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
  if (key === 'payment_submitted') return styles.statusPaymentSubmitted;
  if (key === 'confirmed') return styles.statusConfirmed;
  if (key === 'completed') return styles.statusCompleted;
  if (key === 'cancelled') return styles.statusCancelled;
  if (key === 'pending') return styles.statusPending;
  return styles.statusDefault;
};

const PriestDashboard = () => {
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
      const res = await API.get('/priest/mine');
      setQueue(Array.isArray(res.data?.bookings) ? res.data.bookings : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load seva queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const scopeQueue = useMemo(() => {
    if (queueMode !== 'today') return queue;
    const todayKey = getTodayKey();
    return queue.filter((item) => toDateKey(item.bookingDate) === todayKey);
  }, [queue, queueMode]);

  const queueStats = useMemo(() => {
    const counts = {
      all: scopeQueue.length,
      pending: 0,
      payment_submitted: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0
    };
    scopeQueue.forEach((item) => {
      const key = String(item.status || '').toLowerCase();
      if (key === 'pending') counts.pending += 1;
      if (key === 'payment_submitted') counts.payment_submitted += 1;
      if (key === 'confirmed') counts.confirmed += 1;
      if (key === 'completed') counts.completed += 1;
      if (key === 'cancelled') counts.cancelled += 1;
    });
    return counts;
  }, [scopeQueue]);

  const filteredQueue = useMemo(() => {
    if (statusFilter === 'all') return scopeQueue;
    return scopeQueue.filter((item) => String(item.status || '').toLowerCase() === statusFilter);
  }, [scopeQueue, statusFilter]);

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    setError('');
    setMessage('');
    try {
      const res = await API.patch(`/priest/bookings/${id}/status`, { status });
      setMessage(res.data?.message || 'Seva queue updated.');
      await loadQueue();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update seva status.');
    } finally {
      setUpdatingId('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <section style={styles.hero}>
          <h1 style={styles.title}>Priest Seva Dashboard</h1>
          <p style={styles.sub}>
            Namaste {user?.name || 'Priest'}, handle today&apos;s seva queue with one-tap status actions.
          </p>
        </section>

        <section style={styles.actions}>
          <button style={styles.primaryBtn} type="button" onClick={loadQueue}>
            Refresh Queue
          </button>
          <button style={styles.secondaryBtn} type="button" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
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
              Today Queue
            </button>
            <button
              type="button"
              style={{ ...styles.modeBtn, ...(queueMode === 'all' ? styles.modeBtnActive : {}) }}
              onClick={() => setQueueMode('all')}
            >
              Full Queue
            </button>
          </div>

          <div style={styles.statusTabs}>
            <button
              type="button"
              style={{ ...styles.statusFilterBtn, ...(statusFilter === 'all' ? styles.statusFilterBtnActive : {}) }}
              onClick={() => setStatusFilter('all')}
            >
              All ({queueStats.all})
            </button>
            <button
              type="button"
              style={{ ...styles.statusFilterBtn, ...(statusFilter === 'pending' ? styles.statusFilterBtnActive : {}) }}
              onClick={() => setStatusFilter('pending')}
            >
              Pending ({queueStats.pending})
            </button>
            <button
              type="button"
              style={{ ...styles.statusFilterBtn, ...(statusFilter === 'payment_submitted' ? styles.statusFilterBtnActive : {}) }}
              onClick={() => setStatusFilter('payment_submitted')}
            >
              Payment Submitted ({queueStats.payment_submitted})
            </button>
            <button
              type="button"
              style={{ ...styles.statusFilterBtn, ...(statusFilter === 'confirmed' ? styles.statusFilterBtnActive : {}) }}
              onClick={() => setStatusFilter('confirmed')}
            >
              Confirmed ({queueStats.confirmed})
            </button>
            <button
              type="button"
              style={{ ...styles.statusFilterBtn, ...(statusFilter === 'completed' ? styles.statusFilterBtnActive : {}) }}
              onClick={() => setStatusFilter('completed')}
            >
              Completed ({queueStats.completed})
            </button>
            <button
              type="button"
              style={{ ...styles.statusFilterBtn, ...(statusFilter === 'cancelled' ? styles.statusFilterBtnActive : {}) }}
              onClick={() => setStatusFilter('cancelled')}
            >
              Cancelled ({queueStats.cancelled})
            </button>
          </div>
        </section>

        {loading && <div style={styles.infoBox}>Loading Seva Queue...</div>}
        {error && <div style={styles.errorBox}>{error}</div>}
        {message && <div style={styles.successBox}>{message}</div>}

        {!loading && filteredQueue.length === 0 && (
          <div style={styles.infoBox}>
            {queueMode === 'today'
              ? 'No seva bookings in today queue for selected filter.'
              : 'No priest seva bookings found for selected filter.'}
          </div>
        )}

        {!loading && filteredQueue.length > 0 && (
          <div style={styles.grid}>
            {filteredQueue.map((item) => (
              <article key={item.id} style={styles.card}>
                <div style={styles.cardTop}>
                  <h3 style={styles.cardTitle}>{item.ritualType}</h3>
                  <span style={{ ...styles.statusChip, ...getStatusChipStyle(item.status) }}>
                    {String(item.status || '').replace(/_/g, ' ')}
                  </span>
                </div>

                <div style={styles.metaGrid}>
                  <p style={styles.meta}><strong>Date:</strong> {formatDate(item.bookingDate)}</p>
                  <p style={styles.meta}><strong>Slot:</strong> {item.timeSlot}</p>
                  <p style={styles.meta}><strong>Devotee:</strong> {item.devoteeName}</p>
                  <p style={styles.meta}><strong>Mobile:</strong> {item.devoteeMobile || '-'}</p>
                  <p style={styles.meta}><strong>Pass Code:</strong> {item.linkedVipPass?.bookingCode || '-'}</p>
                  <p style={styles.meta}><strong>VIP Slot:</strong> {item.linkedVipPass?.timeSlot || '-'}</p>
                  {item.paymentProof?.utr ? (
                    <p style={styles.meta}><strong>UTR/RRN:</strong> {item.paymentProof.utr}</p>
                  ) : (
                    <p style={styles.meta}><strong>Payment:</strong> Awaiting proof</p>
                  )}
                  <p style={styles.meta}><strong>Total:</strong> Rs. {item.totalAmount}</p>
                </div>

                {item.paymentProof?.screenshotDataUrl ? (
                  <div style={styles.proofPreview}>
                    <img
                      src={item.paymentProof.screenshotDataUrl}
                      alt="Payment proof"
                      style={styles.proofImage}
                    />
                  </div>
                ) : null}

                <div style={styles.row}>
                  <button
                    style={styles.confirmBtn}
                    type="button"
                    onClick={() => updateStatus(item.id, 'confirmed')}
                    disabled={
                      updatingId === item.id ||
                      String(item.status || '').toLowerCase() !== 'payment_submitted'
                    }
                  >
                    {updatingId === item.id ? 'Updating...' : 'Accept Booking'}
                  </button>
                  <button
                    style={styles.doneBtn}
                    type="button"
                    onClick={() => updateStatus(item.id, 'completed')}
                    disabled={
                      updatingId === item.id ||
                      String(item.status || '').toLowerCase() !== 'confirmed'
                    }
                  >
                    {updatingId === item.id ? 'Updating...' : 'Mark Completed'}
                  </button>
                  <button
                    style={styles.cancelBtn}
                    type="button"
                    onClick={() => updateStatus(item.id, 'cancelled')}
                    disabled={
                      updatingId === item.id ||
                      String(item.status || '').toLowerCase() === 'completed'
                    }
                  >
                    {updatingId === item.id ? 'Updating...' : 'Cancel'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f7f0e4',
    padding: '24px',
    fontFamily: 'Calibri, sans-serif'
  },
  container: {
    maxWidth: '1050px',
    margin: '0 auto'
  },
  hero: {
    background: 'linear-gradient(120deg, #3b1d09, #6f3615)',
    color: '#fff',
    borderRadius: '14px',
    padding: '18px'
  },
  title: {
    margin: '0 0 6px',
    fontFamily: 'Georgia, serif'
  },
  sub: { margin: 0, opacity: 0.94 },
  actions: {
    marginTop: '12px',
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  toolbar: {
    marginTop: '12px',
    border: '1px solid #e3d3bb',
    background: '#fff',
    borderRadius: '10px',
    padding: '10px'
  },
  modeTabs: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  modeBtn: {
    border: '1px solid #d8c2a4',
    background: '#fff8eb',
    color: '#5b3f23',
    borderRadius: '999px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: '700'
  },
  modeBtnActive: {
    background: '#4b200d',
    borderColor: '#4b200d',
    color: '#fff'
  },
  statusTabs: {
    marginTop: '8px',
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap'
  },
  statusFilterBtn: {
    border: '1px solid #deccb0',
    background: '#fdf6e9',
    color: '#6b4f32',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  statusFilterBtnActive: {
    background: '#7a2d17',
    borderColor: '#7a2d17',
    color: '#fff'
  },
  primaryBtn: {
    border: 'none',
    background: '#4b200d',
    color: '#fff',
    borderRadius: '8px',
    padding: '10px 12px',
    cursor: 'pointer',
    fontWeight: '700'
  },
  secondaryBtn: {
    border: 'none',
    background: '#c66f2b',
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
  },
  infoBox: {
    marginTop: '12px',
    border: '1px solid #d6e2f4',
    background: '#f2f7ff',
    color: '#1f4e8c',
    borderRadius: '10px',
    padding: '10px'
  },
  errorBox: {
    marginTop: '12px',
    border: '1px solid #efb7b7',
    background: '#fff1f1',
    color: '#a11f1f',
    borderRadius: '10px',
    padding: '10px'
  },
  successBox: {
    marginTop: '12px',
    border: '1px solid #a8deb7',
    background: '#f0fbf4',
    color: '#166534',
    borderRadius: '10px',
    padding: '10px'
  },
  grid: {
    marginTop: '12px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '10px'
  },
  card: {
    background: '#fff',
    border: '1px solid #e3d3bb',
    borderRadius: '12px',
    padding: '12px',
    boxShadow: '0 6px 16px rgba(71, 41, 20, 0.06)'
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px'
  },
  cardTitle: { margin: 0, color: '#312013' },
  statusChip: {
    borderRadius: '999px',
    padding: '4px 9px',
    fontSize: '12px',
    textTransform: 'capitalize',
    fontWeight: '700',
    border: '1px solid transparent'
  },
  statusPending: {
    background: '#fff7e8',
    color: '#9a5b11',
    borderColor: '#f3ddb4'
  },
  statusPaymentSubmitted: {
    background: '#eef5ff',
    color: '#1f4e8c',
    borderColor: '#c8d8ef'
  },
  statusConfirmed: {
    background: '#eaf8ef',
    color: '#166534',
    borderColor: '#b9e7c7'
  },
  statusCompleted: {
    background: '#ecfeff',
    color: '#0e7490',
    borderColor: '#bae6fd'
  },
  statusCancelled: {
    background: '#fff1f1',
    color: '#a11f1f',
    borderColor: '#efb7b7'
  },
  statusDefault: {
    background: '#f3f4f6',
    color: '#374151',
    borderColor: '#d1d5db'
  },
  metaGrid: {
    marginTop: '8px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '6px'
  },
  meta: {
    margin: 0,
    color: '#654f3a',
    fontSize: '13px'
  },
  proofPreview: {
    marginTop: '10px',
    border: '1px dashed #e2cfb2',
    background: '#fff8ec',
    borderRadius: '10px',
    padding: '8px',
    display: 'flex',
    justifyContent: 'center'
  },
  proofImage: {
    width: '100%',
    maxWidth: '320px',
    borderRadius: '10px',
    border: '1px solid #dfceb8',
    objectFit: 'cover'
  },
  row: {
    marginTop: '10px',
    display: 'flex',
    gap: '7px',
    flexWrap: 'wrap'
  },
  confirmBtn: {
    border: '1px solid #c8d8ef',
    background: '#eef5ff',
    color: '#1f4e8c',
    borderRadius: '8px',
    padding: '8px 10px',
    cursor: 'pointer',
    fontWeight: '700'
  },
  doneBtn: {
    border: 'none',
    background: '#1d7f49',
    color: '#fff',
    borderRadius: '8px',
    padding: '8px 10px',
    cursor: 'pointer',
    fontWeight: '700'
  },
  cancelBtn: {
    border: 'none',
    background: '#b42318',
    color: '#fff',
    borderRadius: '8px',
    padding: '8px 10px',
    cursor: 'pointer',
    fontWeight: '700'
  }
};

export default PriestDashboard;
