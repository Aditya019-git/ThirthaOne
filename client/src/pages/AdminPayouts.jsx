import { useState, useEffect } from 'react';
import API from '../api/axios';

const AdminPayouts = () => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settleLoading, setSettleLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const loadSummary = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/payouts/summary');
      setSummaries(res.data.summary || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payouts summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const handleSettle = async (staffId, payoutIds) => {
    if (!window.confirm('Are you sure you have transferred the funds via UPI/Bank?')) return;
    
    setSettleLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const res = await API.post(`/payouts/settle/${staffId}`, { payoutIds });
      setSuccess(res.data.message || 'Payout marked as settled.');
      await loadSummary();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to settle payout.');
    } finally {
      setSettleLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading payouts...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
      <div style={styles.hero}>
        <h2 style={styles.heroTitle}>Staff Settlements & Payouts</h2>
        <p style={styles.heroSub}>
          This ledger tracks exact amounts owed to Priests and Guides after their cuts are calculated. 
          Transfer the pending balances manually via their UPI ID, then click "Mark as Settled".
        </p>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {summaries.length === 0 ? (
        <div style={styles.empty}>All accounts are settled. No pending payouts.</div>
      ) : (
        <div style={styles.grid}>
          {summaries.map((s) => (
            <div key={s.staffId} style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={{ margin: 0, color: '#3b2a1a' }}>{s.name}</h3>
                <span style={styles.roleBadge}>{s.role.toUpperCase()}</span>
              </div>
              
              <div style={styles.amountBox}>
                <span style={{ fontSize: '14px', color: '#5e4324' }}>Amount Owed</span>
                <strong style={{ fontSize: '24px', color: s.amountOwed >= 0 ? '#2c7a3f' : '#a11f1f' }}>
                  ₹{s.amountOwed.toFixed(2)}
                </strong>
              </div>

              <div style={styles.detailsRow}>
                <strong>Mobile:</strong> {s.mobile}
              </div>
              <div style={styles.detailsRow}>
                <strong>UPI ID:</strong> {s.upiId || 'Not provided'}
              </div>
              <div style={styles.detailsRow}>
                <strong>UPI Name:</strong> {s.upiName || 'Not provided'}
              </div>
              
              <div style={styles.actions}>
                <button 
                  onClick={() => handleSettle(s.staffId, s.payoutIds)}
                  style={styles.settleBtn}
                  disabled={settleLoading || s.amountOwed <= 0}
                >
                  {settleLoading ? 'Processing...' : 'Mark as Settled'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
};

const styles = {
  page: { minHeight: '100vh', background: 'linear-gradient(130deg, #f8f1e6 0%, #f4ecdf 55%, #efe6d9 100%)', padding: '24px' },
  container: { maxWidth: '1000px', margin: '0 auto' },
  hero: {
    background: 'linear-gradient(120deg, #4b130f, #7a2d17)',
    color: '#fff',
    borderRadius: '14px',
    padding: '30px 24px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  },
  heroTitle: {
    margin: '0 0 6px',
    fontSize: '32px',
    fontFamily: 'Georgia, serif',
    color: '#fff'
  },
  heroSub: {
    margin: 0,
    opacity: 0.92,
    fontSize: '16px',
    color: '#fcfaf7'
  },
  error: { padding: '12px', background: '#fff1f1', border: '1px solid #efb7b7', color: '#a11f1f', borderRadius: '8px', marginBottom: '15px' },
  success: { padding: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '8px', marginBottom: '15px' },
  empty: { padding: '40px', textAlign: 'center', background: '#fff', border: '1px dashed #E8C97A', color: '#6d5842', borderRadius: '12px', fontSize: '18px', boxShadow: '0 4px 12px rgba(61, 10, 10, 0.08)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' },
  card: { border: '1px solid #E8C97A', borderRadius: '12px', padding: '24px', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(61, 10, 10, 0.08)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  roleBadge: { fontSize: '12px', fontWeight: 'bold', background: '#FAF6E9', color: '#3D0A0A', border: '1px solid #E8C97A', padding: '6px 12px', borderRadius: '6px', letterSpacing: '1px', textTransform: 'uppercase' },
  amountBox: { background: '#fcfaf7', padding: '15px 20px', borderRadius: '8px', border: '1px solid #c8a96e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  detailsRow: { fontSize: '15px', color: '#6d5842', marginBottom: '10px' },
  actions: { marginTop: 'auto', paddingTop: '20px' },
  settleBtn: { width: '100%', background: '#3D0A0A', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 12px rgba(61, 10, 10, 0.2)' }
};

export default AdminPayouts;
