const { Coupon, CouponUsage } = require('../models');

const countUserCouponUses = async ({ couponId, userId, transaction } = {}) => {
  if (!couponId || !userId) return 0;
  return CouponUsage.count({
    where: { coupon_id: couponId, user_id: userId },
    transaction
  });
};

const canUserUseCoupon = async ({ coupon, userId, transaction } = {}) => {
  if (!coupon || !userId) return true;
  const usageLimit = Math.max(1, Number(coupon.usage_limit || 1));
  const usedByUser = await countUserCouponUses({
    couponId: coupon.id,
    userId,
    transaction
  });
  return usedByUser < usageLimit;
};

const recordCouponUsageForBooking = async ({ booking, transaction } = {}) => {
  if (!booking || !booking.coupon_code || !booking.user_id) return null;

  const coupon = await Coupon.findOne({
    where: { code: String(booking.coupon_code).toUpperCase() },
    transaction
  });
  if (!coupon) return null;

  const allowed = await canUserUseCoupon({
    coupon,
    userId: booking.user_id,
    transaction
  });
  if (!allowed) {
    const err = new Error('Coupon usage limit reached for this user');
    err.statusCode = 400;
    throw err;
  }

  const [usage, created] = await CouponUsage.findOrCreate({
    where: { booking_id: booking.id },
    defaults: {
      coupon_id: coupon.id,
      user_id: booking.user_id,
      booking_id: booking.id,
      code: coupon.code,
      discount_amount: booking.discount_amount || 0
    },
    transaction
  });

  if (created) {
    await Coupon.increment({ used_count: 1 }, {
      where: { id: coupon.id },
      transaction
    });
  }

  return usage;
};

module.exports = {
  countUserCouponUses,
  canUserUseCoupon,
  recordCouponUsageForBooking
};
