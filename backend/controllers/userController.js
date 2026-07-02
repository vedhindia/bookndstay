/**
 * User Controller
 * Handles user operations - hotel search, booking management, reviews
 */

const { sequelize, Hotel, HotelImage, Room, Booking, Review, User, Vendor, Payment, Coupon } = require('../models');
const { Op, literal } = require('sequelize');
const Razorpay = require('razorpay');
require('dotenv').config();

// Helper to clean environment variables (remove quotes, whitespace)
const cleanEnv = (val) => {
  if (!val) return '';
  return val.toString().trim().replace(/^["']|["']$/g, '');
};

// Helper to get Razorpay credentials
const getRazorpayCredentials = () => {
  const key_id = cleanEnv(process.env.RAZORPAY_KEY_ID || process.env.RZP_KEY);
  const key_secret = cleanEnv(process.env.RAZORPAY_KEY_SECRET || process.env.RZP_SECRET);
  return { key_id, key_secret };
};

// Helper to get Razorpay instance
const getRazorpay = () => {
  const { key_id, key_secret } = getRazorpayCredentials();
  if (!key_id || !key_secret) return null;
  return new Razorpay({ key_id, key_secret });
};

const parseTime12h = (value) => {
  const s = String(value || '').trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2] || 0);
  const ampm = String(m[3] || '').toUpperCase();
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
  if (ampm === 'AM') {
    if (hour === 12) hour = 0;
  } else if (ampm === 'PM') {
    if (hour !== 12) hour += 12;
  } else {
    return null;
  }
  return { hour24: hour, minute };
};

const buildISTDateTimeFromDateOnly = (dateOnly, time12h) => {
  if (!dateOnly) return null;
  const d = String(dateOnly).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const parsed = parseTime12h(time12h) || { hour24: 12, minute: 0 };
  const [y, mo, day] = d.split('-').map(Number);
  const utcMs = Date.UTC(y, mo - 1, day, parsed.hour24, parsed.minute) - (5.5 * 60 * 60 * 1000);
  return new Date(utcMs);
};

const round2 = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
};

const getCommissionPercent = () => {
  const raw = process.env.COMMISSION_PERCENT ?? process.env.PLATFORM_COMMISSION_PERCENT;
  const n = parseFloat(String(raw ?? ''));
  if (Number.isFinite(n) && n >= 0 && n <= 100) return n;
  return 10;
};

const istDateOnly = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  const ist = new Date(dt.getTime() + 330 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
};

const weekStartMondayIST = (d) => {
  const dateOnly = istDateOnly(d);
  if (!dateOnly) return null;
  const base = new Date(`${dateOnly}T00:00:00.000Z`);
  const day = base.getUTCDay();
  const diff = (day + 6) % 7;
  base.setUTCDate(base.getUTCDate() - diff);
  return base.toISOString().slice(0, 10);
};

const DEFAULT_HOTEL_CHECK_IN_TIME = '12:00 PM';
const DEFAULT_HOTEL_CHECK_OUT_TIME = '11:00 AM';
const MIN_HOURLY_HOURS = 3;
const HOURLY_DAY_START_HOUR = 6;
const HOURLY_DAY_END_HOUR = 18;
const HOURLY_LATEST_SAME_DAY_CHECKOUT_TIME = '09:00 PM';
const CHILD_AGE_CHARGE_THRESHOLD = 8;
const CHILD_SURCHARGE_AMOUNT = 300;

const normalizeChildAges = (rawValue) => {
  const input = Array.isArray(rawValue) ? rawValue : [];
  return input
    .map((age) => Number(age))
    .filter((age) => Number.isFinite(age) && age >= 0 && age <= 17)
    .map((age) => Math.round(age));
};

const normalizeGuestBreakdown = (rawValue) => {
  if (!Array.isArray(rawValue)) return [];
  return rawValue.map((room, index) => {
    const adults = Math.max(0, Math.round(Number(room?.adults) || 0));
    const children = Math.max(0, Math.round(Number(room?.children) || 0));
    const childAges = normalizeChildAges(room?.child_ages);
    return {
      room_id: room?.room_id ?? room?.roomId ?? index + 1,
      adults,
      children,
      child_ages: childAges.slice(0, children)
    };
  });
};

const normalizeRoomTypeValue = (value) =>
  String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');

const computeNightlyBookedCountsForHourlyWindow = async ({
  hotel,
  targetCheckIn,
  targetCheckOut,
  reqStartAt,
  reqEndAt,
  statusWhere
}) => {
  const hotelId = hotel?.id;
  if (!hotelId || !targetCheckIn || !targetCheckOut || !reqStartAt || !reqEndAt) {
    return { total: 0, ac: 0, nonAc: 0 };
  }

  const bookings = await Booking.findAll({
    where: {
      hotel_id: hotelId,
      ...statusWhere,
      [Op.or]: [{ booking_mode: { [Op.in]: ['NIGHTLY', 'nightly'] } }, { booking_mode: null }],
      [Op.and]: [{ check_in: { [Op.lt]: targetCheckOut } }, { check_out: { [Op.gte]: targetCheckIn } }]
    },
    attributes: ['room_type', 'booked_room', 'check_in', 'check_out', 'booking_mode']
  });

  const checkInTime = (() => {
    const raw = hotel?.check_in_time;
    return parseTime12h(raw) ? raw : DEFAULT_HOTEL_CHECK_IN_TIME;
  })();

  const checkOutTime = (() => {
    const raw = hotel?.check_out_time;
    const parsed = parseTime12h(raw);
    if (!parsed) return DEFAULT_HOTEL_CHECK_OUT_TIME;
    if (parsed.hour24 >= 12) return DEFAULT_HOTEL_CHECK_OUT_TIME;
    return raw;
  })();

  let total = 0;
  let ac = 0;
  let nonAc = 0;

  for (const b of bookings) {
    const startAt = buildISTDateTimeFromDateOnly(b.check_in, checkInTime);
    const endAt = buildISTDateTimeFromDateOnly(b.check_out, checkOutTime);
    if (!startAt || !endAt) continue;
    if (!(startAt < reqEndAt && endAt > reqStartAt)) continue;
    const qty = Number(b.booked_room || 0);
    if (!qty) continue;
    total += qty;
    const rt = normalizeRoomTypeValue(b.room_type);
    if (rt === 'AC') ac += qty;
    if (rt === 'NON_AC') nonAc += qty;
  }

  return { total, ac, nonAc };
};

const computeRefundPercent = ({ bookingMode, msUntilCheckIn }) => {
  const mode = String(bookingMode || 'NIGHTLY').toUpperCase();
  if (!Number.isFinite(msUntilCheckIn) || msUntilCheckIn <= 0) return 0;
  if (mode === 'HOURLY') {
    const minutes = msUntilCheckIn / (60 * 1000);
    if (minutes > 120) return 100;
    if (minutes >= 30) return 50;
    return 0;
  }
  const hours = msUntilCheckIn / (60 * 60 * 1000);
  if (hours > 24) return 100;
  if (hours >= 12) return 50;
  return 0;
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
const { notifyAdmins, notifyVendor } = require('../utils/notificationHub');
const { canUserUseCoupon, recordCouponUsageForBooking } = require('../utils/couponUsage');

// Helper function to create error
const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parseDateTimeInput = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? new Date(value.getTime()) : null;
  }

  const s = String(value).trim();
  if (!s) return null;

  if (/([zZ]|[+-]\d{2}:\d{2})$/.test(s)) {
    const d = new Date(s);
    return Number.isFinite(d.getTime()) ? d : null;
  }

  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const hour = Number(m[4]);
    const minute = Number(m[5]);
    const second = Number(m[6] || 0);
    const utcMs = Date.UTC(year, month - 1, day, hour, minute, second) - (5.5 * 60 * 60 * 1000);
    const d = new Date(utcMs);
    return Number.isFinite(d.getTime()) ? d : null;
  }

  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
};

const getDateOnlyRangeForAvailability = ({ checkIn, checkOut, checkInAt, checkOutAt }) => {
  const toDateOnly = (d) => {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return null;
    return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };

  let targetCheckIn = checkIn || new Date().toISOString().split('T')[0];
  let targetCheckOut = checkOut || null;
  let reqStartAt = null;
  let reqEndAt = null;

  if (checkInAt && checkOutAt) {
    const ciAt = parseDateTimeInput(checkInAt);
    const coAt = parseDateTimeInput(checkOutAt);
    if (ciAt && coAt && !Number.isNaN(ciAt.getTime()) && !Number.isNaN(coAt.getTime()) && coAt > ciAt) {
      reqStartAt = ciAt;
      reqEndAt = coAt;
      targetCheckIn = toDateOnly(ciAt) || targetCheckIn;
      targetCheckOut = toDateOnly(coAt) || targetCheckOut;
    }
  }

  if (!targetCheckOut) {
    const d = new Date(`${targetCheckIn}T00:00:00`);
    d.setDate(d.getDate() + 1);
    targetCheckOut = d.toISOString().split('T')[0];
  }

  if (targetCheckOut && targetCheckIn && String(targetCheckOut) <= String(targetCheckIn)) {
    const d = new Date(`${targetCheckIn}T00:00:00`);
    d.setDate(d.getDate() + 1);
    targetCheckOut = d.toISOString().split('T')[0];
  }

  if (!reqStartAt || !reqEndAt) {
    reqStartAt = new Date(`${targetCheckIn}T00:00:00`);
    reqEndAt = new Date(`${targetCheckOut}T00:00:00`);
  }

  return { targetCheckIn, targetCheckOut, reqStartAt, reqEndAt };
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

const resolveBookingCheckoutAt = (booking) => {
  const mode = String(booking?.booking_mode || 'NIGHTLY').toUpperCase();
  const toDate = (v) => {
    if (!v) return null;
    const d = v instanceof Date ? new Date(v.getTime()) : new Date(v);
    return Number.isFinite(d.getTime()) ? d : null;
  };

  if (mode === 'HOURLY') {
    return toDate(booking?.check_out_at || booking?.check_out);
  }

  const raw = booking?.check_out;
  const d = toDate(raw);
  if (!d) return null;

  const isDateOnly =
    typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim());

  if (isDateOnly) {
    d.setUTCHours(5, 30, 0, 0);
  }
  return d;
};

const autoCompleteExpiredConfirmedHourlyBookingsForHotel = async (hotelId) => {
  if (!hotelId) return;
  const now = new Date();

  const bookings = await Booking.findAll({
    where: {
      hotel_id: hotelId,
      status: 'CONFIRMED',
      booking_mode: 'HOURLY',
      check_out_at: { [Op.lte]: now }
    },
    attributes: ['id']
  });

  if (!bookings.length) return;

  const ids = bookings.map((b) => b.id);
  await Booking.update(
    { status: 'COMPLETED' },
    { where: { id: { [Op.in]: ids }, status: 'CONFIRMED' } }
  );
};

const autoCompleteExpiredConfirmedNightlyBookingsForHotel = async (hotelId) => {
  if (!hotelId) return;
  const now = new Date();

  const candidates = await Booking.findAll({
    where: {
      hotel_id: hotelId,
      status: 'CONFIRMED',
      [Op.or]: [{ booking_mode: 'NIGHTLY' }, { booking_mode: null }]
    },
    attributes: ['id', 'room_type', 'booked_room', 'check_out', 'booking_mode']
  });

  if (!candidates.length) return;

  const expired = candidates.filter((b) => {
    const checkoutAt = resolveBookingCheckoutAt(b);
    return checkoutAt && now.getTime() >= checkoutAt.getTime();
  });

  if (!expired.length) return;

  const ids = expired.map((b) => b.id);
  await Booking.update(
    { status: 'COMPLETED' },
    { where: { id: { [Op.in]: ids }, status: 'CONFIRMED' } }
  );
};

const autoCompleteConfirmedBookingsForUser = async (userId) => {
  const candidates = await Booking.findAll({
    where: { user_id: userId, status: 'CONFIRMED' },
    attributes: ['id', 'hotel_id', 'booking_mode', 'check_out', 'check_out_at']
  });

  const now = new Date();
  const idsToComplete = [];
  for (const b of candidates) {
    const checkoutAt = resolveBookingCheckoutAt(b);
    if (checkoutAt && now.getTime() >= checkoutAt.getTime()) {
      idsToComplete.push(b.id);
    }
  }

  if (!idsToComplete.length) return;
  await Booking.update(
    { status: 'COMPLETED' },
    { where: { id: { [Op.in]: idsToComplete }, status: 'CONFIRMED' } }
  );
};

const autoCancelExpiredPendingBookingsForUser = async (userId) => {
  const expireTime = new Date(Date.now() - 10 * 60 * 1000);
  await Booking.update(
    { status: 'CANCELLED' },
    {
      where: {
        user_id: userId,
        status: 'PENDING',
        createdAt: { [Op.lt]: expireTime }
      }
    }
  );
};

const autoConfirmPendingBookingsWithSuccessfulPaymentsForUser = async (userId) => {
  const pendingBookings = await Booking.findAll({
    where: { user_id: userId, status: 'PENDING' },
    attributes: ['id', 'hotel_id', 'room_type', 'booked_room', 'createdAt', 'payment_id', 'payment_method', 'vendor_id']
  });

  if (!pendingBookings.length) return;

  const tenMinutes = 10 * 60 * 1000;
  const nowMs = Date.now();

  for (const booking of pendingBookings) {
    if (!booking?.id || !booking?.hotel_id) continue;
    if (booking.payment_id) continue;
    if (booking.payment_method && String(booking.payment_method).toUpperCase() === 'PAY_AT_HOTEL') continue;

    const createdAtMs = new Date(booking.createdAt).getTime();
    if (Number.isFinite(createdAtMs) && nowMs - createdAtMs > tenMinutes) continue;

    const payment = await Payment.findOne({ where: { booking_id: booking.id, status: 'SUCCESS' } });
    if (!payment) continue;

    await sequelize.transaction(async (t) => {
      const fresh = await Booking.findByPk(booking.id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!fresh) return;
      if (fresh.status !== 'PENDING') return;

      const createdAtMsInner = new Date(fresh.createdAt).getTime();
      if (Number.isFinite(createdAtMsInner) && nowMs - createdAtMsInner > tenMinutes) return;

      fresh.status = 'CONFIRMED';
      fresh.payment_id = payment.gateway_payment_id || fresh.payment_id;
      fresh.payment_method = fresh.payment_method || 'ONLINE';
      await fresh.save({ transaction: t });
    });

    try {
      notifyAdmins({ section: 'bookings', id: booking.id });
    } catch {
      void 0;
    }
    try {
      if (booking.vendor_id) notifyVendor(booking.vendor_id, { section: 'bookings', id: booking.id });
    } catch {
      void 0;
    }
  }
};

module.exports = {
  // ============ HOTEL BROWSING ============

  /**
   * Get hotel by ID with full details
   */
  getHotelById: asyncHandler(async (req, res) => {
    const hotel = await Hotel.findOne({
      where: { id: req.params.hotelId, status: 'APPROVED' },
      include: [
        { model: HotelImage, as: 'images' },
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

    try {
      await autoCompleteExpiredConfirmedHourlyBookingsForHotel(hotel.id);
      await autoCompleteExpiredConfirmedNightlyBookingsForHotel(hotel.id);
      await hotel.reload();
    } catch {
      void 0;
    }

    // Calculate real-time availability
    const { check_in, check_out, check_in_at, check_out_at } = req.query;

    const toDateOnly = (d) => {
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return null;
      return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    };

    const today = new Date().toISOString().split('T')[0];
    let targetCheckIn = check_in || today;
    let targetCheckOut = check_out;
    let reqStartAt = null;
    let reqEndAt = null;

    if (check_in_at && check_out_at) {
      const ciAt = parseDateTimeInput(check_in_at);
      const coAt = parseDateTimeInput(check_out_at);
      if (ciAt && coAt && !Number.isNaN(ciAt.getTime()) && !Number.isNaN(coAt.getTime()) && coAt > ciAt) {
        reqStartAt = ciAt;
        reqEndAt = coAt;
      }
    }

    if (!targetCheckOut) {
      const d = new Date(targetCheckIn);
      d.setDate(d.getDate() + 1);
      targetCheckOut = d.toISOString().split('T')[0];
    }

    if (targetCheckOut && targetCheckIn && String(targetCheckOut) <= String(targetCheckIn)) {
      const d = new Date(`${targetCheckIn}T00:00:00`);
      d.setDate(d.getDate() + 1);
      targetCheckOut = d.toISOString().split('T')[0];
    }

    if (!reqStartAt || !reqEndAt) {
      reqStartAt = new Date(`${targetCheckIn}T00:00:00`);
      reqEndAt = new Date(`${targetCheckOut}T00:00:00`);
    }

    // Availability shown to users should reflect current inventory minus temporary holds (PENDING bookings).
    // CONFIRMED bookings already decrement hotel availability at confirmation time.
    const statusWhere = { status: { [Op.in]: ['CONFIRMED', 'PENDING', 'confirmed', 'pending'] } };
    const hourlyModeWhere = { booking_mode: { [Op.in]: ['HOURLY', 'hourly'] } };
    const nightlyModeWhere = { [Op.or]: [{ booking_mode: { [Op.in]: ['NIGHTLY', 'nightly'] } }, { booking_mode: null }] };

    const hasHourlyWindow = reqStartAt && reqEndAt && check_in_at && check_out_at;
    const nonAcRoomTypeValues = ['NON_AC', 'Non AC', 'NON-AC', 'Non-AC', 'NON AC'];
    let bookedCount = 0;
    let acBookedCount = 0;
    let nonAcBookedCount = 0;

    if (hasHourlyWindow) {
      const hourlyBookedCountRaw = await Booking.sum('booked_room', {
        where: {
          hotel_id: hotel.id,
          ...statusWhere,
          ...hourlyModeWhere,
          [Op.and]: [{ check_in_at: { [Op.lt]: reqEndAt } }, { check_out_at: { [Op.gt]: reqStartAt } }]
        }
      });

      const [acHourlyBookedRaw, nonAcHourlyBookedRaw] = await Promise.all([
        Booking.sum('booked_room', {
          where: {
            hotel_id: hotel.id,
            room_type: 'AC',
            ...statusWhere,
            ...hourlyModeWhere,
            [Op.and]: [{ check_in_at: { [Op.lt]: reqEndAt } }, { check_out_at: { [Op.gt]: reqStartAt } }]
          }
        }),
        Booking.sum('booked_room', {
          where: {
            hotel_id: hotel.id,
            room_type: { [Op.in]: nonAcRoomTypeValues },
            ...statusWhere,
            ...hourlyModeWhere,
            [Op.and]: [{ check_in_at: { [Op.lt]: reqEndAt } }, { check_out_at: { [Op.gt]: reqStartAt } }]
          }
        })
      ]);

      const nightlyCounts = await computeNightlyBookedCountsForHourlyWindow({
        hotel,
        targetCheckIn,
        targetCheckOut,
        reqStartAt,
        reqEndAt,
        statusWhere
      });

      bookedCount = Number(hourlyBookedCountRaw || 0) + Number(nightlyCounts.total || 0);
      acBookedCount = Number(acHourlyBookedRaw || 0) + Number(nightlyCounts.ac || 0);
      nonAcBookedCount = Number(nonAcHourlyBookedRaw || 0) + Number(nightlyCounts.nonAc || 0);
    } else {
      const [
        nightlyBookedCountRaw,
        hourlyBookedCountRaw,
        acNightlyBookedRaw,
        acHourlyBookedRaw,
        nonAcNightlyBookedRaw,
        nonAcHourlyBookedRaw
      ] = await Promise.all([
        Booking.sum('booked_room', {
          where: {
            hotel_id: hotel.id,
            ...statusWhere,
            ...nightlyModeWhere,
            [Op.and]: [{ check_in: { [Op.lt]: targetCheckOut } }, { check_out: { [Op.gt]: targetCheckIn } }]
          }
        }),
        Booking.sum('booked_room', {
          where: {
            hotel_id: hotel.id,
            ...statusWhere,
            ...hourlyModeWhere,
            [Op.and]: [{ check_in_at: { [Op.lt]: reqEndAt } }, { check_out_at: { [Op.gt]: reqStartAt } }]
          }
        }),
        Booking.sum('booked_room', {
          where: {
            hotel_id: hotel.id,
            room_type: 'AC',
            ...statusWhere,
            ...nightlyModeWhere,
            [Op.and]: [{ check_in: { [Op.lt]: targetCheckOut } }, { check_out: { [Op.gt]: targetCheckIn } }]
          }
        }),
        Booking.sum('booked_room', {
          where: {
            hotel_id: hotel.id,
            room_type: 'AC',
            ...statusWhere,
            ...hourlyModeWhere,
            [Op.and]: [{ check_in_at: { [Op.lt]: reqEndAt } }, { check_out_at: { [Op.gt]: reqStartAt } }]
          }
        }),
        Booking.sum('booked_room', {
          where: {
            hotel_id: hotel.id,
            room_type: { [Op.in]: nonAcRoomTypeValues },
            ...statusWhere,
            ...nightlyModeWhere,
            [Op.and]: [{ check_in: { [Op.lt]: targetCheckOut } }, { check_out: { [Op.gt]: targetCheckIn } }]
          }
        }),
        Booking.sum('booked_room', {
          where: {
            hotel_id: hotel.id,
            room_type: { [Op.in]: nonAcRoomTypeValues },
            ...statusWhere,
            ...hourlyModeWhere,
            [Op.and]: [{ check_in_at: { [Op.lt]: reqEndAt } }, { check_out_at: { [Op.gt]: reqStartAt } }]
          }
        })
      ]);

      bookedCount = Number(nightlyBookedCountRaw || 0) + Number(hourlyBookedCountRaw || 0);
      acBookedCount = Number(acNightlyBookedRaw || 0) + Number(acHourlyBookedRaw || 0);
      nonAcBookedCount = Number(nonAcNightlyBookedRaw || 0) + Number(nonAcHourlyBookedRaw || 0);
    }

    // Overwrite response fields with computed available counts (without persisting).
    const acCapacity = parseInt(hotel.ac_rooms || 0);
    const nonAcCapacity = parseInt(hotel.non_ac_rooms || 0);
    const capacity = parseInt(hotel.available_rooms || 0);
    
    hotel.setDataValue('ac_rooms', Math.max(0, acCapacity - acBookedCount));
    hotel.setDataValue('non_ac_rooms', Math.max(0, nonAcCapacity - nonAcBookedCount));
    
    hotel.setDataValue('available_rooms', Math.max(0, capacity - bookedCount));

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
    const { check_in, check_out, check_in_at, check_out_at, search } = req.query;
    
    const where = { id: req.params.hotelId };
    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }

    const hotel = await Hotel.findOne({ where });
    if (!hotel) {
      throw createError('Hotel not found', 404);
    }

    try {
      const expireTime = new Date(Date.now() - 10 * 60 * 1000);
      await Booking.update(
        { status: 'CANCELLED' },
        {
          where: {
            hotel_id: hotel.id,
            status: { [Op.in]: ['PENDING', 'pending'] },
            createdAt: { [Op.lt]: expireTime }
          }
        }
      );
    } catch {
      void 0;
    }

    try {
      await autoCompleteExpiredConfirmedHourlyBookingsForHotel(hotel.id);
      await autoCompleteExpiredConfirmedNightlyBookingsForHotel(hotel.id);
    } catch {
      void 0;
    }

    const acPrice = parseFloat(hotel.ac_room_price || hotel.base_price || 0);
    const nonAcPrice = parseFloat(hotel.non_ac_room_price || hotel.base_price || 0);
    const acTotal = parseInt(hotel.ac_rooms || hotel.available_rooms || hotel.total_rooms || 0);
    const nonAcTotal = parseInt(hotel.non_ac_rooms || hotel.available_rooms || hotel.total_rooms || 0);

    let acAvailable = acTotal;
    let nonAcAvailable = nonAcTotal;

    const today = new Date().toISOString().split('T')[0];
    let targetCheckIn = check_in || today;
    let targetCheckOut = check_out || null;

    if (!targetCheckOut) {
      const d = new Date(`${targetCheckIn}T00:00:00`);
      d.setDate(d.getDate() + 1);
      targetCheckOut = d.toISOString().split('T')[0];
    }

    if (targetCheckOut && targetCheckIn && String(targetCheckOut) <= String(targetCheckIn)) {
      const d = new Date(`${targetCheckIn}T00:00:00`);
      d.setDate(d.getDate() + 1);
      targetCheckOut = d.toISOString().split('T')[0];
    }

    let reqStartAt = null;
    let reqEndAt = null;
    let hasHourlyWindow = false;
    if (check_in_at && check_out_at) {
      const ciAt = parseDateTimeInput(check_in_at);
      const coAt = parseDateTimeInput(check_out_at);
      if (ciAt && coAt && !Number.isNaN(ciAt.getTime()) && !Number.isNaN(coAt.getTime()) && coAt > ciAt) {
        reqStartAt = ciAt;
        reqEndAt = coAt;
        hasHourlyWindow = true;
      }
    }

    if (!reqStartAt || !reqEndAt) {
      reqStartAt = new Date(`${targetCheckIn}T00:00:00`);
      reqEndAt = new Date(`${targetCheckOut}T00:00:00`);
    }

    const statusWhere = {
      status: { [Op.in]: ['CONFIRMED', 'PENDING', 'confirmed', 'pending'] }
    };
    const nightlyModeWhere = { [Op.or]: [{ booking_mode: { [Op.in]: ['NIGHTLY', 'nightly'] } }, { booking_mode: null }] };
    const hourlyModeWhere = { booking_mode: { [Op.in]: ['HOURLY', 'hourly'] } };
    const nonAcRoomTypeValues = ['NON_AC', 'Non AC', 'NON-AC', 'Non-AC', 'NON AC'];

    const [acHourlyRaw, nonAcHourlyRaw] = await Promise.all([
      Booking.sum('booked_room', {
        where: {
          hotel_id: hotel.id,
          room_type: 'AC',
          ...statusWhere,
          ...hourlyModeWhere,
          [Op.and]: [{ check_in_at: { [Op.lt]: reqEndAt } }, { check_out_at: { [Op.gt]: reqStartAt } }]
        }
      }),
      Booking.sum('booked_room', {
        where: {
          hotel_id: hotel.id,
          room_type: { [Op.in]: nonAcRoomTypeValues },
          ...statusWhere,
          ...hourlyModeWhere,
          [Op.and]: [{ check_in_at: { [Op.lt]: reqEndAt } }, { check_out_at: { [Op.gt]: reqStartAt } }]
        }
      })
    ]);

    let acNightlyRaw = 0;
    let nonAcNightlyRaw = 0;

    if (hasHourlyWindow) {
      const nightlyCounts = await computeNightlyBookedCountsForHourlyWindow({
        hotel,
        targetCheckIn,
        targetCheckOut,
        reqStartAt,
        reqEndAt,
        statusWhere
      });
      acNightlyRaw = nightlyCounts.ac;
      nonAcNightlyRaw = nightlyCounts.nonAc;
    } else {
      const [acN, nonAcN] = await Promise.all([
        Booking.sum('booked_room', {
          where: {
            hotel_id: hotel.id,
            room_type: 'AC',
            ...statusWhere,
            ...nightlyModeWhere,
            [Op.and]: [{ check_in: { [Op.lt]: targetCheckOut } }, { check_out: { [Op.gt]: targetCheckIn } }]
          }
        }),
        Booking.sum('booked_room', {
          where: {
            hotel_id: hotel.id,
            room_type: { [Op.in]: nonAcRoomTypeValues },
            ...statusWhere,
            ...nightlyModeWhere,
            [Op.and]: [{ check_in: { [Op.lt]: targetCheckOut } }, { check_out: { [Op.gt]: targetCheckIn } }]
          }
        })
      ]);
      acNightlyRaw = Number(acN || 0);
      nonAcNightlyRaw = Number(nonAcN || 0);
    }

    const acBookings = Number(acNightlyRaw || 0) + Number(acHourlyRaw || 0);
    const nonAcBookings = Number(nonAcNightlyRaw || 0) + Number(nonAcHourlyRaw || 0);

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
    const { hotel_id, room_type, check_in, check_out, check_in_at, check_out_at, booking_mode, guests = 1, rooms = 1, coupon_code, child_ages = [], guest_breakdown = [] } = req.body;
    
    // Validate required fields
    const bookingMode = String(booking_mode || 'NIGHTLY').toUpperCase();
    if (!['NIGHTLY', 'HOURLY'].includes(bookingMode)) {
      throw createError('Invalid booking_mode. Must be NIGHTLY or HOURLY', 400);
    }
    if (!hotel_id || !room_type) {
      throw createError('Missing required fields: hotel_id, room_type', 400);
    }

    const toDateOnly = (d) => {
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return null;
      return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    };

    let effectiveCheckIn = check_in;
    let effectiveCheckOut = check_out;
    let ciAt = null;
    let coAt = null;
    let durationHours = null;

    if (bookingMode === 'HOURLY') {
      if (!check_in_at || !check_out_at) {
        throw createError('Missing required fields: check_in_at, check_out_at', 400);
      }
      ciAt = parseDateTimeInput(check_in_at);
      coAt = parseDateTimeInput(check_out_at);
      if (!ciAt || !coAt || Number.isNaN(ciAt.getTime()) || Number.isNaN(coAt.getTime())) {
        throw createError('Invalid datetime format for check_in_at/check_out_at', 400);
      }
      if (coAt <= ciAt) {
        throw createError('check_out_at must be after check_in_at', 400);
      }

      const getIstParts = (d) => {
        const istMs = d.getTime() + (5.5 * 60 * 60 * 1000);
        const x = new Date(istMs);
        return {
          hour: x.getUTCHours(),
          minute: x.getUTCMinutes(),
          dateOnly: x.toISOString().slice(0, 10)
        };
      };

      const addDaysToDateOnly = (dateOnly, days) => {
        const s = String(dateOnly || '').slice(0, 10);
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return null;
        const y = Number(m[1]);
        const mo = Number(m[2]);
        const da = Number(m[3]);
        const utc = Date.UTC(y, mo - 1, da + Number(days || 0), 0, 0, 0);
        return new Date(utc).toISOString().slice(0, 10);
      };

      const ist = getIstParts(ciAt);
      if (ist.hour < HOURLY_DAY_START_HOUR) {
        throw createError(`Hourly booking starts from ${String(HOURLY_DAY_START_HOUR).padStart(2, '0')}:00 AM`, 400);
      }

      const isOvernight = ist.hour > HOURLY_DAY_END_HOUR || (ist.hour === HOURLY_DAY_END_HOUR && ist.minute > 0);
      if (isOvernight) {
        const nextDate = addDaysToDateOnly(ist.dateOnly, 1);
        if (!nextDate) throw createError('Invalid check-in datetime', 400);
        const fixed = buildISTDateTimeFromDateOnly(nextDate, DEFAULT_HOTEL_CHECK_OUT_TIME);
        if (!fixed) throw createError('Invalid fixed checkout datetime', 400);
        coAt = fixed;
      } else {
        const diff = Math.ceil((coAt - ciAt) / (1000 * 60 * 60));
        if (diff < MIN_HOURLY_HOURS) {
          throw createError(`Minimum booking duration is ${MIN_HOURLY_HOURS} hours`, 400);
        }
        const lastAllowed = buildISTDateTimeFromDateOnly(ist.dateOnly, HOURLY_LATEST_SAME_DAY_CHECKOUT_TIME);
        if (!lastAllowed) throw createError('Invalid checkout time rule', 500);
        if (coAt > lastAllowed) {
          throw createError(`Hourly booking is allowed only until ${HOURLY_LATEST_SAME_DAY_CHECKOUT_TIME}`, 400);
        }
      }

      durationHours = Math.max(1, Math.ceil((coAt - ciAt) / (1000 * 60 * 60)));
      effectiveCheckIn = toDateOnly(ciAt);
      effectiveCheckOut = toDateOnly(coAt);
      if (!effectiveCheckIn || !effectiveCheckOut) {
        throw createError('Invalid datetime values', 400);
      }
      if (String(effectiveCheckOut) <= String(effectiveCheckIn)) {
        const d = new Date(`${effectiveCheckIn}T00:00:00`);
        d.setDate(d.getDate() + 1);
        effectiveCheckOut = d.toISOString().split('T')[0];
      }
    } else {
      const validation = validateRequiredFields(req.body, ['check_in', 'check_out']);
      if (!validation.isValid) {
        throw createError(`Missing required fields: ${validation.missingFields.join(', ')}`, 400);
      }
      const dateValidation = validateDateRange(check_in, check_out);
      if (!dateValidation.isValid) {
        throw createError(dateValidation.message, 400);
      }
    }

    // Validate room type
    const normalizedRoomType = room_type.toUpperCase();
    if (!['AC', 'NON_AC'].includes(normalizedRoomType)) {
      throw createError('Invalid room type. Must be AC or NON_AC', 400);
    }

    const activePendingSince = new Date(Date.now() - 10 * 60 * 1000);
    const activeStatusWhere = {
      [Op.or]: [
        { status: 'CONFIRMED' },
        { status: 'PENDING', createdAt: { [Op.gte]: activePendingSince } }
      ]
    };

    let createdBooking = null;
    let computed = null;
    const normalizedBreakdown = normalizeGuestBreakdown(guest_breakdown);
    const breakdownChildAges = normalizedBreakdown.flatMap((room) => room.child_ages);
    const normalizedChildAges = normalizeChildAges(Array.isArray(child_ages) && child_ages.length ? child_ages : breakdownChildAges);
    const breakdownAdultsCount = normalizedBreakdown.reduce((sum, room) => sum + Number(room.adults || 0), 0);
    const breakdownChildrenCount = normalizedBreakdown.reduce((sum, room) => sum + Number(room.children || 0), 0);
    const childrenCount = Math.max(normalizedChildAges.length, breakdownChildrenCount);
    const requestedGuests = Math.max(1, Math.round(Number(guests) || 0));
    const adultsCount = Math.max(1, breakdownAdultsCount || (requestedGuests - childrenCount));
    const totalGuests = Math.max(1, adultsCount + childrenCount);
    const chargeableChildCount = normalizedChildAges.filter((age) => age > CHILD_AGE_CHARGE_THRESHOLD).length;

    await sequelize.transaction(async (t) => {
      const hotel = await Hotel.findOne({ where: { id: hotel_id, status: 'APPROVED' }, transaction: t, lock: t.LOCK.UPDATE });
      if (!hotel) throw createError('Hotel not found or not approved', 404);

      await Booking.update(
        { status: 'CANCELLED' },
        { where: { user_id: req.user.id, hotel_id, status: 'PENDING' }, transaction: t }
      );

      let pricePerNight = 0;
      let typeCapacity = 0;

      if (normalizedRoomType === 'AC') {
        pricePerNight = parseFloat(hotel.ac_room_price || 0);
        typeCapacity = Number(hotel.ac_rooms || 0);
      } else {
        pricePerNight = parseFloat(hotel.non_ac_room_price || 0);
        typeCapacity = Number(hotel.non_ac_rooms || 0);
      }
      if (!pricePerNight) {
        pricePerNight = parseFloat(hotel.base_price || 0);
      }
      const totalCapacity = Number(hotel.available_rooms || 0);

      if (!pricePerNight || typeCapacity <= 0 || totalCapacity <= 0) {
        throw createError(`Selected room type (${normalizedRoomType}) is not available at this hotel`, 400);
      }
      if (Number(rooms) > typeCapacity || Number(rooms) > totalCapacity) {
        throw createError('Not enough rooms available for the selected dates', 400);
      }

      const nightlyModeWhere = { [Op.or]: [{ booking_mode: 'NIGHTLY' }, { booking_mode: null }] };
      const hourlyModeWhere = { booking_mode: 'HOURLY' };
      const roomTypeWhere = normalizedRoomType === 'NON_AC'
        ? { [Op.in]: ['NON_AC', 'Non AC', 'NON-AC', 'Non-AC', 'NON AC'] }
        : normalizedRoomType;

      const nightlyOverlapWhere = {
        hotel_id,
        room_type: roomTypeWhere,
        ...activeStatusWhere,
        ...nightlyModeWhere,
        [Op.and]: [
          { check_in: { [Op.lt]: effectiveCheckOut } },
          { check_out: { [Op.gt]: effectiveCheckIn } }
        ]
      };

      const hourlyOverlapWhere = (() => {
        const reqStartAt = bookingMode === 'HOURLY' ? ciAt : new Date(`${effectiveCheckIn}T00:00:00`);
        const reqEndAt = bookingMode === 'HOURLY' ? coAt : new Date(`${effectiveCheckOut}T00:00:00`);
        return {
          hotel_id,
          room_type: roomTypeWhere,
          ...activeStatusWhere,
          ...hourlyModeWhere,
          [Op.and]: [
            { check_in_at: { [Op.lt]: reqEndAt } },
            { check_out_at: { [Op.gt]: reqStartAt } }
          ]
        };
      })();

      const [nightlyBookedRoomsRaw, hourlyBookedRoomsRaw] = await Promise.all([
        Booking.sum('booked_room', { where: nightlyOverlapWhere, transaction: t }),
        Booking.sum('booked_room', { where: hourlyOverlapWhere, transaction: t })
      ]);

      const overlappingBookedRooms = Number(nightlyBookedRoomsRaw || 0) + Number(hourlyBookedRoomsRaw || 0);
      if (overlappingBookedRooms + Number(rooms) > typeCapacity) {
        throw createError('Not enough rooms available for the selected dates', 400);
      }

      let baseAmount = 0;
      let nights = null;
      let pricePerHour = null;
      let roomBaseAmount = 0;
      let childSurchargeAmount = 0;

      if (bookingMode === 'HOURLY') {
        const explicitPricePerHour =
          normalizedRoomType === 'AC'
            ? parseFloat(hotel.ac_price_per_hour || 0)
            : parseFloat(hotel.non_ac_price_per_hour || 0);
        const derived = parseFloat((pricePerNight / 24).toFixed(2));
        pricePerHour = explicitPricePerHour > 0 ? explicitPricePerHour : derived;
        roomBaseAmount = pricePerHour * Number(durationHours) * Number(rooms);
        childSurchargeAmount = CHILD_SURCHARGE_AMOUNT * chargeableChildCount;
        baseAmount = roomBaseAmount + childSurchargeAmount;
      } else {
        const calculated = calculateBookingAmount(pricePerNight, effectiveCheckIn, effectiveCheckOut);
        nights = calculated.nights;
        roomBaseAmount = calculated.amount * Number(rooms);
        childSurchargeAmount = CHILD_SURCHARGE_AMOUNT * chargeableChildCount;
        baseAmount = roomBaseAmount + childSurchargeAmount;
      }

      roomBaseAmount = round2(roomBaseAmount);
      childSurchargeAmount = round2(childSurchargeAmount);
      baseAmount = round2(baseAmount);

      let finalAmount = baseAmount;
      let discountAmount = 0;
      let appliedCouponCode = null;

      if (coupon_code) {
        const now = new Date();
        const coupon = await Coupon.findOne({
          where: {
            code: String(coupon_code).toUpperCase(),
            active: true,
            expiry: { [Op.or]: [{ [Op.gt]: now }, null] }
          },
          transaction: t
        });

        if (!coupon) {
          throw createError('Invalid or expired coupon', 400);
        }

        const allowedForUser = await canUserUseCoupon({
          coupon,
          userId: req.user.id,
          transaction: t
        });
        if (!allowedForUser) {
          throw createError('You have already used this coupon the maximum allowed number of times', 400);
        }

        if (coupon.type === 'PERCENT') {
          discountAmount = (baseAmount * coupon.value) / 100;
        } else {
          discountAmount = coupon.value;
        }
        discountAmount = Math.min(discountAmount, baseAmount);
        finalAmount = Math.max(0, baseAmount - discountAmount);
        appliedCouponCode = coupon.code;
      }

      createdBooking = await Booking.create(
        {
          user_id: req.user.id,
          vendor_id: hotel.vendor_id,
          hotel_id,
          room_type: normalizedRoomType,
          booking_mode: bookingMode,
          check_in: effectiveCheckIn,
          check_out: effectiveCheckOut,
          check_in_at: ciAt,
          check_out_at: coAt,
          duration_hours: durationHours,
          guests: totalGuests,
          adults_count: adultsCount,
          children_count: childrenCount,
          child_ages: normalizedChildAges,
          chargeable_child_count: chargeableChildCount,
          child_surcharge_amount: childSurchargeAmount,
          booked_room: rooms,
          amount: finalAmount,
          price_per_night: pricePerNight,
          price_per_hour: pricePerHour,
          base_amount: baseAmount,
          discount_amount: discountAmount,
          nights,
          coupon_applied: appliedCouponCode,
          coupon_code: appliedCouponCode,
          status: 'PENDING',
          payment_method: null
        },
        { transaction: t }
      );

      computed = {
        amount: finalAmount,
        price_per_night: pricePerNight,
        price_per_hour: pricePerHour,
        base_amount: baseAmount,
        room_base_amount: roomBaseAmount,
        child_surcharge_amount: childSurchargeAmount,
        adults_count: adultsCount,
        children_count: childrenCount,
        child_ages: normalizedChildAges,
        chargeable_child_count: chargeableChildCount,
        child_age_threshold: CHILD_AGE_CHARGE_THRESHOLD,
        child_surcharge_amount_per_child: CHILD_SURCHARGE_AMOUNT,
        discount_amount: discountAmount,
        nights,
        duration_hours: durationHours,
        booking_mode: bookingMode,
        coupon_applied: appliedCouponCode
      };
    });

    sendSuccess(res, { booking: createdBooking, ...computed }, 'Booking created successfully', 201);
  }),

  /**
   * Get user's bookings with pagination
   */
  getMyBookings: asyncHandler(async (req, res) => {
    const { page: queryPage, limit: queryLimit, status } = req.query;
    
    // Validate pagination
    const { page, limit } = validatePagination(queryPage, queryLimit);

    await autoCancelExpiredPendingBookingsForUser(req.user.id);
    await autoConfirmPendingBookingsWithSuccessfulPaymentsForUser(req.user.id);
    await autoCompleteConfirmedBookingsForUser(req.user.id);

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

    if (booking.status === 'PENDING') {
      const createdAt = new Date(booking.createdAt).getTime();
      if (Number.isFinite(createdAt) && Date.now() - createdAt > 10 * 60 * 1000) {
        booking.status = 'CANCELLED';
        await booking.save();
      }
    }

    if (booking.status === 'CONFIRMED') {
      const checkoutAt = resolveBookingCheckoutAt(booking);
      if (checkoutAt && Date.now() >= checkoutAt.getTime()) {
        const mode = String(booking?.booking_mode || 'NIGHTLY').toUpperCase();
        if (mode === 'HOURLY' && booking.hotel_id) {
          await autoCompleteExpiredConfirmedHourlyBookingsForHotel(booking.hotel_id);
          await booking.reload({ include: getBookingIncludes() });
        } else if (booking.hotel_id) {
          await autoCompleteExpiredConfirmedNightlyBookingsForHotel(booking.hotel_id);
          await booking.reload({ include: getBookingIncludes() });
        } else {
          booking.status = 'COMPLETED';
          await booking.save();
        }
      }
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
    
    // Detailed validation
    const keyIdRegex = /^rzp_(test|live)_[a-zA-Z0-9]{14}$/;
    const secretRegex = /^[a-zA-Z0-9]{24}$/;
    
    let keyValidation = {
      idLength: key_id ? key_id.length : 0,
      secretLength: key_secret ? key_secret.length : 0,
      idPrefix: key_id ? key_id.substring(0, 9) : 'none',
      isTestMode: key_id ? key_id.startsWith('rzp_test_') : false,
      isLiveMode: key_id ? key_id.startsWith('rzp_live_') : false,
      isValidIdFormat: key_id ? keyIdRegex.test(key_id) : false,
      isValidSecretFormat: key_secret ? secretRegex.test(key_secret) : false
    };
    
    if (!key_id) status = 'Missing Key ID';
    else if (!key_secret) status = 'Missing Key Secret';
    else if (!keyValidation.isValidIdFormat) status = 'Invalid Key ID Format';
    else if (!keyValidation.isValidSecretFormat) status = 'Invalid Secret Format';
    
    // Check connectivity by attempting to create a test order
    try {
      if (razorpay) {
        // Try creating a dummy order (1 INR)
        await razorpay.orders.create({
          amount: 100, // 1 INR
          currency: 'INR',
          receipt: 'debug_test_1',
          notes: { purpose: 'connectivity_check' }
        });
        connectivity = 'Connected & Authorized (Order Created)';
      }
    } catch (e) {
      connectivity = 'Connection Failed';
      // Extract detailed error
      error = e.error ? `${e.error.code}: ${e.error.description}` : (e.message || JSON.stringify(e));
      
      // If order creation fails, try fetch as fallback to see if it's just an order issue
      try {
        await razorpay.payments.fetch('pay_dummy_123');
        connectivity += ' (But Read Access OK)';
      } catch (readErr) {
        // Ignore read error
      }
    }
    
    // Debug helper to get char codes
    const getCharCodes = (str) => {
      if (!str) return [];
      return str.split('').map(c => c.charCodeAt(0));
    };

    const keyIdCodes = key_id ? getCharCodes(key_id) : [];
    const secretCodes = key_secret ? getCharCodes(key_secret) : [];

    sendSuccess(res, { 
      key_id_preview: key_id ? `${key_id.substring(0, 4)}...${key_id.substring(key_id.length - 4)}` : 'MISSING',
      key_id_full_codes: keyIdCodes, // EXTREME DEBUGGING
      
      key_secret_preview: key_secret ? `${key_secret.substring(0, 4)}...${key_secret.substring(key_secret.length - 4)}` : 'MISSING',
      key_secret_full_codes: secretCodes, // EXTREME DEBUGGING
      
      server_time: new Date().toISOString(),
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

    const { payment_method } = req.body || {};

    const requestedMethod = String(payment_method || '').trim().toUpperCase();
    if (requestedMethod === 'PAY_AT_HOTEL') {
      throw createError('Pay at Hotel is not available. Please use online payment.', 400);
    }

    // Verify Razorpay credentials
    const razorpay = getRazorpay();
    const { key_id } = getRazorpayCredentials();

    if (!razorpay || !key_id) {
      console.error('Razorpay credentials missing or invalid.');
      throw createError('Online payment service is temporarily unavailable. Please try again later.', 503);
    }
    
    // Validate secret length for sanity check
    const { key_secret } = getRazorpayCredentials();
    if (!key_secret || key_secret.length < 10) {
      console.error('Razorpay secret is suspiciously short or missing');
      throw createError('Payment configuration error. Please contact support.', 500);
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
      const keyPrefix = key_id ? key_id.substring(0, 9) : 'unknown';
      const secretLen = key_secret ? key_secret.length : 0;
      throw createError(`Payment initiation failed: ${errorDetails} (Amount: ₹${amountInRupees}, Key: ${keyPrefix}..., SecretLen: ${secretLen})`, 502);
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
            const razorpay = getRazorpay();
            if (razorpay) {
              await razorpay.payments.refund(gateway_payment_id);
            }
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
          payment.status = 'FAILED';
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
      if (booking.status === 'CANCELLED') {
        throw createError('Booking is cancelled/expired. Please create a new booking.', 400);
      }

      if (booking.status !== 'CONFIRMED') {
        if (booking.coupon_code) {
          await recordCouponUsageForBooking({ booking });
        }

        booking.status = 'CONFIRMED';
        booking.payment_id = payment.gateway_payment_id || booking.payment_id;
        if (payment_method) booking.payment_method = payment_method;
        if (String(payment_method || booking.payment_method || '').toUpperCase() !== 'PAY_AT_HOTEL') {
          if (!booking.payment_received_at) {
            const now = new Date();
            booking.payment_received_at = now;
            booking.payment_received_method = booking.payment_received_method || 'ONLINE';
            const paymentReceivedAmount = Number(booking.amount || 0);
            booking.payment_received_amount = paymentReceivedAmount;

            const percent = Number.isFinite(Number(booking.commission_percent))
              ? Math.min(100, Math.max(0, Number(booking.commission_percent)))
              : getCommissionPercent();
            booking.commission_percent = percent;
            const commissionAmount = round2((paymentReceivedAmount * percent) / 100);
            booking.commission_amount = commissionAmount;
            booking.vendor_payable_amount = round2(paymentReceivedAmount - commissionAmount);
            booking.settlement_week_start = booking.settlement_week_start || weekStartMondayIST(now);
            booking.settlement_status = booking.settlement_status || 'UNSETTLED';
          }
        }
        await booking.save();

        try {
          notifyAdmins({ section: 'bookings', id: booking.id });
        } catch {
          void 0;
        }
        try {
          if (booking.vendor_id) notifyVendor(booking.vendor_id, { section: 'bookings', id: booking.id });
        } catch {
          void 0;
        }
      } else if (payment_method && !booking.payment_method) {
        booking.payment_method = payment_method;
        if (String(payment_method || '').toUpperCase() !== 'PAY_AT_HOTEL') {
          if (!booking.payment_received_at) {
            const now = new Date();
            booking.payment_received_at = now;
            booking.payment_received_method = booking.payment_received_method || 'ONLINE';
            const paymentReceivedAmount = Number(booking.amount || 0);
            booking.payment_received_amount = paymentReceivedAmount;

            const percent = Number.isFinite(Number(booking.commission_percent))
              ? Math.min(100, Math.max(0, Number(booking.commission_percent)))
              : getCommissionPercent();
            booking.commission_percent = percent;
            const commissionAmount = round2((paymentReceivedAmount * percent) / 100);
            booking.commission_amount = commissionAmount;
            booking.vendor_payable_amount = round2(paymentReceivedAmount - commissionAmount);
            booking.settlement_week_start = booking.settlement_week_start || weekStartMondayIST(now);
            booking.settlement_status = booking.settlement_status || 'UNSETTLED';
          }
        }
        await booking.save();
      }

      // Send confirmation email
      console.log('Attempting to send confirmation email for booking:', booking.id);
      if (booking.user && booking.user.email) {
        console.log('User email found:', booking.user.email);
        try {
          const emailResult = await sendBookingConfirmationEmail(booking.user.email, {
            userName: booking.user.full_name || 'Valued Guest',
            hotelName: booking.hotel ? booking.hotel.name : 'Hotel',
            hotelAddress: booking.hotel ? booking.hotel.address : '',
            bookingMode: booking.booking_mode,
            checkIn: booking.check_in,
            checkOut: booking.check_out,
            checkInAt: booking.check_in_at,
            checkOutAt: booking.check_out_at,
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

    if (booking.status === 'COMPLETED') {
      throw createError('Completed bookings cannot be cancelled', 400);
    }

    const now = new Date();
    const wasConfirmed = booking.status === 'CONFIRMED';
    const mode = String(booking.booking_mode || 'NIGHTLY').toUpperCase();

    // Hard-block cancellation after check-in starts (OYO-like)
    try {
      let checkInAt = null;
      if (mode === 'HOURLY' && booking.check_in_at) {
        const d = new Date(booking.check_in_at);
        if (!Number.isNaN(d.getTime())) checkInAt = d;
      } else {
        const hotel = await Hotel.findByPk(booking.hotel_id);
        const checkInTime = hotel?.check_in_time || '12:00 PM';
        checkInAt = buildISTDateTimeFromDateOnly(booking.check_in, checkInTime);
      }

      if (checkInAt && !Number.isNaN(checkInAt.getTime()) && now.getTime() >= checkInAt.getTime()) {
        throw createError('Cancellation is not allowed after check-in time has started. Please contact support.', 400);
      }
    } catch (e) {
      if (e && e.statusCode) throw e;
    }

    let refundPercent = 0;
    let refundAmount = 0;
    let refundAttempted = false;
    let refundSucceeded = false;
    let refundError = null;

    if (wasConfirmed) {
      if (String(booking.payment_method || '').toUpperCase() !== 'PAY_AT_HOTEL') {
        const payment = await Payment.findOne({ where: { booking_id: booking.id } });
        if (payment && payment.status === 'SUCCESS' && String(payment.gateway || '').toUpperCase() === 'RAZORPAY') {
          let checkInAt = null;
          if (mode === 'HOURLY' && booking.check_in_at) {
            checkInAt = new Date(booking.check_in_at);
          } else {
            const hotel = await Hotel.findByPk(booking.hotel_id);
            const checkInTime = hotel?.check_in_time || '12:00 PM';
            checkInAt = buildISTDateTimeFromDateOnly(booking.check_in, checkInTime);
          }

          if (checkInAt && !Number.isNaN(checkInAt.getTime())) {
            refundPercent = computeRefundPercent({ bookingMode: mode, msUntilCheckIn: checkInAt.getTime() - now.getTime() });
          } else {
            refundPercent = 0;
          }

          refundAmount = Math.max(0, (Number(payment.amount) || 0) * (refundPercent / 100));
          refundAmount = Math.round(refundAmount * 100) / 100;

          if (refundPercent > 0 && payment.gateway_payment_id) {
            const razorpay = getRazorpay();
            if (razorpay) {
              refundAttempted = true;
              try {
                const amountPaise = Math.max(1, Math.round(refundAmount * 100));
                await razorpay.payments.refund(payment.gateway_payment_id, { amount: amountPaise });
                refundSucceeded = true;
              } catch (e) {
                refundError = e?.error?.description || e?.message || 'Refund failed';
              }
            }
          }
        }
      }
    }

    booking.status = 'CANCELLED';
    booking.refund_percent = wasConfirmed ? (refundPercent || 0) : null;
    booking.refund_amount = wasConfirmed ? (refundAmount || 0) : 0;

    if (!wasConfirmed) {
      booking.refund_status = null;
    } else if (String(booking.payment_method || '').toUpperCase() === 'PAY_AT_HOTEL') {
      booking.refund_status = 'NOT_APPLICABLE_PAY_AT_HOTEL';
    } else if (!refundPercent) {
      booking.refund_status = 'NO_REFUND';
    } else if (refundSucceeded) {
      booking.refund_status = refundPercent === 100 ? 'REFUNDED_FULL' : 'REFUNDED_PARTIAL';
    } else if (refundAttempted) {
      booking.refund_status = 'REFUND_FAILED';
    } else {
      booking.refund_status = 'REFUND_PENDING_MANUAL';
    }
    await booking.save();

    sendSuccess(res, { booking, refund: { refundPercent, refundAmount, refundAttempted, refundSucceeded, refundError } }, 'Booking cancelled successfully');
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
