const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  staffType: {
    type: String,
    enum: ['priest', 'guide'],
    required: true
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  sourceType: {
    type: String,
    enum: ['booking', 'refund_debt'],
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    // Can point to PriestBooking, GuideBooking, or Darshan Booking
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'settled', 'cancelled'],
    default: 'pending'
  },
  settledAt: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Payout', payoutSchema);
