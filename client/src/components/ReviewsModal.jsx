import { useEffect, useState } from 'react';
import API from '../api/axios';

const ReviewsModal = ({ type, targetId, targetName, onClose }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      setError('');
      try {
        const endpoint = type === 'guide' ? `/guide/${targetId}/reviews` : `/priest/${targetId}/reviews`;
        const res = await API.get(endpoint);
        setReviews(res.data?.reviews || []);
      } catch (err) {
        setError('Failed to load reviews.');
      } finally {
        setLoading(false);
      }
    };
    if (targetId) fetchReviews();
  }, [type, targetId]);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Reviews for {targetName}</h3>
          <button style={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>
        
        <div style={styles.body}>
          {loading ? (
            <div style={styles.message}>Loading previous reviews...</div>
          ) : error ? (
            <div style={styles.message}>{error}</div>
          ) : reviews.length === 0 ? (
            <div style={styles.message}>No reviews available yet.</div>
          ) : (
            <div style={styles.reviewList}>
              {reviews.map((r) => (
                <div key={r._id} style={styles.reviewCard}>
                  <div style={styles.reviewHeader}>
                    <div style={styles.devoteeName}>{r.devoteeName}</div>
                    <div style={styles.ratingBadge}>{r.rating} ★</div>
                  </div>
                  <div style={styles.comment}>{r.comment || 'No comment provided.'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 9999,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px'
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #eee'
  },
  title: { margin: 0, fontSize: '18px', color: '#3D0A0A', fontFamily: 'Georgia, serif' },
  closeBtn: {
    background: 'none', border: 'none',
    fontSize: '24px', cursor: 'pointer',
    color: '#888'
  },
  body: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1
  },
  message: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: '20px'
  },
  reviewList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  reviewCard: {
    backgroundColor: '#f9f9f9',
    border: '1px solid #eaeaea',
    borderRadius: '12px',
    padding: '14px'
  },
  reviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },
  devoteeName: { fontWeight: 'bold', color: '#444' },
  ratingBadge: {
    backgroundColor: '#fff8ea',
    color: '#d98a00',
    border: '1px solid #f2cf92',
    padding: '2px 6px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  comment: { color: '#555', fontSize: '14px', lineHeight: 1.4 }
};

export default ReviewsModal;
