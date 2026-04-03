import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const TIME_SLOTS = [
  '06:00 AM - 08:00 AM',
  '08:00 AM - 10:00 AM',
  '10:00 AM - 12:00 PM',
  '04:00 PM - 06:00 PM'
];
const BOOKING_STEPS = [
  { n: '1', t: 'Select Date & Slot', d: 'Choose your darshan date and preferred time slot' },
  { n: '2', t: 'Add Member Details', d: 'Enter devotee names (up to 6 people total)' },
  { n: '3', t: 'Confirm & Get QR', d: 'Your QR pass is generated instantly after booking' }
];

const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const BookPass = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [headDevoteeName, setHeadDevoteeName] = useState(user?.name || '');
  const [headDevoteeAadhaar, setHeadDevoteeAadhaar] = useState('');
  const [bookingDate, setBookingDate] = useState(getTodayDate());
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [members, setMembers] = useState([{ name: user?.name || '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bookingStatus, setBookingStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');

  const memberCount = useMemo(() => members.length, [members]);
  const bookingBlocked = Boolean(bookingStatus && !bookingStatus.canBook);

  const loadBookingStatus = async (dateKey) => {
    setStatusLoading(true);
    setStatusError('');
    try {
      const res = await API.get('/booking/status', { params: { bookingDate: dateKey } });
      setBookingStatus(res.data);
    } catch (err) {
      setStatusError(err.response?.data?.message || 'Unable to fetch booking status.');
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    loadBookingStatus(bookingDate);
  }, [bookingDate]);

  const handleMemberChange = (index, key, value) => {
    setMembers((prev) =>
      prev.map((member, i) => (i === index ? { ...member, [key]: value } : member))
    );
  };

  const addMember = () => {
    if (members.length >= 6) {
      setError('Maximum 6 devotees are allowed in one booking.');
      return;
    }
    setError('');
    setMembers((prev) => [...prev, { name: '' }]);
  };

  const removeMember = (index) => {
    if (members.length === 1) return;
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (bookingBlocked) {
      setError(bookingStatus?.message || 'Booking is currently closed for this date.');
      return;
    }

    setLoading(true);

    try {
      const payload = { headDevoteeName, headDevoteeAadhaar, bookingDate, timeSlot, members };
      const res = await API.post('/booking', payload);
      let createdBookingId =
        res.data?.bookingId ||
        res.data?.booking?._id ||
        res.data?.booking?.id ||
        '';

      if (!createdBookingId) {
        try {
          const latest = await API.get('/booking/mine');
          createdBookingId = latest.data?.bookings?.[0]?._id || latest.data?.bookings?.[0]?.id || '';
        } catch (_ignored) {
          createdBookingId = '';
        }
      }

      if (createdBookingId) {
        navigate(`/booking/${createdBookingId}/qr`);
        return;
      }

      setSuccess('Booking created successfully.');
      setMembers([{ name: headDevoteeName }]);
      loadBookingStatus(bookingDate);
    } catch (err) {
      if (err.response?.data?.status) {
        setBookingStatus(err.response.data.status);
      }
      const validationErrors = err.response?.data?.errors;
      if (Array.isArray(validationErrors) && validationErrors.length > 0) {
        setError(validationErrors[0].msg);
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || 'Booking failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.topRow}>
          <h2 style={styles.title}>Book VIP Darshan Pass</h2>
          <button style={styles.backBtn} onClick={() => navigate('/dashboard')} type="button">
            Back
          </button>
        </div>

        <section style={styles.howSection}>
          <h2 style={styles.howTitle}>Book Your VIP Darshan Pass</h2>
          <div style={styles.stepsRow}>
            {BOOKING_STEPS.map((step) => (
              <div key={step.n} style={styles.stepBox}>
                <div style={styles.stepBoxNum}>{step.n}</div>
                <h3 style={styles.stepBoxTitle}>{step.t}</h3>
                <p style={styles.stepBoxDesc}>{step.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.statusSection}>
          <div
            style={{
              ...styles.statusBadge,
              ...(bookingStatus?.canBook ? styles.statusOpen : styles.statusClosed)
            }}
          >
            {statusLoading
              ? 'Checking booking window...'
              : bookingStatus?.canBook
                ? 'Booking Open'
                : 'Booking Closed'}
          </div>
          <p style={styles.statusText}>
            {statusError || bookingStatus?.message || 'Checking booking availability for selected date...'}
          </p>
          <div style={styles.statusMetaRow}>
            <span style={styles.statusMetaLabel}>Date:</span>
            <strong style={styles.statusMetaValue}>{bookingStatus?.bookingDate || bookingDate}</strong>
          </div>
          <div style={styles.statusMetaRow}>
            <span style={styles.statusMetaLabel}>Remaining people slots:</span>
            <strong style={styles.statusMetaValue}>
              {typeof bookingStatus?.remainingCount === 'number' ? bookingStatus.remainingCount : '-'}
            </strong>
          </div>
        </section>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Head Devotee Name</label>
          <input
            style={styles.input}
            value={headDevoteeName}
            onChange={(e) => setHeadDevoteeName(e.target.value)}
            required
          />
          <label style={styles.label}>Head Devotee Aadhaar (12 digits)</label>
          <input
            style={styles.input}
            placeholder="Enter 12-digit Aadhaar"
            value={headDevoteeAadhaar}
            maxLength={12}
            onChange={(e) => setHeadDevoteeAadhaar(e.target.value.replace(/\D/g, ''))}
            required
          />

          <div style={styles.row}>
            <div style={styles.col}>
              <label style={styles.label}>Booking Date</label>
              <input
                style={styles.input}
                type="date"
                min={getTodayDate()}
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                required
              />
            </div>
            <div style={styles.col}>
              <label style={styles.label}>Time Slot</label>
              <select
                style={styles.input}
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                required
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.memberHeader}>
            <h3 style={styles.memberTitle}>Devotees ({memberCount}/6 people)</h3>
            <button type="button" style={styles.addBtn} onClick={addMember}>
              + Add Member
            </button>
          </div>

          {members.map((member, index) => (
            <div style={styles.memberRow} key={`member-${index}`}>
              <input
                style={styles.memberInput}
                placeholder="Member Name"
                value={member.name}
                onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                required
              />
              <button
                type="button"
                style={styles.removeBtn}
                onClick={() => removeMember(index)}
                disabled={memberCount === 1}
              >
                Remove
              </button>
            </div>
          ))}

          <button style={styles.submitBtn} type="submit" disabled={loading || statusLoading || bookingBlocked}>
            {loading ? 'Booking...' : bookingBlocked ? 'Booking Closed' : 'Confirm Booking'}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f9f4ec',
    padding: '30px 16px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  card: {
    width: '100%',
    maxWidth: '760px',
    background: '#fff',
    borderRadius: '14px',
    padding: '22px',
    boxShadow: '0 10px 24px rgba(0,0,0,0.08)'
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px'
  },
  title: {
    margin: 0,
    color: '#3D0A0A'
  },
  howSection: {
    background: '#f8f8f8',
    border: '1px solid #ececec',
    borderRadius: '12px',
    padding: '18px',
    marginBottom: '16px'
  },
  statusSection: {
    border: '1px solid #efe3ca',
    background: '#fffaf0',
    borderRadius: '12px',
    padding: '12px 14px',
    marginBottom: '14px'
  },
  statusBadge: {
    display: 'inline-block',
    borderRadius: '999px',
    padding: '5px 10px',
    fontSize: '12px',
    fontWeight: 700,
    marginBottom: '8px'
  },
  statusOpen: {
    background: '#eaf8ef',
    border: '1px solid #9cd4b0',
    color: '#166534'
  },
  statusClosed: {
    background: '#fff1f1',
    border: '1px solid #efb7b7',
    color: '#9f1239'
  },
  statusText: {
    margin: '0 0 10px',
    color: '#4b5563',
    fontSize: '13px',
    lineHeight: 1.5
  },
  statusMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    borderTop: '1px dashed #eddcb8',
    paddingTop: '7px',
    marginTop: '7px'
  },
  statusMetaLabel: {
    color: '#7a6c54',
    fontSize: '12px'
  },
  statusMetaValue: {
    color: '#2c1d0d',
    fontSize: '12px'
  },
  howTitle: {
    margin: '0 0 16px',
    color: '#111',
    fontSize: '26px'
  },
  stepsRow: {
    display: 'flex',
    gap: '14px',
    flexWrap: 'wrap'
  },
  stepBox: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px 16px',
    flex: '1',
    minWidth: '200px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    textAlign: 'center'
  },
  stepBoxNum: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    backgroundColor: '#E07B39',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '18px',
    margin: '0 auto 14px',
    fontFamily: 'Calibri, sans-serif'
  },
  stepBoxTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: '8px'
  },
  stepBoxDesc: {
    fontSize: '13px',
    color: '#666',
    lineHeight: '1.6',
    fontFamily: 'Calibri, sans-serif'
  },
  backBtn: {
    background: '#f4efe4',
    border: '1px solid #dbcba9',
    borderRadius: '8px',
    padding: '8px 12px',
    cursor: 'pointer'
  },
  error: {
    background: '#fff1f1',
    border: '1px solid #f7bcbc',
    color: '#b42318',
    borderRadius: '8px',
    padding: '10px',
    marginBottom: '12px'
  },
  success: {
    background: '#f0fbf4',
    border: '1px solid #a7e0b9',
    color: '#166534',
    borderRadius: '8px',
    padding: '10px',
    marginBottom: '12px'
  },
  row: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  col: {
    flex: 1,
    minWidth: '220px'
  },
  label: {
    display: 'block',
    fontSize: '13px',
    color: '#5b5b5b',
    margin: '8px 0 6px'
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #d7d7d7',
    borderRadius: '8px',
    padding: '11px',
    fontSize: '14px'
  },
  memberHeader: {
    marginTop: '16px',
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px'
  },
  memberTitle: {
    margin: 0,
    fontSize: '16px',
    color: '#3D0A0A'
  },
  addBtn: {
    border: 'none',
    borderRadius: '8px',
    padding: '8px 12px',
    background: '#E07B39',
    color: '#fff',
    cursor: 'pointer'
  },
  memberRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    marginBottom: '10px',
    flexWrap: 'wrap'
  },
  memberInput: {
    flex: 1,
    minWidth: '180px',
    border: '1px solid #d7d7d7',
    borderRadius: '8px',
    padding: '10px',
    fontSize: '14px'
  },
  removeBtn: {
    border: '1px solid #e7b2b2',
    color: '#aa2b2b',
    background: '#fff6f6',
    borderRadius: '8px',
    padding: '9px 12px',
    cursor: 'pointer'
  },
  submitBtn: {
    width: '100%',
    marginTop: '12px',
    border: 'none',
    borderRadius: '10px',
    padding: '13px',
    fontSize: '15px',
    fontWeight: 600,
    background: '#3D0A0A',
    color: '#fff',
    cursor: 'pointer'
  }
};

export default BookPass;
