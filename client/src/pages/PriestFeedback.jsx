import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../api/axios';

const clampRating = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 5;
  return Math.max(1, Math.min(5, Math.round(num)));
};

const PriestFeedback = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    const loadBooking = async () => {
      setError('');
      try {
        const res = await API.get('/priest/mine');
        const list = Array.isArray(res.data?.bookings) ? res.data.bookings : [];
        const found = list.find((item) => String(item.id) === String(id));
        setBooking(found || null);
      } catch (_err) {
        setBooking(null);
      }
    };

    loadBooking();
  }, [id]);

  const canSubmit = useMemo(() => {
    if (!id) return false;
    if (loading) return false;
    return true;
  }, [id, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const payload = { rating: clampRating(rating), comment: String(comment || '').trim() };
      const res = await API.post(`/priest/bookings/${id}/feedback`, payload);
      setSuccess(res.data?.message || 'Feedback submitted.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit feedback.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.topBar}>
          <h1 style={styles.title}>Abhishek Feedback</h1>
          <button type="button" style={styles.backBtn} onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>

        {booking ? (
          <section style={styles.infoCard}>
            <p style={styles.row}><strong>Ritual:</strong> {booking.ritualType || '-'}</p>
            <p style={styles.row}><strong>Priest:</strong> {booking.priestName || '-'}</p>
            <p style={styles.row}><strong>Slot:</strong> {booking.timeSlot || '-'}</p>
            <p style={styles.row}><strong>Status:</strong> {String(booking.status || '').replace(/_/g, ' ')}</p>
          </section>
        ) : (
          <div style={styles.infoBox}>
            Booking details could not be loaded, but you can still submit feedback if your booking is completed.
          </div>
        )}

        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        <form style={styles.card} onSubmit={handleSubmit}>
          <label style={styles.label}>Rating (1 to 5)</label>
          <select style={styles.input} value={rating} onChange={(e) => setRating(e.target.value)}>
            <option value={5}>5 - Excellent</option>
            <option value={4}>4 - Good</option>
            <option value={3}>3 - Okay</option>
            <option value={2}>2 - Poor</option>
            <option value={1}>1 - Very Bad</option>
          </select>

          <label style={styles.label}>Comments (optional)</label>
          <textarea
            style={styles.textarea}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience..."
            maxLength={500}
          />

          <button type="submit" style={styles.primaryBtn} disabled={!canSubmit}>
            {loading ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f7f1e7',
    padding: '24px'
  },
  container: {
    maxWidth: '760px',
    margin: '0 auto'
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap'
  },
  title: {
    margin: 0,
    color: '#3D0A0A',
    fontFamily: 'Georgia, serif'
  },
  backBtn: {
    border: '1px solid #d6c4a5',
    background: '#fff8ec',
    color: '#5f431c',
    borderRadius: '8px',
    padding: '9px 12px',
    cursor: 'pointer',
    fontWeight: '700'
  },
  infoCard: {
    marginTop: '12px',
    border: '1px solid #ead9be',
    background: '#fff',
    borderRadius: '12px',
    padding: '12px'
  },
  card: {
    marginTop: '12px',
    border: '1px solid #ead9be',
    background: '#fff',
    borderRadius: '12px',
    padding: '12px'
  },
  row: {
    margin: '6px 0',
    color: '#4b3b26'
  },
  label: {
    display: 'block',
    marginTop: '10px',
    marginBottom: '6px',
    color: '#6d563f',
    fontSize: '13px'
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px',
    border: '1px solid #d8c7ae',
    borderRadius: '8px'
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px',
    border: '1px solid #d8c7ae',
    borderRadius: '8px',
    minHeight: '110px',
    resize: 'vertical'
  },
  primaryBtn: {
    width: '100%',
    marginTop: '12px',
    border: 'none',
    background: '#3D0A0A',
    color: '#fff',
    borderRadius: '10px',
    padding: '12px',
    cursor: 'pointer',
    fontWeight: '700'
  },
  infoBox: {
    marginTop: '12px',
    padding: '12px',
    border: '1px solid #d9e3f2',
    background: '#f2f7ff',
    borderRadius: '10px',
    color: '#1f4e8c'
  },
  errorBox: {
    marginTop: '12px',
    padding: '12px',
    border: '1px solid #f0b3b3',
    background: '#fff3f3',
    borderRadius: '10px',
    color: '#a11f1f'
  },
  successBox: {
    marginTop: '12px',
    padding: '12px',
    border: '1px solid #add7ba',
    background: '#effcf3',
    borderRadius: '10px',
    color: '#1e6b39'
  }
};

export default PriestFeedback;

