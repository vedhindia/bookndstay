const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CouponUsage = sequelize.define('CouponUsage', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    coupon_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    booking_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
    code: { type: DataTypes.STRING, allowNull: false },
    discount_amount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 }
  }, {
    tableName: 'coupon_usages',
    indexes: [
      { fields: ['coupon_id', 'user_id'] },
      { unique: true, fields: ['booking_id'] }
    ]
  });

  return CouponUsage;
};
