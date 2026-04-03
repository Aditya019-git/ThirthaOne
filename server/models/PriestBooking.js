const mongoose = require('mongoose');

const priestBookingSchema = new mongoose.Schema({
  devotee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  priest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'   // assigned via round-robin
  },
  darshanbooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true   // must have VIP pass
  },
  ritualType: {
    type: String,
    required: true   // e.g. "Abhishek", "Rudrabhishek"
  },
  basePrice: {
    type: Number,
    required: true
  },
  surcharge: {
    type: Number,   // 10% extra
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  bookingDate: {
    type: Date,
    required: true   // same-day only
  },
  timeSlot: {
    type: String,   // between 6AM - 12PM only
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  }
}, { timestamps: true });

module.exports = mongoose.model('PriestBooking', priestBookingSchema);