const mongoose = require('mongoose');

const paymentProofSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ['upi', 'bank_transfer', 'cash', 'other'],
      default: 'upi'
    },
    utr: {
      type: String,
      default: ''
    },
    screenshotDataUrl: {
      type: String,
      default: ''
    },
    submittedAt: {
      type: Date
    }
  },
  { _id: false }
);

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
  priestProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PriestProfile'
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
    enum: ['pending', 'payment_submitted', 'confirmed', 'completed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentProof: {
    type: paymentProofSchema,
    default: () => ({})
  },
  feedback: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PriestFeedback'
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  }
}, { timestamps: true });

priestBookingSchema.index({ priest: 1, bookingDate: 1, timeSlot: 1 });
priestBookingSchema.index({ devotee: 1, createdAt: -1 });
priestBookingSchema.index({ darshanbooking: 1 });
priestBookingSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('PriestBooking', priestBookingSchema);
