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
          <button style={styles.secondaryBtn} type="button" onClick={() => navigate('/dashboard')}>
            View Booking Status
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
    maxWidth: '980px',
    margin: '0 auto',
    background: 'linear-gradient(120deg, #22354a, #1f6f6d)',
    color: '#fff',
    borderRadius: '14px',
    padding: '20px'
  },
  title: {
    margin: '0 0 6px',
    fontSize: '30px',
    fontFamily: 'Georgia, serif'
  },
  sub: {
    margin: 0,
    opacity: 0.92
  },
  card: {
    maxWidth: '980px',
    margin: '16px auto 0',
    background: '#fff',
    border: '1px solid #d7dfe8',
    borderRadius: '12px',
    padding: '14px',
    boxShadow: '0 6px 18px rgba(30, 45, 60, 0.08)'
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: '8px',
    color: '#1f3347'
  },
  cardText: {
    marginTop: 0,
    color: '#4f6478',
    fontSize: '14px'
  },
  actionRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  primaryBtn: {
    border: 'none',
    background: '#1f4e8c',
    color: '#fff',
    borderRadius: '8px',
    padding: '10px 12px',
    cursor: 'pointer',
    fontWeight: '700'
  },
  secondaryBtn: {
    border: 'none',
    background: '#15803d',
    color: '#fff',
    borderRadius: '8px',
    padding: '10px 12px',
    cursor: 'pointer',
    fontWeight: '700'
  },
  dangerBtn: {
    border: 'none',
    background: '#b42318',
    color: '#fff',
    borderRadius: '8px',
    padding: '10px 12px',
    cursor: 'pointer',
    fontWeight: '700'
  }
};

export default GateDashboard;
