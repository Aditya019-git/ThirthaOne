import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }),
    []
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const modules = [
    {
      title: 'Gate Operations',
      text: 'Monitor gate scans, instant check-ins, duplicate blocks, and admin overrides.',
      primary: { label: 'Open Gate Dashboard', onClick: () => navigate('/gate') },
      secondary: { label: 'Open Gate Scanner', onClick: () => navigate('/gate/scan') }
    },
    {
      title: 'Devotee Bookings',
      text: 'Review pass flow, track status movement, and inspect QR pass data from dashboard.',
      primary: { label: 'Open Devotee Dashboard', onClick: () => navigate('/dashboard') },
      secondary: { label: 'Book VIP Pass', onClick: () => navigate('/book-pass') }
    },
    {
      title: 'Priest Operations',
      text: 'Onboard verified priests, maintain profile cards, and validate service availability.',
      primary: { label: 'Manage Priests', onClick: () => navigate('/admin/priests') },
      secondary: { label: 'Test Priest Booking', onClick: () => navigate('/priest-booking') }
    },
    {
      title: 'Guide Operations',
      text: 'Onboard verified guides, define destinations and pricing, and monitor trip confirmations + refunds.',
      primary: { label: 'Manage Guides', onClick: () => navigate('/admin/guides') },
      secondary: { label: 'Test Guide Booking', onClick: () => navigate('/guide-booking') }
    }
  ];

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <section style={styles.hero}>
          <div>
            <p style={styles.heroEyebrow}>Temple Command Center</p>
            <h1 style={styles.heroTitle}>Admin Operations Dashboard</h1>
            <p style={styles.heroSub}>
              Welcome, {user?.name || 'Admin'}. Centralized control for booking, gate, and priest services.
            </p>
          </div>
          <div style={styles.heroMeta}>
            <div style={styles.metaCard}>
              <span style={styles.metaLabel}>Today</span>
              <strong style={styles.metaValue}>{todayLabel}</strong>
            </div>
            <div style={styles.metaCard}>
              <span style={styles.metaLabel}>Role</span>
              <strong style={styles.metaValue}>{user?.role || 'admin'}</strong>
            </div>
          </div>
        </section>

        <section style={styles.quickStrip}>
          <button style={styles.quickBtn} type="button" onClick={() => navigate('/dashboard')}>
            Devotee View
          </button>
          <button style={styles.quickBtn} type="button" onClick={() => navigate('/gate')}>
            Gate View
          </button>
          <button style={styles.quickBtn} type="button" onClick={() => navigate('/admin/priests')}>
            Priest Setup
          </button>
          <button style={styles.quickBtn} type="button" onClick={() => navigate('/admin/guides')}>
            Guide Setup
          </button>
          <button style={styles.logoutBtn} type="button" onClick={handleLogout}>
            Secure Logout
          </button>
        </section>

        <section style={styles.grid}>
          {modules.map((item) => (
            <article key={item.title} style={styles.card}>
              <h3 style={styles.cardTitle}>{item.title}</h3>
              <p style={styles.cardText}>{item.text}</p>
              <div style={styles.cardActions}>
                <button style={styles.primaryBtn} type="button" onClick={item.primary.onClick}>
                  {item.primary.label}
                </button>
                <button style={styles.secondaryBtn} type="button" onClick={item.secondary.onClick}>
                  {item.secondary.label}
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: 'radial-gradient(circle at 18% 10%, #f9efe3 0%, #f2e9de 46%, #e9e3f2 100%)',
    padding: '24px',
    fontFamily: 'Calibri, sans-serif'
  },
  container: {
    maxWidth: '1080px',
    margin: '0 auto'
  },
  hero: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: '12px',
    flexWrap: 'wrap',
    background: 'linear-gradient(130deg, #1f2747 0%, #4b1f2f 60%, #6c2c1f 100%)',
    borderRadius: '16px',
    padding: '22px',
    color: '#fff',
    boxShadow: '0 14px 34px rgba(37, 22, 20, 0.25)'
  },
  heroEyebrow: {
    margin: '0 0 6px',
    color: '#ffd8a6',
    fontSize: '12px',
    letterSpacing: '1.2px',
    textTransform: 'uppercase',
    fontWeight: '700'
  },
  heroTitle: {
    margin: '0 0 8px',
    fontSize: '34px',
    lineHeight: 1.1,
    fontFamily: 'Georgia, serif'
  },
  heroSub: {
    margin: 0,
    maxWidth: '640px',
    color: '#efe4d8',
    lineHeight: 1.5
  },
  heroMeta: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '8px',
    minWidth: '220px'
  },
  metaCard: {
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: '10px',
    padding: '10px'
  },
  metaLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#f8dec0',
    textTransform: 'uppercase',
    letterSpacing: '0.9px'
  },
  metaValue: {
    display: 'block',
    marginTop: '3px',
    color: '#fff'
  },
  quickStrip: {
    marginTop: '14px',
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  quickBtn: {
    border: '1px solid #d6c3a9',
    borderRadius: '8px',
    background: '#fff8ed',
    color: '#5d4122',
    padding: '9px 12px',
    cursor: 'pointer',
    fontWeight: '700'
  },
  logoutBtn: {
    border: 'none',
    borderRadius: '8px',
    background: '#b42318',
    color: '#fff',
    padding: '9px 12px',
    cursor: 'pointer',
    fontWeight: '700'
  },
  grid: {
    marginTop: '14px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '12px'
  },
  card: {
    background: '#fff',
    border: '1px solid #e2d4c3',
    borderRadius: '14px',
    padding: '14px',
    boxShadow: '0 8px 22px rgba(44, 25, 14, 0.11)'
  },
  cardTitle: {
    margin: '0 0 8px',
    color: '#2f2214',
    fontFamily: 'Georgia, serif'
  },
  cardText: {
    margin: 0,
    color: '#6d5842',
    fontSize: '14px',
    lineHeight: 1.5
  },
  cardActions: {
    marginTop: '12px',
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  primaryBtn: {
    border: 'none',
    background: '#3D0A0A',
    color: '#fff',
    borderRadius: '8px',
    padding: '9px 12px',
    cursor: 'pointer',
    fontWeight: '700'
  },
  secondaryBtn: {
    border: 'none',
    background: '#E07B39',
    color: '#fff',
    borderRadius: '8px',
    padding: '9px 12px',
    cursor: 'pointer',
    fontWeight: '700'
  }
};

export default AdminDashboard;
