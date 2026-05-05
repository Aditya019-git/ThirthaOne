import { useNavigate, useLocation } from 'react-router-dom';

const OM_SYMBOL = '\u0950';

const PublicNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const goToLoginForBooking = () => {
    navigate('/login', { state: { from: { pathname: '/book-pass' } } });
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav style={styles.navbar}>
      <div style={styles.navLogo} onClick={() => navigate('/')} role="button" tabIndex={0}>
        <span style={styles.om}>{OM_SYMBOL}</span>
        <div>
          <div style={styles.logoTitle}>TirthOne</div>
          <div style={styles.logoSub}>SACRED DARSHAN PORTAL</div>
        </div>
      </div>
      <div style={styles.navLinks}>
        <button style={{ ...styles.navLinkBtn, color: '#f0e6d3' }} onClick={goToLoginForBooking}>
          Book Pass
        </button>
        <button 
          style={{ ...styles.navLinkBtn, color: isActive('/about') ? '#E8C97A' : '#f0e6d3' }} 
          onClick={() => navigate('/about')}
        >
          About Temple
        </button>
        <button 
          style={{ ...styles.navLinkBtn, color: isActive('/nearby') ? '#E8C97A' : '#f0e6d3' }} 
          onClick={() => navigate('/nearby')}
        >
          Nearby Places
        </button>
        <button 
          style={{ ...styles.navLinkBtn, color: isActive('/gallery') ? '#E8C97A' : '#f0e6d3' }} 
          onClick={() => navigate('/gallery')}
        >
          Gallery
        </button>
        <button 
          style={{ ...styles.navLinkBtn, color: isActive('/contact') ? '#E8C97A' : '#f0e6d3' }} 
          onClick={() => navigate('/contact')}
        >
          Contact Us
        </button>
        <button style={styles.navBtn} onClick={() => navigate('/login')}>
          Login / Register
        </button>
      </div>
    </nav>
  );
};

const styles = {
  navbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 40px',
    backgroundColor: '#3D0A0A',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  },
  navLogo: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' },
  om: { fontSize: '20px', color: '#E07B39', fontWeight: 700 },
  logoTitle: { fontSize: '20px', fontWeight: '700', color: '#E8C97A', letterSpacing: '2px' },
  logoSub: { fontSize: '9px', color: '#c8a96e', letterSpacing: '3px' },
  navLinks: { display: 'flex', alignItems: 'center', gap: '28px' },
  navLinkBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '15px',
    fontFamily: 'Calibri, sans-serif',
    cursor: 'pointer',
    padding: 0,
    fontWeight: '500',
    transition: 'color 0.2s'
  },
  navBtn: {
    padding: '10px 20px',
    backgroundColor: '#E07B39',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'background 0.2s'
  }
};

export default PublicNavbar;
