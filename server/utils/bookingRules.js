const DailyLimit = require('../models/DailyLimit');

const IST_TIME_ZONE = 'Asia/Kolkata';
const DARSHAN_START_HOUR_IST = 5;
const DARSHAN_END_HOUR_IST = 23;
const DEFAULT_DAILY_LIMIT = 1200;

const formatDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIME_ZONE
  }).format(date);
};

const getTodayDateKey = () => formatDateKey(new Date());

const isSystemOpenNow = () => true;

const getDarshanWindowLabel = () => '05:00 AM to 11:00 PM IST';

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

  let message = `Booking is open. Darshan slots are available from ${getDarshanWindowLabel()}.`;
  if (!isDateOpen) {
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
    reopenAt: null,
    darshanWindow: getDarshanWindowLabel()
  };
};

module.exports = {
  IST_TIME_ZONE,
  DARSHAN_START_HOUR_IST,
  DARSHAN_END_HOUR_IST,
  DEFAULT_DAILY_LIMIT,
  formatDateKey,
  getTodayDateKey,
  isSystemOpenNow,
  ensureDailyLimit,
  getBookingStatusForDate
};
