const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Complaint = require('../models/Complaint');
const PriestProfile = require('../models/PriestProfile');
const GuideProfile = require('../models/GuideProfile');
const PriestBooking = require('../models/PriestBooking');
const GuideBooking = require('../models/GuideBooking');
const { Parser } = require('json2csv');
const { handleBookingCancellationForPayouts } = require('./payoutController');

const User = require('../models/User');

const getTodayDateKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getDashboardMetrics = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // 1. Today's Bookings
    const bookingsToday = await Booking.find({ bookingDate: { $gte: today } });
    const totalBookings = bookingsToday.length;
    const visitedBookings = bookingsToday.filter(b => b.status === 'visited').length;
    const remainingBookings = bookingsToday.filter(b => b.status === 'confirmed').length;

    // 2. Revenue (Last 7 Days)
    const payments = await Payment.find({ createdAt: { $gte: sevenDaysAgo }, status: 'paid' });
    
    let totalRevenue = 0;
    const dayRevenueMap = {};
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Initialize last 7 days
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(sevenDaysAgo.getDate() + i);
      dayRevenueMap[dayNames[d.getDay()]] = 0;
    }

    payments.forEach(p => {
      totalRevenue += p.amount;
      const day = dayNames[new Date(p.createdAt).getDay()];
      if (dayRevenueMap[day] !== undefined) dayRevenueMap[day] += p.amount;
    });

    // 3. New Devotee Sign-ups (Weekly)
    const recentUsers = await User.find({ createdAt: { $gte: sevenDaysAgo }, role: 'devotee' });
    const daySignupMap = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(sevenDaysAgo.getDate() + i);
      daySignupMap[dayNames[d.getDay()]] = 0;
    }
    recentUsers.forEach(u => {
      const day = dayNames[new Date(u.createdAt).getDay()];
      if (daySignupMap[day] !== undefined) daySignupMap[day] += 1;
    });

    // 4. Scheduled Services
    const scheduledPriest = await PriestBooking.countDocuments({ bookingDate: { $gte: today }, status: 'confirmed' });
    const scheduledGuide = await GuideBooking.countDocuments({ bookingDate: { $gte: today }, status: 'confirmed' });

    // 5. Pending Finance Tasks (Open Complaints for now)
    const pendingTasks = await Complaint.countDocuments({ status: { $ne: 'Resolved' } });

    // 6. Recent Transactions
    const recentTxns = await Payment.find({ status: 'paid' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name');

    const formattedTxns = recentTxns.map(t => ({
      id: t.razorpayOrderId ? t.razorpayOrderId.slice(-6) : t._id.toString().slice(-6),
      type: t.type,
      name: t.user ? t.user.name : 'Unknown',
      amount: `₹${t.amount.toFixed(2)}`,
      status: t.status === 'paid' ? 'Cleared' : 'Pending',
      date: new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }));

    res.status(200).json({
      stats: {
        totalBookings,
        visitedBookings,
        remainingBookings,
        totalRevenue,
        activeUsers: await User.countDocuments({ role: 'devotee' }),
        scheduledServices: scheduledPriest + scheduledGuide,
        pendingTasks
      },
      chartData: {
        labels: Object.keys(dayRevenueMap),
        data: Object.values(dayRevenueMap)
      },
      signupsData: {
        labels: Object.keys(daySignupMap),
        data: Object.values(daySignupMap)
      },
      recentTransactions: formattedTxns
    });

  } catch (error) {
    console.error(error);
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

const deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const complaint = await Complaint.findByIdAndDelete(id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    
    res.status(200).json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting complaint', error: error.message });
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
      
      const pbs = await PriestBooking.find({ payment: payment._id });
      const gbs = await GuideBooking.find({ payment: payment._id });
      
      const subIds = [];
      for (const pb of pbs) {
        pb.status = 'cancelled';
        await pb.save();
        subIds.push(pb._id);
      }
      for (const gb of gbs) {
        gb.status = 'cancelled';
        await gb.save();
        subIds.push(gb._id);
      }
      
      if (subIds.length > 0) {
        await handleBookingCancellationForPayouts(subIds);
      }
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

const getPublicTempleStatus = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Dynamic Wait Time Calculation: Base wait time is 15 mins. Add 2 mins per unvisited booking today.
    const bookingsToday = await Booking.find({ bookingDate: { $gte: today } });
    const pendingBookings = bookingsToday.filter(b => b.status === 'confirmed').length;
    
    let estimatedWaitMins = 15 + (pendingBookings * 2);
    if (estimatedWaitMins > 180) estimatedWaitMins = 180; // Cap at 3 hours

    // Hardcoded upcoming events for now
    const upcomingEvents = [
      { id: 1, month: 'MAR', day: '08', name: 'Mahashivratri', desc: 'Grand celebration with midnight Aarti.' },
      { id: 2, month: 'MAR', day: '25', name: 'Ram Navami', desc: 'Special darshan and continuous chanting.' }
    ];

    res.json({
      success: true,
      waitTimeMins: estimatedWaitMins,
      events: upcomingEvents,
      nextAarti: {
        name: 'Sandhya Aarti',
        time: '6:30 PM',
        status: 'Preparing',
        indicator: 'yellow'
      }
    });
  } catch (error) {
    console.error('Error fetching temple status:', error);
    res.status(500).json({ error: 'Failed to fetch temple status' });
  }
};

// ==========================================
// GATE OFFICER MANAGEMENT
// ==========================================

const getGateOfficers = async (req, res) => {
  try {
    const officers = await User.find({ role: 'gate_officer' }).select('-password').sort({ createdAt: -1 });
    res.status(200).json(officers);
  } catch (error) {
    console.error('getGateOfficers error:', error);
    res.status(500).json({ message: 'Server error fetching gate officers' });
  }
};

const createGateOfficer = async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;
    
    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password are required' });
    }
    if (!email && !mobile) {
      return res.status(400).json({ message: 'At least one of email or mobile is required' });
    }

    const uniqueChecks = [];
    if (email) uniqueChecks.push({ email });
    if (mobile) uniqueChecks.push({ mobile });

    const existingUser = await User.findOne({ $or: uniqueChecks });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email or mobile' });
    }

    const officer = await User.create({
      name,
      email: email || undefined,
      mobile: mobile || undefined,
      password,
      role: 'gate_officer'
    });

    res.status(201).json({ message: 'Gate Officer created successfully', officer });
  } catch (error) {
    console.error('createGateOfficer error:', error);
    res.status(500).json({ message: 'Server error creating gate officer' });
  }
};

const deleteGateOfficer = async (req, res) => {
  try {
    const officerId = req.params.id;
    const officer = await User.findOneAndDelete({ _id: officerId, role: 'gate_officer' });
    
    if (!officer) {
      return res.status(404).json({ message: 'Gate officer not found' });
    }

    res.status(200).json({ message: 'Gate Officer deleted successfully' });
  } catch (error) {
    console.error('deleteGateOfficer error:', error);
    res.status(500).json({ message: 'Server error deleting gate officer' });
  }
};

module.exports = {
  getDashboardMetrics,
  getComplaints,
  resolveComplaint,
  deleteComplaint,
  processManualRefund,
  generateCsvReport,
  getPublicTempleStatus,
  getGateOfficers,
  createGateOfficer,
  deleteGateOfficer
};
