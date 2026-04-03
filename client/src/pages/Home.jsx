import { useNavigate } from 'react-router-dom';

const OM_SYMBOL = '\u0950';
const TRISHUL_SYMBOL = '\uD83D\uDD31';
const HOME_TEMPLE_IMAGES = [
  {
    src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bhimashankar_temple_front.jpg',
    title: 'Temple Front View'
  },
  {
    src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bhimashankar_temple%2C_Maharashtra.JPG',
    title: 'Jyotirlinga Heritage'
  },
  {
    src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bhimashankar_temple_2%2C_pune.jpg',
    title: 'Sacred Courtyard'
  },
  {
    src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bhimashankar_temple.JPG',
    title: 'Darshan Path'
  }
];

const Home = () => {
  const navigate = useNavigate();

  const goToLoginForBooking = () => {
    navigate('/login', { state: { from: { pathname: '/book-pass' } } });
  };

  return (
    <div style={styles.wrapper}>
      <nav style={styles.navbar}>
        <div style={styles.navLogo}>
          <span style={styles.om}>{OM_SYMBOL}</span>
          <div>
            <div style={styles.logoTitle}>TirthOne</div>
            <div style={styles.logoSub}>SACRED DARSHAN PORTAL</div>
          </div>
        </div>
        <div style={styles.navLinks}>
          <button style={styles.navLinkBtn} onClick={goToLoginForBooking}>
            Book Pass
          </button>
          <a href="#passes" style={styles.navLink}>My Passes</a>
          <a href="#about" style={styles.navLink}>About Temple</a>
          <button style={styles.navBtn} onClick={() => navigate('/login')}>
            Login / Register
          </button>
        </div>
      </nav>

      <section style={styles.hero}>
        <div style={styles.heroBadge}>
          <span style={styles.badgeIcon}>{TRISHUL_SYMBOL}</span>
          JYOTIRLINGA VIP DARSHAN
        </div>
        <h1 style={styles.heroTitle}>Bhimashankar</h1>
        <h2 style={styles.heroSubTitle}>VIP Pass Booking</h2>
        <p style={styles.heroHindi}>Shri Bhimashankar Jyotirling</p>
        <p style={styles.heroDesc}>
          Skip the queue. Book your exclusive VIP Darshan pass online for
          Bhimashankar Jyotirlinga, one of the twelve sacred Jyotirlingas of Lord Shiva.
        </p>
        <div style={styles.heroButtons}>
          <button style={styles.btnPrimary} onClick={goToLoginForBooking}>
            Book VIP Pass Now
          </button>
          <button style={styles.btnOutline} onClick={() => navigate('/about')}>
            Know Before You Visit
          </button>
        </div>
      </section>

      <section style={styles.stats}>
        <div style={styles.statItem}>
          <div style={styles.statNumber}>6</div>
          <div style={styles.statLabel}>MEMBERS PER PASS</div>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statItem}>
          <div style={styles.statNumber}>4</div>
          <div style={styles.statLabel}>DAILY TIME SLOTS</div>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statItem}>
          <div style={styles.statNumber}>100%</div>
          <div style={styles.statLabel}>SECURE AND DIGITAL</div>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statItem}>
          <div style={styles.statNumber}>QR</div>
          <div style={styles.statLabel}>INSTANT ENTRY PASS</div>
        </div>
      </section>

      <section style={styles.gallerySection} id="about">
        <div style={styles.galleryHeader}>
          <h3 style={styles.galleryTitle}>Temple Glimpses</h3>
          <p style={styles.gallerySub}>
            A visual journey through Bhimashankar surroundings and sacred spaces.
          </p>
        </div>
        <div style={styles.galleryGrid}>
          {HOME_TEMPLE_IMAGES.map((image) => (
            <article key={image.src} style={styles.galleryCard}>
              <img src={image.src} alt={image.title} style={styles.galleryImage} loading="lazy" />
              <div style={styles.galleryCaption}>{image.title}</div>
            </article>
          ))}
        </div>
      </section>

      <footer style={styles.footer}>
        <div style={styles.footerOm}>{OM_SYMBOL}</div>
        <div style={styles.footerTitle}>TirthOne</div>
        <p style={styles.footerSub}>
          Official VIP Darshan Pass Portal for Bhimashankar Jyotirlinga - Pune, Maharashtra
        </p>
        <p style={styles.footerCopy}>
          Copyright 2025 TirthOne - Built with devotion for devotees
        </p>
      </footer>
    </div>
  );
};

const styles = {
  wrapper: { fontFamily: "'Georgia', serif", margin: 0, padding: 0 },
  navbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 40px',
    backgroundColor: '#3D0A0A',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  navLogo: { display: 'flex', alignItems: 'center', gap: '10px' },
  om: { fontSize: '20px', color: '#E07B39', fontWeight: 700 },
  logoTitle: { fontSize: '20px', fontWeight: '700', color: '#E8C97A', letterSpacing: '2px' },
  logoSub: { fontSize: '9px', color: '#c8a96e', letterSpacing: '3px' },
  navLinks: { display: 'flex', alignItems: 'center', gap: '28px' },
  navLink: { color: '#f0e6d3', textDecoration: 'none', fontSize: '14px', fontFamily: 'Calibri, sans-serif' },
  navLinkBtn: {
    color: '#f0e6d3',
    background: 'transparent',
    border: 'none',
    fontSize: '14px',
    fontFamily: 'Calibri, sans-serif',
    cursor: 'pointer',
    padding: 0
  },
  navBtn: {
    padding: '10px 20px',
    backgroundColor: '#E07B39',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  hero: {
    backgroundColor: '#6B1010',
    backgroundImage: 'radial-gradient(ellipse at center, #8B1A1A 0%, #4A0808 100%)',
    padding: '80px 40px',
    textAlign: 'center',
    color: '#fff',
    minHeight: '70vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    border: '1px solid #E8C97A',
    color: '#E8C97A',
    padding: '8px 20px',
    borderRadius: '20px',
    fontSize: '12px',
    letterSpacing: '2px',
    marginBottom: '24px'
  },
  badgeIcon: { fontSize: '11px', fontWeight: 700 },
  heroTitle: { fontSize: '64px', fontWeight: '800', color: '#fff', margin: '0 0 4px', letterSpacing: '2px' },
  heroSubTitle: { fontSize: '48px', fontWeight: '700', color: '#E8C97A', margin: '0 0 12px' },
  heroHindi: { fontSize: '20px', color: '#f0d9b5', marginBottom: '20px', fontFamily: 'sans-serif' },
  heroDesc: {
    fontSize: '15px',
    color: '#d4b896',
    maxWidth: '560px',
    lineHeight: '1.7',
    marginBottom: '36px',
    fontFamily: 'Calibri, sans-serif'
  },
  heroButtons: { display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' },
  btnPrimary: {
    padding: '14px 28px',
    backgroundColor: '#E07B39',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  btnOutline: {
    padding: '14px 28px',
    backgroundColor: 'transparent',
    color: '#E8C97A',
    border: '2px solid #E8C97A',
    borderRadius: '8px',
    fontSize: '15px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  stats: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '32px 40px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #eee',
    flexWrap: 'wrap'
  },
  gallerySection: {
    padding: '44px 30px 56px',
    backgroundColor: '#e8e0d3'
  },
  galleryHeader: {
    maxWidth: '980px',
    margin: '0 auto 18px'
  },
  galleryTitle: {
    margin: '0 0 8px',
    color: '#2d1b0f',
    fontSize: '30px'
  },
  gallerySub: {
    margin: 0,
    color: '#5d4f3f',
    fontSize: '14px',
    fontFamily: 'Calibri, sans-serif'
  },
  galleryGrid: {
    maxWidth: '980px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px'
  },
  galleryCard: {
    backgroundColor: '#f8f5ef',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 3px 10px rgba(30, 20, 10, 0.18)'
  },
  galleryImage: {
    width: '100%',
    height: '190px',
    objectFit: 'cover',
    display: 'block'
  },
  galleryCaption: {
    padding: '10px 12px',
    color: '#3d2a1e',
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: 'Calibri, sans-serif'
  },
  statItem: { textAlign: 'center', padding: '0 48px' },
  statNumber: { fontSize: '36px', fontWeight: '700', color: '#E07B39', fontFamily: 'Georgia, serif' },
  statLabel: { fontSize: '11px', color: '#888', letterSpacing: '2px', marginTop: '4px', fontFamily: 'Calibri, sans-serif' },
  statDivider: { width: '1px', height: '50px', backgroundColor: '#ddd' },
  footer: {
    backgroundColor: '#3D0A0A',
    color: '#f0e6d3',
    textAlign: 'center',
    padding: '40px 20px'
  },
  footerOm: { fontSize: '22px', color: '#E8C97A', marginBottom: '4px', fontWeight: 700 },
  footerTitle: { fontSize: '22px', fontWeight: '700', color: '#E8C97A', letterSpacing: '3px', marginBottom: '8px' },
  footerSub: { fontSize: '13px', color: '#c8a96e', marginBottom: '6px', fontFamily: 'Calibri, sans-serif' },
  footerCopy: { fontSize: '12px', color: '#a08060', fontFamily: 'Calibri, sans-serif' }
};

export default Home;
