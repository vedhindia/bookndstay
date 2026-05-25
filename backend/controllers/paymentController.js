// controllers/paymentController.js
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { sequelize, Payment, Booking, Hotel, User } = require('../models');
const { sendBookingConfirmationEmail } = require('../utils/mailer');
const { notifyAdmins, notifyVendor } = require('../utils/notificationHub');

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

const safeEqual = (a, b) => {
  try {
    const ba = Buffer.from(String(a || ''), 'utf8');
    const bb = Buffer.from(String(b || ''), 'utf8');
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
};

const parseBookingIdFromReceipt = (receipt) => {
  const r = String(receipt || '').trim();
  const m = r.match(/^rcpt_(\d+)$/i);
  return m ? Number(m[1]) : null;
};

const parseWebhookPayload = (req) => {
  if (Buffer.isBuffer(req.body)) {
    const text = req.body.toString('utf8');
    return { raw: req.body, json: text ? JSON.parse(text) : {} };
  }
  const json = req.body || {};
  const raw = Buffer.from(JSON.stringify(json), 'utf8');
  return { raw, json };
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

module.exports = {
  getPaymentKey: (req, res) => {
    res.json({ key: process.env.RZP_KEY_ID || 'rzp_test_placeholder' });
  },

  webhook: async (req, res) => {
    try {
      const { raw, json: event } = parseWebhookPayload(req);

      const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RZP_WEBHOOK_SECRET;
      const signature = req.headers['x-razorpay-signature'];
      if (secret) {
        const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
        if (!safeEqual(expected, signature)) {
          return res.status(400).json({ message: 'Invalid webhook signature' });
        }
      }

      const eventName = String(event?.event || '').trim();
      const paymentEntity = event?.payload?.payment?.entity || null;
      const orderEntity = event?.payload?.order?.entity || null;

      const isSuccess =
        eventName === 'payment.captured' ||
        eventName === 'order.paid' ||
        String(paymentEntity?.status || '').toLowerCase() === 'captured';

      const isFailure =
        eventName === 'payment.failed' ||
        String(paymentEntity?.status || '').toLowerCase() === 'failed';

      if (!isSuccess && !isFailure) {
        return res.json({ ok: true });
      }

      let bookingId = parseBookingIdFromReceipt(orderEntity?.receipt);

      if (!bookingId) {
        const noteId =
          paymentEntity?.notes?.booking_id ||
          paymentEntity?.notes?.bookingId ||
          paymentEntity?.notes?.booking ||
          null;
        if (noteId && /^\d+$/.test(String(noteId))) bookingId = Number(noteId);
      }

      if (!bookingId && paymentEntity?.order_id) {
        const razorpay = getRazorpay();
        if (razorpay) {
          try {
            const order = await razorpay.orders.fetch(String(paymentEntity.order_id));
            bookingId = parseBookingIdFromReceipt(order?.receipt);
          } catch {
            void 0;
          }
        }
      }

      if (!bookingId) {
        return res.json({ ok: true });
      }

      const booking = await Booking.findByPk(bookingId, {
        include: [{ model: Hotel, as: 'hotel' }, { model: User, as: 'user' }]
      });
      if (!booking) {
        return res.json({ ok: true });
      }

      const paymentId = paymentEntity?.id ? String(paymentEntity.id) : null;
      const orderId = paymentEntity?.order_id ? String(paymentEntity.order_id) : null;

      let payment = await Payment.findOne({ where: { booking_id: booking.id } });
      if (!payment) {
        payment = await Payment.create({
          booking_id: booking.id,
          gateway: 'RAZORPAY',
          gateway_payment_id: paymentId || orderId,
          amount: booking.amount,
          status: isSuccess ? 'SUCCESS' : 'FAILED'
        });
      } else {
        if (paymentId) payment.gateway_payment_id = paymentId;
        if (payment.status !== 'SUCCESS') {
          payment.status = isSuccess ? 'SUCCESS' : 'FAILED';
        }
        await payment.save();
      }

      if (isFailure) {
        if (booking.status === 'PENDING') {
          booking.status = 'CANCELLED';
          await booking.save();
        }
        return res.json({ ok: true });
      }

      if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') {
        return res.json({ ok: true });
      }

      const createdAt = new Date(booking.createdAt).getTime();
      if (Number.isFinite(createdAt) && Date.now() - createdAt > 10 * 60 * 1000) {
        booking.status = 'CANCELLED';
        await booking.save();
        const razorpay = getRazorpay();
        if (razorpay && paymentId) {
          try {
            await razorpay.payments.refund(paymentId);
          } catch {
            void 0;
          }
        }
        return res.json({ ok: true });
      }

      await sequelize.transaction(async (t) => {
        const fresh = await Booking.findByPk(booking.id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!fresh) return;
        if (fresh.status === 'CONFIRMED' || fresh.status === 'COMPLETED') return;
        if (fresh.status !== 'PENDING') return;

        fresh.status = 'CONFIRMED';
        fresh.payment_id = paymentId || fresh.payment_id || orderId;
        fresh.payment_method = 'ONLINE';
        if (!fresh.payment_received_at) {
          const now = new Date();
          fresh.payment_received_at = now;
          fresh.payment_received_method = fresh.payment_received_method || 'ONLINE';
          const paymentReceivedAmount = Number(fresh.amount || 0);
          fresh.payment_received_amount = paymentReceivedAmount;

          const percent = Number.isFinite(Number(fresh.commission_percent))
            ? Math.min(100, Math.max(0, Number(fresh.commission_percent)))
            : getCommissionPercent();
          fresh.commission_percent = percent;
          const commissionAmount = round2((paymentReceivedAmount * percent) / 100);
          fresh.commission_amount = commissionAmount;
          fresh.vendor_payable_amount = round2(paymentReceivedAmount - commissionAmount);
          fresh.settlement_week_start = fresh.settlement_week_start || weekStartMondayIST(now);
          fresh.settlement_status = fresh.settlement_status || 'UNSETTLED';
        }
        await fresh.save({ transaction: t });
      });

      const refreshed = await Booking.findByPk(booking.id, {
        include: [{ model: Hotel, as: 'hotel' }, { model: User, as: 'user' }]
      });

      if (refreshed && refreshed.status === 'CONFIRMED') {
        try {
          notifyAdmins({ section: 'bookings', id: refreshed.id });
        } catch {
          void 0;
        }
        try {
          if (refreshed.vendor_id) notifyVendor(refreshed.vendor_id, { section: 'bookings', id: refreshed.id });
        } catch {
          void 0;
        }

        if (refreshed.user && refreshed.user.email) {
          try {
            await sendBookingConfirmationEmail(refreshed.user.email, {
              userName: refreshed.user.full_name || 'Valued Guest',
              hotelName: refreshed.hotel ? refreshed.hotel.name : 'Hotel',
              hotelAddress: refreshed.hotel ? refreshed.hotel.address : '',
              bookingMode: refreshed.booking_mode,
              checkIn: refreshed.check_in,
              checkOut: refreshed.check_out,
              checkInAt: refreshed.check_in_at,
              checkOutAt: refreshed.check_out_at,
              roomType: refreshed.room_type,
              totalAmount: refreshed.amount,
              bookingId: refreshed.id,
              guests: refreshed.guests,
              paymentMethod: refreshed.payment_method,
              discountAmount: refreshed.discount_amount,
              couponCode: refreshed.coupon_code
            });
          } catch {
            void 0;
          }
        }
      }

      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ message: e?.message || 'Webhook processing failed' });
    }
  }
};
