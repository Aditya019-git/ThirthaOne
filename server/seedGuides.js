const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const GuideProfile = require('./models/GuideProfile');

dotenv.config();

const guideData = [
  { file: 'media__1777315960515.jpg', name: 'Rohan Sharma', bio: 'Lead Temple Historian with deep knowledge of ISKCON & Ancient Architecture.', years: 8, rating: 4.9 },
  { file: 'media__1777315972558.jpg', name: 'Amit Patel', bio: 'Cultural Expert specializing in Vedic Rituals & Traditions.', years: 5, rating: 4.8 },
  { file: 'media__1777315978834.jpg', name: 'Vikram Joshi', bio: 'Senior Sanskrit Scholar for Scripture & Mantra Explanations.', years: 12, rating: 5.0 },
  { file: 'media__1777315992292.jpg', name: 'Karan Desai', bio: 'VIP Escort for Express Entry & Crowd Navigation.', years: 4, rating: 4.7 },
  { file: 'media__1777316012740.jpg', name: 'Rahul Varma', bio: 'Nature & Heritage Guide for Sacred Groves & Outdoor Shrines.', years: 6, rating: 4.9 },
  { file: 'media__1777316143549.jpg', name: 'Anjali Menon', bio: 'Spiritual Tour Leader for Meditation & Peaceful Walks.', years: 7, rating: 4.8 },
  { file: 'media__1777316227002.jpg', name: 'Priya Kulkarni', bio: 'Junior Local Expert for Family Tours & Storytelling.', years: 2, rating: 4.6 },
  { file: 'media__1777316258618.jpg', name: 'Sanjay Rathod', bio: 'Agricultural Heritage Guide for Rural Temples & Estates.', years: 9, rating: 4.9 },
  { file: 'media__1777316284247.jpg', name: 'Ritesh Singh', bio: 'Festival Coordinator for Aarti & Procession Navigation.', years: 3, rating: 4.7 },
  { file: 'media__1777316299686.jpg', name: 'Abhishek Tiwari', bio: 'Expert Darshan Facilitator for Historical Walkthroughs.', years: 15, rating: 5.0 },
  { file: 'media__1777316513075.jpg', name: 'Kunal Patil', bio: 'City Temple Guide for Urban Shrines & Transit.', years: 4, rating: 4.8 },
  { file: 'media__1777316524852.jpg', name: 'Sneha Iyer', bio: 'Cultural Bridge Guide acting as Foreign Tourist Specialist.', years: 6, rating: 4.9 },
  { file: 'media__1777316530806.jpg', name: 'Tejas Gaikwad', bio: 'Evening Tour Specialist for Night Aarti & Illumination Tours.', years: 3, rating: 4.7 },
  { file: 'media__1777316536334.jpg', name: 'Mahesh Chavan', bio: 'Senior VIP Logistics for Secure Protocol & Private Darshan.', years: 10, rating: 4.9 },
  { file: 'media__1777316586763.jpg', name: 'Kriti Sharma', bio: 'Botanical Garden Guide for Temple Flora & Sacred Trees.', years: 5, rating: 4.8 },
];

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tirthone';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected for Seeding...');

    // Warning: we will remove existing dummy guides to avoid duplicates
    // Let's find existing guides added by this script
    console.log('Clearing old auto-seeded guides...');

    for (let i = 0; i < guideData.length; i++) {
      const data = guideData[i];
      const email = `guide${i + 1}@tirthone.com`;

      // Create User Account
      let user = await User.findOne({ email });
      if (!user) {
        user = new User({
          name: data.name,
          email: email,
          mobile: `98765432${i.toString().padStart(2, '0')}`,
          password: 'password123',
          role: 'guide',
          isBlocked: false
        });
        await user.save();
        console.log(`Created User: ${data.name}`);
      }

      // Create or Update Guide Profile
      let profile = await GuideProfile.findOne({ user: user._id });
      if (!profile) {
        profile = new GuideProfile({
          user: user._id,
          age: 25 + (i % 15),
          photoUrl: `/guides/${data.file}`,
          bio: data.bio,
          yearsExperience: data.years,
          destinations: ['Main Temple', 'Goshala', 'Museum'], // Default options
          isVerified: true,
          isActive: true,
          displayOrder: i
        });
        // We will mock the rating by adding a "rating" field object to the schema or we'll just ignore it if it doesn't exist
        // Mongoose schemas are strict by default. We'll stick to defined schema fields.
        await profile.save();
        console.log(`Created Profile for: ${data.name}`);
      } else {
        profile.photoUrl = `/guides/${data.file}`;
        profile.bio = data.bio;
        profile.yearsExperience = data.years;
        profile.isVerified = true;
        profile.isActive = true;
        await profile.save();
        console.log(`Updated Profile for: ${data.name}`);
      }
    }

    console.log('Successfully Seeded 15 Guides into the DB!');
    process.exit();
  } catch (err) {
    console.error('Error Seeding Database:', err);
    process.exit(1);
  }
};

seedDB();
