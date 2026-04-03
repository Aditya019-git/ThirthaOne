const DailyLimit = require('../models/DailyLimit');

const IST_TIME_ZONE = 'Asia/Kolkata';
const BOOKING_OPEN_HOUR_IST = 5;
const DEFAULT_DAILY_LIMIT = 1200;

const formatDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIME_ZONE
  }).format(date);
};

const getTodayDateKey = () => formatDateKey(new Date());

const getCurrentIstHour = () => {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIME_ZONE,
    hour: '2-digit',
    hour12: false
  }).format(new Date());
  return Number(hour);
};

const isSystemOpenNow = () => getCurrentIstHour() >= BOOKING_OPEN_HOUR_IST;

const getDailyReopenLabel = (dateKey) => `${dateKey} 05:00 AM IST`;

const ensureDailyLimit = async (dateKey) =>
  DailyLimit.findOneAndUpdate(
    { date: dateKey },
    {
      $setOnInsert: {
        date: dateKey,
        totalLimit: DEFAULT_DAILY_LIMIT,
        bookedCount: 0,
        isOpen: true
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

const getBookingStatusForDate = async (dateKey, options = {}) => {
  const { ensureDoc = true } = options;
  const dailyLimit = ensureDoc ? await ensureDailyLimit(dateKey) : await DailyLimit.findOne({ date: dateKey });

  const totalLimit = dailyLimit?.totalLimit ?? DEFAULT_DAILY_LIMIT;
  const bookedCount = dailyLimit?.bookedCount ?? 0;
  const remainingCount = Math.max(0, totalLimit - bookedCount);
  const isDateOpen = Boolean(dailyLimit?.isOpen ?? true) && remainingCount > 0;
  const isSystemOpen = isSystemOpenNow();
  const canBook = isSystemOpen && isDateOpen;

  let message = 'Booking is open.';
  if (!isSystemOpen) {
    message = `Bookings open daily at 05:00 AM IST. Please try after ${getDailyReopenLabel(dateKey)}.`;
  } else if (!isDateOpen) {
    message = 'Daily VIP devotee limit reached for this date. Please choose another date.';
  }

  return {
    bookingDate: dateKey,
    totalLimit,
    bookedCount,
    remainingCount,
    isSystemOpen,
    isDateOpen,
    canBook,
    message,
    reopenAt: !isSystemOpen ? getDailyReopenLabel(dateKey) : null
  };
};

module.exports = {
  IST_TIME_ZONE,
  BOOKING_OPEN_HOUR_IST,
  DEFAULT_DAILY_LIMIT,
  formatDateKey,
  getTodayDateKey,
  isSystemOpenNow,
  ensureDailyLimit,
  getBookingStatusForDate
};
