const cron = require('node-cron');
const GuideBooking = require('../models/GuideBooking');
const Payment = require('../models/Payment');
const { IST_TIME_ZONE, getTodayDateKey } = require('../utils/bookingRules');
const { getRazorpayClient, hasRazorpayCredentials, toPaise } = require('../utils/razorpay');
const { sendGuideTripUpdateEmail } = require('../utils/mailer');

const normalizeStatus = (value = '') => String(value || '').trim().toLowerCase();

const attemptRazorpayRefund = async (payment) => {
  if (!payment?.razorpayPaymentId) {
    return { ok: false, reason: 'No razorpayPaymentId on payment.' };
  }
  if (!hasRazorpayCredentials()) {
    return { ok: false, reason: 'Razorpay credentials are missing.' };
  }

  const razorpay = getRazorpayClient();
  if (!razorpay || typeof razorpay.payments?.refund !== 'function') {
    return { ok: false, reason: 'Razorpay client is not available.' };
  }

  try {
    const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
      amount: toPaise(payment.amount)
    });
    return { ok: true, refundId: refund?.id || '' };
  } catch (error) {
    return { ok: false, reason: error?.message || 'Razorpay refund failed.' };
  }
};

const markPaymentRefunded = async (payment, options = {}) => {
  if (!payment) return null;

  const current = normalizeStatus(payment.status);
  if (current === 'refunded') return payment;

  const { refundId = '', failureReason = '' } = options;
  payment.status = 'refunded';
  payment.refundedAt = new Date();
  if (refundId) payment.refundId = refundId;
  if (failureReason) payment.failureReason = failureReason;
  await payment.save();
  return payment;
};

const autoRefundGuideBookings = async () => {
  const todayKey = getTodayDateKey();
  const startOfToday = new Date(`${todayKey}T00:00:00+05:30`);

  const candidates = await GuideBooking.find({
    bookingDate: { $lt: startOfToday },
    status: { $in: ['no_show_reported', 'pending'] }
  })
    .populate([
      { path: 'devotee', select: 'name email mobile' },
      { path: 'guide', select: 'name mobile' },
      { path: 'payment', select: 'status amount currency razorpayPaymentId paidAt refundedAt refundId failureReason' }
    ])
    .sort({ createdAt: 1 })
    .limit(200);

  let refundedCount = 0;
  let skippedCount = 0;

  for (const booking of candidates) {
    const status = normalizeStatus(booking.status);
    if (status !== 'no_show_reported' && status !== 'pending') {
      skippedCount += 1;
      continue;
    }

    const note =
      status === 'pending'
        ? 'Auto-refunded: Trip request expired without guide confirmation.'
        : 'Auto-refunded: No-show reported by devotee.';

    const paymentDoc = booking.payment?._id ? booking.payment : booking.payment;
    const payment = paymentDoc?._id ? paymentDoc : null;

    if (payment) {
      const paymentStatus = normalizeStatus(payment.status);
      if (paymentStatus !== 'refunded') {
        const refundAttempt = await attemptRazorpayRefund(payment);
        if (refundAttempt.ok) {
          await markPaymentRefunded(payment, { refundId: refundAttempt.refundId });
        } else {
          // Offline/dev payments are still marked refunded to keep the system consistent.
          await markPaymentRefunded(payment, { failureReason: refundAttempt.reason });
        }
      }
    }

    booking.status = 'refunded';
    booking.statusNote = note;
    await booking.save();

    refundedCount += 1;

    const devoteeEmail = booking?.devotee?.email || '';
    if (devoteeEmail) {
      await sendGuideTripUpdateEmail({
        to: devoteeEmail,
        name: booking?.devotee?.name || '',
        booking,
        subject: 'TirthOne Guide Trip: Refunded',
        statusLabel: 'refunded',
        note
      });
    }
  }

  console.log(`[RefundEngine] Completed for ${todayKey}. Refunded=${refundedCount} skipped=${skippedCount}`);
  return { todayKey, refundedCount, skippedCount };
};

const scheduleRefundEngineJob = () => {
  cron.schedule(
    '15 0 * * *',
    async () => {
      try {
        await autoRefundGuideBookings();
      } catch (error) {
        console.error(`[RefundEngine] Failed: ${error.message}`);
      }
    },
    { timezone: IST_TIME_ZONE }
  );
};

module.exports = { scheduleRefundEngineJob, autoRefundGuideBookings };
