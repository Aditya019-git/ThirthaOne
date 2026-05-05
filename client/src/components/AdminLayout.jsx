import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { label: 'Overview', path: '/admin', icon: '📊' },
    { label: 'Devotee Bookings', path: '/dashboard', icon: '🙏' },
    { label: 'Gate Operations', path: '/admin/gate-officers', icon: '⛩️' },
    { label: 'Priest Setup', path: '/admin/priests', icon: '🕉️' },
    { label: 'Guide Setup', path: '/admin/guides', icon: '🗺️' },
    { label: 'Complaints & Refunds', path: '/admin/reports', icon: '📋' },
    { label: 'Payouts Ledger', path: '/admin/payouts', icon: '💰' },
  ];

  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logoContainer}>
          <div style={styles.omSymbol}>{'\u0950'}</div>
          <div>
            <h2 style={styles.logoTitle}>TirthOne</h2>
            <p style={styles.logoSubtitle}>ADMIN CONSOLE</p>
          </div>
        </div>

        <nav style={styles.nav}>
          {menuItems.map((item) => (
            <button
              key={item.path}
              style={{
                ...styles.navItem,
                backgroundColor: isActive(item.path) ? 'rgba(232, 201, 122, 0.15)' : 'transparent',
                borderLeft: isActive(item.path) ? '4px solid #E8C97A' : '4px solid transparent',
                color: isActive(item.path) ? '#E8C97A' : '#f0e6d3',
              }}
              onClick={() => navigate(item.path)}
            >
              <span style={styles.icon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Secure Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={styles.mainWrapper}>
        {/* Topbar exactly like the image */}
        <header style={styles.topbar}>
          <div style={styles.topbarLeft}>
            {/* Optional space for future breadcrumbs or title */}
          </div>
          <div style={styles.topbarRight}>
            <button style={styles.iconBtn}>🔔<span style={styles.badge}>2</span></button>
            <div style={styles.profileBox}>
              <div style={styles.avatar}>A</div>
              <div style={styles.profileText}>
                <span style={styles.profileName}>Temple Admin</span>
                <span style={styles.profileRole}>Admin</span>
              </div>
            </div>
          </div>
        </header>

        <main style={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
};

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    // Using the user's requested theme background
    background: 'radial-gradient(circle at 18% 10%, #f9efe3 0%, #f2e9de 46%, #e9e3f2 100%)',
    fontFamily: 'Calibri, sans-serif'
  },
  sidebar: {
    width: '260px',
    backgroundColor: '#3D0A0A',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '4px 0 15px rgba(0,0,0,0.1)',
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflowY: 'auto'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '30px 20px',
    borderBottom: '1px solid rgba(232, 201, 122, 0.2)',
    marginBottom: '20px'
  },
  omSymbol: {
    fontSize: '28px',
    color: '#E07B39',
    fontWeight: 'bold'
  },
  logoTitle: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#E8C97A',
    letterSpacing: '1px'
  },
  logoSubtitle: {
    margin: 0,
    fontSize: '10px',
    color: '#c8a96e',
    letterSpacing: '2px'
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    padding: '0 10px',
    flex: 1
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 15px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
    fontFamily: 'Calibri, sans-serif'
  },
  icon: {
    fontSize: '18px'
  },
  sidebarFooter: {
    padding: '20px',
    borderTop: '1px solid rgba(232, 201, 122, 0.2)'
  },
  logoutBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#b42318',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  mainWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  topbar: {
    height: '70px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 30px',
    borderBottom: '1px solid rgba(232, 201, 122, 0.3)',
    backgroundColor: 'transparent'
  },
  topbarLeft: {
    display: 'flex',
    alignItems: 'center'
  },
  topbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    position: 'relative'
  },
  badge: {
    position: 'absolute',
    top: '-4px',
    right: '-6px',
    backgroundColor: '#d93025',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 'bold',
    borderRadius: '50%',
    padding: '2px 5px'
  },
  profileBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#3D0A0A',
    color: '#E8C97A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '16px'
  },
  profileText: {
    display: 'flex',
    flexDirection: 'column'
  },
  profileName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#3D0A0A'
  },
  profileRole: {
    fontSize: '12px',
    color: '#88311d'
  },
  mainContent: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column'
  }
};

export default AdminLayout;
