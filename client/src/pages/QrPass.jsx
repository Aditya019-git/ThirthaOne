import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../api/axios';
import QrInfoCards from '../components/QrInfoCards';

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const QrPass = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(null);
  const [qrCode, setQrCode] = useState('');

  useEffect(() => {
    const fetchQrPass = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await API.get(`/booking/${bookingId}/qr`);
        setBooking(res.data.booking || null);
        setQrCode(res.data.qrCode || '');
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load QR pass.');
      } finally {
        setLoading(false);
      }
    };

    fetchQrPass();
  }, [bookingId]);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <h1 style={styles.title}>Your VIP Darshan QR Pass</h1>
          <button style={styles.ghostBtn} type="button" onClick={() => navigate('/dashboard')}>
            Back To Dashboard
          </button>
        </div>

        {loading && <div style={styles.infoBox}>Loading your QR pass...</div>}
        {error && <div style={styles.errorBox}>{error}</div>}

        {!loading && !error && booking && (
          <section style={styles.passCard}>
            <div style={styles.qrCol}>
              {qrCode ? (
                <img src={qrCode} alt="VIP Darshan QR Pass" style={styles.qrImage} />
              ) : (
                <div style={styles.qrFallback}>QR not available</div>
              )}
            </div>

            <div style={styles.detailsCol}>
              <h2 style={styles.detailsTitle}>Booking Details</h2>
              <p style={styles.row}><strong>Booking ID:</strong> {booking._id}</p>
              <p style={styles.row}><strong>Head Devotee:</strong> {booking.headDevoteeName}</p>
              <p style={styles.row}><strong>Head Aadhaar:</strong> {booking.headDevoteeAadhaar || '-'}</p>
              <p style={styles.row}><strong>Date:</strong> {formatDate(booking.bookingDate)}</p>
              <p style={styles.row}><strong>Time Slot:</strong> {booking.timeSlot}</p>
              <p style={styles.row}><strong>Total People:</strong> {booking.memberCount}</p>
              <p style={styles.row}><strong>Status:</strong> {booking.status}</p>

              <div style={styles.memberListWrap}>
                <strong>Devotees:</strong>
                <ul style={styles.memberList}>
                  {(booking.members || []).map((member, index) => (
                    <li key={`${member.name}-${index}`}>{member.name}</li>
                  ))}
                </ul>
              </div>

              <div style={styles.actionRow}>
                <button style={styles.primaryBtn} type="button" onClick={() => window.print()}>
                  Print Pass
                </button>
                <button style={styles.secondaryBtn} type="button" onClick={() => navigate('/book-pass')}>
                  Book Another Pass
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      <QrInfoCards />
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f7f1e7',
    paddingBottom: '24px'
  },
  container: {
    maxWidth: '1020px',
    margin: '0 auto',
    padding: '22px 16px'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '14px'
  },
  title: {
    margin: 0,
    color: '#3D0A0A',
    fontFamily: 'Georgia, serif'
  },
  ghostBtn: {
    border: '1px solid #d6c4a5',
    background: '#fff8ec',
    color: '#5f431c',
    borderRadius: '8px',
    padding: '9px 12px',
    cursor: 'pointer'
  },
  infoBox: {
    padding: '12px',
    border: '1px solid #d9e3f2',
    background: '#f2f7ff',
    borderRadius: '10px',
    color: '#1f4e8c'
  },
  errorBox: {
    padding: '12px',
    border: '1px solid #f0b3b3',
    background: '#fff3f3',
    borderRadius: '10px',
    color: '#a11f1f'
  },
  passCard: {
    background: '#fff',
    borderRadius: '14px',
    border: '1px solid #efdfc6',
    boxShadow: '0 10px 28px rgba(70, 40, 20, 0.1)',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '18px',
    padding: '18px'
  },
  qrCol: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  qrImage: {
    width: '100%',
    maxWidth: '260px',
    border: '1px solid #e3d3b7',
    borderRadius: '10px',
    background: '#fff',
    padding: '8px'
  },
  qrFallback: {
    width: '100%',
    maxWidth: '260px',
    minHeight: '260px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px dashed #e3d3b7',
    borderRadius: '10px',
    color: '#8f7a5a'
  },
  detailsCol: {
    minWidth: 0
  },
  detailsTitle: {
    marginTop: 0,
    color: '#2c1809'
  },
  row: {
    margin: '5px 0',
    color: '#4b3b26'
  },
  memberListWrap: {
    marginTop: '10px',
    color: '#4b3b26'
  },
  memberList: {
    margin: '6px 0 0 18px',
    padding: 0
  },
  actionRow: {
    marginTop: '14px',
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  primaryBtn: {
    border: 'none',
    background: '#3D0A0A',
    color: '#fff',
    borderRadius: '8px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: '700'
  },
  secondaryBtn: {
    border: 'none',
    background: '#E07B39',
    color: '#fff',
    borderRadius: '8px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: '700'
  }
};

export default QrPass;
