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
    adults_count: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 1 },
    children_count: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
    child_ages: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('child_ages');
        if (!raw) return [];
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      },
      set(value) {
        const arr = Array.isArray(value) ? value : [];
        this.setDataValue('child_ages', arr.length ? JSON.stringify(arr) : null);
      }
    },
    chargeable_child_count: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
    child_surcharge_amount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
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
    discount_amount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    checked_in_at: { type: DataTypes.DATE, allowNull: true },
    payment_received_at: { type: DataTypes.DATE, allowNull: true },
    payment_received_method: { type: DataTypes.STRING, allowNull: true },
    payment_received_amount: { type: DataTypes.FLOAT, allowNull: true },
    commission_percent: { type: DataTypes.FLOAT, allowNull: true },
    commission_amount: { type: DataTypes.FLOAT, allowNull: true },
    vendor_payable_amount: { type: DataTypes.FLOAT, allowNull: true },
    settlement_week_start: { type: DataTypes.DATEONLY, allowNull: true },
    settlement_status: { type: DataTypes.ENUM('UNSETTLED', 'SETTLED'), allowNull: true },
    settled_at: { type: DataTypes.DATE, allowNull: true },
    settlement_ref: { type: DataTypes.STRING, allowNull: true }
  }, { tableName: 'bookings' });

  return Booking;
};
