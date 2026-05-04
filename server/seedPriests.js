const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const PriestProfile = require('./models/PriestProfile');

dotenv.config();

// We have 14 unique files. We will duplicate the last one to make 15 priests.
const priestData = [
  { file: 'media__1777317584550.jpg', name: 'Pandit Narayan Bhat', bio: 'Expert in Vedic Astrology and Mahamrityunjay Jaap.', years: 18 },
  { file: 'media__1777317596649.jpg', name: 'Acharya Vishwanath', bio: 'Specialist in Navagraha Shanti and Mangal Dosh Nivaran.', years: 12 },
  { file: 'media__1777317604332.jpg', name: 'Shri Ramakant Shastri', bio: 'Head Priest for Abhishek and Rudrabhishek ceremonies.', years: 25 },
  { file: 'media__1777317611816.jpg', name: 'Pandit Keshav Dutt', bio: 'Vastu Consultant and expert in Griha Pravesh Puja.', years: 10 },
  { file: 'media__1777317617869.jpg', name: 'Swami Yogananda', bio: 'Specialist in Upanayana (Thread Ceremony) and Vivah (Marriage).', years: 20 },
  { file: 'media__1777317639428.jpg', name: 'Pandit Hari Om', bio: 'Maha Aarti Lead and Bhagavad Gita scholar.', years: 15 },
  { file: 'media__1777317657671.jpg', name: 'Acharya Devanand', bio: 'Expert in Pitru Dosh Nivaran and Shradh Rituals.', years: 14 },
  { file: 'media__1777317664025.jpg', name: 'Pandit Satish Pandey', bio: 'Specialist in Satyanarayan Katha and Vrat rituals.', years: 8 },
  { file: 'media__1777317670906.jpg', name: 'Shri Gopinath Joshi', bio: 'Expert in Kaal Sarp Dosh Nivaran and Chandi Path.', years: 22 },
  { file: 'media__1777317678783.jpg', name: 'Acharya Madhav Rao', bio: 'Head Priest for Janmashtami and Ram Navami celebrations.', years: 30 },
  { file: 'media__1777317694142.jpg', name: 'Pandit Dinesh Tiwari', bio: 'Specialist in Durga Saptashati Path and Navratri Havans.', years: 11 },
  { file: 'media__1777317700974.jpg', name: 'Swami Chaitanya', bio: 'Expert in Rudraksha Dharan and Mantra Diksha.', years: 16 },
  { file: 'media__1777317707536.jpg', name: 'Pandit Ravi Sharma', bio: 'Specialist in Vidyarambham and Saraswati Puja.', years: 9 },
  { file: 'media__1777317715437.jpg', name: 'Acharya Shivkumar', bio: 'Head Priest for Mahashivratri and Pradosh Vrat Abhishek.', years: 21 },
  { file: 'media__1777317715437.jpg', name: 'Pandit Balakrishna', bio: 'Specialist in Annaprashan and Namakaran Sanskar.', years: 13 },
];

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tirthone';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected for Seeding Priests...');

    console.log('Seeding 15 priests...');

    for (let i = 0; i < priestData.length; i++) {
      const data = priestData[i];
      const email = `priest${i + 1}@tirthone.com`;

      // Create User Account
      let user = await User.findOne({ email });
      if (!user) {
        user = new User({
          name: data.name,
          email: email,
          mobile: `98765444${i.toString().padStart(2, '0')}`, // different mobile prefix from guides
          password: 'password123',
          role: 'priest',
          isBlocked: false
        });
        await user.save();
        console.log(`Created User: ${data.name}`);
      }

      // Create or Update Priest Profile
      let profile = await PriestProfile.findOne({ user: user._id });
      if (!profile) {
        profile = new PriestProfile({
          user: user._id,
          age: 35 + (i % 25), // typical age range for priests
          photoUrl: `/priests/${data.file}`,
          bio: data.bio,
          yearsExperience: data.years,
          isVerified: true,
          isActive: true,
          displayOrder: i
        });
        await profile.save();
        console.log(`Created Profile for: ${data.name}`);
      } else {
        profile.photoUrl = `/priests/${data.file}`;
        profile.bio = data.bio;
        profile.yearsExperience = data.years;
        profile.isVerified = true;
        profile.isActive = true;
        await profile.save();
        console.log(`Updated Profile for: ${data.name}`);
      }
    }

    console.log('Successfully Seeded 15 Priests into the DB!');
    process.exit();
  } catch (err) {
    console.error('Error Seeding Database:', err);
    process.exit(1);
  }
};

seedDB();
