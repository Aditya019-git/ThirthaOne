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
<<<<<<< Updated upstream
=======
  type: {
    type: String,
    enum: ['darshan', 'vip_pass', 'priest', 'guide', 'combo'],
    required: true
  },
>>>>>>> Stashed changes
  currency: {
    type: String,
    default: 'INR'
  },
<<<<<<< Updated upstream
  type: {
    type: String,
    enum: ['darshan', 'priest', 'guide'],
    required: true
=======
  staffCut: {
    type: Number,
    default: 0
  },
  templeCut: {
    type: Number,
    default: 0
  },
  comboBreakdown: {
    type: Map,
    of: Number,
    default: {}
>>>>>>> Stashed changes
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
