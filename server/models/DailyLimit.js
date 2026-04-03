const mongoose = require('mongoose');

const dailyLimitSchema = new mongoose.Schema({
  date: {
    type: String,   // stored as "YYYY-MM-DD"
    unique: true,
    required: true
  },
  totalLimit: {
    type: Number,
    default: 1200
  },
  bookedCount: {
    type: Number,
    default: 0
  },
  isOpen: {
    type: Boolean,
    default: true   // false when limit reached
  }
}, { timestamps: true });

module.exports = mongoose.model('DailyLimit', dailyLimitSchema);