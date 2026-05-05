import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GateDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <h1 style={styles.title}>Gate Officer Dashboard</h1>
        <p style={styles.sub}>Namaste {user?.name || 'Officer'}, manage entry validation from here.</p>
      </section>

      <section style={styles.card}>
        <h3 style={styles.cardTitle}>VIP Gate Check-In</h3>
        <p style={styles.cardText}>
          Scan QR continuously at gate to auto-mark passes as visited and block duplicate entry.
        </p>
        <div style={styles.actionRow}>
          <button style={styles.primaryBtn} type="button" onClick={() => navigate('/gate/scan')}>
            Scan Pass
          </button>
          <button style={styles.dangerBtn} type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </section>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    padding: '24px',
    background: '#f8f3e9',
    fontFamily: 'Calibri, sans-serif'
  },
  hero: {
    background: 'linear-gradient(120deg, #4b130f, #7a2d17)',
    color: '#fff',
    borderRadius: '14px',
    padding: '30px 24px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
  },
  title: {
    margin: '0 0 6px',
    fontSize: '32px',
  },
  sub: {
    margin: 0,
    opacity: 0.92,
    fontSize: '16px'
  },
  card: {
    maxWidth: '980px',
    margin: '24px auto 0',
    background: '#fff',
    border: 'none',
    borderTop: '4px solid #E8C97A',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 8px 24px rgba(61, 10, 10, 0.08)'
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: '8px',
    color: '#3D0A0A',
    fontSize: '22px'
  },
  cardText: {
    marginTop: 0,
    marginBottom: '24px',
    color: '#555',
    fontSize: '15px'
  },
  actionRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  primaryBtn: {
    border: 'none',
    background: '#E8C97A',
    color: '#3D0A0A',
    borderRadius: '8px',
    padding: '12px 20px',
    cursor: 'pointer',
    fontWeight: '800',
    fontSize: '15px',
    transition: 'transform 0.2s'
  },
  secondaryBtn: {
    border: '1px solid #E8C97A',
    background: '#fcfaf7',
    color: '#3D0A0A',
    borderRadius: '8px',
    padding: '12px 20px',
    cursor: 'pointer',
    fontWeight: '800',
    fontSize: '15px',
    transition: 'background-color 0.2s'
  },
  dangerBtn: {
    border: '1px solid #b42318',
    background: 'transparent',
    color: '#b42318',
    borderRadius: '8px',
    padding: '12px 20px',
    cursor: 'pointer',
    fontWeight: '800',
    fontSize: '15px',
    transition: 'background-color 0.2s'
  }
};

export default GateDashboard;
