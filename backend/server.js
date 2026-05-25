// server.js
const app = require('./app');
const { sequelize, Booking, Coupon, CouponUsage } = require('./models');
const { DataTypes, Op } = require('sequelize');

const PORT = process.env.PORT || 3001;

(async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    // ✅ Controlled sync: enable ALTER via env only when needed
    const alter = String(process.env.DB_SYNC_ALTER || 'false').toLowerCase() === 'true';
    const force = String(process.env.DB_SYNC_FORCE || 'false').toLowerCase() === 'true';
    // Self-healing: ensure users.profile_photo exists before syncing
    try {
      const qi = sequelize.getQueryInterface();
      const table = await qi.describeTable('users');
      if (!table.profile_photo) {
        console.log('Adding missing column users.profile_photo');
        await qi.addColumn('users', 'profile_photo', {
          type: DataTypes.STRING,
          allowNull: true,
          after: 'address'
        });
      }
      const hotels = await qi.describeTable('hotels');
      if (!hotels.map_url) {
        console.log('Adding missing column hotels.map_url');
        await qi.addColumn('hotels', 'map_url', {
          type: DataTypes.STRING,
          allowNull: true,
          after: 'longitude'
        });
      }
      if (!hotels.hotel_features) {
        console.log('Adding missing column hotels.hotel_features');
        await qi.addColumn('hotels', 'hotel_features', {
          type: DataTypes.JSON,
          allowNull: true,
          after: 'map_url'
        });
      }
      if (!hotels.booked_room) {
        console.log('Adding missing column hotels.booked_room');
        await qi.addColumn('hotels', 'booked_room', {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          after: 'total_rooms'
        });
      }

      // Check for missing Booking columns
      const bookings = await qi.describeTable('bookings');
      if (!bookings.payment_method) {
        console.log('Adding missing column bookings.payment_method');
        await qi.addColumn('bookings', 'payment_method', {
          type: DataTypes.STRING,
          defaultValue: 'ONLINE',
          after: 'payment_id'
        });
      }
      if (!bookings.refund_status) {
        console.log('Adding missing column bookings.refund_status');
        await qi.addColumn('bookings', 'refund_status', {
          type: DataTypes.STRING,
          allowNull: true,
          after: 'payment_method'
        });
      }
      if (!bookings.refund_percent) {
        console.log('Adding missing column bookings.refund_percent');
        await qi.addColumn('bookings', 'refund_percent', {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: true,
          after: 'refund_status'
        });
      }
      if (!bookings.refund_amount) {
        console.log('Adding missing column bookings.refund_amount');
        await qi.addColumn('bookings', 'refund_amount', {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
          after: 'refund_percent'
        });
      }
      if (!bookings.booked_room) {
        console.log('Adding missing column bookings.booked_room');
        await qi.addColumn('bookings', 'booked_room', {
          type: DataTypes.INTEGER.UNSIGNED,
          defaultValue: 1,
          after: 'guests'
        });
      }
      if (!bookings.price_per_night) {
        console.log('Adding missing column bookings.price_per_night');
        await qi.addColumn('bookings', 'price_per_night', {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
          after: 'amount'
        });
      }
      if (!bookings.base_amount) {
        console.log('Adding missing column bookings.base_amount');
        await qi.addColumn('bookings', 'base_amount', {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
          after: 'amount'
        });
      }
      if (!bookings.booking_mode) {
        console.log('Adding missing column bookings.booking_mode');
        await qi.addColumn('bookings', 'booking_mode', {
          type: DataTypes.ENUM('NIGHTLY', 'HOURLY'),
          allowNull: false,
          defaultValue: 'NIGHTLY',
          after: 'room_type'
        });
      }
      if (!bookings.check_in_at) {
        console.log('Adding missing column bookings.check_in_at');
        await qi.addColumn('bookings', 'check_in_at', {
          type: DataTypes.DATE,
          allowNull: true,
          after: 'check_out'
        });
      }
      if (!bookings.check_out_at) {
        console.log('Adding missing column bookings.check_out_at');
        await qi.addColumn('bookings', 'check_out_at', {
          type: DataTypes.DATE,
          allowNull: true,
          after: 'check_in_at'
        });
      }
      if (!bookings.duration_hours) {
        console.log('Adding missing column bookings.duration_hours');
        await qi.addColumn('bookings', 'duration_hours', {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: true,
          after: 'check_out_at'
        });
      }
      if (!bookings.price_per_hour) {
        console.log('Adding missing column bookings.price_per_hour');
        await qi.addColumn('bookings', 'price_per_hour', {
          type: DataTypes.FLOAT,
          allowNull: true,
          after: 'price_per_night'
        });
      }
      if (!bookings.checked_in_at) {
        console.log('Adding missing column bookings.checked_in_at');
        await qi.addColumn('bookings', 'checked_in_at', {
          type: DataTypes.DATE,
          allowNull: true,
          after: 'status'
        });
      }
      if (!bookings.payment_received_at) {
        console.log('Adding missing column bookings.payment_received_at');
        await qi.addColumn('bookings', 'payment_received_at', {
          type: DataTypes.DATE,
          allowNull: true,
          after: 'checked_in_at'
        });
      }
      if (!bookings.payment_received_method) {
        console.log('Adding missing column bookings.payment_received_method');
        await qi.addColumn('bookings', 'payment_received_method', {
          type: DataTypes.STRING,
          allowNull: true,
          after: 'payment_received_at'
        });
      }
      if (!bookings.payment_received_amount) {
        console.log('Adding missing column bookings.payment_received_amount');
        await qi.addColumn('bookings', 'payment_received_amount', {
          type: DataTypes.FLOAT,
          allowNull: true,
          after: 'payment_received_method'
        });
      }
      if (!bookings.commission_percent) {
        console.log('Adding missing column bookings.commission_percent');
        await qi.addColumn('bookings', 'commission_percent', {
          type: DataTypes.FLOAT,
          allowNull: true,
          after: 'payment_received_amount'
        });
      }
      if (!bookings.commission_amount) {
        console.log('Adding missing column bookings.commission_amount');
        await qi.addColumn('bookings', 'commission_amount', {
          type: DataTypes.FLOAT,
          allowNull: true,
          after: 'commission_percent'
        });
      }
      if (!bookings.vendor_payable_amount) {
        console.log('Adding missing column bookings.vendor_payable_amount');
        await qi.addColumn('bookings', 'vendor_payable_amount', {
          type: DataTypes.FLOAT,
          allowNull: true,
          after: 'commission_amount'
        });
      }
      if (!bookings.settlement_week_start) {
        console.log('Adding missing column bookings.settlement_week_start');
        await qi.addColumn('bookings', 'settlement_week_start', {
          type: DataTypes.DATEONLY,
          allowNull: true,
          after: 'vendor_payable_amount'
        });
      }
      if (!bookings.settlement_status) {
        console.log('Adding missing column bookings.settlement_status');
        await qi.addColumn('bookings', 'settlement_status', {
          type: DataTypes.ENUM('UNSETTLED', 'SETTLED'),
          allowNull: true,
          defaultValue: 'UNSETTLED',
          after: 'settlement_week_start'
        });
      }
      if (!bookings.settled_at) {
        console.log('Adding missing column bookings.settled_at');
        await qi.addColumn('bookings', 'settled_at', {
          type: DataTypes.DATE,
          allowNull: true,
          after: 'settlement_status'
        });
      }
      if (!bookings.settlement_ref) {
        console.log('Adding missing column bookings.settlement_ref');
        await qi.addColumn('bookings', 'settlement_ref', {
          type: DataTypes.STRING,
          allowNull: true,
          after: 'settled_at'
        });
      }
      try {
        const statusType = String(bookings.status?.type || '');
        if (statusType && !statusType.toUpperCase().includes('COMPLETED')) {
          console.log('Updating enum bookings.status to include COMPLETED');
          await qi.changeColumn('bookings', 'status', {
            type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'),
            allowNull: false,
            defaultValue: 'PENDING'
          });
        }
      } catch (statusErr) {
        console.warn('Could not modify bookings.status enum:', statusErr.message);
      }

      // Fix coupon vendor_id constraint
      try {
        const coupons = await qi.describeTable('coupons');
        if (coupons.vendor_id && coupons.vendor_id.allowNull === false) {
           console.log('Relaxing coupons.vendor_id constraint to allow NULL');
           await qi.changeColumn('coupons', 'vendor_id', {
               type: DataTypes.INTEGER.UNSIGNED,
               allowNull: true
           });
        }
      } catch (couponErr) {
         console.warn('Could not modify coupons table (might not exist yet):', couponErr.message);
      }
    } catch (e) {
      // Ignore describe/add errors; sync alter will attempt to fix
      console.warn('Schema check warning:', e.message);
    }
    await sequelize.sync({ alter, force });

    try {
      const historicalCouponBookings = await Booking.findAll({
        where: {
          coupon_code: { [Op.ne]: null },
          status: { [Op.in]: ['CONFIRMED', 'COMPLETED'] }
        },
        attributes: ['id', 'user_id', 'coupon_code', 'discount_amount']
      });

      for (const booking of historicalCouponBookings) {
        const coupon = await Coupon.findOne({
          where: { code: String(booking.coupon_code || '').toUpperCase() }
        });
        if (!coupon) continue;

        await CouponUsage.findOrCreate({
          where: { booking_id: booking.id },
          defaults: {
            coupon_id: coupon.id,
            user_id: booking.user_id,
            booking_id: booking.id,
            code: coupon.code,
            discount_amount: booking.discount_amount || 0
          }
        });
      }

      const coupons = await Coupon.findAll({ attributes: ['id'] });
      for (const coupon of coupons) {
        const count = await CouponUsage.count({ where: { coupon_id: coupon.id } });
        await Coupon.update({ used_count: count }, { where: { id: coupon.id } });
      }
    } catch (couponUsageErr) {
      console.warn('Coupon usage backfill warning:', couponUsageErr.message);
    }

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    const enableScheduler = String(process.env.ENABLE_SCHEDULER || 'true').toLowerCase() === 'true';
    if (enableScheduler) {
      let running = false;
      const sweep = async () => {
        if (running) return;
        running = true;
        try {
          const now = new Date();
          const expireTime = new Date(now.getTime() - 10 * 60 * 1000);

          await Booking.update(
            { status: 'CANCELLED' },
            { where: { status: 'PENDING', createdAt: { [Op.lt]: expireTime } } }
          );

          await Booking.update(
            { status: 'COMPLETED' },
            { where: { status: 'CONFIRMED', booking_mode: 'HOURLY', check_out_at: { [Op.lte]: now } } }
          );

          const today = new Date();
          const todayDateOnly = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
          const nightlyCandidates = await Booking.findAll({
            where: {
              status: 'CONFIRMED',
              [Op.or]: [{ booking_mode: 'NIGHTLY' }, { booking_mode: null }],
              check_out: { [Op.lte]: todayDateOnly }
            },
            attributes: ['id', 'check_out']
          });

          if (nightlyCandidates.length) {
            const idsToComplete = [];
            for (const b of nightlyCandidates) {
              const raw = b.check_out;
              if (!raw) continue;
              const d = new Date(String(raw));
              if (Number.isNaN(d.getTime())) continue;
              if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
                d.setUTCHours(5, 30, 0, 0);
              }
              if (now.getTime() >= d.getTime()) idsToComplete.push(b.id);
            }
            if (idsToComplete.length) {
              await Booking.update(
                { status: 'COMPLETED' },
                { where: { id: { [Op.in]: idsToComplete }, status: 'CONFIRMED' } }
              );
            }
          }
        } catch (e) {
          console.warn('Lifecycle sweep warning:', e.message);
        } finally {
          running = false;
        }
      };

      setInterval(sweep, 60 * 1000);
      sweep().catch(() => void 0);
    }
  } catch (err) {
    console.error('Unable to start server:', err);
    process.exit(1);
  }
})();
