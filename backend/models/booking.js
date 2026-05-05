// models/booking.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Booking = sequelize.define('Booking', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    vendor_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    hotel_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    room_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    room_type: { type: DataTypes.STRING, allowNull: true },
    booking_mode: { type: DataTypes.ENUM('NIGHTLY', 'HOURLY'), allowNull: false, defaultValue: 'NIGHTLY' },
    check_in: { type: DataTypes.DATEONLY, allowNull: false },
    check_out: { type: DataTypes.DATEONLY, allowNull: false },
    check_in_at: { type: DataTypes.DATE, allowNull: true },
    check_out_at: { type: DataTypes.DATE, allowNull: true },
    duration_hours: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    guests: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 1 },
    booked_room: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 1 },
    status: { type: DataTypes.ENUM('PENDING','CONFIRMED','CANCELLED','COMPLETED'), defaultValue: 'PENDING' },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    base_amount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    price_per_night: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    price_per_hour: { type: DataTypes.FLOAT, allowNull: true },
    payment_id: { type: DataTypes.STRING, allowNull: true },
    payment_method: { type: DataTypes.STRING, allowNull: true },
    refund_status: { type: DataTypes.STRING, allowNull: true },
    refund_percent: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    refund_amount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    coupon_code: { type: DataTypes.STRING, allowNull: true },
    discount_amount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 }
  }, { tableName: 'bookings' });

  return Booking;
};
