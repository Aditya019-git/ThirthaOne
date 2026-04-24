const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roleGuard');
const Complaint = require('../models/Complaint');

// Devotee Route: Submit a complaint
router.post('/', protect, allowRoles('devotee'), async (req, res) => {
  try {
    const { targetType, targetId, relatedBookingId, issueDescription } = req.body;
    if (!targetType || !issueDescription) {
      return res.status(400).json({ message: 'Target Type and Issue Description are required.' });
    }

    const payload = {
      devotee: req.user.id,
      targetType,
      issueDescription
    };

    if (targetType !== 'Temple' && targetId) {
      payload.targetId = targetId;
    }
    if (relatedBookingId) {
      payload.relatedBookingId = relatedBookingId;
    }

    const complaint = await Complaint.create(payload);
    res.status(201).json({ message: 'Complaint registered successfully.', complaint });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// Devotee: Get my complaints
router.get('/my', protect, allowRoles('devotee'), async (req, res) => {
  try {
    const complaints = await Complaint.find({ devotee: req.user.id })
      .populate('targetId', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json({ complaints });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
});

module.exports = router;
