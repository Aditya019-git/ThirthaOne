const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');
const { scheduleBookingReopenJob } = require('./jobs/bookingWindowCron');
const { scheduleRefundEngineJob } = require('./jobs/refundEngineCron');
const { handleRazorpayWebhook } = require('./controllers/bookingController');

const app = express();

// 1. Connect to database
connectDB();

// 2. Import models
require('./models/User');
require('./models/Booking');
require('./models/Pass');
require('./models/PriestBooking');
require('./models/PriestProfile');
require('./models/PriestFeedback');
require('./models/GuideBooking');
require('./models/GuideProfile');
require('./models/GuideFeedback');
require('./models/Payment');
require('./models/DailyLimit');
require('./models/Payout');

// 3. Middlewares
app.use(cors());
app.post('/api/booking/payment-webhook', express.raw({ type: 'application/json' }), handleRazorpayWebhook);
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true, limit: '6mb' }));

// 4. Routes
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const priestRoutes = require('./routes/priestRoutes');
const guideRoutes = require('./routes/guideRoutes');
const comboRoutes = require('./routes/comboRoutes');
const adminRoutes = require('./routes/adminRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const payoutRoutes = require('./routes/payoutRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/priest', priestRoutes);
app.use('/api/guide', guideRoutes);
app.use('/api/combo', comboRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/payouts', payoutRoutes);

// 5. Schedulers
scheduleBookingReopenJob();
scheduleRefundEngineJob();

// 6. Test route
app.get('/', (req, res) => {
  res.json({ message: 'Bhimashankar Temple API is running' });
});

// 7. Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
