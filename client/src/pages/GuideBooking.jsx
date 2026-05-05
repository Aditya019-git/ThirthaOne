import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  XCircle,
  CheckCircle,
  Clock,
  MapPin,
  Camera,
  Star,
  RefreshCw,
  Info,
  Calendar,
  Languages,
  MessageSquare
} from 'lucide-react';
import ReviewsModal from '../components/ReviewsModal';
import API from '../api/axios';

const getTodayDate = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

const getApiErrorMessage = (err, fallback) => {
  const data = err?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (err?.message) return err.message;
  return fallback;
};

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
const GuideBooking = () => {
  const navigate = useNavigate();
  const [initLoading, setInitLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [placesCatalog, setPlacesCatalog] = useState([]);
  const [guides, setGuides] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [reviewModalTarget, setReviewModalTarget] = useState(null);
  const [fullViewGuide, setFullViewGuide] = useState(null);

  const [bookingDate, setBookingDate] = useState(getTodayDate());
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [selectedGuideProfileId, setSelectedGuideProfileId] = useState('');

  const [reassignBookingId, setReassignBookingId] = useState('');
  const [reassignGuideId, setReassignGuideId] = useState('');

  const loadAll = async () => {
    setInitLoading(true);
    setError('');
    try {
      const [templateRes, mineRes] = await Promise.all([
        API.get('/guide/template-list'),
        API.get('/guide/mine')
      ]);
      const list = Array.isArray(templateRes.data?.guides) ? templateRes.data.guides : [];
      const catalog = Array.isArray(templateRes.data?.placesCatalog) ? templateRes.data.placesCatalog : [];
      const bookings = Array.isArray(mineRes.data?.bookings) ? mineRes.data.bookings : [];

      setGuides(list);
      setPlacesCatalog(catalog);
      setMyBookings(bookings);
      setSelectedGuideProfileId((prev) => prev || list[0]?.id || '');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load guide booking details.'));
    } finally {
      setInitLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const placePriceMap = useMemo(() => {
    const map = new Map();
    placesCatalog.forEach((p) => map.set(p.code, p));
    return map;
  }, [placesCatalog]);

  const selectedBreakdown = useMemo(() => {
    const list = (selectedPlaces || []).map((code) => placePriceMap.get(code)).filter(Boolean);
    const total = list.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
    return { list, total };
  }, [selectedPlaces, placePriceMap]);

  const togglePlace = (code) => {
    setSelectedPlaces((prev) => {
      const next = new Set(Array.isArray(prev) ? prev : []);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return [...next];
    });
  };

  const notifyPaymentFailed = async (bookingId, reason) => {
    try {
      await API.post(`/booking/${bookingId}/payment-failed`, { reason });
    } catch (_error) {}
  };

  const openRazorpayCheckout = async ({ bookingId, paymentConfig }) => {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      await notifyPaymentFailed(bookingId, 'Razorpay script not loaded');
      setError('Unable to load payment gateway.');
      return;
    }
    if (!window.Razorpay) {
      await notifyPaymentFailed(bookingId, 'Razorpay object unavailable');
      setError('Payment gateway is unavailable right now.');
      return;
    }

    const options = {
      key: paymentConfig.keyId,
      order_id: paymentConfig.orderId,
      amount: paymentConfig.amount,
      currency: paymentConfig.currency || 'INR',
      name: 'TirthOne Guide Booking',
      description: 'Payment for Guide Service',
      theme: { color: '#7a2d17' },
      handler: async (gatewayResponse) => {
        try {
          await API.post(`/guide/bookings/${bookingId}/verify-payment`, gatewayResponse);
          setSuccess('Payment verified successfully!');
          await loadAll();
        } catch (verifyError) {
          setError(verifyError.response?.data?.message || 'Payment verification failed.');
        }
      },
      modal: {
        ondismiss: async () => {
          await notifyPaymentFailed(bookingId, 'User closed checkout');
          setError('Payment was not completed.');
        }
      }
    };
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', async (res) => {
      await notifyPaymentFailed(bookingId, res.error.description);
      setError(res.error.description);
    });
    rzp.open();
  };

  const submitBooking = async () => {
    setError('');
    setSuccess('');

    if (!selectedGuideProfileId) {
      setError('Please choose a guide first.');
      return;
    }
    if (!selectedPlaces.length) {
      setError('Please select at least one destination.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        guideProfileId: selectedGuideProfileId,
        bookingDate,
        places: selectedPlaces
      };
      const res = await API.post('/guide/book', payload);
      if (res.data?.paymentRequired && res.data?.payment?.orderId) {
        setSuccess('Initiating payment gateway...');
        await openRazorpayCheckout({ bookingId: res.data.booking.id, paymentConfig: res.data.payment });
      } else {
        setSuccess(res.data?.message || 'Trip request created.');
        setSelectedPlaces([]);
        await loadAll();
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to create trip request.'));
    } finally {
      setLoading(false);
    }
  };

  const cancelTrip = async (id) => {
    setError('');
    setSuccess('');
    try {
      const res = await API.post(`/guide/bookings/${id}/cancel`);
      setSuccess(res.data?.message || 'Trip cancelled.');
      await loadAll();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to cancel trip.'));
    }
  };

  const reportNoShow = async (id) => {
    setError('');
    setSuccess('');
    try {
      const res = await API.post(`/guide/bookings/${id}/report-no-show`);
      setSuccess(res.data?.message || 'Complaint sent.');
      await loadAll();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to report no-show.'));
    }
  };

  const startReassign = (bookingId) => {
    setReassignBookingId(bookingId);
    setReassignGuideId('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitReassign = async () => {
    if (!reassignBookingId) return;
    if (!reassignGuideId) {
      setError('Select a new guide to continue.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await API.post(`/guide/bookings/${reassignBookingId}/reassign`, {
        guideProfileId: reassignGuideId
      });
      setSuccess(res.data?.message || 'Guide reassigned.');
      setReassignBookingId('');
      setReassignGuideId('');
      await loadAll();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to reassign guide.'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusChipStyle = (status) => {
    const key = String(status || '').toLowerCase();
    if (key === 'confirmed') return styles.chipOk;
    if (key === 'pending') return styles.chipPending;
    if (key === 'declined' || key === 'no_show_reported') return styles.chipWarn;
    if (key === 'completed') return styles.chipDone;
    if (key === 'refunded' || key === 'cancelled') return styles.chipMuted;
    return styles.chipBase;
  };

  const canChooseAnotherGuide = (status) => ['declined', 'no_show_reported'].includes(String(status || '').toLowerCase());

  if (initLoading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>Loading guide booking...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.hero}>
          <div>
            <h1 style={styles.heroTitle}>Book a Temple Guide</h1>
            <p style={styles.heroSub}>
              Pick destinations, choose a verified guide, and submit a request. Your guide confirms the trip before it appears as confirmed.
            </p>
          </div>
        </header>

        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        {reassignBookingId && (
          <section style={styles.reassignCard}>
            <div style={styles.reassignTopRow}>
              <div>
                <h3 style={styles.reassignTitle}>Choose Another Guide</h3>
                <p style={styles.reassignSub}>Select a new guide, then submit. The request will wait for the new guide’s confirmation.</p>
              </div>
              <button
                type="button"
                style={styles.ghostBtn}
                onClick={() => {
                  setReassignBookingId('');
                  setReassignGuideId('');
                }}
              >
                Close
              </button>
            </div>

            <div style={styles.guidesGrid}>
              {guides.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setReassignGuideId(g.id)}
                  style={{
                    ...styles.guidePickCard,
                    ...(reassignGuideId === g.id ? styles.guidePickActive : {})
                  }}
                >
                  <div style={styles.guidePickLeft}>
                    <div style={styles.avatar}>
                      {g.photoUrl ? (
                        <img src={g.photoUrl} alt={g.name} style={styles.avatarImg} />
                      ) : (
                        <div style={styles.avatarFallback}>{(g.name || 'G').slice(0, 1).toUpperCase()}</div>
                      )}
                    </div>
                  </div>
                  <div style={styles.guidePickBody}>
                    <div style={styles.guidePickName}>{g.name}</div>
                    <div style={styles.guidePickMeta}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ff9800' }}>{Number(g.rating?.avg || 0).toFixed(1)}★</span>
                      <button type="button" onClick={(e)=>{ e.stopPropagation(); setReviewModalTarget({ id: g.id, name: g.name }); }} style={{ backgroundColor: 'transparent', border: '1px solid #dcc9ad', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', padding: '2px 6px' }}>Reviews</button>
                      <span style={styles.smallChip}>{g.yearsExperience || 0} yrs</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div style={styles.reassignActions}>
              <button type="button" style={styles.primaryBtn} onClick={submitReassign} disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Reassign Request'}
              </button>
            </div>
          </section>
        )}

        <section style={styles.card}>
          <div style={styles.steps}>
            <div style={styles.step}>
              <div style={styles.stepNum}>1</div>
              <div>
                <div style={styles.stepTitle}>Pick Date</div>
                <div style={styles.stepSub}>Choose the date of your exploration trip.</div>
              </div>
            </div>
            <div style={styles.step}>
              <div style={styles.stepNum}>2</div>
              <div>
                <div style={styles.stepTitle}>Select Destinations</div>
                <div style={styles.stepSub}>Pricing is fixed per destination.</div>
              </div>
            </div>
            <div style={styles.step}>
              <div style={styles.stepNum}>3</div>
              <div>
                <div style={styles.stepTitle}>Choose Guide</div>
                <div style={styles.stepSub}>Guide confirms before trip is confirmed.</div>
              </div>
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>Trip Date</label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.summaryBox}>
              <div style={styles.summaryLabel}>Estimated Total</div>
              <div style={styles.summaryValue}>Rs. {selectedBreakdown.total}</div>
              <div style={styles.muted}>Payment goes to temple account (refund supported on cancellation).</div>
            </div>
          </div>

          <div style={styles.sectionTitle}>Destinations (Pricing)</div>
          <div style={styles.destGrid}>
            {placesCatalog.map((p) => {
              const checked = selectedPlaces.includes(p.code);
              return (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => togglePlace(p.code)}
                  style={{ ...styles.destCard, ...(checked ? styles.destCardActive : {}) }}
                >
                  <div style={styles.destName}>{p.name}</div>
                  <div style={styles.destPrice}>Rs. {p.price}</div>
                  <div style={styles.destTick}>{checked ? 'Selected' : 'Tap to select'}</div>
                </button>
              );
            })}
          </div>

          <div style={styles.sectionTitle}>Choose a Verified Guide</div>
          {guides.length === 0 ? (
            <div style={styles.infoBox}>No verified guides available yet. Ask admin to add guides.</div>
          ) : (
            <div style={styles.guidesGrid}>
              {guides.map((g) => {
                const selected = selectedGuideProfileId === g.id;
                return (
                  <article
                    key={g.id}
                    style={{
                      ...styles.guideCard,
                      ...(selected ? styles.guideCardActive : {})
                    }}
                    onClick={() => setSelectedGuideProfileId(g.id)}
                  >
                    <div style={styles.cardHead}>
                      <div style={styles.avatar}>
                        {g.photoUrl ? (
                          <img
                            src={g.photoUrl}
                            alt={g.name}
                            style={styles.avatarImg}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedGuideProfileId(g.id);
                              setFullViewGuide(g);
                            }}
                          />
                        ) : (
                          <div style={styles.avatarFallback}>{(g.name || 'G').slice(0, 1).toUpperCase()}</div>
                        )}
                      </div>
                      <div style={styles.cardHeadInfo}>
                        <h3 style={styles.guideName}>{g.name}</h3>
                        <div style={styles.badgeRow}>
                          <span style={styles.badgeVerified}>Verified</span>
                          <span style={styles.badgeRating}>{Number(g.rating?.avg || 0).toFixed(1)}★</span>
                        </div>
                        <p style={styles.metaStrong}>{g.yearsExperience || 0} yrs exp</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReviewModalTarget({ id: g.id, name: g.name });
                          }}
                          style={styles.reviewBtnInline}
                        >
                          Read Reviews
                        </button>
                      </div>
                    </div>

                    <div style={styles.detailList}>
                      <p style={styles.meta}><strong>Age:</strong> {g.age ?? '-'}</p>
                      <p style={styles.meta}><strong>Email:</strong> {g.email || '-'}</p>
                      <p style={styles.meta}><strong>Mobile:</strong> {g.mobile || '-'}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div style={styles.formActions}>
            <button type="button" style={styles.primaryBtn} onClick={submitBooking} disabled={loading || guides.length === 0}>
              {loading ? 'Submitting...' : 'Submit Guide Request'}
            </button>
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.listHeader}>
            <h2 style={styles.cardTitle}>My Guide Trips</h2>
            <button type="button" style={styles.ghostBtn} onClick={loadAll} disabled={loading}>
              Refresh
            </button>
          </div>

          {myBookings.length === 0 ? (
            <div style={styles.muted}>No guide trips yet.</div>
          ) : (
            <div style={styles.myGrid}>
              {myBookings.map((b) => {
                const status = String(b.status || '').toLowerCase();
                const placesLabel = Array.isArray(b.places) && b.places.length
                  ? b.places.map((p) => `${p.name} (Rs.${p.price})`).join(', ')
                  : '-';

                return (
                  <article key={b.id} style={styles.tripCard}>
                    <div style={styles.tripTopRow}>
                      <div>
                        <div style={styles.tripLabel}>Trip Date</div>
                        <div style={styles.tripValue}>{formatDate(b.bookingDate)}</div>
                      </div>
                      <div style={{ ...styles.chipBase, ...getStatusChipStyle(b.status) }}>
                        {status.replace(/_/g, ' ')}
                      </div>
                    </div>

                    <div style={styles.tripBlock}>
                      <div style={styles.tripLabel}>Destinations</div>
                      <div style={styles.tripValue}>{placesLabel}</div>
                    </div>

                  <div style={styles.tripGrid}>
                    <div>
                      <div style={styles.tripLabel}>Guide</div>
                      <div style={styles.tripValue}>{b.guide?.name || '-'}</div>
                    </div>
                    <div>
                      <div style={styles.tripLabel}>Total</div>
                      <div style={styles.tripValue}>Rs. {b.totalAmount}</div>
                    </div>
                  </div>
                  {b.payment?.status && (
                    <div style={styles.tripGrid}>
                      <div>
                        <div style={styles.tripLabel}>Payment</div>
                        <div style={styles.tripValue}>{String(b.payment.status).toUpperCase()}</div>
                      </div>
                      <div>
                        <div style={styles.tripLabel}>Paid On</div>
                        <div style={styles.tripValue}>{b.payment.paidAt ? formatDate(b.payment.paidAt) : '-'}</div>
                      </div>
                    </div>
                  )}
                  {b.payment?.refundedAt && (
                    <div style={styles.infoBox}>
                      Refund processed on <strong>{formatDate(b.payment.refundedAt)}</strong>.
                    </div>
                  )}

                  {b.statusNote && <div style={styles.noteBox}>{b.statusNote}</div>}

                    {status === 'confirmed' && b.guide?.mobile && (
                      <div style={styles.infoBox}>
                        Contact: <strong>{b.guide.name}</strong> ({b.guide.mobile})
                      </div>
                    )}

                    <div style={styles.tripActions}>
                      {canChooseAnotherGuide(b.status) && (
                        <button type="button" style={styles.secondaryBtn} onClick={() => startReassign(b.id)}>
                          Choose Another Guide
                        </button>
                      )}
                      {status === 'confirmed' && (
                        <button type="button" style={styles.secondaryBtn} onClick={() => reportNoShow(b.id)}>
                          Raise Complaint / Issue Refund
                        </button>
                      )}
                      {status === 'completed' && !b.feedbackId && (
                        <button type="button" style={styles.secondaryBtn} onClick={() => navigate(`/guide-feedback/${b.id}`)}>
                          Leave Feedback
                        </button>
                      )}
                      {!['completed', 'refunded'].includes(status) && (
                        <button type="button" style={styles.dangerBtn} onClick={() => cancelTrip(b.id)}>
                          Cancel & Refund
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
      {reviewModalTarget && <ReviewsModal type="guide" targetId={reviewModalTarget.id} targetName={reviewModalTarget.name} onClose={() => setReviewModalTarget(null)} />}

      {fullViewGuide && (
        <div style={styles.modalOverlay} onClick={() => setFullViewGuide(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button type="button" style={styles.modalClose} onClick={() => setFullViewGuide(null)}>×</button>
            <div style={styles.modalHeader}>
              <img
                src={fullViewGuide.photoUrl || 'https://placehold.co/400x400/f3e8d5/6d4c2f?text=Guide'}
                alt={fullViewGuide.name}
                style={styles.modalPhoto}
              />
              <div style={styles.modalHeaderInfo}>
                <h2 style={styles.modalTitle}>{fullViewGuide.name}</h2>
                <div style={styles.modalBadges}>
                  <span style={styles.badgeVerified}>Verified Guide</span>
                  <span style={styles.badgeRating}>{Number(fullViewGuide.rating?.avg || 0).toFixed(1)}★</span>
                  <span style={styles.badgeSecondary}>{fullViewGuide.yearsExperience || 0} yrs exp</span>
                </div>
              </div>
            </div>
            
            <div style={styles.modalBody}>
              <h3 style={styles.modalSectionTitle}>About</h3>
              <p style={styles.modalBio}>{fullViewGuide.bio || 'No biography available.'}</p>
              
              <h3 style={styles.modalSectionTitle}>Details</h3>
              <div style={styles.modalDetailsGrid}>
                <div><strong>Age:</strong> {fullViewGuide.age ?? '-'}</div>
                <div><strong>Mobile:</strong> {fullViewGuide.mobile || '-'}</div>
                <div><strong>Email:</strong> {fullViewGuide.email || '-'}</div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                style={styles.modalActionBtn}
                onClick={() => {
                  setSelectedGuideProfileId(fullViewGuide.id);
                  setFullViewGuide(null);
                  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }}
              >
                Confirm Selection
              </button>
            </div>
          </div>
        </div>
      )}
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
  heroSub: { margin: '8px 0 0', color: '#efe4d8', maxWidth: '760px', lineHeight: 1.45 },
  heroActions: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start' },
  backBtn: {
    border: '1px solid rgba(255,255,255,0.35)',
    borderRadius: '10px',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
    fontWeight: '800',
    cursor: 'pointer'
  },
  card: {
    marginTop: '12px',
    background: '#fff',
    border: '1px solid #e2d4c3',
    borderRadius: '16px',
    padding: '14px',
    boxShadow: '0 10px 24px rgba(44, 25, 14, 0.1)'
  },
  cardTitle: { margin: 0, fontFamily: 'Georgia, serif', color: '#2f2214' },
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
  infoBox: {
    border: '1px solid #d6e2f4',
    background: '#f2f7ff',
    color: '#1f4e8c',
    borderRadius: '12px',
    padding: '10px'
  },
  steps: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '10px'
  },
  step: {
    border: '1px solid #ead8bb',
    background: '#fffaf0',
    borderRadius: '14px',
    padding: '12px',
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start'
  },
  stepNum: {
    width: '34px',
    height: '34px',
    borderRadius: '999px',
    background: '#E07B39',
    color: '#fff',
    display: 'grid',
    placeItems: 'center',
    fontWeight: '900'
  },
  stepTitle: { fontWeight: '900', color: '#2f2214' },
  stepSub: { marginTop: '4px', color: '#6d5842', fontSize: '13px', lineHeight: 1.35 },
  formRow: {
    marginTop: '12px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px'
  },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: {
    fontSize: '12px',
    fontWeight: '800',
    color: '#5d4122',
    textTransform: 'uppercase',
    letterSpacing: '0.7px'
  },
  input: {
    border: '1px solid #dec89f',
    borderRadius: '10px',
    padding: '10px 12px',
    outline: 'none',
    background: '#fffaf0'
  },
  summaryBox: {
    border: '1px solid #ead8bb',
    background: 'linear-gradient(180deg, #fffaf0 0%, #fff3e3 100%)',
    borderRadius: '14px',
    padding: '12px'
  },
  summaryLabel: { color: '#6d5842', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.7px' },
  summaryValue: { marginTop: '6px', fontSize: '26px', fontWeight: '900', color: '#2f2214', fontFamily: 'Georgia, serif' },
  sectionTitle: { marginTop: '14px', fontFamily: 'Georgia, serif', fontSize: '20px', color: '#2f2214' },
  destGrid: {
    marginTop: '10px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '10px'
  },
  destCard: {
    border: '1px solid #ead8bb',
    background: '#fffaf0',
    borderRadius: '14px',
    padding: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    boxShadow: '0 10px 20px rgba(44, 25, 14, 0.06)'
  },
  destCardActive: {
    borderColor: '#3D0A0A',
    background: 'linear-gradient(180deg, rgba(61,10,10,0.10) 0%, rgba(224,123,57,0.12) 100%)'
  },
  destName: { fontWeight: '900', color: '#2f2214' },
  destPrice: { marginTop: '6px', fontWeight: '900', color: '#6d5842' },
  destTick: { marginTop: '8px', fontSize: '12px', color: '#6d5842', fontWeight: '800' },
  guidesGrid: {
    marginTop: '10px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px'
  },
  guideCard: {
    background: '#fff',
    border: '1px solid #e8d9c4',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 4px 12px rgba(61, 10, 10, 0.06)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  guideCardActive: {
    border: '2px solid #7a4520',
    boxShadow: '0 8px 24px rgba(87, 47, 20, 0.18)',
    transform: 'translateY(-2px)'
  },
  cardHead: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  cardHeadInfo: {
    minWidth: 0,
    flex: 1
  },
  avatar: {
    width: '104px',
    height: '104px',
    borderRadius: '8px',
    border: '1px solid #ddccb5',
    background: '#fffaf0',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    overflow: 'hidden'
  },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  avatarFallback: { width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontWeight: '900', color: '#3D0A0A', fontFamily: 'Georgia, serif' },
  guideName: { margin: '0 0 6px', color: '#2f1f11', fontSize: '18px', fontWeight: '700' },
  badgeRow: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' },
  badgeVerified: { border: '1px solid #b8d0f0', background: '#eef5ff', color: '#1f4e8c', borderRadius: '999px', padding: '2px 8px', fontSize: '11px', fontWeight: '700' },
  badgeRating: { border: '1px solid #f6e3c5', background: '#fff8ea', color: '#a46b14', borderRadius: '999px', padding: '2px 8px', fontSize: '11px', fontWeight: '700' },
  badgeSecondary: { border: '1px solid #dcc9ad', background: '#fffaf1', color: '#6d5337', borderRadius: '999px', padding: '2px 8px', fontSize: '11px', fontWeight: '700' },
  metaStrong: { margin: '0 0 6px', color: '#6b4e31', fontSize: '12px', fontWeight: '700' },
  reviewBtnInline: { background: 'transparent', border: '1px solid #dcc9ad', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', padding: '3px 8px', color: '#4a3827' },
  detailList: { marginTop: '4px', borderTop: '1px dashed #e7d8c3', paddingTop: '12px', display: 'grid', gap: '6px', fontSize: '13px' },
  meta: { margin: 0, color: '#5a4634', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(20, 10, 5, 0.7)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  modalContent: { position: 'relative', background: '#fffaf2', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', border: '1px solid #e8d9c4' },
  modalClose: { position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', fontSize: '28px', lineHeight: 1, color: '#4a3827', cursor: 'pointer', zIndex: 2 },
  modalHeader: { padding: '24px', borderBottom: '1px solid #e8d9c4', background: 'linear-gradient(180deg, #fefdfb 0%, #fffaf2 100%)', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' },
  modalPhoto: { width: '120px', height: '120px', borderRadius: '12px', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '2px solid #fff' },
  modalHeaderInfo: { flex: '1 1 200px' },
  modalTitle: { margin: '0 0 10px', fontSize: '24px', color: '#3b2a1a' },
  modalBadges: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  modalBody: { padding: '24px' },
  modalSectionTitle: { margin: '0 0 12px', fontSize: '16px', color: '#7a4520', borderBottom: '2px solid #f0e6d3', paddingBottom: '6px' },
  modalBio: { margin: '0 0 24px', lineHeight: 1.6, color: '#4a3827', fontSize: '15px' },
  modalDetailsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', color: '#4a3827', fontSize: '14px', background: '#fff', padding: '16px', borderRadius: '10px', border: '1px solid #e8d9c4' },
  modalFooter: { padding: '20px 24px', borderTop: '1px solid #e8d9c4', background: '#fff' },
  modalActionBtn: { width: '100%', padding: '14px', background: '#5a190f', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
  formActions: { marginTop: '12px', display: 'flex', justifyContent: 'flex-end' },
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
  ghostBtn: {
    border: '1px solid #dec89f',
    background: '#fff',
    borderRadius: '10px',
    padding: '9px 12px',
    cursor: 'pointer',
    fontWeight: '900',
    color: '#5d4122'
  },
  muted: { color: '#6d5842', fontSize: '12px' },
  listHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  myGrid: { marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '10px' },
  tripCard: { border: '1px solid #ead8bb', borderRadius: '16px', padding: '12px', background: '#fffaf0' },
  tripTopRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' },
  tripGrid: { marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  tripBlock: { marginTop: '10px' },
  tripLabel: { fontSize: '11px', fontWeight: '900', color: '#6d5842', textTransform: 'uppercase', letterSpacing: '0.8px' },
  tripValue: { marginTop: '4px', fontWeight: '900', color: '#2f2214' },
  noteBox: { marginTop: '10px', border: '1px dashed #ead8bb', borderRadius: '12px', padding: '10px', color: '#5d4122', background: '#fff' },
  tripActions: { marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' },
  chipBase: { padding: '6px 10px', borderRadius: '999px', border: '1px solid transparent', fontSize: '11px', fontWeight: '900', textTransform: 'capitalize' },
  chipOk: { background: '#eaf8ef', borderColor: '#b9e7c7', color: '#166534' },
  chipPending: { background: '#fff7e8', borderColor: '#f3ddb4', color: '#9a5b11' },
  chipWarn: { background: '#fff1f1', borderColor: '#efb7b7', color: '#a11f1f' },
  chipDone: { background: '#ecfeff', borderColor: '#bae6fd', color: '#0e7490' },
  chipMuted: { background: '#f3f4f6', borderColor: '#d1d5db', color: '#374151' },
  reassignCard: {
    marginTop: '12px',
    border: '1px solid #ead8bb',
    background: 'linear-gradient(180deg, #fffaf0 0%, #fff3e3 100%)',
    borderRadius: '16px',
    padding: '14px',
    boxShadow: '0 10px 24px rgba(44, 25, 14, 0.1)'
  },
  reassignTopRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' },
  reassignTitle: { margin: 0, fontFamily: 'Georgia, serif', color: '#2f2214' },
  reassignSub: { margin: '6px 0 0', color: '#6d5842' },
  reassignActions: { marginTop: '12px', display: 'flex', justifyContent: 'flex-end' },
  guidePickCard: {
    border: '1px solid #ead8bb',
    background: '#fff',
    borderRadius: '16px',
    padding: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    display: 'grid',
    gridTemplateColumns: '60px 1fr',
    gap: '10px',
    alignItems: 'center'
  },
  guidePickActive: {
    borderColor: '#3D0A0A',
    boxShadow: '0 14px 30px rgba(61, 10, 10, 0.18)'
  },
  guidePickLeft: { display: 'flex', justifyContent: 'center' },
  guidePickBody: { display: 'flex', flexDirection: 'column', gap: '6px' },
  guidePickName: { fontWeight: '900', color: '#2f2214' },
  guidePickMeta: { display: 'flex', gap: '6px', flexWrap: 'wrap' }
};

export default GuideBooking;
