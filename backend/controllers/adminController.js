/**
 * Admin Controller
 * Handles admin operations - user management, hotel management, booking management, analytics
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { Admin, User, Vendor, VendorApplication, VendorApplicationDocument, Hotel, Booking, Room, HotelImage, Review, Coupon, Payment, sequelize } = require('../models');
const { sendSuccess, sendError, sendPaginatedResponse } = require('../utils/responseHelper');
const { validateRequiredFields, isValidEmail, validatePagination } = require('../utils/validationHelper');
const { getHotelIncludes, getBookingIncludes, getPaginationOffset } = require('../utils/dbHelper');
const { asyncHandler } = require('../middlewares/errorHandler');
const { sendVendorCredentialsEmail, sendVendorApplicationRejectedEmail } = require('../utils/mailer');

const generateTempPassword = () => crypto.randomBytes(8).toString('hex');

module.exports = {
  // ============ USER MANAGEMENT ============

  /**
   * Create new user or vendor account
   */
  createUser: asyncHandler(async (req, res) => {
    const { full_name, email, phone, password, role, business_name, business_address } = req.body;
    
    // Validate required fields
    const validation = validateRequiredFields(req.body, ['full_name', 'email', 'password']);
    if (!validation.isValid) {
      const error = new Error(`Missing required fields: ${validation.missingFields.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }

    // Validate email format
    if (!isValidEmail(email)) {
      const error = new Error('Invalid email format');
      error.statusCode = 400;
      throw error;
    }

    const validRoles = ['USER', 'VENDOR'];
    const userRole = role && validRoles.includes(role) ? role : 'USER';
    
    // Check if email already exists
    let exists;
    if (userRole === 'VENDOR') {
      exists = await Vendor.findOne({ where: { email } });
    } else {
      exists = await User.findOne({ where: { email } });
    }
    
    if (exists) {
      const error = new Error('Email already exists');
      error.statusCode = 409;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let user;
    
    if (userRole === 'VENDOR') {
      user = await Vendor.create({ 
        full_name, 
        email, 
        phone, 
        password: hashedPassword, 
        business_name, 
        business_address, 
        status: 'ACTIVE'
      });
    } else {
      user = await User.create({ 
        full_name, 
        email, 
        phone, 
        password: hashedPassword 
      });
    }
    
    sendSuccess(res, {
      user: { 
        id: user.id, 
        full_name: user.full_name, 
        email: user.email, 
        role: userRole 
      }
    }, `${userRole} account created successfully`, 201);
  }),

  /**
   * Get all users and vendors
   */
  getAllUsers: asyncHandler(async (req, res) => {
    const [users, vendors] = await Promise.all([
      User.findAll({ 
        attributes: ['id', 'full_name', 'email', 'phone', 'is_verified', 'is_active', 'createdAt'],
        order: [['createdAt', 'DESC']]
      }),
      Vendor.findAll({ 
        attributes: ['id', 'full_name', 'email', 'phone', 'business_name', 'status', 'createdAt'],
        order: [['createdAt', 'DESC']]
      })
    ]);

    sendSuccess(res, { users, vendors }, 'Users retrieved successfully');
  }),

  /**
   * Get all vendors with pagination and optional filters
   */
  getVendors: asyncHandler(async (req, res) => {
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = getPaginationOffset(page, limit);
    const { status, search } = req.query;

    const where = {};
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { business_name: { [Op.like]: `%${search}%` } }
      ];
    }

    const { rows, count } = await Vendor.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'full_name', 'email', 'phone', 'business_name', 'business_address', 'status', 'createdAt']
    });

    const pagination = {
      page,
      limit,
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      hasNext: offset + rows.length < count,
      hasPrev: page > 1
    };

    return sendPaginatedResponse(res, rows, pagination, 'Vendors retrieved successfully');
  }),



  /**
   * Get vendor by ID with details
   */
  getVendorById: asyncHandler(async (req, res) => {
    const { vendorId } = req.params;
    
    const vendor = await Vendor.findByPk(vendorId, {
      attributes: ['id', 'full_name', 'email', 'phone', 'business_name', 'business_address', 'status', 'createdAt', 'updatedAt']
    });
    
    if (!vendor) {
      const error = new Error('Vendor not found');
      error.statusCode = 404;
      throw error;
    }

    // Get vendor's hotels count
    const hotelsCount = await Hotel.count({ where: { vendor_id: vendorId } });

    sendSuccess(res, { 
      vendor: {
        ...vendor.toJSON(),
        hotelsCount
      }
    }, 'Vendor details retrieved successfully');
  }),

  /**
   * Get user by ID
   */
  getUserById: asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.userId, {
      attributes: ['id', 'full_name', 'email', 'phone', 'is_verified', 'createdAt']
    });
    
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    sendSuccess(res, { user }, 'User details retrieved successfully');
  }),

  /**
   * Update user information
   */
  updateUser: asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.userId);
    
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    
    const { full_name, email, phone, is_verified } = req.body;
    const updateData = {};
    
    if (full_name) updateData.full_name = full_name;
    if (email) {
      if (!isValidEmail(email)) {
        const error = new Error('Invalid email format');
        error.statusCode = 400;
        throw error;
      }
      updateData.email = email;
    }
    if (phone) updateData.phone = phone;
    if (typeof is_verified === 'boolean') updateData.is_verified = is_verified;
    
    await user.update(updateData);
    sendSuccess(res, { user }, 'User updated successfully');
  }),

  /**
   * Delete user account
   */
  deleteUser: asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.userId);
    
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    
    await user.destroy();
    sendSuccess(res, null, 'User deleted successfully');
  }),

  /**
   * Block/suspend user account
   */
  blockUser: asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.userId);
    
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    
    await user.update({ is_verified: false });
    sendSuccess(res, null, 'User blocked successfully');
  }),

  /**
   * Unblock/activate user account
   */
  unblockUser: asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.userId);
    
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    
    await user.update({ is_verified: true });
    sendSuccess(res, null, 'User unblocked successfully');
  }),

  /**
   * Get users with pagination and optional filters
   */
  getUsersPaginated: asyncHandler(async (req, res) => {
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = getPaginationOffset(page, limit);
    const { search, is_active, is_verified } = req.query;

    const where = {};
    if (typeof is_active !== 'undefined') where.is_active = String(is_active) === 'true';
    if (typeof is_verified !== 'undefined') where.is_verified = String(is_verified) === 'true';
    if (search) {
      where[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }

    const { rows, count } = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'full_name', 'email', 'phone', 'is_verified', 'is_active', 'createdAt']
    });

    const pagination = {
      page,
      limit,
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      hasNext: offset + rows.length < count,
      hasPrev: page > 1
    };

    return sendPaginatedResponse(res, rows, pagination, 'Users retrieved successfully');
  }),

  /**
   * Update user status flags (is_active, is_verified)
   */
  updateUserStatus: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { is_active, is_verified } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const updates = {};
    if (typeof is_active !== 'undefined') updates.is_active = Boolean(is_active);
    if (typeof is_verified !== 'undefined') updates.is_verified = Boolean(is_verified);

    if (Object.keys(updates).length === 0) {
      const error = new Error('Provide at least one of is_active or is_verified');
      error.statusCode = 400;
      throw error;
    }

    await user.update(updates);
    return sendSuccess(res, { user }, 'User status updated successfully');
  }),

  /**
   * Get all bookings of a specific user (admin scope) with pagination
   */
  getUserBookings: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = getPaginationOffset(page, limit);
    const { status, start_date, end_date } = req.query;

    const where = { user_id: userId };
    if (status) where.status = status;

    // Date range filter for check-in
    if (start_date && end_date) {
        where.check_in = { [Op.between]: [start_date, end_date] };
    } else if (start_date) {
        where.check_in = { [Op.gte]: start_date };
    }

    const { rows, count } = await Booking.findAndCountAll({
      where,
      include: getBookingIncludes(),
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const pagination = {
      page,
      limit,
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      hasNext: offset + rows.length < count,
      hasPrev: page > 1
    };

    return sendPaginatedResponse(res, rows, pagination, 'User bookings retrieved successfully');
  }),

  /**
   * Create vendor (simple)
   */
  createVendor: asyncHandler(async (req, res) => {
    const { full_name, email, phone, password, business_name, business_address, status } = req.body;

    // Basic validation
    const validation = validateRequiredFields(req.body, ['full_name', 'email', 'password']);
    if (!validation.isValid) {
      const err = new Error(`Missing required fields: ${validation.missingFields.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
    if (!isValidEmail(email)) {
      const err = new Error('Invalid email format');
      err.statusCode = 400;
      throw err;
    }

    // Unique email
    const exists = await Vendor.findOne({ where: { email } });
    if (exists) {
      const err = new Error('Email already exists');
      err.statusCode = 409;
      throw err;
    }

    const hashed = await bcrypt.hash(password, 10);
    const vendor = await Vendor.create({
      full_name,
      email,
      phone,
      password: hashed,
      business_name,
      business_address,
      status: status || 'ACTIVE'
    });

    return sendSuccess(res, { vendor: {
      id: vendor.id,
      full_name: vendor.full_name,
      email: vendor.email,
      phone: vendor.phone,
      business_name: vendor.business_name,
      business_address: vendor.business_address,
      status: vendor.status,
      createdAt: vendor.createdAt
    } }, 'Vendor created successfully', 201);
  }),

  /**
   * Update vendor (simple)
   */
  updateVendor: asyncHandler(async (req, res) => {
    const { vendorId } = req.params;
    const vendor = await Vendor.findByPk(vendorId);
    if (!vendor) {
      const err = new Error('Vendor not found');
      err.statusCode = 404;
      throw err;
    }

    const { full_name, email, phone, password, business_name, business_address, status } = req.body;

    // If changing email, ensure unique and valid
    if (email) {
      if (!isValidEmail(email)) {
        const err = new Error('Invalid email format');
        err.statusCode = 400;
        throw err;
      }
      const emailInUse = await Vendor.findOne({ where: { email, id: { [Op.ne]: vendor.id } } });
      if (emailInUse) {
        const err = new Error('Email already in use');
        err.statusCode = 409;
        throw err;
      }
    }

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (business_name !== undefined) updates.business_name = business_name;
    if (business_address !== undefined) updates.business_address = business_address;
    if (status !== undefined) updates.status = status;
    if (password) updates.password = await bcrypt.hash(password, 10);

    await vendor.update(updates);

    return sendSuccess(res, { vendor: {
      id: vendor.id,
      full_name: vendor.full_name,
      email: vendor.email,
      phone: vendor.phone,
      business_name: vendor.business_name,
      business_address: vendor.business_address,
      status: vendor.status,
      updatedAt: vendor.updatedAt
    } }, 'Vendor updated successfully');
  }),

  /**
   * Activate vendor - Set status to ACTIVE
   */
  activateVendor: asyncHandler(async (req, res) => {
    const { vendorId } = req.params;
    const vendor = await Vendor.findByPk(vendorId);
    
    if (!vendor) {
      const err = new Error('Vendor not found');
      err.statusCode = 404;
      throw err;
    }

    if (vendor.status === 'ACTIVE') {
      const err = new Error('Vendor is already active');
      err.statusCode = 400;
      throw err;
    }

    await vendor.update({ status: 'ACTIVE' });

    return sendSuccess(res, { vendor: {
      id: vendor.id,
      full_name: vendor.full_name,
      email: vendor.email,
      phone: vendor.phone,
      business_name: vendor.business_name,
      business_address: vendor.business_address,
      status: vendor.status,
      updatedAt: vendor.updatedAt
    } }, 'Vendor activated successfully');
  }),

  /**
   * Deactivate/Suspend vendor - Set status to SUSPENDED
   */
  deactivateVendor: asyncHandler(async (req, res) => {
    const { vendorId } = req.params;
    const vendor = await Vendor.findByPk(vendorId);
    
    if (!vendor) {
      const err = new Error('Vendor not found');
      err.statusCode = 404;
      throw err;
    }

    if (vendor.status === 'SUSPENDED') {
      const err = new Error('Vendor is already suspended');
      err.statusCode = 400;
      throw err;
    }

    await vendor.update({ status: 'SUSPENDED' });

    return sendSuccess(res, { vendor: {
      id: vendor.id,
      full_name: vendor.full_name,
      email: vendor.email,
      phone: vendor.phone,
      business_name: vendor.business_name,
      business_address: vendor.business_address,
      status: vendor.status,
      updatedAt: vendor.updatedAt
    } }, 'Vendor suspended successfully');
  }),

  /**
   * Get all hotels of a specific vendor
   */
  getVendorHotels: asyncHandler(async (req, res) => {
    const { vendorId } = req.params;
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = getPaginationOffset(page, limit);
    const { status, search } = req.query;

    const where = { vendor_id: vendorId };
    if (status) where.status = status;
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { address: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } }
      ];
    }

    const { rows, count } = await Hotel.findAndCountAll({
      where,
      include: [
        { model: HotelImage, as: 'images' },
        { model: Room, as: 'rooms', attributes: ['id'] }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const pagination = {
      page,
      limit,
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      hasNext: offset + rows.length < count,
      hasPrev: page > 1
    };

    return sendPaginatedResponse(res, rows, pagination, 'Vendor hotels retrieved successfully');
  }),

  getVendorApplications: asyncHandler(async (req, res) => {
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = getPaginationOffset(page, limit);
    const { status, search } = req.query;

    const where = {};
    if (status) where.status = String(status).toUpperCase();
    if (search) {
      where[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { business_name: { [Op.like]: `%${search}%` } },
      ];
    }

    const { rows, count } = await VendorApplication.findAndCountAll({
      where,
      include: [{ model: VendorApplicationDocument, as: 'documents' }],
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    const pagination = {
      page,
      limit,
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      hasNext: offset + rows.length < count,
      hasPrev: page > 1,
    };

    return sendPaginatedResponse(res, rows, pagination, 'Vendor applications retrieved successfully');
  }),

  getVendorApplicationById: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const application = await VendorApplication.findByPk(id, {
      include: [{ model: VendorApplicationDocument, as: 'documents' }],
    });

    if (!application) {
      const err = new Error('Vendor application not found');
      err.statusCode = 404;
      throw err;
    }

    return sendSuccess(res, { application }, 'Vendor application retrieved successfully');
  }),

  approveVendorApplication: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { admin_notes } = req.body || {};

    const application = await VendorApplication.findByPk(id, {
      include: [{ model: VendorApplicationDocument, as: 'documents' }],
    });
    if (!application) {
      const err = new Error('Vendor application not found');
      err.statusCode = 404;
      throw err;
    }

    if (application.status === 'APPROVED') {
      const err = new Error('Application already approved');
      err.statusCode = 400;
      throw err;
    }

    const email = String(application.email || '').trim().toLowerCase();
    const existingVendor = await Vendor.findOne({ where: { email } });
    if (existingVendor) {
      const err = new Error('Vendor already exists with this email');
      err.statusCode = 409;
      throw err;
    }

    const tempPassword = generateTempPassword();
    const emailRes = await sendVendorCredentialsEmail(email, tempPassword);
    if (!emailRes.success) {
      return res.status(502).json({ message: emailRes.error || 'Failed to send vendor credentials email' });
    }

    const hashed = await bcrypt.hash(tempPassword, 10);

    const vendor = await Vendor.create({
      full_name: application.full_name,
      email,
      phone: application.phone,
      password: hashed,
      business_name: application.business_name,
      business_address: application.business_address,
      status: 'ACTIVE',
    });

    await application.update({
      status: 'APPROVED',
      admin_notes: admin_notes ? String(admin_notes) : application.admin_notes,
      rejection_reason: null,
    });

    return sendSuccess(
      res,
      { vendor: { id: vendor.id, email: vendor.email }, application },
      'Vendor application approved and credentials sent'
    );
  }),

  rejectVendorApplication: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason, admin_notes } = req.body || {};

    const application = await VendorApplication.findByPk(id);
    if (!application) {
      const err = new Error('Vendor application not found');
      err.statusCode = 404;
      throw err;
    }

    if (application.status === 'APPROVED') {
      const err = new Error('Approved application cannot be rejected');
      err.statusCode = 400;
      throw err;
    }

    await application.update({
      status: 'REJECTED',
      rejection_reason: reason ? String(reason) : 'Rejected by admin',
      admin_notes: admin_notes ? String(admin_notes) : application.admin_notes,
    });

    const email = String(application.email || '').trim().toLowerCase();
    const emailRes = await sendVendorApplicationRejectedEmail(email, application.rejection_reason);
    if (!emailRes.success) {
      return res.status(502).json({ message: emailRes.error || 'Failed to send rejection email' });
    }

    return sendSuccess(res, { application }, 'Vendor application rejected');
  }),

  // ============ HOTEL MANAGEMENT ============

  /**
   * Get all hotels with vendor information (Paginated & Filterable)
   */
  getAllHotels: asyncHandler(async (req, res) => {
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = getPaginationOffset(page, limit);
    const { status, vendor_id, search, city } = req.query;

    const where = {};
    if (status) where.status = status;
    if (vendor_id) where.vendor_id = vendor_id;
    if (city) where.city = city;
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { address: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } },
        { '$vendor.full_name$': { [Op.like]: `%${search}%` } },
        { '$vendor.business_name$': { [Op.like]: `%${search}%` } }
      ];
    }

    const { rows, count } = await Hotel.findAndCountAll({
      where,
      include: [
        { model: Vendor, as: 'vendor', attributes: ['id', 'full_name', 'email', 'business_name'] }
      ],
      attributes: {
        include: [
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM rooms AS room
              WHERE
                room.hotel_id = Hotel.id
            )`),
            'roomsCount'
          ]
        ]
      },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      subQuery: false
    });

    const pagination = {
      page,
      limit,
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      hasNext: offset + rows.length < count,
      hasPrev: page > 1
    };

    return sendPaginatedResponse(res, rows, pagination, 'Hotels retrieved successfully');
  }),

  /**
   * Get hotel by ID with full details
   */
  getHotelById: asyncHandler(async (req, res) => {
    const hotel = await Hotel.findByPk(req.params.hotelId, {
      include: [
        { model: Vendor, as: 'vendor', attributes: ['id', 'full_name', 'email', 'business_name', 'phone'] },
        { model: HotelImage, as: 'images' },
        { model: Room, as: 'rooms' }
      ]
    });
    
    if (!hotel) {
      const error = new Error('Hotel not found');
      error.statusCode = 404;
      throw error;
    }

    // Process hotel data to include derived fields
    const hotelData = hotel.toJSON();
    
    // Calculate rooms count - use association if available, else fallback to total_rooms column
    hotelData.rooms_count = (hotelData.rooms && hotelData.rooms.length > 0) 
      ? hotelData.rooms.length 
      : (hotelData.total_rooms || 0);
    
    // Calculate price range
    if (hotelData.rooms && hotelData.rooms.length > 0) {
      const prices = hotelData.rooms.map(r => Number(r.price));
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      hotelData.price_range = min === max ? `₹${min}` : `₹${min} - ₹${max}`;
    } else {
      // Fallback to hotel pricing columns if no rooms found
      const acPrice = Number(hotelData.ac_room_price) || 0;
      const nonAcPrice = Number(hotelData.non_ac_room_price) || 0;
      const basePrice = Number(hotelData.base_price) || 0;

      if (acPrice > 0 && nonAcPrice > 0) {
        const min = Math.min(acPrice, nonAcPrice);
        const max = Math.max(acPrice, nonAcPrice);
        hotelData.price_range = min === max ? `₹${min}` : `₹${min} - ₹${max}`;
      } else if (basePrice > 0) {
        hotelData.price_range = `₹${basePrice}`;
      } else {
        hotelData.price_range = "N/A";
      }
    }

    sendSuccess(res, { hotel: hotelData }, 'Hotel details retrieved successfully');
  }),

  /**
   * Update hotel information
   */
  updateHotel: asyncHandler(async (req, res) => {
    const hotel = await Hotel.findByPk(req.params.hotelId);
    
    if (!hotel) {
      const error = new Error('Hotel not found');
      error.statusCode = 404;
      throw error;
    }
    
    await hotel.update(req.body);
    sendSuccess(res, { hotel }, 'Hotel updated successfully');
  }),

  /**
   * Delete hotel
   */
  deleteHotel: asyncHandler(async (req, res) => {
    const hotel = await Hotel.findByPk(req.params.hotelId);
    
    if (!hotel) {
      const error = new Error('Hotel not found');
      error.statusCode = 404;
      throw error;
    }
    
    await hotel.destroy();
    sendSuccess(res, null, 'Hotel deleted successfully');
  }),

  /**
   * Approve hotel for listing
   */
  approveHotel: asyncHandler(async (req, res) => {
    const hotel = await Hotel.findByPk(req.params.hotelId);
    
    if (!hotel) {
      const error = new Error('Hotel not found');
      error.statusCode = 404;
      throw error;
    }
    
    await hotel.update({ status: 'APPROVED' });
    sendSuccess(res, { hotel }, 'Hotel approved successfully');
  }),

  /**
   * Reject hotel application
   */
  rejectHotel: asyncHandler(async (req, res) => {
    const hotel = await Hotel.findByPk(req.params.hotelId);
    
    if (!hotel) {
      const error = new Error('Hotel not found');
      error.statusCode = 404;
      throw error;
    }
    
    await hotel.update({ status: 'REJECTED' });
    sendSuccess(res, { hotel }, 'Hotel rejected successfully');
  }),

  /**
   * Update hotel status (PENDING, APPROVED, REJECTED, INACTIVE)
   */
  updateHotelStatus: asyncHandler(async (req, res) => {
    const { status } = req.body;
    const hotel = await Hotel.findByPk(req.params.hotelId);
    
    if (!hotel) {
      const error = new Error('Hotel not found');
      error.statusCode = 404;
      throw error;
    }

    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'INACTIVE'];
    if (!status || !validStatuses.includes(status)) {
        const error = new Error(`Invalid status value. Allowed: ${validStatuses.join(', ')}`);
        error.statusCode = 400;
        throw error;
    }
    
    await hotel.update({ status });
    sendSuccess(res, { hotel }, `Hotel status updated to ${status}`);
  }),

  // ============ BOOKING MANAGEMENT ============

  /**
   * Get all bookings with user and hotel information (Paginated & Filterable)
   */
  getAllBookings: asyncHandler(async (req, res) => {
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = getPaginationOffset(page, limit);
    const { status, hotel_id, user_id, start_date, end_date, search } = req.query;

    const where = {};
    if (status) where.status = status;
    if (hotel_id) where.hotel_id = hotel_id;
    if (user_id) where.user_id = user_id;
    
    // Date range filter for check-in
    if (start_date && end_date) {
        where.check_in = { [Op.between]: [start_date, end_date] };
    } else if (start_date) {
        where.check_in = { [Op.gte]: start_date };
    }

    // Search functionality
    if (search) {
      const searchConditions = [
        { '$user.full_name$': { [Op.like]: `%${search}%` } },
        { '$user.email$': { [Op.like]: `%${search}%` } },
        { '$hotel.name$': { [Op.like]: `%${search}%` } }
      ];
      
      // If search is a number, try searching by Booking ID
      if (!isNaN(parseInt(search))) {
        searchConditions.push({ id: parseInt(search) });
      }

      where[Op.or] = searchConditions;
    }

    const { rows, count } = await Booking.findAndCountAll({
      where,
      include: getBookingIncludes(),
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const pagination = {
      page,
      limit,
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      hasNext: offset + rows.length < count,
      hasPrev: page > 1
    };

    return sendPaginatedResponse(res, rows, pagination, 'Bookings retrieved successfully');
  }),

  /**
   * Get booking by ID with full details
   */
  getBookingById: asyncHandler(async (req, res) => {
    const booking = await Booking.findByPk(req.params.bookingId, {
      include: getBookingIncludes()
    });
    
    if (!booking) {
      const error = new Error('Booking not found');
      error.statusCode = 404;
      throw error;
    }

    sendSuccess(res, { booking }, 'Booking details retrieved successfully');
  }),

  /**
   * Update booking information
   */
  updateBooking: asyncHandler(async (req, res) => {
    const booking = await Booking.findByPk(req.params.bookingId);
    
    if (!booking) {
      const error = new Error('Booking not found');
      error.statusCode = 404;
      throw error;
    }

    const oldStatus = booking.status;
    const newStatus = req.body.status || oldStatus;
    
    await booking.update(req.body);

    // If status changed to CANCELLED, restore rooms
    if (oldStatus !== 'CANCELLED' && booking.status === 'CANCELLED') {
        const roomsToRestore = booking.booked_room || 1;
        if (booking.room_id) {
            const room = await Room.findByPk(booking.room_id);
            if (room) {
              await room.update({ available_rooms: room.available_rooms + roomsToRestore });
            }
        } else if (booking.room_type && booking.hotel_id) {
            const hotel = await Hotel.findByPk(booking.hotel_id);
            if (hotel) {
                if (booking.room_type === 'AC') {
                    hotel.ac_rooms = (hotel.ac_rooms || 0) + roomsToRestore;
                } else if (booking.room_type === 'NON_AC') {
                    hotel.non_ac_rooms = (hotel.non_ac_rooms || 0) + roomsToRestore;
                }
                // Restore total available rooms
                hotel.available_rooms = (hotel.available_rooms || 0) + roomsToRestore;
                
                hotel.booked_room = Math.max(0, (hotel.booked_room || 0) - roomsToRestore);
                await hotel.save();
            }
        }
    }
    // If status changed from CANCELLED to CONFIRMED, decrement rooms
    else if (oldStatus === 'CANCELLED' && booking.status === 'CONFIRMED') {
        const roomsToBook = booking.booked_room || 1;
        if (booking.room_id) {
            // Legacy room model support
            const room = await Room.findByPk(booking.room_id);
            if (room) {
              await room.update({ available_rooms: Math.max(0, room.available_rooms - roomsToBook) });
            }
        } else if (booking.room_type && booking.hotel_id) {
            const hotel = await Hotel.findByPk(booking.hotel_id);
            if (hotel) {
                if (booking.room_type === 'AC') {
                    hotel.ac_rooms = Math.max(0, (hotel.ac_rooms || 0) - roomsToBook);
                } else if (booking.room_type === 'NON_AC') {
                    hotel.non_ac_rooms = Math.max(0, (hotel.non_ac_rooms || 0) - roomsToBook);
                }
                hotel.available_rooms = Math.max(0, (hotel.available_rooms || 0) - roomsToBook);
                hotel.booked_room = (hotel.booked_room || 0) + roomsToBook;
                await hotel.save();
            }
        }
    }
    
    sendSuccess(res, { booking }, 'Booking updated successfully');
  }),

  /**
   * Cancel booking and restore room availability
   */
  cancelBooking: asyncHandler(async (req, res) => {
    const booking = await Booking.findByPk(req.params.bookingId);
    
    if (!booking) {
      const error = new Error('Booking not found');
      error.statusCode = 404;
      throw error;
    }
    
    await booking.update({ status: 'CANCELLED' });
    
    // Restore room availability
    const roomsToRestore = booking.booked_room || 1;
    if (booking.room_id) {
        const room = await Room.findByPk(booking.room_id);
        if (room) {
          await room.update({ available_rooms: room.available_rooms + roomsToRestore });
        }
    } else if (booking.room_type && booking.hotel_id) {
        const hotel = await Hotel.findByPk(booking.hotel_id);
        if (hotel) {
            if (booking.room_type === 'AC') {
                hotel.ac_rooms = (hotel.ac_rooms || 0) + roomsToRestore;
            } else if (booking.room_type === 'NON_AC') {
                hotel.non_ac_rooms = (hotel.non_ac_rooms || 0) + roomsToRestore;
            }
            // Restore total available rooms
            hotel.available_rooms = (hotel.available_rooms || 0) + roomsToRestore;
            
            hotel.booked_room = Math.max(0, (hotel.booked_room || 0) - roomsToRestore);
            await hotel.save();
        }
    }
    
    sendSuccess(res, { booking }, 'Booking cancelled successfully');
  }),

  // ============ ROOM MANAGEMENT ============

  /**
   * Get all rooms with hotel information
   */
  getAllRooms: asyncHandler(async (req, res) => {
    const rooms = await Room.findAll({
      include: [{ model: Hotel, as: 'hotel', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']]
    });

    sendSuccess(res, { rooms }, 'Rooms retrieved successfully');
  }),

  /**
   * Get room by ID with hotel details
   */
  getRoomById: asyncHandler(async (req, res) => {
    const room = await Room.findByPk(req.params.roomId, {
      include: [{ model: Hotel, as: 'hotel' }]
    });
    
    if (!room) {
      const error = new Error('Room not found');
      error.statusCode = 404;
      throw error;
    }

    sendSuccess(res, { room }, 'Room details retrieved successfully');
  }),

  /**
   * Update room information
   */
  updateRoom: asyncHandler(async (req, res) => {
    const room = await Room.findByPk(req.params.roomId);
    
    if (!room) {
      const error = new Error('Room not found');
      error.statusCode = 404;
      throw error;
    }
    
    await room.update(req.body);
    sendSuccess(res, { room }, 'Room updated successfully');
  }),

  /**
   * Delete room
   */
  deleteRoom: asyncHandler(async (req, res) => {
    const room = await Room.findByPk(req.params.roomId);
    
    if (!room) {
      const error = new Error('Room not found');
      error.statusCode = 404;
      throw error;
    }
    
    await room.destroy();
    sendSuccess(res, null, 'Room deleted successfully');
  }),

  // ============ PAYMENT MANAGEMENT ============

  /**
   * Get all payments (Paginated & Filterable)
   */
  getAllPayments: asyncHandler(async (req, res) => {
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = getPaginationOffset(page, limit);
    const { status, gateway, booking_id, start_date, end_date } = req.query;

    const where = {};
    if (status) where.status = status;
    if (gateway) where.gateway = gateway;
    if (booking_id) where.booking_id = booking_id;

    if (start_date && end_date) {
        where.createdAt = { [Op.between]: [start_date, end_date] };
    }

    const { rows, count } = await Payment.findAndCountAll({
      where,
      include: [
        { 
            model: Booking, 
            as: 'booking',
            attributes: ['id', 'status', 'amount'],
            include: [
                { model: User, as: 'user', attributes: ['id', 'full_name', 'email'] }
            ]
        }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    // Map to include transaction_id alias for gateway_payment_id
    const payments = rows.map(p => {
        const payment = p.toJSON();
        return {
            ...payment,
            transaction_id: payment.gateway_payment_id
        };
    });

    const pagination = {
      page,
      limit,
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      hasNext: offset + rows.length < count,
      hasPrev: page > 1
    };

    return sendPaginatedResponse(res, payments, pagination, 'Payments retrieved successfully');
  }),

  /**
   * Get payment by ID
   */
  getPaymentById: asyncHandler(async (req, res) => {
    const payment = await Payment.findByPk(req.params.paymentId, {
      include: [
        { 
            model: Booking, 
            as: 'booking',
            include: [
                { model: User, as: 'user', attributes: ['id', 'full_name', 'email', 'phone'] },
                { model: Hotel, as: 'hotel', attributes: ['id', 'name'] }
            ]
        }
      ]
    });
    
    if (!payment) {
      const error = new Error('Payment not found');
      error.statusCode = 404;
      throw error;
    }

    // Add transaction_id alias
    const paymentData = {
        ...payment.toJSON(),
        transaction_id: payment.gateway_payment_id
    };

    sendSuccess(res, { payment: paymentData }, 'Payment details retrieved successfully');
  }),

  // ============ COUPON MANAGEMENT ============


  // ============ DASHBOARD STATS ============

  /**
   * Get comprehensive dashboard statistics
   */
  getDashboardStats: asyncHandler(async (req, res) => {
    const [
      totalUsers,
      totalVendors,
      totalAdmins,
      totalHotels,
      totalBookings,
      totalRooms,
      pendingHotels,
      confirmedBookings
    ] = await Promise.all([
      User.count(),
      Vendor.count(),
      Admin.count(),
      Hotel.count(),
      Booking.count(),
      Room.count(),
      Hotel.count({ where: { status: 'PENDING' } }),
      Booking.count({ where: { status: 'CONFIRMED' } })
    ]);

    // Total Revenue (from confirmed bookings)
    const revenueResult = await Booking.findOne({
      where: { status: 'CONFIRMED' },
      attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'total']]
    });
    const totalRevenue = revenueResult?.get('total') || 0;

    // Active Vendors with Revenue
    // Fetch vendors and calculate their revenue from confirmed bookings across their hotels
    const vendors = await Vendor.findAll({
      where: { status: 'ACTIVE' },
      attributes: ['id', 'full_name', 'business_name', 'email', 'phone'],
      include: [{
        model: Hotel,
        as: 'hotels',
        attributes: ['id', 'name'],
        include: [{
          model: Booking,
          as: 'bookings',
          attributes: ['amount', 'status'],
          where: { status: 'CONFIRMED' },
          required: false
        }]
      }]
    });

    const activeVendors = vendors.map(v => {
      let revenue = 0;
      let bookings = 0;
      const hotelNames = [];

      if (v.hotels) {
        v.hotels.forEach(h => {
          hotelNames.push(h.name);
          if (h.bookings) {
            h.bookings.forEach(b => {
              revenue += Number(b.amount) || 0;
              bookings++;
            });
          }
        });
      }

      return {
        id: v.id,
        name: v.full_name,
        business: v.business_name,
        email: v.email,
        phone: v.phone,
        hotels: hotelNames,
        revenue,
        bookings
      };
    })
    .sort((a, b) => b.revenue - a.revenue) // Sort by revenue descending
    .slice(0, 10); // Top 10 vendors

    // Monthly Bookings for chart (last 7 months)
    const today = new Date();
    const monthlyBookings = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const nextMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
        
        const count = await Booking.count({
            where: {
                createdAt: {
                    [Op.gte]: d,
                    [Op.lt]: nextMonth
                }
            }
        });
        monthlyBookings.push(count);
    }
    
    const stats = {
      totalUsers,
      totalVendors,
      totalAdmins,
      totalHotels,
      totalBookings,
      totalRooms,
      pendingHotels,
      confirmedBookings,
      totalRevenue,
      activeVendors,
      monthlyBookings
    };

    sendSuccess(res, { stats }, 'Dashboard statistics retrieved successfully');
  })
};
