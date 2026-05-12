// controllers/couponController.js
const { Coupon } = require('../models');
const { Op } = require('sequelize');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { canUserUseCoupon } = require('../utils/couponUsage');

/**
 * @description Create a new coupon
 */
const createCoupon = async (req, res) => {
  try {
    const { code, type, value, expiry, usage_limit, active } = req.body;

    // Validate required fields
    if (!code || !type || !value) {
      return sendError(res, 'Code, type, and value are required', 400);
    }

    // Check if code already exists
    const existingCoupon = await Coupon.findOne({ where: { code: code.toUpperCase() } });
    if (existingCoupon) {
      return sendError(res, 'Coupon code already exists', 400);
    }

    // Create coupon
    const coupon = await Coupon.create({
      vendor_id: null,
      code: code.toUpperCase(),
      type,
      value,
      expiry: expiry || null,
      usage_limit: usage_limit || 1,
      used_count: 0,
      active: active !== undefined ? active : true
    });

    return sendSuccess(res, { coupon }, 'Coupon created successfully', 201);
  } catch (err) {
    console.error('Error creating coupon:', err);
    return sendError(res, err.message, 500);
  }
};

/**
 * @description Get coupons (admin-only; returns all)
 */
const getMyCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.findAll({ order: [['createdAt', 'DESC']] });

    return sendSuccess(res, { coupons, count: coupons.length }, 'Coupons retrieved successfully');
  } catch (err) {
    console.error('Error fetching coupons:', err);
    return sendError(res, err.message, 500);
  }
};

/**
 * @description Get a single coupon by ID (admin-only)
 */
const getCouponById = async (req, res) => {
  try {
    const { couponId } = req.params;
    const coupon = await Coupon.findOne({ where: { id: couponId } });

    if (!coupon) {
      return sendError(res, 'Coupon not found', 404);
    }

    return sendSuccess(res, { coupon }, 'Coupon retrieved successfully');
  } catch (err) {
    console.error('Error fetching coupon:', err);
    return sendError(res, err.message, 500);
  }
};

/**
 * @description Update a coupon (admin-only)
 */
const updateCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;
    const { code, type, value, expiry, usage_limit, active } = req.body;

    const coupon = await Coupon.findOne({ where: { id: couponId } });

    if (!coupon) {
      return sendError(res, 'Coupon not found', 404);
    }

    // If code is being changed, check uniqueness
    if (code && code.toUpperCase() !== coupon.code) {
      const existingCoupon = await Coupon.findOne({ where: { code: code.toUpperCase() } });
      if (existingCoupon) {
        return sendError(res, 'Coupon code already exists', 400);
      }
    }

    // Update coupon
    await coupon.update({
      code: code ? code.toUpperCase() : coupon.code,
      type: type || coupon.type,
      value: value !== undefined ? value : coupon.value,
      expiry: expiry !== undefined ? expiry : coupon.expiry,
      usage_limit: usage_limit !== undefined ? usage_limit : coupon.usage_limit,
      active: active !== undefined ? active : coupon.active
    });

    return sendSuccess(res, { coupon }, 'Coupon updated successfully');
  } catch (err) {
    console.error('Error updating coupon:', err);
    return sendError(res, err.message, 500);
  }
};

/**
 * @description Delete a coupon (admin-only)
 */
const deleteCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;

    const coupon = await Coupon.findOne({ where: { id: couponId } });

    if (!coupon) {
      return sendError(res, 'Coupon not found', 404);
    }

    await coupon.destroy();

    return sendSuccess(res, null, 'Coupon deleted successfully');
  } catch (err) {
    console.error('Error deleting coupon:', err);
    return sendError(res, err.message, 500);
  }
};

/**
 * @description Get available coupons. Public requests get all active coupons;
 * authenticated user requests exclude coupons that reached that user's limit.
 */
const getAvailableCoupons = async (req, res) => {
  try {
    const now = new Date();

    const coupons = await Coupon.findAll({
      where: {
        active: true
      }
    });

    const activeCoupons = [];
    for (const c of coupons) {
      const isNotExpired = !c.expiry || new Date(c.expiry) > now;
      if (!isNotExpired) continue;

      if (req.user?.id) {
        const allowedForUser = await canUserUseCoupon({ coupon: c, userId: req.user.id });
        if (!allowedForUser) continue;
      }

      activeCoupons.push(c);
    }

    return sendSuccess(res, { coupons: activeCoupons, count: activeCoupons.length }, 'Available coupons retrieved successfully');
  } catch (err) {
    console.error('Error fetching available coupons:', err);
    return sendError(res, err.message, 500);
  }
};

/**
 * @description Apply/validate a coupon code
 */
const applyCoupon = async (req, res) => {
  try {
    const { code, amount } = req.body;

    if (!code) {
      return sendError(res, 'Coupon code is required', 400);
    }

    const now = new Date();
    const coupon = await Coupon.findOne({
      where: {
        code: code.toUpperCase(),
        active: true,
        expiry: { [Op.or]: [{ [Op.gt]: now }, null] }
      }
    });

    if (!coupon) {
      return sendError(res, 'Invalid, expired, or fully used coupon', 400);
    }

    if (req.user?.id) {
      const allowedForUser = await canUserUseCoupon({ coupon, userId: req.user.id });
      if (!allowedForUser) {
        return sendError(res, 'You have already used this coupon the maximum allowed number of times', 400);
      }
    }

    // Calculate discount
    let discount_amount = 0;
    let total_after_discount = null;

    if (typeof amount === 'number' && amount > 0) {
      if (coupon.type === 'PERCENT') {
        discount_amount = (amount * coupon.value) / 100;
      } else {
        discount_amount = coupon.value;
      }
      discount_amount = Math.min(discount_amount, amount);
      total_after_discount = Math.max(0, amount - discount_amount);
    }

    return sendSuccess(res, {
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value
      },
      discount: {
        input_amount: amount ?? null,
        discount_amount,
        total_after_discount
      }
    }, 'Coupon applied successfully');
  } catch (err) {
    console.error('Error applying coupon:', err);
    return sendError(res, err.message, 500);
  }
};

module.exports = {
  createCoupon,
  getMyCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  getAvailableCoupons,
  applyCoupon
};
