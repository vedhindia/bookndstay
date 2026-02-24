/**
 * Vendor Controller
 * Handles vendor operations - hotel management, room management, booking management
 */

const { Hotel, HotelImage, Room, Booking, User, Vendor, Review } = require('../models');
const { sendSuccess, sendError, sendPaginatedResponse } = require('../utils/responseHelper');
const { validateRequiredFields, validatePagination, isValidEmail } = require('../utils/validationHelper');
const { getBookingIncludes, getPaginationOffset } = require('../utils/dbHelper');
const { asyncHandler } = require('../middlewares/errorHandler');
const { Op, fn, col } = require('sequelize');

/* ===================== HELPERS ===================== */

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const buildDateRangeFilter = (startDate, endDate) => {
  const filter = {};
  if (startDate) filter.createdAt = { [Op.gte]: new Date(startDate) };
  if (endDate) filter.createdAt = { ...filter.createdAt, [Op.lte]: new Date(endDate) };
  return filter;
};

const normalizeArray = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    return val.split(',').map(v => v.trim()).filter(Boolean);
  }
  return null;
};

/* ===================== CONTROLLER ===================== */

module.exports = {

  /* ===================== HOTEL MANAGEMENT ===================== */

  /** CREATE HOTEL */
  createHotel: asyncHandler(async (req, res) => {
    const body = req.body;

    const vendor = await Vendor.findByPk(req.user.id);
    if (!vendor) throw createError('Vendor not found', 404);
    if (vendor.status !== 'ACTIVE') throw createError('Vendor account not active', 403);

    const validation = validateRequiredFields(body, ['name', 'address', 'city']);
    if (!validation.isValid) {
      throw createError(`Missing required fields: ${validation.missingFields.join(', ')}`);
    }

    if (body.email && !isValidEmail(body.email)) {
      throw createError('Invalid email format');
    }

    const totalRooms = parseInt(body.total_rooms) || 0;

    const hotel = await Hotel.create({
      vendor_id: req.user.id,
      name: body.name,
      description: body.description || null,
      address: body.address,
      city: body.city,
      state: body.state || null,
      pincode: body.pincode || null,
      country: body.country || 'India',
      latitude: body.latitude ? parseFloat(body.latitude) : null,
      longitude: body.longitude ? parseFloat(body.longitude) : null,
      map_url: body.map_url || null,
      amenities: normalizeArray(body.amenities),
      hotel_features: normalizeArray(body.hotel_features),
      phone: body.phone || null,
      email: body.email || null,

      total_rooms: totalRooms,
      booked_room: 0,
      available_rooms: totalRooms,
      base_price: parseFloat(body.base_price) || 0,
      featured: String(body.featured).toLowerCase() === 'true',
      ac_room_price: body.ac_room_price ? parseFloat(body.ac_room_price) : null,
      non_ac_room_price: body.non_ac_room_price ? parseFloat(body.non_ac_room_price) : null,
      ac_rooms: parseInt(body.ac_rooms) || 0,
      non_ac_rooms: parseInt(body.non_ac_rooms) || 0,
      check_in_time: body.check_in_time || null,
      check_out_time: body.check_out_time || null,
      cancellation_policy: body.cancellation_policy || null,
      gst_number: body.gst_number || null,
      status: 'PENDING'
    });

    sendSuccess(res, { hotel }, 'Hotel created successfully', 201);
  }),

  /** GET MY HOTELS */
  getMyHotels: asyncHandler(async (req, res) => {
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = getPaginationOffset(page, limit);

    const hotels = await Hotel.findAndCountAll({
      where: { vendor_id: req.user.id },
      include: [{ model: HotelImage, as: 'images' }],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const rows = hotels.rows.map(h => {
      h.images = (h.images || []).filter(img => img.url?.startsWith('/uploads/'));
      return h;
    });

    sendPaginatedResponse(res, rows, {
      page,
      limit,
      totalItems: hotels.count,
      totalPages: Math.ceil(hotels.count / limit)
    }, 'Hotels retrieved successfully');
  }),

  /** GET HOTEL BY ID (VENDOR) */
  getHotelById: asyncHandler(async (req, res) => {
    const hotel = await Hotel.findOne({
      where: { id: req.params.hotelId, vendor_id: req.user.id },
      include: [
        { model: HotelImage, as: 'images' },
        {
          model: Review,
          as: 'reviews',
          include: [{ model: User, as: 'user', attributes: ['full_name'] }]
        }
      ]
    });

    if (!hotel) throw createError('Hotel not found', 404);

    sendSuccess(res, { hotel }, 'Hotel details retrieved');
  }),

  /** UPDATE HOTEL */
  updateHotel: asyncHandler(async (req, res) => {
    const hotel = await Hotel.findOne({
      where: { id: req.params.hotelId, vendor_id: req.user.id }
    });

    if (!hotel) throw createError('Hotel not found', 404);

    const updates = { ...req.body };

    // 🚫 Block restricted fields
    delete updates.vendor_id;
    delete updates.status;
    delete updates.rating;

    await hotel.update(updates);
    await hotel.reload();

    sendSuccess(res, { hotel }, 'Hotel updated successfully');
  }),

  /** DELETE HOTEL */
  deleteHotel: asyncHandler(async (req, res) => {
    const hotel = await Hotel.findOne({
      where: { id: req.params.hotelId, vendor_id: req.user.id }
    });

    if (!hotel) throw createError('Hotel not found', 404);

    const activeBookings = await Booking.count({
      where: {
        hotel_id: hotel.id,
        status: ['PENDING', 'CONFIRMED']
      }
    });

    if (activeBookings > 0) {
      throw createError('Cannot delete hotel with active bookings');
    }

    await hotel.destroy();
    sendSuccess(res, null, 'Hotel deleted successfully');
  }),

  /* ===================== BOOKINGS ===================== */

  getMyBookings: asyncHandler(async (req, res) => {
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = getPaginationOffset(page, limit);

    const bookings = await Booking.findAndCountAll({
      where: { vendor_id: req.user.id },
      include: getBookingIncludes(),
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    sendPaginatedResponse(res, bookings.rows, {
      page,
      limit,
      totalItems: bookings.count,
      totalPages: Math.ceil(bookings.count / limit)
    }, 'Bookings retrieved successfully');
  }),

  /* ===================== DASHBOARD ===================== */

  getDashboardStats: asyncHandler(async (req, res) => {
    const [
      totalHotels,
      approvedHotels,
      pendingHotels,
      totalBookings,
      confirmedBookings,
      revenueResult
    ] = await Promise.all([
      Hotel.count({ where: { vendor_id: req.user.id } }),
      Hotel.count({ where: { vendor_id: req.user.id, status: 'APPROVED' } }),
      Hotel.count({ where: { vendor_id: req.user.id, status: 'PENDING' } }),
      Booking.count({ where: { vendor_id: req.user.id } }),
      Booking.count({ where: { vendor_id: req.user.id, status: 'CONFIRMED' } }),
      Booking.findAll({
        where: { vendor_id: req.user.id, status: 'CONFIRMED' },
        attributes: [[fn('SUM', col('amount')), 'totalRevenue']]
      })
    ]);

    sendSuccess(res, {
      stats: {
        totalHotels,
        approvedHotels,
        pendingHotels,
        totalBookings,
        confirmedBookings,
        totalRevenue: parseFloat(revenueResult[0]?.dataValues?.totalRevenue || 0)
      }
    }, 'Dashboard statistics retrieved');
  }),

  /* ===================== PROFILE ===================== */

  getVendorProfile: asyncHandler(async (req, res) => {
    const vendor = await Vendor.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!vendor) throw createError('Vendor not found', 404);

    const hotelsCount = await Hotel.count({ where: { vendor_id: req.user.id } });

    sendSuccess(res, {
      vendor: {
        ...vendor.toJSON(),
        hotels_count: hotelsCount
      }
    }, 'Vendor profile retrieved');
  }),

  updateVendorProfile: asyncHandler(async (req, res) => {
    const vendor = await Vendor.findByPk(req.user.id);
    if (!vendor) throw createError('Vendor not found', 404);

    await vendor.update(req.body);
    sendSuccess(res, { vendor }, 'Vendor profile updated');
  })
};