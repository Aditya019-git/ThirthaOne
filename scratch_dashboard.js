const fs = require('fs');

// ==== 1. Update Backend bookingController.js ====
let backend = fs.readFileSync('server/controllers/bookingController.js', 'utf8');

backend = backend.replace(
  /const getMyBookings = async \(req, res\) => {[\s\S]*?res\.status\(200\)\.json\(\{ bookings: bookings\.map\(serializeBooking\) \}\);\n\s*\} catch \(error\) {[\s\S]*?};/,
  `const getMyBookings = async (req, res) => {
  try {
    const PriestBooking = require('../models/PriestBooking');
    const GuideBooking = require('../models/GuideBooking');

    const query = req.user.role === 'admin' ? {} : { user: req.user.id };
    const bookings = await Booking.find(query).sort({ createdAt: -1 });

    const priestQuery = req.user.role === 'admin' ? {} : { devotee: req.user.id };
    const priestBookings = await PriestBooking.find(priestQuery).populate('priest', 'name').sort({ createdAt: -1 });

    const guideQuery = req.user.role === 'admin' ? {} : { devotee: req.user.id };
    const guideBookings = await GuideBooking.find(guideQuery).populate('guide', 'name').sort({ createdAt: -1 });

    res.status(200).json({ 
      bookings: bookings.map(serializeBooking),
      priestBookings,
      guideBookings
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};`
);
fs.writeFileSync('server/controllers/bookingController.js', backend);
console.log('bookingController.js updated');

// ==== 2. Update Frontend Dashboard.jsx ====
let frontend = fs.readFileSync('client/src/pages/Dashboard.jsx', 'utf8');

// Add state variables
frontend = frontend.replace(
  /const \[bookings, setBookings\] = useState\(\[\]\);/,
  `const [bookings, setBookings] = useState([]);
  const [priestBookings, setPriestBookings] = useState([]);
  const [guideBookings, setGuideBookings] = useState([]);`
);

// Update fetch call
frontend = frontend.replace(
  /setBookings\(Array\.isArray\(res\.data\?\.bookings\) \? res\.data\.bookings : \[\]\);/,
  `setBookings(Array.isArray(res.data?.bookings) ? res.data.bookings : []);
      setPriestBookings(Array.isArray(res.data?.priestBookings) ? res.data.priestBookings : []);
      setGuideBookings(Array.isArray(res.data?.guideBookings) ? res.data.guideBookings : []);`
);

// Append the new UI blocks right before </section> of bookingsSection
let priestBlock = `
        {priestBookings.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={styles.bookingsTitle}>My Priest Bookings</h4>
            <div style={styles.bookingsGrid} className="mt-3">
              {priestBookings.map((pb) => (
                <article key={pb._id} style={styles.bookingCard}>
                  <div style={styles.bookingTopRow}>
                    <div>
                      <div style={styles.bookingIdLabel}>Priest</div>
                      <div style={styles.bookingIdValue}>{pb.priest?.name || 'Assigned soon'}</div>
                    </div>
                    <span style={{ ...styles.statusChip, ...getStatusChipStyle(pb.status) }}>{pb.status}</span>
                  </div>
                  <div style={styles.bookingInfoRow}>
                    <span style={styles.bookingInfoLabel}>Ritual:</span>
                    <strong style={styles.bookingInfoValue}>{pb.ritualType}</strong>
                  </div>
                  <div style={styles.bookingInfoRow}>
                    <span style={styles.bookingInfoLabel}>Slot:</span>
                    <strong style={styles.bookingInfoValue}>{pb.timeSlot || '-'}</strong>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
`;

let guideBlock = `
        {guideBookings.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={styles.bookingsTitle}>My Guide Bookings</h4>
            <div style={styles.bookingsGrid} className="mt-3">
              {guideBookings.map((gb) => (
                <article key={gb._id} style={styles.bookingCard}>
                  <div style={styles.bookingTopRow}>
                    <div>
                      <div style={styles.bookingIdLabel}>Guide</div>
                      <div style={styles.bookingIdValue}>{gb.guide?.name || 'Assigned soon'}</div>
                    </div>
                    <span style={{ ...styles.statusChip, ...getStatusChipStyle(gb.status) }}>{gb.status}</span>
                  </div>
                  <div style={styles.bookingInfoRow}>
                    <span style={styles.bookingInfoLabel}>Date:</span>
                    <strong style={styles.bookingInfoValue}>{formatBookingDate(gb.tripDate)}</strong>
                  </div>
                  <div style={styles.bookingInfoRow}>
                    <span style={styles.bookingInfoLabel}>Language:</span>
                    <strong style={styles.bookingInfoValue}>{gb.language || '-'}</strong>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
`;

frontend = frontend.replace(
  /<\/section>\s*\}\)\s*<section style=\{styles\.gallerySection\}>/m,
  `${priestBlock}${guideBlock}
      </section>
      )}

      <section style={styles.gallerySection}>`
);

fs.writeFileSync('client/src/pages/Dashboard.jsx', frontend);
console.log('Dashboard.jsx updated');
