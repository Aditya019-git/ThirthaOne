const cron = require('node-cron');
const DailyLimit = require('../models/DailyLimit');
const {
  IST_TIME_ZONE,
  DEFAULT_DAILY_LIMIT,
  getTodayDateKey
} = require('../utils/bookingRules');

const scheduleBookingReopenJob = () => {
  cron.schedule(
    '0 5 * * *',
    async () => {
      try {
        const todayDateKey = getTodayDateKey();

        await DailyLimit.findOneAndUpdate(
          { date: todayDateKey },
          {
            $setOnInsert: {
              date: todayDateKey,
              totalLimit: DEFAULT_DAILY_LIMIT,
              bookedCount: 0,
              isOpen: true
            }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const updateResult = await DailyLimit.updateMany(
          {
            date: { $gte: todayDateKey },
            isOpen: false,
            $expr: { $lt: ['$bookedCount', '$totalLimit'] }
          },
          { $set: { isOpen: true } }
        );

        console.log(
          `[BookingCron] 5 AM reopen completed for ${todayDateKey}. Records reopened: ${updateResult.modifiedCount || 0}`
        );
      } catch (error) {
        console.error(`[BookingCron] Failed: ${error.message}`);
      }
    },
    { timezone: IST_TIME_ZONE }
  );
};

module.exports = { scheduleBookingReopenJob };
