const Payout = require('../models/Payout');
const PriestProfile = require('../models/PriestProfile');
const GuideProfile = require('../models/GuideProfile');

const getPayoutSummary = async (req, res) => {
  try {
    const payouts = await Payout.find({ status: 'pending' }).populate('staffId', 'name email mobile role');
    
    // Group payouts by staffId
    const summaryMap = {};
    for (const p of payouts) {
      if (!p.staffId) continue;
      const key = p.staffId._id.toString();
      if (!summaryMap[key]) {
        summaryMap[key] = {
          staffId: p.staffId._id,
          name: p.staffId.name,
          role: p.staffId.role, // 'priest' or 'guide'
          mobile: p.staffId.mobile,
          amountOwed: 0,
          payoutIds: []
        };
      }
      summaryMap[key].amountOwed += p.amount;
      summaryMap[key].payoutIds.push(p._id);
    }

    // Attach UPI and Bank details from Profiles
    const result = [];
    for (const key in summaryMap) {
      const entry = summaryMap[key];
      if (entry.role === 'priest') {
        const profile = await PriestProfile.findOne({ user: entry.staffId });
        entry.upiId = profile?.upiId || '';
        entry.upiName = profile?.upiName || '';
        entry.bankDetails = profile?.bankDetails || '';
      } else if (entry.role === 'guide') {
        const profile = await GuideProfile.findOne({ user: entry.staffId });
        entry.upiId = profile?.upiId || '';
        entry.upiName = profile?.upiName || '';
        entry.bankDetails = profile?.bankDetails || '';
      }
      // Only show if amount owed isn't perfectly 0 (could be negative debt!)
      if (entry.amountOwed !== 0) {
        result.push(entry);
      }
    }

    return res.status(200).json({ summary: result });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const settlePayouts = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { payoutIds } = req.body; // array of Payout ObjectIds

    if (!Array.isArray(payoutIds) || payoutIds.length === 0) {
      return res.status(400).json({ message: 'No payouts selected for settlement.' });
    }

    await Payout.updateMany(
      { _id: { $in: payoutIds }, staffId },
      { $set: { status: 'settled', settledAt: new Date() } }
    );

    return res.status(200).json({ message: 'Payouts marked as settled.' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

const handleBookingCancellationForPayouts = async (referenceIds) => {
  if (!Array.isArray(referenceIds) || referenceIds.length === 0) return;

  const payouts = await Payout.find({ referenceId: { $in: referenceIds } });
  
  for (const payout of payouts) {
    if (payout.status === 'pending') {
      payout.status = 'cancelled';
      await payout.save();
    } else if (payout.status === 'settled') {
      // Create a debt (negative payout) because they were already paid for a booking that is now refunded
      await Payout.create({
        staffType: payout.staffType,
        staffId: payout.staffId,
        amount: -payout.amount,
        sourceType: 'refund_debt',
        referenceId: payout.referenceId,
        status: 'pending' // pending deduction from future earnings
      });
    }
  }
};

module.exports = {
  getPayoutSummary,
  settlePayouts,
  handleBookingCancellationForPayouts
};
