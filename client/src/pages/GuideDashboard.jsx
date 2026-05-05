import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const formatDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const toDateKey = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getTodayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const getStatusChipStyle = (status) => {
  const key = String(status || '').toLowerCase();
  if (key === 'pending') return styles.statusPending;
  if (key === 'confirmed') return styles.statusConfirmed;
  if (key === 'declined' || key === 'no_show_reported') return styles.statusWarn;
  if (key === 'completed') return styles.statusCompleted;
  if (key === 'refunded' || key === 'cancelled') return styles.statusCancelled;
  return styles.statusDefault;
};

const GuideDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [queueMode, setQueueMode] = useState('today');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadQueue = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/guide/mine');
      setQueue(Array.isArray(res.data?.bookings) ? res.data.bookings : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load trip requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const scopedQueue = useMemo(() => {
    if (queueMode !== 'today') return queue;
    const todayKey = getTodayKey();
    return queue.filter((item) => toDateKey(item.bookingDate) === todayKey);
  }, [queue, queueMode]);

  const queueStats = useMemo(() => {
    const counts = {
      all: scopedQueue.length,
      pending: 0,
      confirmed: 0,
      declined: 0,
      no_show_reported: 0,
      completed: 0,
      refunded: 0
    };
    scopedQueue.forEach((item) => {
      const key = String(item.status || '').toLowerCase();
      if (counts[key] !== undefined) counts[key] += 1;
    });
    return counts;
  }, [scopedQueue]);

  const filteredQueue = useMemo(() => {
    if (statusFilter === 'all') return scopedQueue;
    return scopedQueue.filter((item) => String(item.status || '').toLowerCase() === statusFilter);
  }, [scopedQueue, statusFilter]);

  const updateStatus = async (id, status, note) => {
    setUpdatingId(id);
    setError('');
    setMessage('');
    try {
      const res = await API.patch(`/guide/bookings/${id}/status`, { status, note });
      setMessage(res.data?.message || 'Trip request updated.');
      await loadQueue();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update trip status.');
    } finally {
      setUpdatingId('');
    }
  };

  const handleDecline = (id) => {
    const reason = window.prompt('Reason for decline (optional):', 'Not available at this time');
    updateStatus(id, 'declined', reason || '');
  };

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
      <div style={styles.container}>
        <section style={styles.hero}>
          <h1 style={styles.title}>Guide Trip Dashboard</h1>
          <p style={styles.sub}>
            Welcome {user?.name || 'Guide'}. Confirm requests quickly so devotees can plan their trip.
          </p>
        </section>

        <section style={styles.actions}>
          <button style={styles.primaryBtn} type="button" onClick={loadQueue}>
            Refresh Requests
          </button>
          <button style={styles.secondaryBtn} type="button" onClick={handleRaiseComplaint}>
            Raise Complaint
          </button>
          <button style={styles.dangerBtn} type="button" onClick={handleLogout}>
            Logout
          </button>
        </section>

        <section style={styles.toolbar}>
          <div style={styles.modeTabs}>
            <button
              type="button"
              style={{ ...styles.modeBtn, ...(queueMode === 'today' ? styles.modeBtnActive : {}) }}
              onClick={() => setQueueMode('today')}
            >
              Today
            </button>
            <button
              type="button"
              style={{ ...styles.modeBtn, ...(queueMode === 'all' ? styles.modeBtnActive : {}) }}
              onClick={() => setQueueMode('all')}
            >
              Full List
            </button>
          </div>

          <div style={styles.statusTabs}>
            <button
              type="button"
              style={{ ...styles.statusBtn, ...(statusFilter === 'all' ? styles.statusBtnActive : {}) }}
              onClick={() => setStatusFilter('all')}
            >
              All ({queueStats.all})
            </button>
            <button
              type="button"
              style={{ ...styles.statusBtn, ...(statusFilter === 'pending' ? styles.statusBtnActive : {}) }}
              onClick={() => setStatusFilter('pending')}
            >
              Pending ({queueStats.pending})
            </button>
            <button
              type="button"
              style={{ ...styles.statusBtn, ...(statusFilter === 'confirmed' ? styles.statusBtnActive : {}) }}
              onClick={() => setStatusFilter('confirmed')}
            >
              Confirmed ({queueStats.confirmed})
            </button>
            <button
              type="button"
              style={{ ...styles.statusBtn, ...(statusFilter === 'completed' ? styles.statusBtnActive : {}) }}
              onClick={() => setStatusFilter('completed')}
            >
              Completed ({queueStats.completed})
            </button>
          </div>
        </section>

        {error && <div style={styles.errorBox}>{error}</div>}
        {message && <div style={styles.successBox}>{message}</div>}

        {loading ? (
          <div style={styles.card}>Loading…</div>
        ) : filteredQueue.length === 0 ? (
          <div style={styles.card}>No trip requests in this view.</div>
        ) : (
          <div style={styles.list}>
            {filteredQueue.map((item) => {
              const status = String(item.status || '').toLowerCase();
              const places = Array.isArray(item.places) ? item.places : [];
              return (
                <article key={item.id} style={styles.itemCard}>
                  <div style={styles.itemTopRow}>
                    <div>
                      <div style={styles.itemTitle}>
                        {item.devotee?.name || 'Devotee'} <span style={styles.smallMuted}>({item.devotee?.mobile || '-'})</span>
                      </div>
                      <div style={styles.itemSub}>
                        Trip Date: <strong>{formatDate(item.bookingDate)}</strong>
                      </div>
                    </div>
                    <div style={{ ...styles.statusChip, ...getStatusChipStyle(item.status) }}>
                      {status.replace(/_/g, ' ')}
                    </div>
                  </div>

                  <div style={styles.placeRow}>
                    <div style={styles.placeLabel}>Destinations</div>
                    <div style={styles.placeValue}>
                      {places.length ? places.map((p) => p.name).join(', ') : '-'}
                    </div>
                  </div>

                  <div style={styles.placeRow}>
                    <div style={styles.placeLabel}>Total</div>
                    <div style={styles.placeValue}>Rs. {item.totalAmount}</div>
                  </div>

                  {item.statusNote && <div style={styles.noteBox}>{item.statusNote}</div>}

                  <div style={styles.itemActions}>
                    {status === 'pending' && (
                      <>
                        <button
                          type="button"
                          style={styles.primaryBtn}
                          disabled={updatingId === item.id}
                          onClick={() => updateStatus(item.id, 'confirmed')}
                        >
                          {updatingId === item.id ? 'Updating…' : 'Accept'}
                        </button>
                        <button
                          type="button"
                          style={styles.secondaryBtn}
                          disabled={updatingId === item.id}
                          onClick={() => handleDecline(item.id)}
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {status === 'confirmed' && (
                      <button
                        type="button"
                        style={styles.primaryBtn}
                        disabled={updatingId === item.id}
                        onClick={() => updateStatus(item.id, 'completed')}
                      >
                        {updatingId === item.id ? 'Updating…' : 'Mark Completed'}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: 'radial-gradient(circle at 18% 10%, #f9efe3 0%, #f2e9de 46%, #e9e3f2 100%)',
    padding: '22px',
    fontFamily: 'Calibri, sans-serif'
  },
  container: { maxWidth: '1100px', margin: '0 auto' },
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
    fontFamily: 'Georgia, serif'
  },
  sub: {
    margin: 0,
    opacity: 0.92,
    fontSize: '16px',
    color: '#fcfaf7'
  },
  actions: { marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap' },
  primaryBtn: {
    border: 'none',
    background: '#3D0A0A',
    color: '#fff',
    borderRadius: '10px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: '900'
  },
  secondaryBtn: {
    border: 'none',
    background: '#E07B39',
    color: '#fff',
    borderRadius: '10px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: '900'
  },
  dangerBtn: {
    border: 'none',
    background: '#b42318',
    color: '#fff',
    borderRadius: '10px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: '900'
  },
  toolbar: {
    marginTop: '12px',
    background: '#fff',
    border: '1px solid #e2d4c3',
    borderRadius: '16px',
    padding: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap'
  },
  modeTabs: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  modeBtn: {
    border: '1px solid #dec89f',
    background: '#fffaf0',
    borderRadius: '999px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: '900',
    color: '#5d4122'
  },
  modeBtnActive: { borderColor: '#3D0A0A', background: 'rgba(61,10,10,0.08)', color: '#3D0A0A' },
  statusTabs: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  statusBtn: {
    border: '1px solid #dec89f',
    background: '#fff',
    borderRadius: '999px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: '900',
    color: '#5d4122'
  },
  statusBtnActive: { borderColor: '#3D0A0A', background: '#3D0A0A', color: '#fff' },
  card: {
    marginTop: '12px',
    background: '#fff',
    border: '1px solid #e2d4c3',
    borderRadius: '16px',
    padding: '14px'
  },
  list: {
    marginTop: '12px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '12px'
  },
  itemCard: {
    background: '#fffaf0',
    border: '1px solid #ead8bb',
    borderRadius: '16px',
    padding: '12px'
  },
  itemTopRow: { display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' },
  itemTitle: { fontWeight: '900', color: '#2f2214', fontFamily: 'Georgia, serif', fontSize: '18px' },
  itemSub: { marginTop: '6px', color: '#6d5842' },
  smallMuted: { color: '#6d5842', fontWeight: '700' },
  statusChip: {
    padding: '6px 10px',
    borderRadius: '999px',
    border: '1px solid transparent',
    fontSize: '11px',
    fontWeight: '900',
    textTransform: 'capitalize'
  },
  statusPending: { background: '#fff7e8', borderColor: '#f3ddb4', color: '#9a5b11' },
  statusConfirmed: { background: '#eaf8ef', borderColor: '#b9e7c7', color: '#166534' },
  statusWarn: { background: '#fff1f1', borderColor: '#efb7b7', color: '#a11f1f' },
  statusCompleted: { background: '#ecfeff', borderColor: '#bae6fd', color: '#0e7490' },
  statusCancelled: { background: '#f3f4f6', borderColor: '#d1d5db', color: '#374151' },
  statusDefault: { background: '#f3f4f6', borderColor: '#d1d5db', color: '#374151' },
  placeRow: { marginTop: '10px', display: 'flex', justifyContent: 'space-between', gap: '10px' },
  placeLabel: { color: '#6d5842', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.8px' },
  placeValue: { fontWeight: '900', color: '#2f2214', textAlign: 'right' },
  noteBox: { marginTop: '10px', border: '1px dashed #ead8bb', background: '#fff', borderRadius: '12px', padding: '10px', color: '#5d4122' },
  itemActions: { marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' },
  errorBox: {
    marginTop: '12px',
    border: '1px solid #efb7b7',
    background: '#fff1f1',
    color: '#a11f1f',
    borderRadius: '12px',
    padding: '10px'
  },
  successBox: {
    marginTop: '12px',
    border: '1px solid #b9e7c7',
    background: '#eaf8ef',
    color: '#166534',
    borderRadius: '12px',
    padding: '10px'
  }
};

export default GuideDashboard;
