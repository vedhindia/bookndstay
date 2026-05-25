/**
 * Vendor Controller
 * Handles vendor operations - hotel management, room management, booking management
 */

const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { sequelize, Hotel, HotelImage, Room, Booking, User, Vendor, Review } = require('../models');
const { Payment } = require('../models');
const Razorpay = require('razorpay');
const { sendSuccess, sendError, sendPaginatedResponse } = require('../utils/responseHelper');
const { validateRequiredFields, validatePagination, isValidEmail } = require('../utils/validationHelper');
const { getBookingIncludes, getPaginationOffset } = require('../utils/dbHelper');
const { asyncHandler } = require('../middlewares/errorHandler');
const { fn, col, literal } = require('sequelize');
const { addVendorClient, removeVendorClient, writeEvent, notifyAdmins } = require('../utils/notificationHub');

/* ===================== HELPERS ===================== */

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getRazorpay = () => {
  const key_id = process.env.RZP_KEY_ID || process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RZP_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;
  try {
    return new Razorpay({ key_id, key_secret });
  } catch {
    return null;
  }
};

const buildDateRangeFilter = (startDate, endDate) => {
  const filter = {};
  if (startDate) filter.createdAt = { [Op.gte]: new Date(startDate) };
  if (endDate) filter.createdAt = { ...filter.createdAt, [Op.lte]: new Date(endDate) };
  return filter;
};

const parseDateTimeInputAsIST = (value) => {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (/[zZ]$/.test(s) || /[+\-]\d{2}:\d{2}$/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
  if (!m) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const hh = Number(m[4]);
  const mm = Number(m[5]);
  const utcMs = Date.UTC(y, mo, day, hh, mm) - (5.5 * 60 * 60 * 1000);
  return new Date(utcMs);
};

const normalizeArray = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    return val.split(',').map(v => v.trim()).filter(Boolean);
  }
  return null;
};

const parseStrictInt = (val) => {
  if (val === null || val === undefined || val === '') return Number.NaN;
  const n = Number(val);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return Number.NaN;
  return n;
};

const parseStrictNumber = (val) => {
  if (val === null || val === undefined || val === '') return Number.NaN;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  if (!Number.isFinite(n)) return Number.NaN;
  return n;
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

const assertRoomsValid = ({ totalRooms, availableRooms, acRooms, nonAcRooms }) => {
  if (!Number.isInteger(totalRooms) || totalRooms <= 0) throw createError('total_rooms must be a positive integer');
  if (!Number.isInteger(availableRooms) || availableRooms < 0) throw createError('available_rooms must be an integer 0 or more');
  if (availableRooms > totalRooms) throw createError('available_rooms must be less than or equal to total_rooms');
  if (!Number.isInteger(acRooms) || acRooms < 0) throw createError('ac_rooms must be an integer 0 or more');
  if (!Number.isInteger(nonAcRooms) || nonAcRooms < 0) throw createError('non_ac_rooms must be an integer 0 or more');
  if (acRooms > availableRooms) throw createError('ac_rooms must be less than or equal to available_rooms');
  if (nonAcRooms > availableRooms) throw createError('non_ac_rooms must be less than or equal to available_rooms');
  if (acRooms + nonAcRooms !== availableRooms) throw createError('ac_rooms + non_ac_rooms must be equal to available_rooms');
};

const assertPricesValid = ({ basePrice, acRoomPrice, nonAcRoomPrice }) => {
  if (!Number.isFinite(basePrice) || basePrice <= 0) throw createError('base_price must be greater than 0');
  if (!Number.isFinite(nonAcRoomPrice) || nonAcRoomPrice <= 0) throw createError('non_ac_room_price must be greater than 0');
  if (!Number.isFinite(acRoomPrice) || acRoomPrice <= 0) throw createError('ac_room_price must be greater than 0');
  if (nonAcRoomPrice < basePrice) throw createError('non_ac_room_price must be greater than or equal to base_price');
  if (acRoomPrice <= basePrice) throw createError('ac_room_price must be greater than base_price');
  if (acRoomPrice <= nonAcRoomPrice) throw createError('ac_room_price must be greater than non_ac_room_price');
};

/* ===================== CONTROLLER ===================== */

module.exports = {
  notificationsStream: asyncHandler(async (req, res) => {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    writeEvent(res, 'ready', { ok: true, ts: new Date().toISOString() });
    addVendorClient(req.user.id, res);

    const heartbeat = setInterval(() => {
      writeEvent(res, 'ping', { ts: new Date().toISOString() });
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      removeVendorClient(req.user.id, res);
      try {
        res.end();
      } catch {
        void 0;
      }
    });
  }),

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

    const totalRooms = parseStrictInt(body.total_rooms);
    const availableRooms = Object.prototype.hasOwnProperty.call(body, 'available_rooms')
      ? parseStrictInt(body.available_rooms)
      : totalRooms;
    const acRooms = parseStrictInt(body.ac_rooms);
    const nonAcRooms = parseStrictInt(body.non_ac_rooms);
    assertRoomsValid({ totalRooms, availableRooms, acRooms, nonAcRooms });

    const basePrice = parseStrictNumber(body.base_price);
    const acRoomPrice = parseStrictNumber(body.ac_room_price);
    const nonAcRoomPrice = parseStrictNumber(body.non_ac_room_price);
    assertPricesValid({ basePrice, acRoomPrice, nonAcRoomPrice });

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
      available_rooms: availableRooms,
      base_price: basePrice,
      featured: String(body.featured).toLowerCase() === 'true',
      ac_room_price: acRoomPrice,
      non_ac_room_price: nonAcRoomPrice,
      ac_rooms: acRooms,
      non_ac_rooms: nonAcRooms,
      check_in_time: body.check_in_time || null,
      check_out_time: body.check_out_time || null,
      cancellation_policy: body.cancellation_policy || null,
      gst_number: body.gst_number || null,
      status: 'PENDING'
    });

    try {
      notifyAdmins({ section: 'hotels', id: hotel.id });
    } catch {
      void 0;
    }

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

    const { check_in, check_out } = req.query;
    const activePendingSince = new Date(Date.now() - 10 * 60 * 1000);
    const statusWhere = {
      [Op.or]: [
        { status: 'CONFIRMED' },
        { status: 'PENDING', createdAt: { [Op.gte]: activePendingSince } }
      ]
    };

    let rangeStartDate = null;
    let rangeEndDate = null;
    let rangeStartAt = null;
    let rangeEndAt = null;

    if (check_in) {
      rangeStartDate = String(check_in).slice(0, 10);
      const fallbackEnd = check_out ? String(check_out).slice(0, 10) : null;
      rangeEndDate = fallbackEnd;
      if (!rangeEndDate) {
        const d = new Date(`${rangeStartDate}T00:00:00`);
        d.setDate(d.getDate() + 1);
        rangeEndDate = d.toISOString().slice(0, 10);
      }
      rangeStartAt = new Date(`${rangeStartDate}T00:00:00`);
      rangeEndAt = new Date(`${rangeEndDate}T00:00:00`);
    }

    const rows = await Promise.all(hotels.rows.map(async (h) => {
      h.images = (h.images || []).filter(img => img.url?.startsWith('/uploads/'));
      if (rangeStartDate && rangeEndDate) {
        const nightlyModeWhere = { [Op.or]: [{ booking_mode: 'NIGHTLY' }, { booking_mode: null }] };
        const hourlyModeWhere = { booking_mode: 'HOURLY' };
        const nonAcRoomTypeValues = ['NON_AC', 'Non AC', 'NON-AC', 'Non-AC', 'NON AC'];

        const nightlyOverlapWhere = {
          hotel_id: h.id,
          ...statusWhere,
          ...nightlyModeWhere,
          [Op.and]: [
            { check_in: { [Op.lt]: rangeEndDate } },
            { check_out: { [Op.gt]: rangeStartDate } }
          ]
        };

        const hourlyOverlapWhere = {
          hotel_id: h.id,
          ...statusWhere,
          ...hourlyModeWhere,
          [Op.and]: [
            { check_in_at: { [Op.lt]: rangeEndAt } },
            { check_out_at: { [Op.gt]: rangeStartAt } }
          ]
        };

        const [nightlyBookedRaw, hourlyBookedRaw] = await Promise.all([
          Booking.sum('booked_room', { where: nightlyOverlapWhere }),
          Booking.sum('booked_room', { where: hourlyOverlapWhere })
        ]);
        const [
          acNightlyBookedRaw,
          acHourlyBookedRaw,
          nonAcNightlyBookedRaw,
          nonAcHourlyBookedRaw
        ] = await Promise.all([
          Booking.sum('booked_room', { where: { ...nightlyOverlapWhere, room_type: 'AC' } }),
          Booking.sum('booked_room', { where: { ...hourlyOverlapWhere, room_type: 'AC' } }),
          Booking.sum('booked_room', { where: { ...nightlyOverlapWhere, room_type: { [Op.in]: nonAcRoomTypeValues } } }),
          Booking.sum('booked_room', { where: { ...hourlyOverlapWhere, room_type: { [Op.in]: nonAcRoomTypeValues } } })
        ]);

        const bookedTotal = Number(nightlyBookedRaw || 0) + Number(hourlyBookedRaw || 0);
        const bookedAc = Number(acNightlyBookedRaw || 0) + Number(acHourlyBookedRaw || 0);
        const bookedNonAc = Number(nonAcNightlyBookedRaw || 0) + Number(nonAcHourlyBookedRaw || 0);

        const capacityTotal = parseInt(h.available_rooms || 0);
        const capacityAc = parseInt(h.ac_rooms || 0);
        const capacityNonAc = parseInt(h.non_ac_rooms || 0);

        const availableTotal = Math.max(0, capacityTotal - bookedTotal);
        const availableAc = Math.max(0, capacityAc - bookedAc);
        const availableNonAc = Math.max(0, capacityNonAc - bookedNonAc);

        h.setDataValue('availability', {
          mode: 'NIGHTLY',
          from: rangeStartDate,
          to: rangeEndDate,
          capacity_total: capacityTotal,
          capacity_ac: capacityAc,
          capacity_non_ac: capacityNonAc,
          booked_total: bookedTotal,
          booked_ac: bookedAc,
          booked_non_ac: bookedNonAc,
          available_total: availableTotal,
          available_ac: availableAc,
          available_non_ac: availableNonAc
        });
        h.setDataValue('available_rooms', availableTotal);
        h.setDataValue('ac_rooms', availableAc);
        h.setDataValue('non_ac_rooms', availableNonAc);
      }
      return h;
    }));

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

    const { check_in, check_out, check_in_at, check_out_at } = req.query;
    if (check_in || check_in_at) {
      const activePendingSince = new Date(Date.now() - 10 * 60 * 1000);
      const statusWhere = {
        [Op.or]: [
          { status: 'CONFIRMED' },
          { status: 'PENDING', createdAt: { [Op.gte]: activePendingSince } }
        ]
      };

      const isHourly = Boolean(check_in_at || check_out_at);
      let rangeStartAt;
      let rangeEndAt;
      let rangeStartDate;
      let rangeEndDate;

      if (isHourly) {
        rangeStartAt = parseDateTimeInputAsIST(check_in_at) || parseDateTimeInputAsIST(check_in);
        rangeEndAt = parseDateTimeInputAsIST(check_out_at) || parseDateTimeInputAsIST(check_out);
        if (!rangeStartAt || !rangeEndAt) throw createError('check_in_at and check_out_at are required for HOURLY availability', 400);
      } else {
        rangeStartDate = String(check_in).slice(0, 10);
        const fallbackEnd = check_out ? String(check_out).slice(0, 10) : null;
        if (!rangeStartDate) throw createError('check_in is required', 400);
        rangeEndDate = fallbackEnd;
        if (!rangeEndDate) {
          const d = new Date(`${rangeStartDate}T00:00:00`);
          d.setDate(d.getDate() + 1);
          rangeEndDate = d.toISOString().slice(0, 10);
        }
        rangeStartAt = new Date(`${rangeStartDate}T00:00:00`);
        rangeEndAt = new Date(`${rangeEndDate}T00:00:00`);
      }

      const nightlyModeWhere = { [Op.or]: [{ booking_mode: 'NIGHTLY' }, { booking_mode: null }] };
      const hourlyModeWhere = { booking_mode: 'HOURLY' };
      const nonAcRoomTypeValues = ['NON_AC', 'Non AC', 'NON-AC', 'Non-AC', 'NON AC'];

      const nightlyOverlapWhere = {
        hotel_id: hotel.id,
        ...statusWhere,
        ...nightlyModeWhere,
        [Op.and]: [
          { check_in: { [Op.lt]: rangeEndDate || rangeEndAt.toISOString().slice(0, 10) } },
          { check_out: { [Op.gt]: rangeStartDate || rangeStartAt.toISOString().slice(0, 10) } }
        ]
      };

      const hourlyOverlapWhere = {
        hotel_id: hotel.id,
        ...statusWhere,
        ...hourlyModeWhere,
        [Op.and]: [
          { check_in_at: { [Op.lt]: rangeEndAt } },
          { check_out_at: { [Op.gt]: rangeStartAt } }
        ]
      };

      const [
        nightlyBookedRaw,
        hourlyBookedRaw,
        acNightlyBookedRaw,
        acHourlyBookedRaw,
        nonAcNightlyBookedRaw,
        nonAcHourlyBookedRaw
      ] = await Promise.all([
        Booking.sum('booked_room', { where: nightlyOverlapWhere }),
        Booking.sum('booked_room', { where: hourlyOverlapWhere }),
        Booking.sum('booked_room', { where: { ...nightlyOverlapWhere, room_type: 'AC' } }),
        Booking.sum('booked_room', { where: { ...hourlyOverlapWhere, room_type: 'AC' } }),
        Booking.sum('booked_room', { where: { ...nightlyOverlapWhere, room_type: { [Op.in]: nonAcRoomTypeValues } } }),
        Booking.sum('booked_room', { where: { ...hourlyOverlapWhere, room_type: { [Op.in]: nonAcRoomTypeValues } } })
      ]);

      const bookedTotal = Number(nightlyBookedRaw || 0) + Number(hourlyBookedRaw || 0);
      const bookedAc = Number(acNightlyBookedRaw || 0) + Number(acHourlyBookedRaw || 0);
      const bookedNonAc = Number(nonAcNightlyBookedRaw || 0) + Number(nonAcHourlyBookedRaw || 0);

      const capacityTotal = parseInt(hotel.available_rooms || 0);
      const capacityAc = parseInt(hotel.ac_rooms || 0);
      const capacityNonAc = parseInt(hotel.non_ac_rooms || 0);

      hotel.setDataValue('availability', {
        mode: isHourly ? 'HOURLY' : 'NIGHTLY',
        from: isHourly ? rangeStartAt.toISOString() : rangeStartDate,
        to: isHourly ? rangeEndAt.toISOString() : rangeEndDate,
        capacity_total: capacityTotal,
        capacity_ac: capacityAc,
        capacity_non_ac: capacityNonAc,
        booked_total: bookedTotal,
        booked_ac: bookedAc,
        booked_non_ac: bookedNonAc,
        available_total: Math.max(0, capacityTotal - bookedTotal),
        available_ac: Math.max(0, capacityAc - bookedAc),
        available_non_ac: Math.max(0, capacityNonAc - bookedNonAc)
      });
    }

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

    const roomKeys = ['total_rooms', 'available_rooms', 'ac_rooms', 'non_ac_rooms'];
    const touchesRooms = roomKeys.some((k) => Object.prototype.hasOwnProperty.call(updates, k));
    if (touchesRooms) {
      const nextTotalRooms = Object.prototype.hasOwnProperty.call(updates, 'total_rooms')
        ? parseStrictInt(updates.total_rooms)
        : hotel.total_rooms;
      const nextAvailableRooms = Object.prototype.hasOwnProperty.call(updates, 'available_rooms')
        ? parseStrictInt(updates.available_rooms)
        : hotel.available_rooms;
      const nextAcRooms = Object.prototype.hasOwnProperty.call(updates, 'ac_rooms')
        ? parseStrictInt(updates.ac_rooms)
        : hotel.ac_rooms;
      const nextNonAcRooms = Object.prototype.hasOwnProperty.call(updates, 'non_ac_rooms')
        ? parseStrictInt(updates.non_ac_rooms)
        : hotel.non_ac_rooms;

      assertRoomsValid({ totalRooms: nextTotalRooms, availableRooms: nextAvailableRooms, acRooms: nextAcRooms, nonAcRooms: nextNonAcRooms });
      updates.total_rooms = nextTotalRooms;
      updates.available_rooms = nextAvailableRooms;
      updates.ac_rooms = nextAcRooms;
      updates.non_ac_rooms = nextNonAcRooms;
    }

    const priceKeys = ['base_price', 'ac_room_price', 'non_ac_room_price'];
    const touchesPrices = priceKeys.some((k) => Object.prototype.hasOwnProperty.call(updates, k));
    if (touchesPrices) {
      const nextBasePrice = Object.prototype.hasOwnProperty.call(updates, 'base_price')
        ? parseStrictNumber(updates.base_price)
        : parseStrictNumber(hotel.base_price);
      const nextAcRoomPrice = Object.prototype.hasOwnProperty.call(updates, 'ac_room_price')
        ? parseStrictNumber(updates.ac_room_price)
        : parseStrictNumber(hotel.ac_room_price);
      const nextNonAcRoomPrice = Object.prototype.hasOwnProperty.call(updates, 'non_ac_room_price')
        ? parseStrictNumber(updates.non_ac_room_price)
        : parseStrictNumber(hotel.non_ac_room_price);

      assertPricesValid({ basePrice: nextBasePrice, acRoomPrice: nextAcRoomPrice, nonAcRoomPrice: nextNonAcRoomPrice });
      updates.base_price = nextBasePrice;
      updates.ac_room_price = nextAcRoomPrice;
      updates.non_ac_room_price = nextNonAcRoomPrice;
    }

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

    const confirmedBookings = await Booking.count({
      where: { hotel_id: hotel.id, status: 'CONFIRMED' }
    });

    if (confirmedBookings > 0) {
      throw createError('Cannot delete hotel with confirmed bookings', 409);
    }

    await Booking.update(
      { status: 'CANCELLED' },
      { where: { hotel_id: hotel.id, status: 'PENDING' } }
    );

    const anyBookings = await Booking.count({ where: { hotel_id: hotel.id } });

    if (anyBookings > 0) {
      await hotel.update({ status: 'INACTIVE' });
      await hotel.reload();
      sendSuccess(res, { hotel }, 'Hotel removed successfully');
      return;
    }

    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const imageRows = await HotelImage.findAll({ where: { hotel_id: hotel.id } });
    const fileNames = imageRows
      .map((img) => String(img.url || ''))
      .filter((u) => u.startsWith('/uploads/'))
      .map((u) => u.replace('/uploads/', ''))
      .filter(Boolean);

    await sequelize.transaction(async (t) => {
      await HotelImage.destroy({ where: { hotel_id: hotel.id }, transaction: t });
      await Room.destroy({ where: { hotel_id: hotel.id }, transaction: t });
      await Review.destroy({ where: { hotel_id: hotel.id }, transaction: t });
      await Hotel.destroy({ where: { id: hotel.id }, transaction: t });
    });

    await Promise.all(
      fileNames.map(async (name) => {
        const fp = path.join(uploadsDir, name);
        try {
          await fs.promises.unlink(fp);
        } catch {}
      })
    );
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

  /** GET USER BOOKINGS (VENDOR SCOPED) */
  getUserBookings: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = getPaginationOffset(page, limit);

    const bookings = await Booking.findAndCountAll({
      where: { 
        vendor_id: req.user.id,
        user_id: userId
      },
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
    }, 'User bookings retrieved successfully');
  }),

  /** GET BOOKING BY ID */
  getBookingById: asyncHandler(async (req, res) => {
    const booking = await Booking.findOne({
      where: { 
        id: req.params.bookingId,
        vendor_id: req.user.id
      },
      include: getBookingIncludes()
    });

    if (!booking) throw createError('Booking not found', 404);

    sendSuccess(res, booking, 'Booking details retrieved');
  }),

  /** UPDATE BOOKING STATUS */
  updateBookingStatus: asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!status || !['pending', 'confirmed', 'cancelled', 'completed'].includes(status.toLowerCase())) {
        throw createError('Invalid status value. Allowed: pending, confirmed, cancelled, completed');
    }

    const booking = await Booking.findOne({
      where: { 
        id: req.params.bookingId,
        vendor_id: req.user.id
      }
    });

    if (!booking) throw createError('Booking not found', 404);
    
    const nextStatus = status.toUpperCase();
    const prevStatus = booking.status;

    if (nextStatus === 'CANCELLED' && prevStatus !== 'CANCELLED') {
      const isPayAtHotel = String(booking.payment_method || '').toUpperCase() === 'PAY_AT_HOTEL';
      if (!isPayAtHotel) {
        const payment = await Payment.findOne({ where: { booking_id: booking.id } });
        if (payment && payment.status === 'SUCCESS' && String(payment.gateway || '').toUpperCase() === 'RAZORPAY' && payment.gateway_payment_id) {
          const razorpay = getRazorpay();
          if (razorpay) {
            try {
              const amountPaise = Math.max(1, Math.round((Number(payment.amount) || 0) * 100));
              await razorpay.payments.refund(payment.gateway_payment_id, { amount: amountPaise });
              booking.refund_percent = 100;
              booking.refund_amount = Number(payment.amount) || 0;
              booking.refund_status = 'REFUNDED_FULL';
            } catch {
              booking.refund_percent = 100;
              booking.refund_amount = Number(payment.amount) || 0;
              booking.refund_status = 'REFUND_FAILED';
            }
          } else {
            booking.refund_percent = 100;
            booking.refund_amount = Number(payment.amount) || 0;
            booking.refund_status = 'REFUND_PENDING_MANUAL';
          }
        }
      }
      booking.status = 'CANCELLED';
      await booking.save();
    } else {
      await booking.update({ status: nextStatus });
    }

    sendSuccess(res, booking, 'Booking status updated');
  }),

  markCheckedIn: asyncHandler(async (req, res) => {
    const booking = await Booking.findOne({
      where: {
        id: req.params.bookingId,
        vendor_id: req.user.id
      },
      include: getBookingIncludes()
    });

    if (!booking) throw createError('Booking not found', 404);
    if (booking.status === 'CANCELLED') throw createError('Cancelled bookings cannot be checked-in', 400);
    if (!['CONFIRMED', 'COMPLETED'].includes(String(booking.status || '').toUpperCase())) {
      throw createError('Only confirmed bookings can be checked-in', 400);
    }

    if (!booking.checked_in_at) {
      const at = parseDateTimeInputAsIST(req.body?.checked_in_at) || new Date();
      booking.checked_in_at = at;
      await booking.save();
      try {
        notifyAdmins({ section: 'bookings', id: booking.id });
      } catch {
        void 0;
      }
    }

    sendSuccess(res, { booking }, 'Checked-in recorded');
  }),

  markPaymentReceived: asyncHandler(async (req, res) => {
    const booking = await Booking.findOne({
      where: {
        id: req.params.bookingId,
        vendor_id: req.user.id
      },
      include: getBookingIncludes()
    });

    if (!booking) throw createError('Booking not found', 404);
    if (booking.status === 'CANCELLED') throw createError('Cancelled bookings cannot be updated', 400);

    if (!booking.payment_received_at) {
      const at = parseDateTimeInputAsIST(req.body?.payment_received_at) || new Date();
      const amtInput = parseStrictNumber(req.body?.payment_received_amount ?? req.body?.amount);
      const amount = Number.isFinite(amtInput) ? amtInput : Number(booking.amount || 0);
      if (!Number.isFinite(amount) || amount < 0) throw createError('Invalid payment_received_amount', 400);

      const methodRaw = String(req.body?.payment_received_method ?? req.body?.method ?? '').trim();
      const defaultMethod = String(booking.payment_method || '').toUpperCase() === 'PAY_AT_HOTEL' ? 'PAY_AT_HOTEL' : 'ONLINE';
      const method = methodRaw ? methodRaw.toUpperCase() : defaultMethod;

      const percentInput = parseStrictNumber(req.body?.commission_percent ?? booking.commission_percent);
      const percent = Number.isFinite(percentInput) ? Math.min(100, Math.max(0, percentInput)) : getCommissionPercent();

      const paymentReceivedAmount = round2(amount);
      const commissionAmount = round2((paymentReceivedAmount * percent) / 100);
      const vendorPayableAmount = round2(paymentReceivedAmount - commissionAmount);

      booking.payment_received_at = at;
      booking.payment_received_method = method;
      booking.payment_received_amount = paymentReceivedAmount;
      booking.commission_percent = percent;
      booking.commission_amount = commissionAmount;
      booking.vendor_payable_amount = vendorPayableAmount;

      if (String(booking.payment_method || '').toUpperCase() === 'PAY_AT_HOTEL') {
        booking.settlement_week_start = weekStartMondayIST(at);
        if (!booking.settlement_status) booking.settlement_status = 'UNSETTLED';
      }

      await booking.save();
      try {
        notifyAdmins({ section: 'bookings', id: booking.id });
      } catch {
        void 0;
      }
    }

    sendSuccess(res, { booking }, 'Payment received recorded');
  }),

  getNotificationCounts: asyncHandler(async (req, res) => {
    const parseSince = (v) => {
      if (!v) return null;
      const d = new Date(String(v));
      if (Number.isNaN(d.getTime())) return null;
      return d;
    };

    const usersSince = parseSince(req.query.users_since);
    const bookingsSince = parseSince(req.query.bookings_since);

    const [bookings, users] = await Promise.all([
      bookingsSince
        ? Booking.count({ where: { vendor_id: req.user.id, createdAt: { [Op.gt]: bookingsSince } } })
        : Promise.resolve(0),
      usersSince
        ? Booking.count({
            distinct: true,
            col: 'user_id',
            where: { vendor_id: req.user.id, createdAt: { [Op.gt]: usersSince } }
          })
        : Promise.resolve(0)
    ]);

    return sendSuccess(res, { counts: { users, bookings } }, 'Notification counts retrieved successfully');
  }),

  /* ===================== DASHBOARD ===================== */

  getDashboardStats: asyncHandler(async (req, res) => {
    const [
      totalHotels,
      approvedHotels,
      pendingHotels,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      cancelledBookings,
      completedBookings,
      revenueResult
    ] = await Promise.all([
      Hotel.count({ where: { vendor_id: req.user.id } }),
      Hotel.count({ where: { vendor_id: req.user.id, status: 'APPROVED' } }),
      Hotel.count({ where: { vendor_id: req.user.id, status: 'PENDING' } }),
      Booking.count({ where: { vendor_id: req.user.id } }),
      Booking.count({ where: { vendor_id: req.user.id, status: 'PENDING' } }),
      Booking.count({ where: { vendor_id: req.user.id, status: 'CONFIRMED' } }),
      Booking.count({ where: { vendor_id: req.user.id, status: 'CANCELLED' } }),
      Booking.count({ where: { vendor_id: req.user.id, status: 'COMPLETED' } }),
      Booking.findAll({
        where: { vendor_id: req.user.id, status: 'COMPLETED' },
        attributes: [[
          fn(
            'SUM',
            literal(`
              CASE
                WHEN booking_mode = 'HOURLY' THEN COALESCE(amount, price_per_hour * COALESCE(duration_hours, 0) * COALESCE(booked_room, 1), base_amount, 0)
                ELSE COALESCE(amount, price_per_night * COALESCE(booked_room, 1), base_amount, 0)
              END
            `)
          ),
          'totalRevenue'
        ]]
      })
    ]);

    sendSuccess(res, {
      stats: {
        totalHotels,
        approvedHotels,
        pendingHotels,
        totalBookings,
        pendingBookings,
        confirmedBookings,
        cancelledBookings,
        completedBookings,
        totalRevenue: parseFloat(revenueResult[0]?.dataValues?.totalRevenue || 0)
      }
    }, 'Dashboard statistics retrieved');
  }),

  /** GET REVENUE REPORT */
  getRevenueReport: asyncHandler(async (req, res) => {
    const { start_date, end_date } = req.query;
    const dateFilter = buildDateRangeFilter(start_date, end_date);
    
    // Add vendor filter
    dateFilter.vendor_id = req.user.id;
    dateFilter.status = 'CONFIRMED'; // Only count confirmed bookings

    const revenue = await Booking.sum('amount', {
      where: dateFilter
    }) || 0;

    const bookingCount = await Booking.count({
      where: dateFilter
    });

    sendSuccess(res, { 
      revenue, 
      booking_count: bookingCount,
      period: { start: start_date, end: end_date }
    }, 'Revenue report generated');
  }),

  getCommissionSummary: asyncHandler(async (req, res) => {
    const percentFallback = getCommissionPercent();

    const pahBaseExpr = 'COALESCE(payment_received_amount, 0)';
    const pahPercentExpr = `COALESCE(NULLIF(commission_percent, 0), ${percentFallback})`;
    const pahCommissionExpr = `COALESCE(NULLIF(commission_amount, 0), (${pahBaseExpr} * ${pahPercentExpr} / 100))`;
    const pahNetExpr = `(${pahBaseExpr} - ${pahCommissionExpr})`;

    const onlineBaseExpr = 'COALESCE(payment_received_amount, amount, 0)';
    const onlinePercentExpr = `COALESCE(NULLIF(commission_percent, 0), ${percentFallback})`;
    const onlineCommissionExpr = `COALESCE(NULLIF(commission_amount, 0), (${onlineBaseExpr} * ${onlinePercentExpr} / 100))`;
    const onlineNetExpr = `(${onlineBaseExpr} - ${onlineCommissionExpr})`;

    const baseWhere = {
      vendor_id: req.user.id,
      status: { [Op.ne]: 'CANCELLED' }
    };

    const thisWeekStart = weekStartMondayIST(new Date());
    const ws = thisWeekStart ? new Date(`${thisWeekStart}T00:00:00.000Z`) : null;
    const we = ws ? new Date(ws.getTime()) : null;
    if (we) we.setUTCDate(we.getUTCDate() + 7);
    const weekEnd = ws ? new Date(ws.getTime()) : null;
    if (weekEnd) weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    const thisWeekEndStr = weekEnd ? weekEnd.toISOString().slice(0, 10) : null;

    const [pahAgg, onlineAgg, pahThisWeekAgg] = await Promise.all([
      Booking.findOne({
        where: {
          ...baseWhere,
          payment_method: 'PAY_AT_HOTEL',
          checked_in_at: { [Op.ne]: null },
          payment_received_at: { [Op.ne]: null }
        },
        attributes: [
          [fn('SUM', literal(pahBaseExpr)), 'gross_amount'],
          [fn('SUM', literal(pahCommissionExpr)), 'commission_amount'],
          [fn('SUM', literal(pahNetExpr)), 'net_amount']
        ]
      }),
      Booking.findOne({
        where: {
          ...baseWhere,
          payment_received_at: { [Op.ne]: null },
          [Op.or]: [{ payment_method: { [Op.ne]: 'PAY_AT_HOTEL' } }, { payment_method: null }]
        },
        attributes: [
          [fn('SUM', literal(onlineBaseExpr)), 'gross_amount'],
          [fn('SUM', literal(onlineCommissionExpr)), 'commission_amount'],
          [fn('SUM', literal(onlineNetExpr)), 'net_amount']
        ]
      }),
      Booking.findOne({
        where: {
          ...baseWhere,
          payment_method: 'PAY_AT_HOTEL',
          checked_in_at: { [Op.ne]: null },
          payment_received_at: { [Op.ne]: null },
          [Op.or]: [{ settlement_status: null }, { settlement_status: 'UNSETTLED' }],
          ...(thisWeekStart && ws && we
            ? {
                [Op.or]: [
                  { settlement_week_start: thisWeekStart },
                  {
                    settlement_week_start: null,
                    payment_received_at: { [Op.gte]: ws, [Op.lt]: we }
                  }
                ]
              }
            : {})
        },
        attributes: [
          [fn('SUM', literal(pahCommissionExpr)), 'commission_amount'],
          [fn('SUM', literal(pahBaseExpr)), 'gross_amount']
        ]
      })
    ]);

    const pahGross = parseFloat(pahAgg?.get?.('gross_amount') || pahAgg?.dataValues?.gross_amount || 0) || 0;
    const pahCommission = parseFloat(pahAgg?.get?.('commission_amount') || pahAgg?.dataValues?.commission_amount || 0) || 0;
    const pahNet = parseFloat(pahAgg?.get?.('net_amount') || pahAgg?.dataValues?.net_amount || 0) || 0;

    const onlineGross = parseFloat(onlineAgg?.get?.('gross_amount') || onlineAgg?.dataValues?.gross_amount || 0) || 0;
    const onlineCommission = parseFloat(onlineAgg?.get?.('commission_amount') || onlineAgg?.dataValues?.commission_amount || 0) || 0;
    const onlineNet = parseFloat(onlineAgg?.get?.('net_amount') || onlineAgg?.dataValues?.net_amount || 0) || 0;

    const thisWeekPahCommission = parseFloat(pahThisWeekAgg?.get?.('commission_amount') || pahThisWeekAgg?.dataValues?.commission_amount || 0) || 0;
    const thisWeekPahGross = parseFloat(pahThisWeekAgg?.get?.('gross_amount') || pahThisWeekAgg?.dataValues?.gross_amount || 0) || 0;

    sendSuccess(res, {
      percent: percentFallback,
      pay_at_hotel: {
        gross_amount: round2(pahGross),
        commission_amount: round2(pahCommission),
        net_amount: round2(pahNet)
      },
      online: {
        gross_amount: round2(onlineGross),
        commission_amount: round2(onlineCommission),
        net_amount: round2(onlineNet)
      },
      settlement_due_this_week: {
        week_start: thisWeekStart,
        week_end: thisWeekEndStr,
        pay_at_hotel_gross_amount: round2(thisWeekPahGross),
        pay_at_hotel_commission_due: round2(thisWeekPahCommission)
      },
      totals: {
        gross_amount: round2(pahGross + onlineGross),
        commission_amount: round2(pahCommission + onlineCommission),
        net_amount: round2(pahNet + onlineNet)
      }
    }, 'Commission summary retrieved');
  }),

  /* ===================== IMAGE MANAGEMENT ===================== */

  /** GET HOTEL IMAGES */
  getHotelImages: asyncHandler(async (req, res) => {
    const hotel = await Hotel.findOne({
      where: { id: req.params.hotelId, vendor_id: req.user.id }
    });

    if (!hotel) throw createError('Hotel not found', 404);

    const images = await HotelImage.findAll({
      where: { hotel_id: hotel.id }
    });

    const formattedImages = images.map(img => {
        // Ensure URL is properly formatted if needed
        return img;
    });

    sendSuccess(res, { images: formattedImages }, 'Hotel images retrieved');
  }),

  /** UPLOAD HOTEL IMAGES */
  uploadHotelImages: asyncHandler(async (req, res) => {
    const hotel = await Hotel.findOne({
      where: { id: req.params.hotelId, vendor_id: req.user.id }
    });

    if (!hotel) throw createError('Hotel not found', 404);

    if (!req.files || req.files.length === 0) {
      throw createError('No images uploaded');
    }

    const imagePromises = req.files.map(file => {
      const imageUrl = `/uploads/${file.filename}`;
      
      return HotelImage.create({
        hotel_id: hotel.id,
        url: imageUrl
      });
    });

    const newImages = await Promise.all(imagePromises);

    sendSuccess(res, { images: newImages }, 'Images uploaded successfully');
  }),

  /** DELETE HOTEL IMAGE */
  deleteHotelImage: asyncHandler(async (req, res) => {
    const image = await HotelImage.findByPk(req.params.imageId);

    if (!image) throw createError('Image not found', 404);

    // Verify ownership through hotel
    const hotel = await Hotel.findOne({
      where: { id: image.hotel_id, vendor_id: req.user.id }
    });

    if (!hotel) throw createError('Unauthorized access to this image', 403);

    await image.destroy();

    sendSuccess(res, null, 'Image deleted successfully');
  }),

  /* ===================== REVIEW MANAGEMENT ===================== */

  getReviews: asyncHandler(async (req, res) => {
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = getPaginationOffset(page, limit);
    const q = String(req.query.q || '').trim();
    const statusInput = String(req.query.status || '').toUpperCase();

    const toDbStatus = {
      VISIBLE: 'APPROVED',
      HIDDEN: 'REJECTED',
      FLAGGED: 'PENDING',
      APPROVED: 'APPROVED',
      REJECTED: 'REJECTED',
      PENDING: 'PENDING'
    };

    const where = {};
    if (toDbStatus[statusInput]) {
      where.status = toDbStatus[statusInput];
    }

    const include = [
      { model: User, as: 'user', attributes: ['id', 'full_name', 'email'] },
      {
        model: Hotel,
        as: 'hotel',
        attributes: ['id', 'name', 'vendor_id'],
        where: { vendor_id: req.user.id },
        required: true
      }
    ];

    if (q) {
      where[Op.or] = [
        { comment: { [Op.like]: `%${q}%` } },
        { '$user.full_name$': { [Op.like]: `%${q}%` } },
        { '$user.email$': { [Op.like]: `%${q}%` } },
        { '$hotel.name$': { [Op.like]: `%${q}%` } }
      ];
    }

    const { rows, count } = await Review.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const toPanelStatus = {
      APPROVED: 'VISIBLE',
      REJECTED: 'HIDDEN',
      PENDING: 'FLAGGED'
    };
    const reviews = rows.map((row) => {
      const item = row.toJSON();
      return { ...item, status: toPanelStatus[item.status] || item.status };
    });

    sendSuccess(res, {
      reviews,
      total: count,
      page,
      limit
    }, 'Reviews retrieved successfully');
  }),

  moderateReview: asyncHandler(async (req, res) => {
    const review = await Review.findOne({
      where: { id: req.params.reviewId },
      include: [{
        model: Hotel,
        as: 'hotel',
        attributes: ['id', 'vendor_id'],
        where: { vendor_id: req.user.id },
        required: true
      }]
    });

    if (!review) throw createError('Review not found', 404);

    const input = String(req.body.status || '').toUpperCase();
    const toDbStatus = {
      VISIBLE: 'APPROVED',
      HIDDEN: 'REJECTED',
      FLAGGED: 'PENDING',
      APPROVED: 'APPROVED',
      REJECTED: 'REJECTED',
      PENDING: 'PENDING'
    };
    const nextStatus = toDbStatus[input];
    if (!nextStatus) throw createError('Invalid status. Use VISIBLE/HIDDEN/FLAGGED', 400);

    await review.update({ status: nextStatus });
    sendSuccess(res, { review }, 'Review moderated successfully');
  }),

  deleteReview: asyncHandler(async (req, res) => {
    const review = await Review.findOne({
      where: { id: req.params.reviewId },
      include: [{
        model: Hotel,
        as: 'hotel',
        attributes: ['id', 'vendor_id'],
        where: { vendor_id: req.user.id },
        required: true
      }]
    });

    if (!review) throw createError('Review not found', 404);
    await review.destroy();
    sendSuccess(res, null, 'Review deleted successfully');
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
