import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const formatDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getApiErrorMessage = (err, fallback) => {
  const data = err?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (err?.message) return err.message;
  return fallback;
};

const GuideFeedback = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await API.get(`/guide/bookings/${id}`);
        setBooking(res.data?.booking || null);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Unable to load trip details.'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const placesLabel = useMemo(() => {
    const places = Array.isArray(booking?.places) ? booking.places : [];
    if (!places.length) return '-';
    return places.map((p) => `${p.name} (Rs.${p.price})`).join(', ');
  }, [booking]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const res = await API.post(`/guide/bookings/${id}/feedback`, { rating, comment });
      setSuccess(res.data?.message || 'Feedback submitted.');
      setTimeout(() => navigate('/guide-booking'), 900);
    } catch (err) {
      if (err?.response?.status === 403) {
        const role = user?.role || 'unknown';
        setError(
          `Access denied for role "${role}". Feedback can be submitted only by devotees (or admin). ` +
          `If you are testing guide + devotee in the same browser, use an incognito window for the second login.`
        );
      } else {
        setError(getApiErrorMessage(err, 'Unable to submit feedback.'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.hero}>
          <div>
            <h1 style={styles.heroTitle}>Guide Trip Feedback</h1>
            <p style={styles.heroSub}>Your rating helps other devotees choose the right guide.</p>
          </div>
          <div style={styles.heroActions}>
            <button type="button" style={styles.backBtn} onClick={() => navigate('/guide-booking')}>
              Back
            </button>
          </div>
        </header>

        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        {loading ? (
          <div style={styles.card}>Loading…</div>
        ) : !booking ? (
          <div style={styles.card}>Trip not found.</div>
        ) : (
          <section style={styles.card}>
            <div style={styles.summary}>
              <div style={styles.summaryLine}>
                <span style={styles.kLabel}>Guide</span>
                <span style={styles.kValue}>{booking.guide?.name || '-'}</span>
              </div>
              <div style={styles.summaryLine}>
                <span style={styles.kLabel}>Trip Date</span>
                <span style={styles.kValue}>{formatDate(booking.bookingDate)}</span>
              </div>
              <div style={styles.summaryLine}>
                <span style={styles.kLabel}>Destinations</span>
                <span style={styles.kValue}>{placesLabel}</span>
              </div>
              <div style={styles.summaryLine}>
                <span style={styles.kLabel}>Total</span>
                <span style={styles.kValue}>Rs. {booking.totalAmount}</span>
              </div>
              <div style={styles.summaryLine}>
                <span style={styles.kLabel}>Status</span>
                <span style={styles.kValue}>{String(booking.status || '').replace(/_/g, ' ')}</span>
              </div>
            </div>

            <form onSubmit={submit} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Rating</label>
                <div style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setRating(v)}
                      style={{ ...styles.starBtn, ...(rating >= v ? styles.starBtnActive : {}) }}
                      aria-label={`Rate ${v} star`}
                    >
                      ★
                    </button>
                  ))}
                  <span style={styles.ratingText}>{rating}/5</span>
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Comment (optional)</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={5}
                  style={styles.textarea}
                  placeholder="Share your experience (clean and helpful)."
                />
                <div style={styles.muted}>Max 500 characters.</div>
              </div>

              <div style={styles.formActions}>
                <button type="submit" style={styles.primaryBtn} disabled={saving}>
                  {saving ? 'Submitting…' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          </section>
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
  container: { maxWidth: '980px', margin: '0 auto' },
  hero: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    background: 'linear-gradient(130deg, #1f2747 0%, #4b1f2f 60%, #6c2c1f 100%)',
    borderRadius: '16px',
    padding: '18px',
    color: '#fff',
    boxShadow: '0 14px 34px rgba(37, 22, 20, 0.25)'
  },
  heroTitle: { margin: 0, fontFamily: 'Georgia, serif', fontSize: '34px' },
  heroSub: { margin: '8px 0 0', color: '#efe4d8', lineHeight: 1.45 },
  heroActions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  backBtn: {
    border: '1px solid rgba(255,255,255,0.35)',
    borderRadius: '10px',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
    fontWeight: '900',
    cursor: 'pointer'
  },
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
  },
  card: {
    marginTop: '12px',
    background: '#fff',
    border: '1px solid #e2d4c3',
    borderRadius: '16px',
    padding: '14px',
    boxShadow: '0 10px 24px rgba(44, 25, 14, 0.1)'
  },
  summary: {
    border: '1px solid #ead8bb',
    background: '#fffaf0',
    borderRadius: '14px',
    padding: '12px'
  },
  summaryLine: { display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '8px', flexWrap: 'wrap' },
  kLabel: { color: '#6d5842', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.8px' },
  kValue: { fontWeight: '900', color: '#2f2214' },
  form: { marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '900', color: '#5d4122', textTransform: 'uppercase', letterSpacing: '0.7px' },
  starsRow: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' },
  starBtn: {
    border: '1px solid #dec89f',
    background: '#fff',
    borderRadius: '10px',
    width: '44px',
    height: '44px',
    cursor: 'pointer',
    fontSize: '22px',
    color: '#c1a074',
    fontWeight: '900'
  },
  starBtnActive: {
    borderColor: '#E07B39',
    background: 'rgba(224,123,57,0.14)',
    color: '#E07B39'
  },
  ratingText: { fontWeight: '900', color: '#2f2214' },
  textarea: {
    border: '1px solid #dec89f',
    borderRadius: '10px',
    padding: '10px 12px',
    outline: 'none',
    background: '#fffaf0',
    resize: 'vertical'
  },
  muted: { color: '#6d5842', fontSize: '12px' },
  formActions: { display: 'flex', justifyContent: 'flex-end' },
  primaryBtn: {
    border: 'none',
    background: '#3D0A0A',
    color: '#fff',
    borderRadius: '10px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: '900'
  }
};

export default GuideFeedback;
