const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');
const { scheduleBookingReopenJob } = require('./jobs/bookingWindowCron');
const { handleRazorpayWebhook } = require('./controllers/bookingController');

const app = express();

// 1. Connect to database
connectDB();

// 2. Import models
require('./models/User');
require('./models/Booking');
require('./models/Pass');
require('./models/PriestBooking');
require('./models/GuideBooking');
require('./models/Payment');
require('./models/DailyLimit');

// 3. Middlewares
app.use(cors());
app.post('/api/booking/payment-webhook', express.raw({ type: 'application/json' }), handleRazorpayWebhook);
app.use(express.json());

// 4. Routes
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/booking', bookingRoutes);

// 5. Schedulers
scheduleBookingReopenJob();

// 6. Test route
app.get('/', (req, res) => {
  res.json({ message: 'Bhimashankar Temple API is running' });
});

// 7. Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
