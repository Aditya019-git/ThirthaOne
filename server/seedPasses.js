const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Booking = require('./models/Booking');
const PriestProfile = require('./models/PriestProfile');
const GuideProfile = require('./models/GuideProfile');
const PriestBooking = require('./models/PriestBooking');
const GuideBooking = require('./models/GuideBooking');
const Payment = require('./models/Payment');

dotenv.config();

const seedPasses = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tirthone';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected for Seeding Passes...');

    let devotee = await User.findOne({ role: 'devotee' });
    if (!devotee) {
      devotee = await User.create({
        name: 'Demo Devotee',
        email: 'devotee@example.com',
        mobile: '9999999999',
        password: 'password123',
        role: 'devotee'
      });
    }

    const priestProfile = await PriestProfile.findOne({ isActive: true, isVerified: true });
    const guideProfile = await GuideProfile.findOne({ isActive: true, isVerified: true });

    if (!priestProfile || !guideProfile) {
      console.log('Please ensure you have at least one active & verified Priest and Guide.');
      process.exit(0);
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Create a successful Darshan Booking
    const passPayment = await Payment.create({
      user: devotee._id,
      amount: 1500,
      currency: 'INR',
      type: 'vip_pass',
      status: 'paid',
      paidAt: new Date(),
      razorpayPaymentId: 'pay_' + Date.now()
    });

    const booking = await Booking.create({
      user: devotee._id,
      headDevoteeName: devotee.name,
      headDevoteeAadhaar: '123456789012',
      members: [{ name: devotee.name }, { name: 'Family Member 1' }, { name: 'Family Member 2' }],
      memberCount: 3,
      bookingDate: tomorrow,
      timeSlot: '08:00 AM - 10:00 AM',
      bookingCode: 'VIP' + Math.floor(Math.random() * 1000000),
      status: 'confirmed',
      payment: passPayment._id
    });

    // 2. Create Priest Booking
    const priestPayment = await Payment.create({
      user: devotee._id,
      amount: 500,
      currency: 'INR',
      type: 'priest',
      status: 'paid',
      paidAt: new Date(),
      razorpayPaymentId: 'pay_P_' + Date.now()
    });

    await PriestBooking.create({
      devotee: devotee._id,
      priest: priestProfile.user,
      priestProfile: priestProfile._id,
      darshanbooking: booking._id,
      ritualType: 'Rudrabhishek',
      basePrice: 500,
      surcharge: 0,
      totalAmount: 500,
      bookingDate: tomorrow,
      timeSlot: '08:00 AM',
      status: 'confirmed',
      payment: priestPayment._id
    });

    // 3. Create Guide Booking
    const guidePayment = await Payment.create({
      user: devotee._id,
      amount: 400,
      currency: 'INR',
      type: 'guide',
      status: 'paid',
      paidAt: new Date(),
      razorpayPaymentId: 'pay_G_' + Date.now()
    });

    await GuideBooking.create({
      devotee: devotee._id,
      guide: guideProfile.user,
      guideProfile: guideProfile._id,
      places: [
        { code: 'main_temple', name: 'Main Temple', price: 200 },
        { code: 'museum', name: 'Museum', price: 200 }
      ],
      totalAmount: 400,
      bookingDate: tomorrow,
      status: 'confirmed',
      payment: guidePayment._id
    });

    console.log('Successfully seeded a Combo VIP Pass (Darshan + Priest + Guide)!');
    process.exit(0);
  } catch (error) {
    console.error('Error Seeding Passes:', error);
    process.exit(1);
  }
};

seedPasses();
