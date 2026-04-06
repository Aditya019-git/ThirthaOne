const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  type: {
    type: String,
    enum: ['darshan', 'priest', 'guide'],
    required: true
  },
  razorpayOrderId: {
    type: String
  },
  razorpayPaymentId: {
    type: String
  },
  razorpaySignature: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending'
  },
  paidAt: {
    type: Date
  },
  refundId: {
    type: String   // Razorpay refund ID
  },
  refundedAt: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
