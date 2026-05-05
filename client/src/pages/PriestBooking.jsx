import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReviewsModal from '../components/ReviewsModal';
import API from '../api/axios';

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const POLL_STATUS_INTERVAL_MS = 5000;

const getTodayDate = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

const PriestBooking = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [slotStatusMap, setSlotStatusMap] = useState(null);
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotError, setSlotError] = useState('');

  const [priests, setPriests] = useState([]);
  const [selectedPriestId, setSelectedPriestId] = useState('');
  const [selectedRitualCode, setSelectedRitualCode] = useState('');
  const [bookingDate, setBookingDate] = useState(getTodayDate());
  const [timeSlot, setTimeSlot] = useState('');
  const [initLoading, setInitLoading] = useState(true);
  const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [latestBooking, setLatestBooking] = useState(null);
  const [latestPayment, setLatestPayment] = useState(null);

  const [reviewModalTarget, setReviewModalTarget] = useState(null);
  const [fullViewPriest, setFullViewPriest] = useState(null);

  const [vipEligible, setVipEligible] = useState(false);
  const [vipEligibilityMessage, setVipEligibilityMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setInitLoading(true);
      setError('');
      setSuccess('');
      try {
        const [servicesRes, priestsRes, myBookingsRes] = await Promise.all([
          API.get('/priest/services'),
          API.get('/priest/template-list'),
          API.get('/booking/mine')
        ]);

        const myBookings = Array.isArray(myBookingsRes.data?.bookings) ? myBookingsRes.data.bookings : [];
        const todayKey = getTodayDate();
        const hasEligibleVipPass = myBookings.some((item) => {
          const status = String(item?.status || '').toLowerCase();
          if (!['confirmed', 'visited'].includes(status)) return false;

          const date = new Date(item.bookingDate);
          if (Number.isNaN(date.getTime())) return false;

          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}` === todayKey;
        });

        setVipEligible(hasEligibleVipPass);
        setVipEligibilityMessage(
          hasEligibleVipPass
            ? ''
            : 'VIP pass is mandatory for Abhishek booking. Please book your VIP darshan pass for today first.'
        );

        const rituals = Array.isArray(servicesRes.data?.rituals) ? servicesRes.data.rituals : [];
        const slots = Array.isArray(servicesRes.data?.rules?.allowedTimeSlots)
          ? servicesRes.data.rules.allowedTimeSlots
          : [];
        const priestList = Array.isArray(priestsRes.data?.priests) ? priestsRes.data.priests : [];

        setServices(rituals);
        setTimeSlots(slots);
        setPriests(priestList);
        setSelectedRitualCode((prev) => prev || rituals[0]?.code || '');
        setSelectedPriestId((prev) => (hasEligibleVipPass ? (prev || priestList[0]?.id || '') : ''));
        setTimeSlot((prev) => prev || slots[0] || '');
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load priest booking details.');
      } finally {
        setInitLoading(false);
      }
    };

    loadData();
  }, []);

  const refreshLatestBooking = async (bookingId) => {
    if (!bookingId) return null;
    const res = await API.get(`/priest/bookings/${bookingId}`);
    const next = res.data?.booking || null;
    setLatestBooking(next);
    setLatestPayment(next?.payment || null);
    return next;
  };

  useEffect(() => {
    const loadExistingPriestBooking = async () => {
      if (initLoading || !vipEligible) return;
      if (latestBooking?.id) return;

      setError('');
      try {
        const res = await API.get('/priest/mine');
        const list = Array.isArray(res.data?.bookings) ? res.data.bookings : [];
        const todayKey = getTodayDate();
        const todayItem = list.find((item) => {
          const key = new Date(item.bookingDate);
          if (Number.isNaN(key.getTime())) return false;
          const y = key.getFullYear();
          const m = String(key.getMonth() + 1).padStart(2, '0');
          const d = String(key.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}` === todayKey;
        });

        if (todayItem?.id) {
          await refreshLatestBooking(todayItem.id);
        }
      } catch (_err) {
        // Ignore, best-effort only.
      }
    };

    loadExistingPriestBooking();
  }, [initLoading, latestBooking?.id, vipEligible]);

  useEffect(() => {
    if (!latestBooking?.id) return undefined;
    const status = String(latestBooking.status || '').toLowerCase();
    const shouldPoll = status === 'payment_submitted' || status === 'confirmed';
    if (!shouldPoll) return undefined;

    const id = latestBooking.id;
    const timer = setInterval(async () => {
      try {
        await refreshLatestBooking(id);
      } catch (_err) {
        // ignore polling errors
      }
    }, POLL_STATUS_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [latestBooking?.id, latestBooking?.status]);

  useEffect(() => {
    const loadSlotStatus = async () => {
      if (!vipEligible || !selectedPriestId) return;
      setSlotLoading(true);
      setSlotError('');
      try {
        const res = await API.get('/priest/slot-status', {
          params: { bookingDate, priestProfileId: selectedPriestId }
        });
        const slots = res.data?.slots || null;
        setSlotStatusMap(slots);

        if (slots && timeSlots.length > 0) {
          const current = slots[timeSlot];
          if (current?.isFull) {
            const firstOpen = timeSlots.find((s) => slots[s] && !slots[s].isFull);
            if (firstOpen) setTimeSlot(firstOpen);
          }
        }
      } catch (err) {
        setSlotError(err.response?.data?.message || 'Unable to load slot availability.');
      } finally {
        setSlotLoading(false);
      }
    };

    loadSlotStatus();
  }, [bookingDate, selectedPriestId, timeSlot, timeSlots, vipEligible]);

  const selectedRitual = useMemo(
    () => services.find((item) => item.code === selectedRitualCode) || null,
    [services, selectedRitualCode]
  );

  const selectedPriest = useMemo(
    () => priests.find((p) => p.id === selectedPriestId) || null,
    [priests, selectedPriestId]
  );

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        priestProfileId: selectedPriestId,
        ritualCode: selectedRitualCode,
        bookingDate,
        timeSlot
      };
      const res = await API.post('/priest/book', payload);
      const booking = res.data?.booking || null;
      setLatestBooking(booking);
      setLatestPayment(booking?.payment || null);
      
      if (res.data?.paymentRequired && res.data?.payment?.orderId) {
        setSuccess('Initiating payment gateway...');
        await openRazorpayCheckout({ bookingId: booking.id, paymentConfig: res.data.payment });
      } else {
        setSuccess(res.data?.message || 'Priest booking request created.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create priest booking.');
    } finally {
      setLoading(false);
    }
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
      name: 'TirthOne Priest Abhishek',
      description: 'Payment for Priest Service',
      theme: { color: '#7a2d17' },
      handler: async (gatewayResponse) => {
        try {
          await API.post(`/priest/bookings/${bookingId}/verify-payment`, gatewayResponse);
          await refreshLatestBooking(bookingId);
          setSuccess('Payment verified successfully!');
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

  const goToFeedback = () => {
    if (!latestBooking?.id) return;
    navigate(`/priest-feedback/${latestBooking.id}`);
  };

  

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.topBar}>
          <h1 style={styles.title}>Book Priest Abhishek</h1>
          <button style={styles.backBtn} onClick={() => navigate('/dashboard')} type="button">
            Back to Dashboard
          </button>
        </div>
        <p style={styles.subTitle}>
          Same-day ritual booking only. Abhishek window is 06:00 AM to 02:00 PM IST.
        </p>

        {initLoading && <div style={styles.infoBox}>Loading priest templates and ritual menu...</div>}
        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        {!initLoading && !vipEligible && (
          <div style={styles.lockedBox}>
            <h3 style={styles.lockedTitle}>VIP Pass Required First</h3>
            <p style={styles.lockedText}>{vipEligibilityMessage}</p>
            <div style={styles.lockedActions}>
              <button type="button" style={styles.submitBtn} onClick={() => navigate('/book-pass')}>
                Book VIP Pass First
              </button>
              <button type="button" style={styles.backBtn} onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

        {!initLoading && vipEligible && (
          <>
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Select Priest</h2>
              {priests.length === 0 ? (
                <div style={styles.infoBox}>No active priest with payment details available yet. Ask admin to add priests.</div>
              ) : (
                <div style={styles.priestGrid}>
                  {priests.map((priest) => {
                    const isSelected = selectedPriestId === priest.id;
                    return (
                      <article
                        key={priest.id}
                        style={{
                          ...styles.priestCard,
                          ...(isSelected ? styles.priestCardActive : {})
                        }}
                        onClick={() => setSelectedPriestId(priest.id)}
                      >
                        <div style={styles.cardHead}>
                          <img
                            src={priest.photoUrl || 'https://placehold.co/240x200/f3e8d5/6d4c2f?text=Priest'}
                            alt={priest.name}
                            style={styles.photo}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPriestId(priest.id);
                              setFullViewPriest(priest);
                            }}
                          />
                          <div style={styles.cardHeadInfo}>
                            <h3 style={styles.priestName}>{priest.name}</h3>
                            <div style={styles.badgeRow}>
                              <span style={styles.badgeVerified}>Verified</span>
                              <span style={styles.badgeRating}>{Number(priest.rating?.avg || 0).toFixed(1)}★</span>
                            </div>
                            <p style={styles.metaStrong}>{priest.yearsExperience || 0} yrs exp</p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReviewModalTarget({ id: priest.id, name: priest.name });
                              }}
                              style={styles.reviewBtnInline}
                            >
                              Read Reviews
                            </button>
                          </div>
                        </div>

                        <div style={styles.detailList}>
                          <p style={styles.meta}><strong>Age:</strong> {priest.age}</p>
                          <p style={styles.meta}><strong>Email:</strong> {priest.email || '-'}</p>
                          <p style={styles.meta}><strong>Mobile:</strong> {priest.mobile || '-'}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Ritual Menu</h2>
              <div style={styles.ritualList}>
                {services.map((ritual) => (
                  <label key={ritual.code} style={styles.ritualItem}>
                    <input
                      type="radio"
                      name="ritual"
                      checked={selectedRitualCode === ritual.code}
                      onChange={() => setSelectedRitualCode(ritual.code)}
                    />
                    <span>
                      <strong>{ritual.name}</strong> - Rs. {ritual.basePrice}
                      <br />
                      <small>{ritual.description}</small>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <form style={styles.section} onSubmit={handleCreateBooking}>
              <h2 style={styles.sectionTitle}>Confirm Details</h2>
              <div style={styles.formGrid}>
                <div>
                  <label style={styles.label}>Booking Date</label>
                  <input
                    type="date"
                    value={bookingDate}
                    min={getTodayDate()}
                    max={getTodayDate()}
                    onChange={(e) => setBookingDate(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
                <div>
                  <label style={styles.label}>Abhishek Slot</label>
                  <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} style={styles.input} required>
                    {timeSlots.map((slot) => {
                      const info = slotStatusMap?.[slot];
                      const isFull = Boolean(info?.isFull);
                      const remaining = typeof info?.remaining === 'number' ? info.remaining : null;
                      const label = isFull
                        ? `${slot} (Full)`
                        : remaining === null
                          ? slot
                          : `${slot} (Remaining ${remaining})`;
                      return (
                        <option key={slot} value={slot} disabled={isFull}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                  {slotLoading && <p style={styles.hint}>Checking slot availability...</p>}
                  {slotError && <p style={styles.fieldError}>{slotError}</p>}
                </div>
              </div>

              <div style={styles.summaryCard}>
                <p style={styles.summaryRow}><strong>Selected Priest:</strong> {selectedPriest?.name || '-'}</p>
                <p style={styles.summaryRow}><strong>Ritual:</strong> {selectedRitual?.name || '-'}</p>
                <p style={styles.summaryTotal}>
                  Amount To Pay Priest: Rs. {selectedRitual?.basePrice || 0}
                </p>
              </div>

              <button
                type="submit"
                style={styles.submitBtn}
                disabled={loading || !selectedPriestId || !selectedRitualCode || !timeSlot}
              >
                {loading ? 'Creating Request...' : 'Create Booking Request'}
              </button>
            </form>

            {latestBooking && (
              <section style={styles.section}>
                <h2 style={styles.sectionTitle}>Latest Priest Booking</h2>
                <div style={styles.latestCard}>
                  <p style={styles.summaryRow}><strong>Booking ID:</strong> {latestBooking.id}</p>
                  <p style={styles.summaryRow}><strong>Priest:</strong> {latestBooking.priestName}</p>
                  <p style={styles.summaryRow}><strong>Ritual:</strong> {latestBooking.ritualType}</p>
                  <p style={styles.summaryRow}><strong>Slot:</strong> {latestBooking.timeSlot}</p>
                  <p style={styles.summaryRow}>
                    <strong>Status:</strong> {String(latestBooking.status || '').replace(/_/g, ' ')}
                  </p>
                  <p style={styles.summaryTotal}><strong>Total:</strong> Rs. {latestBooking.totalAmount}</p>

                  <div style={styles.refreshRow}>
                    <button
                      type="button"
                      style={styles.payCopyBtn}
                      onClick={() => refreshLatestBooking(latestBooking.id)}
                    >
                      Refresh Status
                    </button>
                    {String(latestBooking.status || '').toLowerCase() === 'payment_submitted' && (
                      <span style={styles.refreshHint}>
                        Waiting for priest acceptance... auto-refresh is ON.
                      </span>
                    )}
                  </div>

                  {latestBooking.status === 'pending' && latestPayment && (
                    <div style={styles.infoBox}>
                      <p>Complete your payment via Razorpay to confirm.</p>
                      <button style={styles.submitBtn} onClick={() => openRazorpayCheckout({ bookingId: latestBooking.id, paymentConfig: { keyId: 'YOUR_KEY_HERE', orderId: latestPayment.razorpayOrderId, amount: latestPayment.amount * 100 }})}>Retry Payment</button>
                    </div>
                  )}
                  {latestBooking.status === 'payment_submitted' && (
                    <div style={styles.infoBox}>
                      Payment proof submitted. Waiting for priest acceptance. This will update automatically.
                    </div>
                  )}

                  {latestBooking.status === 'confirmed' && (
                    <div style={styles.successBox}>
                      Priest accepted your booking. Please reach on time for your slot.
                    </div>
                  )}

                  {latestBooking.status === 'completed' && (
                    <div style={styles.feedbackBox}>
                      <p style={styles.summaryRow}><strong>Ritual Completed.</strong> Please share your feedback.</p>
                      <button
                        type="button"
                        style={styles.payCopyBtn}
                        onClick={goToFeedback}
                        disabled={Boolean(latestBooking.feedbackId)}
                      >
                        {latestBooking.feedbackId ? 'Feedback Submitted' : 'Give Feedback'}
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
      {reviewModalTarget && <ReviewsModal type="priest" targetId={reviewModalTarget.id} targetName={reviewModalTarget.name} onClose={() => setReviewModalTarget(null)} />}

      {fullViewPriest && (
        <div style={styles.modalOverlay} onClick={() => setFullViewPriest(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button type="button" style={styles.modalClose} onClick={() => setFullViewPriest(null)}>×</button>
            <div style={styles.modalHeader}>
              <img
                src={fullViewPriest.photoUrl || 'https://placehold.co/400x400/f3e8d5/6d4c2f?text=Priest'}
                alt={fullViewPriest.name}
                style={styles.modalPhoto}
              />
              <div style={styles.modalHeaderInfo}>
                <h2 style={styles.modalTitle}>{fullViewPriest.name}</h2>
                <div style={styles.modalBadges}>
                  <span style={styles.badgeVerified}>Verified Priest</span>
                  <span style={styles.badgeRating}>{Number(fullViewPriest.rating?.avg || 0).toFixed(1)}★</span>
                  <span style={styles.badgeSecondary}>{fullViewPriest.yearsExperience || 0} yrs exp</span>
                </div>
              </div>
            </div>
            
            <div style={styles.modalBody}>
              <h3 style={styles.modalSectionTitle}>About</h3>
              <p style={styles.modalBio}>{fullViewPriest.bio || 'No biography available.'}</p>
              
              <h3 style={styles.modalSectionTitle}>Details</h3>
              <div style={styles.modalDetailsGrid}>
                <div><strong>Age:</strong> {fullViewPriest.age}</div>
                <div><strong>Mobile:</strong> {fullViewPriest.mobile || '-'}</div>
                <div><strong>Email:</strong> {fullViewPriest.email || '-'}</div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                style={styles.modalActionBtn}
                onClick={() => {
                  setSelectedPriestId(fullViewPriest.id);
                  setFullViewPriest(null);
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
    background: 'linear-gradient(140deg, #f9f1e6, #f4efe8 50%, #e9efe9)',
    padding: '24px'
  },
  container: {
    maxWidth: '1080px',
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
    color: '#2f1d11',
    fontFamily: 'Georgia, serif'
  },
  subTitle: {
    color: '#695544',
    marginTop: '8px'
  },
  backBtn: {
    border: '1px solid #d9c4a3',
    background: '#fff8ed',
    color: '#5e3f20',
    borderRadius: '8px',
    padding: '8px 12px',
    cursor: 'pointer'
  },
  section: {
    marginTop: '14px',
    background: '#fff',
    border: '1px solid #e8d9c4',
    borderRadius: '12px',
    padding: '14px'
  },
  sectionTitle: {
    margin: '0 0 10px',
    color: '#3b2a1a'
  },
  hint: {
    margin: '8px 0 0',
    color: '#6d563f',
    fontSize: '12px'
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
  feedbackBox: {
    marginTop: '12px',
    border: '1px solid #dcc9ad',
    background: '#fffaf1',
    color: '#4a3827',
    borderRadius: '10px',
    padding: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    flexWrap: 'wrap'
  },
  lockedBox: {
    marginTop: '12px',
    border: '1px solid #e9c79e',
    background: '#fff8ec',
    color: '#5a3d1f',
    borderRadius: '10px',
    padding: '12px'
  },
  lockedTitle: {
    margin: '0 0 8px',
    color: '#4a2c10',
    fontSize: '20px'
  },
  lockedText: {
    margin: '0 0 12px',
    lineHeight: 1.5
  },
  lockedActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  priestGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px'
  },
  priestCard: {
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
  priestCardActive: {
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
  photo: {
    width: '104px',
    height: '104px',
    borderRadius: '8px',
    objectFit: 'cover',
    objectPosition: 'center top',
    border: '1px solid #ddccb5',
    cursor: 'pointer',
    transition: 'transform 0.2s'
  },
  priestName: {
    margin: '0 0 6px',
    color: '#2f1f11',
    fontSize: '18px',
    fontWeight: '700'
  },
  badgeRow: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    marginBottom: '6px'
  },
  badgeVerified: {
    border: '1px solid #b8d0f0',
    background: '#eef5ff',
    color: '#1f4e8c',
    borderRadius: '999px',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: '700'
  },
  badgeRating: {
    border: '1px solid #f6e3c5',
    background: '#fff8ea',
    color: '#a46b14',
    borderRadius: '999px',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: '700'
  },
  badgeSecondary: {
    border: '1px solid #dcc9ad',
    background: '#fffaf1',
    color: '#6d5337',
    borderRadius: '999px',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: '700'
  },
  metaStrong: {
    margin: '0 0 6px',
    color: '#6b4e31',
    fontSize: '12px',
    fontWeight: '700'
  },
  reviewBtnInline: {
    background: 'transparent',
    border: '1px solid #dcc9ad',
    borderRadius: '4px',
    fontSize: '11px',
    cursor: 'pointer',
    padding: '3px 8px',
    color: '#4a3827'
  },
  detailList: {
    marginTop: '4px',
    borderTop: '1px dashed #e7d8c3',
    paddingTop: '12px',
    display: 'grid',
    gap: '6px',
    fontSize: '13px'
  },
  meta: {
    margin: 0,
    color: '#5a4634',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(20, 10, 5, 0.7)',
    backdropFilter: 'blur(4px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  modalContent: {
    position: 'relative',
    background: '#fffaf2',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
    border: '1px solid #e8d9c4'
  },
  modalClose: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'transparent',
    border: 'none',
    fontSize: '28px',
    lineHeight: 1,
    color: '#4a3827',
    cursor: 'pointer',
    zIndex: 2
  },
  modalHeader: {
    padding: '24px',
    borderBottom: '1px solid #e8d9c4',
    background: 'linear-gradient(180deg, #fefdfb 0%, #fffaf2 100%)',
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  modalPhoto: {
    width: '120px',
    height: '120px',
    borderRadius: '12px',
    objectFit: 'cover',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '2px solid #fff'
  },
  modalHeaderInfo: {
    flex: '1 1 200px'
  },
  modalTitle: {
    margin: '0 0 10px',
    fontSize: '24px',
    color: '#3b2a1a'
  },
  modalBadges: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  modalBody: {
    padding: '24px'
  },
  modalSectionTitle: {
    margin: '0 0 12px',
    fontSize: '16px',
    color: '#7a4520',
    borderBottom: '2px solid #f0e6d3',
    paddingBottom: '6px'
  },
  modalBio: {
    margin: '0 0 24px',
    lineHeight: 1.6,
    color: '#4a3827',
    fontSize: '15px'
  },
  modalDetailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    color: '#4a3827',
    fontSize: '14px',
    background: '#fff',
    padding: '16px',
    borderRadius: '10px',
    border: '1px solid #e8d9c4'
  },
  modalFooter: {
    padding: '20px 24px',
    borderTop: '1px solid #e8d9c4',
    background: '#fff'
  },
  modalActionBtn: {
    width: '100%',
    padding: '14px',
    background: '#5a190f',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  ritualList: {
    display: 'grid',
    gap: '8px'
  },
  ritualItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    border: '1px solid #e8d9c4',
    borderRadius: '8px',
    padding: '8px',
    color: '#3c2c1c'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '10px'
  },
  label: {
    display: 'block',
    fontSize: '13px',
    color: '#6d563f',
    marginBottom: '6px'
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px',
    border: '1px solid #d8c7ae',
    borderRadius: '8px'
  },
  summaryCard: {
    marginTop: '12px',
    border: '1px dashed #e2cfb2',
    background: '#fff8ec',
    borderRadius: '10px',
    padding: '10px'
  },
  summaryRow: {
    margin: '4px 0',
    color: '#4a3827'
  },
  summaryTotal: {
    margin: '8px 0 0',
    color: '#351f0f',
    fontWeight: '700'
  },
  submitBtn: {
    marginTop: '12px',
    border: 'none',
    background: '#5a190f',
    color: '#fff',
    borderRadius: '8px',
    padding: '11px 14px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  latestCard: {
    border: '1px solid #dfd1bf',
    background: '#fffaf2',
    borderRadius: '10px',
    padding: '10px'
  },
  refreshRow: {
    marginTop: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap'
  },
  refreshHint: {
    fontSize: '12px',
    color: '#6d563f',
    fontWeight: '700'
  },
  payBox: {
    marginTop: '12px',
    border: '1px solid #ead9be',
    background: '#fff8ec',
    borderRadius: '12px',
    padding: '12px'
  },
  payTitle: {
    margin: '0 0 10px',
    color: '#2f1d11'
  },
  payGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(220px, 320px) 1fr',
    gap: '12px'
  },
  payQrCol: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  payQr: {
    width: '100%',
    maxWidth: '280px',
    borderRadius: '12px',
    border: '1px solid #e3d3b7',
    background: '#fff',
    padding: '8px'
  },
  qrFallback: {
    width: '100%',
    maxWidth: '280px',
    minHeight: '260px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px dashed #e3d3b7',
    borderRadius: '12px',
    color: '#8f7a5a'
  },
  payInfoCol: {
    minWidth: 0
  },
  payInfoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  payLabel: {
    fontSize: '12px',
    color: '#7b6247',
    textTransform: 'uppercase',
    letterSpacing: '0.4px'
  },
  payValue: {
    color: '#2c1d0d'
  },
  payBtnRow: {
    marginTop: '10px',
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  payCopyBtn: {
    border: '1px solid #d4bea1',
    background: '#fff8ee',
    color: '#5e4324',
    borderRadius: '8px',
    padding: '8px 10px',
    cursor: 'pointer',
    fontWeight: '700'
  },
  bankBox: {
    marginTop: '10px',
    border: '1px dashed #e2cfb2',
    background: '#fffaf1',
    borderRadius: '10px',
    padding: '10px'
  },
  bankTitle: {
    margin: '0 0 8px',
    fontWeight: '700',
    color: '#5a3518'
  },
  proofBox: {
    marginTop: '12px'
  },
  shotPreviewRow: {
    marginTop: '8px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    flexWrap: 'wrap'
  },
  shotPreview: {
    width: '160px',
    height: '120px',
    objectFit: 'cover',
    borderRadius: '10px',
    border: '1px solid #dfceb8'
  },
  removeShotBtn: {
    border: '1px solid #d6b09a',
    background: '#fff3ed',
    color: '#7b2f16',
    borderRadius: '8px',
    padding: '8px 10px',
    cursor: 'pointer',
    fontWeight: '700'
  },
  fieldError: {
    margin: '6px 0 0',
    color: '#aa2c2c',
    fontSize: '12px'
  }
};

export default PriestBooking;
