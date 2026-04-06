const Razorpay = require('razorpay');

const hasRazorpayConfig = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const isRazorpayPaymentEnabled = () =>
  String(process.env.ENABLE_RAZORPAY_PAYMENT || '').toLowerCase() === 'true';

const isPaymentRequired = () => hasRazorpayConfig() && isRazorpayPaymentEnabled();

const getPricePerPerson = () => {
  const raw = Number(process.env.VIP_PASS_PRICE_PER_PERSON || 100);
  return Number.isFinite(raw) && raw > 0 ? raw : 100;
};

const calculateBookingAmount = (memberCount) => getPricePerPerson() * memberCount;

const toPaise = (rupees) => Math.round(Number(rupees || 0) * 100);

let razorpayClient;

const getRazorpayClient = () => {
  if (!hasRazorpayConfig()) return null;
  if (razorpayClient) return razorpayClient;

  razorpayClient = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });

  return razorpayClient;
};

module.exports = {
  hasRazorpayConfig,
  isRazorpayPaymentEnabled,
  isPaymentRequired,
  calculateBookingAmount,
  toPaise,
  getRazorpayClient
};
