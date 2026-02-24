/**
 * User Controller
 * Handles user operations - hotel search, booking management, reviews
 */

const { Hotel, HotelImage, Room, Booking, Review, User, Vendor, Payment } = require('../models');
const { Op, literal } = require('sequelize');
const Razorpay = require('razorpay');
require('dotenv').config();

// Helper to get Razorpay credentials
const getRazorpayCredentials = () => {
  const key_id = (process.env.RAZORPAY_KEY_ID || process.env.RZP_KEY || '').trim();
  const key_secret = (process.env.RAZORPAY_KEY_SECRET || process.env.RZP_SECRET || '').trim();
  return { key_id, key_secret };
};

// Helper to get Razorpay instance
const getRazorpay = () => {
  const { key_id, key_secret } = getRazorpayCredentials();
  if (!key_id || !key_secret) return null;
  return new Razorpay({ key_id, key_secret });
};

const { sendSuccess, sendError, sendPaginatedResponse } = require('../utils/responseHelper');
const { validateRequiredFields, validateDateRange, isValidRating, validatePagination } = require('../utils/validationHelper');
const { 
  buildHotelSearchConditions, 
  buildRoomPriceConditions,
  getHotelIncludes, 
  getBookingIncludes, 
  getPaginationOffset,
  calculateBookingAmount
} = require('../utils/dbHelper');
const { sendBookingConfirmationEmail } = require('../utils/mailer');
const { asyncHandler } = require('../middlewares/errorHandler');

// Helper function to create error
const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Helper function to update hotel average rating
const updateHotelAverageRating = async (hotelId) => {
  try {
    const hotel = await Hotel.findByPk(hotelId, {
      include: [{ model: Review, as: 'reviews' }]
    });
    
    if (hotel) {
      const totalReviews = hotel.reviews ? hotel.reviews.length : 0;
      let newRating = 0.0;
      
      if (totalReviews > 0) {
        const sum = hotel.reviews.reduce((acc, review) => acc + (Number(review.rating) || 0), 0);
        newRating = sum / totalReviews;
      }
      
      // Round to 1 decimal place
      newRating = Math.round(newRating * 10) / 10;
      
      await hotel.update({ rating: newRating });
      return newRating;
    }
  } catch (error) {
    console.error('Error updating hotel rating:', error);
  }
};

module.exports = {
  // ============ HOTEL BROWSING ============

  /**
   * Get hotel by ID with full details
   */
  getHotelById: asyncHandler(async (req, res) => {
    const hotel = await Hotel.findByPk(req.params.hotelId, {
      where: { status: 'APPROVED' },
      include: [
        { model: HotelImage, as: 'images' },
        // { model: Room, as: 'rooms' },
        { model: Vendor, as: 'vendor', attributes: ['id', 'full_name', 'business_name'] },
        { 
          model: Review, 
          as: 'reviews',
          include: [{ model: User, as: 'user', attributes: ['full_name'] }]
        }
      ]
    });

    if (!hotel) {
      throw createError('Hotel not found', 404);
    }

    // CLEANUP: Check for and expire pending bookings older than 10 minutes
    try {
      const expireTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      const expiredBookings = await Booking.findAll({
        where: {
          hotel_id: hotel.id,
          status: 'PENDING',
          createdAt: { [Op.lt]: expireTime }
        }
      });

      if (expiredBookings.length > 0) {
        console.log(`Found ${expiredBookings.length} expired pending bookings for hotel ${hotel.id}. Cleaning up...`);
        
        for (const booking of expiredBookings) {
          booking.status = 'CANCELLED';
          await booking.save();
          // Note: We do NOT restore inventory here because PENDING bookings no longer decrement inventory in the Hotel table.
        }
      }
    } catch (cleanupError) {
      console.error('Error cleaning up expired bookings:', cleanupError);
      // Continue execution even if cleanup fails
    }

    // Calculate real-time availability
    const { check_in, check_out } = req.query;
    
    const today = new Date().toISOString().split('T')[0];
    const targetCheckIn = check_in || today;
    
    let targetCheckOut = check_out;
    if (!targetCheckOut) {
       const d = new Date(targetCheckIn);
       d.setDate(d.getDate() + 1);
       targetCheckOut = d.toISOString().split('T')[0];
    }

    // 1. Calculate Bookings (PENDING + CONFIRMED) to subtract from available inventory
    // We count both PENDING and CONFIRMED bookings because we treat the Hotel table's inventory as TOTAL CAPACITY.
    const bookingCondition = { 
      status: { [Op.in]: ['PENDING', 'CONFIRMED'] }
    };
    
    // Only exclude current user's PENDING bookings if authenticated (so they don't block themselves?)
    // Actually, if a user has a PENDING booking, they ARE blocking the room.
    // But if they are viewing the hotel again, maybe they want to book another room?
    // The original logic excluded current user's PENDING bookings. Let's keep that for PENDING only.
    if (req.user && req.user.id) {
        // This is tricky with Op.or. Let's simplify:
        // We want: (Status=CONFIRMED) OR (Status=PENDING AND User!=Me)
        // But for simplicity, let's just count ALL bookings.
        // If I have a pending booking, I am using a room.
        // If I want to book ANOTHER room, I need to know if there are OTHERS available.
        // So I should count my own pending booking as "used".
    }

    const bookedCount = await Booking.sum('booked_room', {
      where: {
        hotel_id: hotel.id,
        status: { [Op.in]: ['PENDING', 'CONFIRMED'] },
        [Op.and]: [
          { check_in: { [Op.lt]: targetCheckOut } },
          { check_out: { [Op.gt]: targetCheckIn } }
        ]
      }
    }) || 0;

    // 2. Calculate AC Bookings
    const acBookedCount = await Booking.sum('booked_room', {
      where: {
        hotel_id: hotel.id,
        room_type: 'AC',
        status: { [Op.in]: ['PENDING', 'CONFIRMED'] },
        [Op.and]: [
          { check_in: { [Op.lt]: targetCheckOut } },
          { check_out: { [Op.gt]: targetCheckIn } }
        ]
      }
    }) || 0;

    // 3. Calculate Non-AC Bookings
    const nonAcBookedCount = await Booking.sum('booked_room', {
      where: {
        hotel_id: hotel.id,
        room_type: 'Non AC', // Matches DB value
        status: { [Op.in]: ['PENDING', 'CONFIRMED'] },
        [Op.and]: [
          { check_in: { [Op.lt]: targetCheckOut } },
          { check_out: { [Op.gt]: targetCheckIn } }
        ]
      }
    }) || 0;

    // Overwrite the fields with AVAILABLE count
    // The DB values (ac_rooms, non_ac_rooms, available_rooms) represent "Total Capacity".
    const acTotalCapacity = parseInt(hotel.ac_rooms || 0);
    const nonAcTotalCapacity = parseInt(hotel.non_ac_rooms || 0);
    const totalCapacity = parseInt(hotel.available_rooms || 0);
    
    hotel.setDataValue('ac_rooms', Math.max(0, acTotalCapacity - acBookedCount));
    hotel.setDataValue('non_ac_rooms', Math.max(0, nonAcTotalCapacity - nonAcBookedCount));
    
    // Set total available rooms based on TotalInventory - Booked
    hotel.setDataValue('available_rooms', Math.max(0, totalCapacity - bookedCount));

    hotel.images = (hotel.images || []).filter(img => img.url && img.url.startsWith('/uploads/') && !img.url.includes('/src/assets/'));
    sendSuccess(res, { hotel }, 'Hotel details retrieved successfully');
  }),

  /**
   * Search hotels with advanced filtering
   */
  searchHotels: asyncHandler(async (req, res) => {
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const where = buildHotelSearchConditions(req.query);
    // const roomWhere = buildRoomPriceConditions(req.query);
    const offset = getPaginationOffset(page, limit);

    const bookingsCountExpr = `(SELECT COUNT(DISTINCT user_id) FROM bookings WHERE bookings.hotel_id = Hotel.id AND bookings.status = 'CONFIRMED')`;

    const hotels = await Hotel.findAndCountAll({
      where,
      attributes: {
        include: [
          [literal('(SELECT COUNT(*) FROM reviews WHERE reviews.hotel_id = Hotel.id)'), 'reviewCount'],
          [literal(bookingsCountExpr), 'bookingsToday']
        ]
      },
      include: [
        { model: HotelImage, as: 'images' },
        // { 
        //   model: Room, 
        //   as: 'rooms', 
        //   where: Object.keys(roomWhere).length > 0 ? roomWhere : undefined,
        //   required: Object.keys(roomWhere).length > 0
        // },
        { model: Vendor, as: 'vendor', attributes: ['id', 'full_name', 'business_name'] }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    if (hotels.count === 0 && !req.query.status) {
      const relaxedWhere = { ...where };
      delete relaxedWhere.status;
      const retry = await Hotel.findAndCountAll({
        where: relaxedWhere,
        attributes: {
          include: [
            [literal('(SELECT COUNT(*) FROM reviews WHERE reviews.hotel_id = Hotel.id)'), 'reviewCount'],
            [literal(bookingsCountExpr), 'bookingsToday']
          ]
        },
        include: [
          { model: HotelImage, as: 'images' },
          // { 
          //   model: Room, 
          //   as: 'rooms', 
          //   where: Object.keys(roomWhere).length > 0 ? roomWhere : undefined,
          //   required: Object.keys(roomWhere).length > 0
          // },
          { model: Vendor, as: 'vendor', attributes: ['id', 'full_name', 'business_name'] }
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });
      hotels.count = retry.count;
      hotels.rows = retry.rows;
    }

    const pagination = {
      page,
      totalPages: Math.ceil(hotels.count / limit),
      totalItems: hotels.count,
      limit,
      hasNext: page < Math.ceil(hotels.count / limit),
      hasPrev: page > 1
    };

    const rows = hotels.rows.map(h => {
      h.images = (h.images || []).filter(img => img.url && img.url.startsWith('/uploads/') && !img.url.includes('/src/assets/'));
      return h;
    });
    sendPaginatedResponse(res, rows, pagination, 'Search results retrieved successfully');
  }),

  // ============ ROOM BROWSING ============

  /**
   * Get rooms by hotel ID
   */
  getRoomsByHotel: asyncHandler(async (req, res) => {
    const roomWhere = { 
      hotel_id: req.params.hotelId,
      ...buildRoomPriceConditions(req.query)
    };

    const rooms = await Room.findAll({
      where: roomWhere,
      include: [{ 
        model: Hotel, 
        as: 'hotel', 
        attributes: ['id', 'name', 'status'],
        where: { status: 'APPROVED' }
      }],
      order: [['price', 'ASC']]
    });

    sendSuccess(res, { rooms }, 'Rooms retrieved successfully');
  }),

  /**
   * Get hotel room types (AC / NON_AC) with prices and availability
   */
  getHotelRoomTypes: asyncHandler(async (req, res) => {
    const { check_in, check_out, search } = req.query;
    
    const where = { id: req.params.hotelId };
    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }

    const hotel = await Hotel.findOne({ where });
    if (!hotel) {
      throw createError('Hotel not found', 404);
    }
    const acPrice = parseFloat(hotel.ac_room_price || hotel.base_price || 0);
    const nonAcPrice = parseFloat(hotel.non_ac_room_price || hotel.base_price || 0);
    const acTotal = parseInt(hotel.ac_rooms || hotel.available_rooms || hotel.total_rooms || 0);
    const nonAcTotal = parseInt(hotel.non_ac_rooms || hotel.available_rooms || hotel.total_rooms || 0);

    let acAvailable = acTotal;
    let nonAcAvailable = nonAcTotal;

    // NOTE: We calculate real-time availability based on overlapping bookings
    const targetCheckIn = check_in || new Date().toISOString().split('T')[0];
    // If check_out is not provided, assume 1 night stay for availability check
    let targetCheckOut = check_out;
    if (!targetCheckOut) {
      const d = new Date(targetCheckIn);
      d.setDate(d.getDate() + 1);
      targetCheckOut = d.toISOString().split('T')[0];
    }

    const acBookings = await Booking.sum('booked_room', {
      where: {
        hotel_id: hotel.id,
        room_type: 'AC',
        status: { [Op.in]: ['PENDING', 'CONFIRMED'] },
        [Op.and]: [
          { check_in: { [Op.lt]: targetCheckOut } },
          { check_out: { [Op.gt]: targetCheckIn } }
        ]
      }
    }) || 0;

    const nonAcBookings = await Booking.sum('booked_room', {
      where: {
        hotel_id: hotel.id,
        room_type: 'NON_AC',
        status: { [Op.in]: ['PENDING', 'CONFIRMED'] },
        [Op.and]: [
          { check_in: { [Op.lt]: targetCheckOut } },
          { check_out: { [Op.gt]: targetCheckIn } }
        ]
      }
    }) || 0;

    acAvailable = Math.max(0, acTotal - acBookings);
    nonAcAvailable = Math.max(0, nonAcTotal - nonAcBookings);

    const types = [];
    if (acTotal > 0 && acPrice > 0) {
      types.push({
        type: 'AC',
        price_per_night: acPrice,
        total: acTotal,
        available: acAvailable
      });
    }
    if (nonAcTotal > 0 && nonAcPrice > 0) {
      types.push({
        type: 'NON_AC',
        price_per_night: nonAcPrice,
        total: nonAcTotal,
        available: nonAcAvailable
      });
    }

    sendSuccess(res, { hotel_id: hotel.id, types }, 'Room types retrieved successfully');
  }),

  /**
   * Get room by ID with hotel details
   */
  getRoomById: asyncHandler(async (req, res) => {
    const room = await Room.findByPk(req.params.roomId, {
      include: [{ 
        model: Hotel, 
        as: 'hotel', 
        where: { status: 'APPROVED' },
        include: [{ model: HotelImage, as: 'images' }]
      }]
    });

    if (!room) {
      throw createError('Room not found', 404);
    }

    sendSuccess(res, { room }, 'Room details retrieved successfully');
  }),

  // ============ BOOKING MANAGEMENT ============

  /**
   * Create a new booking
   */
  createBooking: asyncHandler(async (req, res) => {
    const { hotel_id, room_type, check_in, check_out, guests = 1, rooms = 1, coupon_code } = req.body;
    
    // Validate required fields
    const validation = validateRequiredFields(req.body, ['hotel_id', 'room_type', 'check_in', 'check_out']);
    if (!validation.isValid) {
      throw createError(`Missing required fields: ${validation.missingFields.join(', ')}`, 400);
    }

    // Validate date range
    const dateValidation = validateDateRange(check_in, check_out);
    if (!dateValidation.isValid) {
      throw createError(dateValidation.message, 400);
    }

    // Validate room type
    const normalizedRoomType = room_type.toUpperCase();
    if (!['AC', 'NON_AC'].includes(normalizedRoomType)) {
      throw createError('Invalid room type. Must be AC or NON_AC', 400);
    }

    // Get hotel details
    const hotel = await Hotel.findByPk(hotel_id, {
      where: { status: 'APPROVED' }
    });

    if (!hotel) {
      throw createError('Hotel not found or not approved', 404);
    }

    // AUTO-CANCEL: Cancel previous PENDING bookings for this user at this hotel to prevent inventory locking
    try {
      const previousPending = await Booking.findAll({
        where: {
          user_id: req.user.id,
          hotel_id,
          status: 'PENDING'
        }
      });

      if (previousPending.length > 0) {
        for (const prevBooking of previousPending) {
          prevBooking.status = 'CANCELLED';
          await prevBooking.save();
          // Note: We do NOT restore inventory because PENDING bookings do not decrement Hotel inventory.
        }
      }
    } catch (err) {
      console.error('Error auto-cancelling previous bookings:', err);
    }

    // Determine price and capacity
    let pricePerNight = 0;
    let totalCapacity = 0;

    if (normalizedRoomType === 'AC') {
      pricePerNight = parseFloat(hotel.ac_room_price || 0);
      totalCapacity = Number(hotel.ac_rooms || 0);
    } else {
      pricePerNight = parseFloat(hotel.non_ac_room_price || 0);
      totalCapacity = Number(hotel.non_ac_rooms || 0);
    }
    if (!pricePerNight) {
      pricePerNight = parseFloat(hotel.base_price || 0);
    }
    if (totalCapacity <= 0) {
      totalCapacity = Number(hotel.available_rooms || hotel.total_rooms || 0);
    }
    if (!pricePerNight || totalCapacity <= 0) {
      throw createError(`Selected room type (${normalizedRoomType}) is not available at this hotel`, 400);
    }

    // Check availability
    const overlappingBookings = await Booking.count({
      where: {
        hotel_id,
        room_type: normalizedRoomType,
        status: { [Op.in]: ['PENDING', 'CONFIRMED'] },
        [Op.and]: [
          { check_in: { [Op.lt]: check_out } },
          { check_out: { [Op.gt]: check_in } }
        ]
      }
    });

    // Check if enough rooms are available
    if (overlappingBookings + Number(rooms) > totalCapacity) {
      throw createError('Not enough rooms available for the selected dates', 400);
    }

    // Calculate base booking amount
    const { amount: singleRoomAmount, nights } = calculateBookingAmount(pricePerNight, check_in, check_out);
    const baseAmount = singleRoomAmount * Number(rooms);
    
    let finalAmount = baseAmount;
    let discountAmount = 0;
    let appliedCouponCode = null;

    // Coupon logic
    if (coupon_code) {
      const { Coupon } = require('../models');
      const now = new Date();
      
      const coupon = await Coupon.findOne({
          where: {
              code: coupon_code,
              active: true,
              expiry: { [Op.or]: [{ [Op.gt]: now }, null] },
              used_count: { [Op.lt]: literal('usage_limit') }
          }
      });

      if (coupon) {
        if (coupon.type === 'PERCENT') {
          discountAmount = (baseAmount * coupon.value) / 100;
        } else {
          discountAmount = coupon.value;
        }
        discountAmount = Math.min(discountAmount, baseAmount);
        finalAmount = Math.max(0, baseAmount - discountAmount);
        appliedCouponCode = coupon.code;
      }
    }

    // Create booking
    const booking = await Booking.create({
      user_id: req.user.id,
      vendor_id: hotel.vendor_id,
      hotel_id,
      room_type: normalizedRoomType,
      // room_id is null
      check_in,
      check_out,
      guests,
      booked_room: rooms,
      amount: finalAmount,
      price_per_night: pricePerNight,
      base_amount: baseAmount,
      discount_amount: discountAmount,
      nights,
      coupon_applied: appliedCouponCode,
      coupon_code: appliedCouponCode,
      status: 'PENDING',
      payment_method: null // Ensure this is not set until payment is completed
    });

    // NOTE: We do NOT update Hotel table inventory (ac_rooms, available_rooms, booked_room) here.
    // Inventory is only permanently deducted when status becomes CONFIRMED.
    // Availability for new bookings is calculated dynamically in getHotelById by checking PENDING + CONFIRMED bookings.

    sendSuccess(res, { 
      booking, 
      amount: finalAmount, 
      price_per_night: pricePerNight,
      base_amount: baseAmount,
      discount_amount: discountAmount,
      nights,
      coupon_applied: appliedCouponCode 
    }, 'Booking created successfully', 201);
  }),

  /**
   * Get user's bookings with pagination
   */
  getMyBookings: asyncHandler(async (req, res) => {
    const { page: queryPage, limit: queryLimit, status } = req.query;
    
    // Validate pagination
    const { page, limit } = validatePagination(queryPage, queryLimit);

    // Build where conditions
    const where = { user_id: req.user.id };
    if (status && ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(status)) {
      where.status = status;
    }

    const offset = getPaginationOffset(page, limit);

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where,
      include: getBookingIncludes(),
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    const pagination = {
      page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      limit,
      hasNext: page < Math.ceil(count / limit),
      hasPrev: page > 1
    };

    sendPaginatedResponse(res, bookings, pagination, 'Bookings retrieved successfully');
  }),

  /**
   * Get booking by ID
   */
  getBookingById: asyncHandler(async (req, res) => {
    const booking = await Booking.findOne({
      where: { 
        id: req.params.bookingId,
        user_id: req.user.id 
      },
      include: getBookingIncludes()
    });

    if (!booking) {
      throw createError('Booking not found', 404);
    }

    sendSuccess(res, { booking }, 'Booking details retrieved successfully');
  }),

  /**
   * Get payment key
   */
  getPaymentKey: asyncHandler(async (req, res) => {
    const { key_id } = getRazorpayCredentials();
    sendSuccess(res, { key_id }, 'Payment key retrieved');
  }),

  /**
   * Debug Razorpay configuration
   */
  debugRazorpay: asyncHandler(async (req, res) => {
    const { key_id, key_secret } = getRazorpayCredentials();
    const razorpay = getRazorpay();
    
    let status = 'Configured';
    let error = null;
    let connectivity = 'Unknown';
    let keyValidation = {
      idLength: key_id ? key_id.length : 0,
      secretLength: key_secret ? key_secret.length : 0,
      idPrefix: key_id ? key_id.substring(0, 9) : 'none',
      isTestMode: key_id ? key_id.startsWith('rzp_test_') : false,
      isLiveMode: key_id ? key_id.startsWith('rzp_live_') : false
    };
    
    if (!key_id) status = 'Missing Key ID';
    else if (!key_secret) status = 'Missing Key Secret';
    
    // Check connectivity by fetching a dummy payment
    try {
      if (razorpay) {
        // Fetching a non-existent payment should return 400/404 with specific error code
        await razorpay.payments.fetch('pay_dummy_123');
      }
    } catch (e) {
      if (e.statusCode === 404 || (e.error && e.error.code === 'BAD_REQUEST_ERROR')) {
        connectivity = 'Connected (Verified)';
      } else {
        connectivity = 'Connection Failed';
        error = e.error ? e.error.description : (e.message || e);
      }
    }
    
    sendSuccess(res, { 
      key_id_preview: key_id ? key_id.substring(0, 10) + '...' : 'MISSING',
      key_secret_exists: !!key_secret,
      keyValidation,
      status,
      connectivity,
      error
    }, 'Razorpay Debug Info');
  }),

  /**
   * Initiate payment for a booking (creates Razorpay order and Payment record)
   */
  initiatePayment: asyncHandler(async (req, res) => {
    const booking = await Booking.findOne({
      where: { id: req.params.bookingId, user_id: req.user.id }
    });
    if (!booking) {
      throw createError('Booking not found', 404);
    }

    // Check for 10-minute payment window
    const createdAt = new Date(booking.createdAt).getTime();
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    
    if (now - createdAt > tenMinutes) {
      throw createError('Payment window expired (10 minutes). Please create a new booking.', 400);
    }

    if (!booking.amount || booking.amount <= 0) {
      throw createError('Invalid booking amount', 400);
    }

    const { payment_method } = req.body;

    // If Pay at Hotel, skip Razorpay order creation
    if (payment_method === 'PAY_AT_HOTEL') {
      // Check if payment already exists
      let payment = await Payment.findOne({ where: { booking_id: booking.id } });
      
      if (!payment) {
        payment = await Payment.create({
          booking_id: booking.id,
          gateway: 'PAY_AT_HOTEL',
          gateway_payment_id: `PAH_${booking.id}_${Date.now()}`,
          amount: booking.amount,
          status: 'INITIATED'
        });
      }
      
      return sendSuccess(res, { payment }, 'Payment initiated (Pay at Hotel)');
    }

    // Verify Razorpay credentials
    const razorpay = getRazorpay();
    const { key_id } = getRazorpayCredentials();

    if (!razorpay || !key_id) {
      console.error('Razorpay credentials missing or invalid.');
      throw createError('Online payment service is temporarily unavailable. Please try Pay at Hotel.', 503);
    }

    console.log(`[Payment] Initiating Razorpay with KeyID: ${key_id.substring(0, 10)}...`);

    let order;
    try {
      order = await razorpay.orders.create({
        amount: Math.round(parseFloat(booking.amount) * 100),
        currency: 'INR',
        receipt: `rcpt_${booking.id}`
      });
    } catch (rzpError) {
      console.error('Razorpay order creation failed:', rzpError);
      
      // Extract detailed error message
      const errorDetails = rzpError.error && rzpError.error.description 
        ? rzpError.error.description 
        : (rzpError.message || JSON.stringify(rzpError));
        
      const amountInRupees = parseFloat(booking.amount).toFixed(2);
      throw createError(`Payment initiation failed: ${errorDetails} (Amount: ₹${amountInRupees})`, 502);
    }
    
    // Check if payment already exists
    let payment = await Payment.findOne({ where: { booking_id: booking.id } });
    
    if (payment) {
      // Update existing payment record
      payment.gateway = 'RAZORPAY';
      payment.gateway_payment_id = order.id;
      payment.amount = booking.amount;
      payment.status = 'INITIATED';
      await payment.save();
    } else {
      // Create new payment record
      payment = await Payment.create({
        booking_id: booking.id,
        gateway: 'RAZORPAY',
        gateway_payment_id: order.id,
        amount: booking.amount,
        status: 'INITIATED'
      });
    }

    sendSuccess(res, { order, payment, key_id }, 'Payment initiated');
  }),

  /**
   * Complete payment for a booking (manual test endpoint)
   */
  completePayment: asyncHandler(async (req, res) => {
    const { gateway_payment_id, status, payment_method } = req.body;
    
    // Fetch booking with all necessary relations for email
    const booking = await Booking.findOne({
      where: { id: req.params.bookingId, user_id: req.user.id },
      include: [
        { model: Hotel, as: 'hotel' },
        { model: User, as: 'user' }
      ]
    });

    if (!booking) {
      throw createError('Booking not found', 404);
    }

    // Check for 10-minute payment window on completion
    // Only enforce if status is 'success' (don't block failure updates)
    // AND skip for Pay at Hotel (which has no strict time limit for "payment")
    if (String(status).toLowerCase() === 'success' && payment_method !== 'PAY_AT_HOTEL') {
      const createdAt = new Date(booking.createdAt).getTime();
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;

      if (now - createdAt > tenMinutes) {
        // Late payment logic: Reject and Refund
        if (payment_method === 'ONLINE' && gateway_payment_id) {
          try {
            // Attempt auto-refund via Razorpay
            await razorpay.payments.refund(gateway_payment_id);
            console.log(`Refunded late payment: ${gateway_payment_id}`);
          } catch (e) {
            console.error('Refund failed:', e);
            // We still proceed to reject the booking
          }
        }
        
        booking.status = 'CANCELLED';
        await booking.save();

        // Update payment status to REFUNDED or FAILED
        const payment = await Payment.findOne({ where: { booking_id: booking.id } });
        if (payment) {
          payment.gateway_payment_id = gateway_payment_id || payment.gateway_payment_id;
          payment.status = 'REFUNDED'; // Or FAILED if refund logic isn't fully integrated
          await payment.save();
        }

        throw createError('Payment received after 10-minute window. Your payment has been refunded.', 400);
      }
    }

    const payment = await Payment.findOne({ where: { booking_id: booking.id } });
    if (!payment) {
      throw createError('Payment not found', 404);
    }
    payment.gateway_payment_id = gateway_payment_id || payment.gateway_payment_id;
    payment.status = String(status).toLowerCase() === 'success' ? 'SUCCESS' : 'FAILED';
    await payment.save();
    
    if (payment.status === 'SUCCESS') {
      booking.status = 'CONFIRMED';
      booking.payment_id = payment.gateway_payment_id;
      if (payment_method) {
        booking.payment_method = payment_method;
      }
      await booking.save();

      // UPDATE HOTEL INVENTORY: 
      // We do NOT deduct rooms from the Hotel table anymore.
      // The Hotel table fields (ac_rooms, non_ac_rooms, available_rooms) represent TOTAL CAPACITY.
      // Availability is calculated dynamically in getHotelById and createBooking based on overlapping bookings.
      /*
      if (booking.hotel) {
        const hotel = booking.hotel;
        const roomsToBook = Number(booking.booked_room) || 1;
        
        // We might want to track total bookings count for analytics, but not for availability.
        // hotel.booked_room = (Number(hotel.booked_room) || 0) + roomsToBook;
        // await hotel.save();
      }
      */

      // Send confirmation email
      console.log('Attempting to send confirmation email for booking:', booking.id);
      if (booking.user && booking.user.email) {
        console.log('User email found:', booking.user.email);
        try {
          const emailResult = await sendBookingConfirmationEmail(booking.user.email, {
            userName: booking.user.full_name || 'Valued Guest',
            hotelName: booking.hotel ? booking.hotel.name : 'Hotel',
            hotelAddress: booking.hotel ? booking.hotel.address : '',
            checkIn: booking.check_in,
            checkOut: booking.check_out,
            roomType: booking.room_type,
            totalAmount: booking.amount,
            bookingId: booking.id,
            guests: booking.guests,
            paymentMethod: booking.payment_method,
            discountAmount: booking.discount_amount,
            couponCode: booking.coupon_code
          });
          
          if (emailResult.success) {
             console.log('Confirmation email sent successfully');
             if (emailResult.info && emailResult.info.message) {
                 console.log('Email JSON details:', emailResult.info.message);
             }
          } else {
             console.error('Failed to send confirmation email (internal):', emailResult.error);
          }
        } catch (emailError) {
          console.error('Error sending confirmation email:', emailError);
        }
      } else {
        console.warn('Cannot send email: User or email missing', { 
          hasUser: !!booking.user, 
          email: booking.user ? booking.user.email : 'N/A' 
        });
      }
    } else {
      // Handle failed/cancelled payment
      if (booking.status !== 'CANCELLED') {
        booking.status = 'CANCELLED';
        if (payment_method) {
          booking.payment_method = payment_method;
        }
        await booking.save();

        // NOTE: We do NOT restore inventory here because we never deducted it in createBooking.
        // We only mark the booking as CANCELLED so getHotelById knows it's no longer blocking a room.
      }
    }
    sendSuccess(res, { payment, booking }, 'Payment status updated');
  }),

  /**
   * Cancel a booking
   */
  cancelBooking: asyncHandler(async (req, res) => {
    const booking = await Booking.findOne({
      where: { 
        id: req.params.bookingId,
        user_id: req.user.id 
      }
    });

    if (!booking) {
      throw createError('Booking not found', 404);
    }

    if (booking.status === 'CANCELLED') {
      throw createError('Booking already cancelled', 400);
    }

    // Check cancellation policy for confirmed bookings
    if (booking.status === 'CONFIRMED') {
      const checkInDate = new Date(booking.check_in);
      const now = new Date();
      
      // Policy: 
      // - Cancel before 12:00 AM (midnight) of check-in day: Full Refund
      // - Cancel on booking day (after midnight): Penalty applied
      
      const checkInMidnight = new Date(checkInDate);
      checkInMidnight.setHours(0, 0, 0, 0);
      
      if (now < checkInMidnight) {
        // Full Refund
        booking.refund_status = 'FULL_REFUND';
      } else {
        // Penalty Applied
        booking.refund_status = 'PENALTY_APPLIED';
      }
    }

    // Capture original status to decide if we need to restore inventory
    const originalStatus = booking.status;

    // Cancel booking and restore room availability
    booking.status = 'CANCELLED';
    await booking.save();
    
    // Restore counts on Hotel model ONLY IF original status was CONFIRMED
    // However, since we now treat Hotel fields as TOTAL CAPACITY, we do NOT restore them.
    /*
    if (originalStatus === 'CONFIRMED') {
      const hotel = await Hotel.findByPk(booking.hotel_id);
      if (hotel) {
        // ... restore logic ...
        // await hotel.save();
      }
    }
    */

    // Restore legacy Room model (deprecated but kept for backward compatibility if needed)
    const room = await Room.findByPk(booking.room_id);
    if (room) {
      await room.update({ available_rooms: room.available_rooms + 1 });
    }

    sendSuccess(res, { booking }, 'Booking cancelled successfully');
  }),

  // ============ REVIEW MANAGEMENT ============

  /**
   * Create a review for a hotel
   */
  createReview: asyncHandler(async (req, res) => {
    const { hotel_id, rating, comment } = req.body;
    
    // Validate required fields
    const validation = validateRequiredFields(req.body, ['hotel_id', 'rating', 'comment']);
    if (!validation.isValid) {
      throw createError(`Missing required fields: ${validation.missingFields.join(', ')}`, 400);
    }

    // Validate rating
    if (!isValidRating(rating)) {
      throw createError('Rating must be between 1 and 5', 400);
    }

    // Check if user already reviewed this hotel
    const existingReview = await Review.findOne({
      where: {
        user_id: req.user.id,
        hotel_id
      }
    });

    if (existingReview) {
      throw createError('You have already reviewed this hotel', 400);
    }

    const review = await Review.create({
      user_id: req.user.id,
      hotel_id,
      rating,
      comment
    });

    // Update hotel rating
    await updateHotelAverageRating(hotel_id);

    sendSuccess(res, { review }, 'Review created successfully', 201);
  }),

  /**
   * Get user's reviews
   */
  getMyReviews: asyncHandler(async (req, res) => {
    const reviews = await Review.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Hotel, as: 'hotel', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']]
    });

    sendSuccess(res, { reviews }, 'Reviews retrieved successfully');
  }),

  /**
   * Update a review
   */
  updateReview: asyncHandler(async (req, res) => {
    const review = await Review.findOne({
      where: {
        id: req.params.reviewId,
        user_id: req.user.id
      }
    });

    if (!review) {
      throw createError('Review not found', 404);
    }

    const { rating, comment } = req.body;
    const updateData = {};
    
    if (rating !== undefined) {
      if (!isValidRating(rating)) {
        throw createError('Rating must be between 1 and 5', 400);
      }
      updateData.rating = rating;
    }
    
    if (comment) updateData.comment = comment;

    await review.update(updateData);

    // Update hotel rating
    await updateHotelAverageRating(review.hotel_id);

    sendSuccess(res, { review }, 'Review updated successfully');
  }),

  /**
   * Delete a review
   */
  deleteReview: asyncHandler(async (req, res) => {
    const review = await Review.findOne({
      where: {
        id: req.params.reviewId,
        user_id: req.user.id
      }
    });

    if (!review) {
      throw createError('Review not found', 404);
    }

    const hotelId = review.hotel_id;
    await review.destroy();

    // Update hotel rating
    await updateHotelAverageRating(hotelId);

    sendSuccess(res, null, 'Review deleted successfully');
  }),

  // ============ USER PROFILE ============

  /**
   * Get user profile
   */
  getProfile: asyncHandler(async (req, res) => {
    let user;
    try {
      user = await User.findByPk(req.user.id, {
        attributes: ['id', 'full_name', 'email', 'phone', 'address', 'profile_photo', 'is_verified', 'createdAt']
      });
    } catch (err) {
      if (/Unknown column 'profile_photo'/i.test(err.message)) {
        user = await User.findByPk(req.user.id, {
          attributes: ['id', 'full_name', 'email', 'phone', 'address', 'is_verified', 'createdAt']
        });
      } else {
        throw err;
      }
    }

    if (!user) {
      throw createError('User not found', 404);
    }

    sendSuccess(res, { user }, 'Profile retrieved successfully');
  }),

  /**
   * Update user profile
   */
  updateProfile: asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      throw createError('User not found', 404);
    }

    // Accept common alias keys from frontend forms
    const {
      full_name,
      fullName,
      phone,
      phone_number,
      mobile,
      address
    } = req.body || {};
    const updateData = {};
    
    if (full_name || fullName) updateData.full_name = (full_name || fullName).trim();
    if (phone || phone_number || mobile) updateData.phone = (phone || phone_number || mobile).trim();
    if (address) updateData.address = String(address).trim();
    if (req.file && req.file.filename) updateData.profile_photo = req.file.filename;
    
    if (Object.keys(updateData).length === 0) {
      return sendError(res, 'No profile fields provided to update', 400);
    }

    try {
      await user.update(updateData);
    } catch (err) {
      if (/Unknown column 'profile_photo'/i.test(err.message)) {
        delete updateData.profile_photo;
        await user.update(updateData);
      } else {
        throw err;
      }
    }
    sendSuccess(res, { user }, 'Profile updated successfully');
  })
};
