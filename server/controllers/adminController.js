const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Complaint = require('../models/Complaint');
const PriestProfile = require('../models/PriestProfile');
const GuideProfile = require('../models/GuideProfile');
const { Parser } = require('json2csv');

const getTodayDateKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getDashboardMetrics = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Today's Bookings
    const bookingsToday = await Booking.find({ bookingDate: { $gte: today } });
    const totalBookings = bookingsToday.length;
    const visitedBookings = bookingsToday.filter(b => b.status === 'visited').length;
    const remainingBookings = bookingsToday.filter(b => b.status === 'confirmed').length;

    // 2. Revenue (Last 7 Days) for Chart
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Aggregate payments over last 7 days
    const payments = await Payment.find({ createdAt: { $gte: sevenDaysAgo }, status: 'paid' });
    
    let totalRevenue = 0;
    const dayRevenueMap = {};

    payments.forEach(p => {
      totalRevenue += p.amount;
      const day = new Date(p.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
      dayRevenueMap[day] = (dayRevenueMap[day] || 0) + p.amount;
    });

    const revenueLabels = Object.keys(dayRevenueMap);
    const revenueData = Object.values(dayRevenueMap);

    res.status(200).json({
      stats: {
        totalBookings,
        visitedBookings,
        remainingBookings,
        totalRevenue
      },
      chartData: {
        labels: revenueLabels,
        data: revenueData
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error fetching metrics', error: error.message });
  }
};

const getComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate('devotee', 'name email mobile')
      .sort({ createdAt: -1 });

    res.status(200).json({ complaints });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching complaints', error: error.message });
  }
};

const resolveComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, applyPenalty } = req.body;

    const complaint = await Complaint.findById(id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    complaint.status = status || complaint.status;
    if (adminNotes) complaint.adminNotes = adminNotes;
    
    if (applyPenalty && !complaint.penaltyApplied) {
      complaint.penaltyApplied = true;
      if (complaint.targetType === 'Priest') {
        await PriestProfile.findByIdAndUpdate(complaint.targetId, { isActive: false });
      } else if (complaint.targetType === 'Guide') {
        await GuideProfile.findByIdAndUpdate(complaint.targetId, { isActive: false });
      }
    }

    await complaint.save();
    res.status(200).json({ message: 'Complaint resolved successfully', complaint });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const processManualRefund = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    if (booking.status === 'visited') {
      return res.status(400).json({ message: 'Cannot refund a visited booking.' });
    }

    booking.status = 'cancelled';
    await booking.save();

    // Find payment and mark refunded
    const payment = await Payment.findOne({ booking: bookingId });
    if (payment) {
      payment.status = 'refunded';
      await payment.save();
    }

    res.status(200).json({ message: 'Booking cancelled and refunded successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error processing refund', error: error.message });
  }
};

const generateCsvReport = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const payments = await Payment.find({ createdAt: { $gte: today } }).populate('user', 'name');
    
    const data = payments.map(p => ({
      PaymentID: p._id.toString(),
      User: p.user ? p.user.name : 'Guest',
      Amount_INR: p.amount,
      Status: p.status,
      Type: p.comboBreakdown ? 'Combo' : 'Standard',
      Date: p.createdAt.toLocaleString()
    }));

    if (data.length === 0) {
      return res.status(404).json({ message: 'No records found for today to generate CSV.' });
    }

    const parser = new Parser();
    const csv = parser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment(`Daily_Report_${getTodayDateKey()}.csv`);
    return res.send(csv);

  } catch (error) {
    res.status(500).json({ message: 'Server error generating CSV', error: error.message });
  }
};

module.exports = {
  getDashboardMetrics,
  getComplaints,
  resolveComplaint,
  processManualRefund,
  generateCsvReport
};
