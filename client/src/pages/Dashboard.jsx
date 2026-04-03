import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={styles.page}>
      <section style={styles.profileCard}>
        <div style={styles.avatar}>
          {(user?.name || 'D').slice(0, 1).toUpperCase()}
        </div>
        <div style={styles.profileText}>
          <h2 style={styles.title}>Welcome, {user?.name || 'Devotee'}!</h2>
          <p style={styles.meta}>Role: <strong>{user?.role}</strong></p>
          <p style={styles.meta}>Mobile: {user?.mobile}</p>
        </div>
      </section>

      <section style={styles.actions}>
        <button
          onClick={() => navigate('/book-pass')}
          style={styles.primaryBtn}
        >
          Book Pass
        </button>
        <button
          onClick={handleLogout}
          style={styles.secondaryBtn}
        >
          Logout
        </button>
      </section>

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
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px 22px'
  },
  avatar: {
    width: '58px',
    height: '58px',
    borderRadius: '50%',
    background: '#f3c98a',
    color: '#4b130f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: '700'
  },
  profileText: { flex: 1 },
  title: {
    margin: '0 0 6px',
    fontSize: '28px',
    fontFamily: 'Georgia, serif'
  },
  meta: {
    margin: '2px 0',
    opacity: 0.93
  },
  actions: {
    maxWidth: '980px',
    margin: '12px auto 0',
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  primaryBtn: {
    padding: '10px 18px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#3D0A0A',
    color: '#fff',
    fontWeight: '700',
    cursor: 'pointer'
  },
  secondaryBtn: {
    padding: '10px 18px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#E07B39',
    color: '#fff',
    fontWeight: '700',
    cursor: 'pointer'
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
