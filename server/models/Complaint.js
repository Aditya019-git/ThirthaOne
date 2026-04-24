const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  devotee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetType: {
    type: String,
    enum: ['Priest', 'Guide', 'Temple'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: function() { return this.targetType !== 'Temple'; }
  },
  relatedBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  issueDescription: {
    type: String,
    required: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['Open', 'Under Review', 'Resolved', 'Dismissed'],
    default: 'Open'
  },
  adminNotes: {
    type: String,
    default: ''
  },
  penaltyApplied: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);
