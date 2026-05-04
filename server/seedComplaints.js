const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const PriestProfile = require('./models/PriestProfile');
const GuideProfile = require('./models/GuideProfile');
const Complaint = require('./models/Complaint');

dotenv.config();

const seedComplaints = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tirthone';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected for Seeding Complaints...');

    // Get a devotee (or any user to act as devotee)
    let devotee = await User.findOne({ role: 'devotee' });
    if (!devotee) {
      // Create a dummy devotee if none exists
      devotee = await User.create({
        name: 'Demo Devotee',
        email: 'devotee@example.com',
        mobile: '9999999999',
        password: 'password123',
        role: 'devotee'
      });
    }

    // Get some priests and guides
    const priest = await PriestProfile.findOne();
    const guide = await GuideProfile.findOne();

    const complaintsData = [
      {
        devotee: devotee._id,
        targetType: 'Priest',
        targetId: priest ? priest._id : null,
        issueDescription: 'The priest arrived 30 minutes late for the Abhishek and seemed very rushed during the pooja.',
        status: 'Open'
      },
      {
        devotee: devotee._id,
        targetType: 'Guide',
        targetId: guide ? guide._id : null,
        issueDescription: 'The guide did not cover all the destinations promised during booking. Skipped the Museum visit.',
        status: 'Under Review'
      },
      {
        devotee: devotee._id,
        targetType: 'Temple',
        issueDescription: 'The VIP Darshan queue was extremely crowded and mismanaged despite having a confirmed pass.',
        status: 'Resolved',
        adminNotes: 'Addressed the crowd management issue with the gate staff.',
        penaltyApplied: false
      },
      {
        devotee: devotee._id,
        targetType: 'Priest',
        targetId: priest ? priest._id : null,
        issueDescription: 'Priest demanded extra Dakshina forcefully at the end of the ritual.',
        status: 'Open'
      }
    ];

    // Filter out invalid ones if we didn't find a priest or guide
    const validComplaints = complaintsData.filter(c => c.targetType === 'Temple' || c.targetId);

    // Insert
    await Complaint.deleteMany({}); // clear existing
    await Complaint.insertMany(validComplaints);

    console.log('Successfully seeded demo complaints!');
    process.exit(0);
  } catch (error) {
    console.error('Error Seeding Complaints:', error);
    process.exit(1);
  }
};

seedComplaints();
