import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useState, useEffect } from 'react';

const PROFILE_GALLERY_IMAGES = [
  {
    src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Devotees_at_Kedarnath_temple%2C_Uttrakhand_01.jpg',
    title: 'Devotees in Darshan Queue'
  },
  {
    src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Devotees_at_Kedarnath_temple%2C_Uttrakhand_02.jpg',
    title: 'Pilgrims During Temple Visit'
  },
  {
    src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Devotees_seen_at_the_Bagheswari_Temple1.jpg',
    title: 'Temple Devotion Moments'
  },
  {
    src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bhimashankar_temple_front.jpg',
    title: 'Bhimashankar Temple View'
  },
  {
    src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bhimashankar_temple%2C_Maharashtra.JPG',
    title: 'Sacred Architecture'
  },
  {
    src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bhimashankar_temple_2%2C_pune.jpg',
    title: 'Temple Complex'
  }
];

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [templeStatus, setTempleStatus] = useState({
    waitTimeMins: 45,
    events: [
      { id: 1, month: 'MAR', day: '08', name: 'Mahashivratri', desc: 'Grand celebration with midnight Aarti.' },
      { id: 2, month: 'MAR', day: '25', name: 'Ram Navami', desc: 'Special darshan and continuous chanting.' }
    ],
    nextAarti: {
      name: 'Sandhya Aarti',
      time: '6:30 PM',
      status: 'Preparing',
      indicator: 'yellow'
    }
  });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await API.get('/auth/temple-status');
        if (res.data && res.data.success) {
          setTempleStatus(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch temple status:', err);
      }
    };
    fetchStatus();
  }, []);

  useEffect(() => {
    if (user?.role === 'priest') {
      navigate('/priest', { replace: true });
    } else if (user?.role === 'guide') {
      navigate('/guide', { replace: true });
    } else if (user?.role === 'gate_officer') {
      navigate('/gate', { replace: true });
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRaiseComplaint = async () => {
    const issue = window.prompt("Describe your issue or complaint with the Temple services:");
    if (!issue) return;
    try {
      await API.post('/complaints', {
        targetType: 'Temple',
        issueDescription: issue
      });
      alert('Complaint submitted successfully. Operations will review it.');
    } catch (err) {
      alert('Failed to submit complaint.');
    }
  };

  return (
    <div style={styles.page}>
      <section style={styles.profileCard}>
        <div style={styles.profileLeft}>
          <div style={styles.avatar}>
            {(user?.name || 'D').slice(0, 1).toUpperCase()}
          </div>
          <div style={styles.profileText}>
            <h2 style={styles.title}>Welcome, {user?.name || 'Devotee'}!</h2>
            <p style={styles.meta}>Role: <strong>{user?.role}</strong></p>
            <p style={styles.meta}>Mobile: {user?.mobile}</p>
          </div>
        </div>
        <div style={styles.profileRight}>
          {user?.role === 'admin' && (
            <button onClick={() => navigate('/admin')} style={styles.headerBtnAdmin}>
              ⚙️ Admin Panel
            </button>
          )}
          <button onClick={handleLogout} style={styles.headerBtnLogout}>
            🚪 Logout
          </button>
        </div>
      </section>

      <section style={styles.actionGridContainer}>
        <div onClick={() => navigate('/book-pass')} style={styles.cardEtch}>
          <div style={styles.etchIcon}>🎟️</div>
          <span style={styles.etchText}>Book VIP Pass</span>
        </div>
        <div onClick={() => navigate('/book-pass')} style={styles.cardEtch}>
          <div style={styles.etchIcon}>🕉️</div>
          <span style={styles.etchText}>Book Priest</span>
        </div>
        <div onClick={() => navigate('/guide-booking')} style={styles.cardEtch}>
          <div style={styles.etchIcon}>🗺️</div>
          <span style={styles.etchText}>Book Guide</span>
        </div>
        <div onClick={handleRaiseComplaint} style={styles.cardEtch}>
          <div style={styles.etchIcon}>📋</div>
          <span style={styles.etchText}>Raise Complaint</span>
        </div>
      </section>

      <div style={styles.featuresLayout}>
        <section style={styles.eventsSection}>
          <h3 style={styles.sectionHeading}>Upcoming Temple Events</h3>
          <div style={styles.eventsList}>
             {templeStatus.events.map(event => (
               <div key={event.id} style={styles.eventCard}>
                  <div style={styles.eventDateBox}>
                    <span style={styles.eventMonth}>{event.month}</span>
                    <span style={styles.eventDay}>{event.day}</span>
                  </div>
                  <div style={styles.eventDetails}>
                    <h4 style={styles.eventName}>{event.name}</h4>
                    <p style={styles.eventDesc}>{event.desc}</p>
                  </div>
               </div>
             ))}
          </div>
        </section>

        <section style={styles.statusSection}>
           <h3 style={styles.sectionHeading}>Live Darshan Status</h3>
           <div style={styles.statusCard}>
              <h4 style={styles.statusTitle}>Sri Venkateswara Queue</h4>
              <p style={styles.statusText}>Estimated Wait: <strong>{templeStatus.waitTimeMins} Mins</strong></p>
              <div style={styles.statusIndicator}>
                <span style={styles.dotGreen}></span> Normal Crowd
              </div>
           </div>
           <div style={styles.statusCard}>
              <h4 style={styles.statusTitle}>Next Temple Aarti</h4>
              <p style={styles.statusText}>{templeStatus.nextAarti.name} at <strong>{templeStatus.nextAarti.time}</strong></p>
              <div style={styles.statusIndicator}>
                <span style={templeStatus.nextAarti.indicator === 'yellow' ? styles.dotYellow : styles.dotGreen}></span> {templeStatus.nextAarti.status}
              </div>
           </div>
        </section>
      </div>

      <section style={styles.gallerySection}>
        <h3 style={styles.galleryTitle}>Temple And Devotee Gallery</h3>
        <p style={styles.gallerySub}>
          Inspiration for your upcoming darshan journey.
        </p>
        <div style={styles.grid}>
          {PROFILE_GALLERY_IMAGES.map((item) => (
            <article key={item.src} style={styles.card}>
              <img src={item.src} alt={item.title} style={styles.image} loading="lazy" />
              <div style={styles.caption}>{item.title}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f2ebdf',
    padding: '24px',
    fontFamily: 'Calibri, sans-serif'
  },
  profileCard: {
    maxWidth: '980px',
    margin: '0 auto',
    borderRadius: '14px',
    background: 'linear-gradient(120deg, #4b130f, #7a2d17)',
    color: '#fff',
    padding: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '20px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
  },
  profileLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  profileRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerBtnLogout: {
    backgroundColor: 'transparent',
    color: '#E8C97A',
    border: '1px solid #E8C97A',
    padding: '10px 20px',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s, color 0.2s'
  },
  headerBtnAdmin: {
    backgroundColor: '#E8C97A',
    color: '#3D0A0A',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s'
  },
  avatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#E8C97A',
    color: '#3D0A0A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    fontWeight: 'bold'
  },
  profileText: {
    display: 'flex',
    flexDirection: 'column'
  },
  title: {
    margin: '0 0 4px 0',
    fontSize: '24px'
  },
  meta: {
    margin: '2px 0',
    opacity: 0.93
  },
  actionGridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '24px',
    maxWidth: '980px',
    margin: '40px auto 40px auto',
  },
  cardEtch: {
    backgroundColor: '#fff',
    borderRadius: '4px',
    padding: '24px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    border: '1px solid #E8C97A',
    boxShadow: '0 2px 4px rgba(232, 201, 122, 0.2)',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  etchIcon: {
    fontSize: '24px',
  },
  etchText: {
    color: '#4b130f',
    fontFamily: "'Georgia', serif",
    fontSize: '18px',
  },
  featuresLayout: {
    display: 'flex',
    gap: '24px',
    maxWidth: '980px',
    margin: '0 auto 40px auto',
    flexWrap: 'wrap',
  },
  eventsSection: {
    flex: '2 1 500px',
  },
  statusSection: {
    flex: '1 1 300px',
  },
  sectionHeading: {
    color: '#3D0A0A',
    fontSize: '20px',
    margin: '0 0 16px 0',
    borderBottom: '2px solid #E8C97A',
    paddingBottom: '8px',
    display: 'inline-block'
  },
  eventsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  eventCard: {
    display: 'flex',
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2d5c3',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    overflow: 'hidden'
  },
  eventDateBox: {
    backgroundColor: '#E8C97A',
    color: '#3D0A0A',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '80px'
  },
  eventMonth: {
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  eventDay: {
    fontSize: '24px',
    fontWeight: '900'
  },
  eventDetails: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  },
  eventName: {
    margin: '0 0 4px 0',
    color: '#3D0A0A',
    fontSize: '18px'
  },
  eventDesc: {
    margin: 0,
    color: '#666',
    fontSize: '14px'
  },
  statusCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #e2d5c3',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    marginBottom: '12px'
  },
  statusTitle: {
    margin: '0 0 8px 0',
    color: '#3D0A0A',
    fontSize: '16px'
  },
  statusText: {
    margin: '0 0 12px 0',
    color: '#444',
    fontSize: '14px'
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#555',
    background: '#FAF6E9',
    padding: '6px 10px',
    borderRadius: '6px',
    display: 'inline-flex'
  },
  dotGreen: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10B981'
  },
  dotYellow: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#F59E0B'
  },
  gallerySection: {
    maxWidth: '980px',
    margin: '20px auto 0'
  },
  galleryTitle: {
    margin: '0 0 6px',
    color: '#2e1f13',
    fontSize: '28px',
    fontFamily: 'Georgia, serif'
  },
  gallerySub: {
    margin: '0 0 12px',
    color: '#645748'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 3px 12px rgba(30, 20, 10, 0.16)'
  },
  image: {
    width: '100%',
    height: '180px',
    objectFit: 'cover',
    display: 'block'
  },
  caption: {
    padding: '10px 12px',
    color: '#39291c',
    fontSize: '13px',
    fontWeight: '700'
  }
};

export default Dashboard;
