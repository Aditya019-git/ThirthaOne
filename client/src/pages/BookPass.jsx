import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const TIME_SLOTS = [
  '05:00 AM - 07:00 AM',
  '07:00 AM - 09:00 AM',
  '09:00 AM - 11:00 AM',
  '11:00 AM - 01:00 PM',
  '01:00 PM - 03:00 PM',
  '03:00 PM - 05:00 PM',
  '05:00 PM - 07:00 PM',
  '07:00 PM - 09:00 PM',
  '09:00 PM - 11:00 PM'
];

const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

const BookPass = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Pass
  const [headDevoteeName, setHeadDevoteeName] = useState(user?.name || '');
  const [headDevoteeAadhaar, setHeadDevoteeAadhaar] = useState('');
  const [bookingDate, setBookingDate] = useState(getTodayDate());
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [members, setMembers] = useState([{ name: user?.name || '' }]);
  const [bookingStatus, setBookingStatus] = useState(null);

  // Step 2: Priest
  const [priests, setPriests] = useState([]);
  const [rituals, setRituals] = useState([]);
  const [priestAddonEnabled, setPriestAddonEnabled] = useState(false);
  const [selectedPriestId, setSelectedPriestId] = useState('');
  const [selectedRitualCode, setSelectedRitualCode] = useState('');
  const [fullViewPriest, setFullViewPriest] = useState(null);

  // Step 3: Guide
  const [guides, setGuides] = useState([]);
  const [placesCatalog, setPlacesCatalog] = useState([]);
  const [guideAddonEnabled, setGuideAddonEnabled] = useState(false);
  const [selectedGuideId, setSelectedGuideId] = useState('');
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [fullViewGuide, setFullViewGuide] = useState(null);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [statusRes, priestSvcRes, priestListRes, guideListRes] = await Promise.all([
          API.get('/booking/status', { params: { bookingDate } }),
          API.get('/priest/services'),
          API.get('/priest/template-list'),
          API.get('/guide/template-list')
        ]);

        setBookingStatus(statusRes.data);

        const rits = Array.isArray(priestSvcRes.data?.rituals) ? priestSvcRes.data.rituals : [];
        setRituals(rits);
        if (rits.length > 0) setSelectedRitualCode(rits[0].code);

        setPriests(Array.isArray(priestListRes.data?.priests) ? priestListRes.data.priests : []);

        setGuides(Array.isArray(guideListRes.data?.guides) ? guideListRes.data.guides : []);
        setPlacesCatalog(Array.isArray(guideListRes.data?.placesCatalog) ? guideListRes.data.placesCatalog : []);
      } catch (err) {
        console.error('Failed to load add-on lists:', err);
      }
    };
    loadInitialData();
  }, [bookingDate]);

  const handleMemberChange = (index, key, value) => {
    setMembers((prev) => prev.map((member, i) => (i === index ? { ...member, [key]: value } : member)));
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

  const togglePlace = (code) => {
    setSelectedPlaces(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const calculateTotals = () => {
    const vipAmount = members.length * 500; // hardcoded VIP price
    let priestAmount = 0;
    if (priestAddonEnabled && selectedRitualCode) {
      const rit = rituals.find(r => r.code === selectedRitualCode);
      if (rit) priestAmount = rit.basePrice;
    }

    let guideAmount = 0;
    if (guideAddonEnabled && selectedPlaces.length > 0) {
      selectedPlaces.forEach(code => {
        const place = placesCatalog.find(p => p.code === code);
        if (place) guideAmount += place.price;
      });
    }

    return { vipAmount, priestAmount, guideAmount, total: vipAmount + priestAmount + guideAmount };
  };

  const handleNextStep1 = (e) => {
    e.preventDefault();
    setError('');

    if (!headDevoteeAadhaar || headDevoteeAadhaar.length !== 12) {
      setError('Head Devotee Aadhaar must be exactly 12 digits.');
      return;
    }

    const todayStr = getTodayDate();
    if (bookingDate < todayStr) {
      setError('Past dates are not valid.');
      return;
    }

    if (bookingDate === todayStr) {
      const startTimeMatch = timeSlot.match(/(\d{2}):(\d{2})\s(AM|PM)/);
      if (startTimeMatch) {
        let [_, hours, mins, modifier] = startTimeMatch;
        hours = parseInt(hours, 10);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;

        const now = new Date();
        const slotTime = new Date();
        slotTime.setHours(hours, parseInt(mins, 10), 0, 0);

        if (now > slotTime) {
          setError('This time slot has already passed for today. Please select a future time slot or another date.');
          return;
        }
      }
    }

    if (bookingStatus && !bookingStatus.canBook) {
      setError(bookingStatus.message || 'The selected date is currently unavailable. Please choose a different date.');
      return;
    }

    const hasEmptyNames = members.some(m => !m.name.trim());
    if (hasEmptyNames) {
      setError('Please provide names for all devotees.');
      return;
    }

    setStep(2);
  };

  const handleNextStep3 = () => {
    setError('');
    if (guideAddonEnabled && selectedPlaces.length === 0) {
      setError('Select at least one place for the guide.');
      return;
    }
    setStep(4);
  };

  const handleCheckout = async () => {
    setError('');
    setLoading(true);

    try {
      const payload = {
        headDevoteeName,
        headDevoteeAadhaar,
        bookingDate,
        timeSlot,
        members,
        priestAddon: {
          enabled: priestAddonEnabled,
          priestId: selectedPriestId,
          ritualType: selectedRitualCode
        },
        guideAddon: {
          enabled: guideAddonEnabled,
          guideId: selectedGuideId,
          placeCodes: selectedPlaces
        }
      };

      const res = await API.post('/combo/book', payload);
      const { paymentRequired, bookingId, payment } = res.data;

      if (!paymentRequired || !payment) {
        navigate(`/booking/${bookingId}/qr`);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error('Razorpay SDK failed to load.');

      const options = {
        key: payment.keyId,
        amount: payment.amount,
        currency: payment.currency,
        name: 'Shree Bhimashankar Temple',
        description: 'Combo Booking Payment',
        order_id: payment.orderId,
        handler: async (response) => {
          try {
            await API.post(`/combo/verify-payment/${bookingId}`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            navigate(`/booking/${bookingId}/qr`);
          } catch (verifyErr) {
            setError(verifyErr.response?.data?.message || 'Payment verification failed.');
            setLoading(false);
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.mobile
        },
        theme: { color: '#88311d' },
        modal: { ondismiss: () => setLoading(false) }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => setLoading(false));
      rzp.open();

    } catch (err) {
      setError(err.response?.data?.message || 'Combo booking failed.');
      setLoading(false);
    }
  };

  const { vipAmount, priestAmount, guideAmount, total } = calculateTotals();

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.topRow}>
          <h2 style={styles.title}>Unified Combo Checkout</h2>
          <button style={styles.backBtn} onClick={() => {
            if (step > 1) setStep(step - 1);
            else navigate('/dashboard');
          }} type="button">
            Back
          </button>
        </div>

        <div style={styles.stepper}>
          {[1, 2, 3, 4].map(s => (
            <div key={s} style={{ ...styles.stepIndicator, background: step >= s ? '#88311d' : '#e0cfba' }}>
              Step {s}
            </div>
          ))}
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {step === 1 && (
          <form onSubmit={handleNextStep1}>
            <h3 style={styles.stepTitle}>1. VIP Darshan Pass</h3>
            <label style={styles.label}>Head Devotee Name</label>
            <input style={styles.input} value={headDevoteeName} onChange={e => setHeadDevoteeName(e.target.value)} required />

            <label style={styles.label}>Head Devotee Aadhaar</label>
            <input style={styles.input} value={headDevoteeAadhaar} onChange={e => setHeadDevoteeAadhaar(e.target.value.replace(/\D/g, ''))} maxLength={12} required placeholder="12-digit Aadhaar Number" />

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Date</label>
                <input style={styles.input} type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} required min={getTodayDate()} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Time Slot</label>
                <select style={styles.input} value={timeSlot} onChange={e => setTimeSlot(e.target.value)} required>
                  {TIME_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                </select>
              </div>
            </div>

            <h3 style={styles.sectionHeading}>Devotees ({members.length}/6)</h3>
            {members.map((m, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input style={styles.input} placeholder={`Devotee ${idx + 1} Name`} value={m.name} onChange={e => handleMemberChange(idx, 'name', e.target.value)} required />
                <button type="button" onClick={() => removeMember(idx)} style={styles.removeBtn}>✕</button>
              </div>
            ))}
            {members.length < 6 && (
              <button type="button" onClick={addMember} style={styles.addBtn}>+ Add Member</button>
            )}

            <button type="submit" style={styles.primaryBtn}>Continue to Add-ons</button>
          </form>
        )}

        {step === 2 && (
          <div>
            <h3 style={styles.stepTitle}>2. Add Priest (Optional)</h3>
            <p style={{ color: '#5e4324' }}>Would you like to book a priest for Abhishek/Pooja?</p>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button style={priestAddonEnabled ? styles.toggleBtnActive : styles.toggleBtn} onClick={() => setPriestAddonEnabled(true)}>Yes, Add Priest</button>
              <button style={!priestAddonEnabled ? styles.toggleBtnActive : styles.toggleBtn} onClick={() => { setPriestAddonEnabled(false); setStep(3); }}>No, Skip</button>
            </div>

            {priestAddonEnabled && (
              <div style={styles.addonCard}>
                
                <label style={styles.label}>Select Ritual</label>
                <div style={styles.ritualGrid}>
                  {rituals.map(r => (
                    <button 
                      key={r.code} 
                      type="button" 
                      onClick={() => setSelectedRitualCode(r.code)}
                      style={{...styles.ritualCard, ...(selectedRitualCode === r.code ? styles.ritualCardActive : {})}}
                    >
                      <div style={styles.ritualName}>{r.name}</div>
                      <div style={styles.ritualPrice}>₹{r.basePrice}</div>
                    </button>
                  ))}
                </div>

                <label style={styles.label}>Choose a Verified Priest (Optional)</label>
                <div style={styles.personGrid}>
                  <article 
                    onClick={() => setSelectedPriestId('')}
                    style={{...styles.staffCard, ...(!selectedPriestId ? styles.staffCardActive : {})}}
                  >
                    <div style={styles.cardHead}>
                      <div style={styles.avatarFallback}>ANY</div>
                      <div style={styles.cardHeadInfo}>
                        <h3 style={styles.personName}>Any Available Priest</h3>
                        <p style={styles.metaStrong}>We'll auto-assign for you</p>
                      </div>
                    </div>
                  </article>

                  {priests.map(p => (
                    <article
                      key={p.id}
                      style={{ ...styles.staffCard, ...(selectedPriestId === p.id ? styles.staffCardActive : {}) }}
                      onClick={() => setSelectedPriestId(p.id)}
                    >
                      <div style={styles.cardHead}>
                        <div style={styles.avatar}>
                          {p.photoUrl ? (
                            <img
                              src={p.photoUrl}
                              alt={p.name}
                              style={styles.avatarImg}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPriestId(p.id);
                                setFullViewPriest(p);
                              }}
                            />
                          ) : (
                            <div style={styles.avatarFallback}>{(p.name || 'P').slice(0, 1).toUpperCase()}</div>
                          )}
                        </div>
                        <div style={styles.cardHeadInfo}>
                          <h3 style={styles.personName}>{p.name}</h3>
                          <div style={styles.badgeRow}>
                            <span style={styles.badgeVerified}>Verified</span>
                            <span style={styles.badgeRating}>{Number(p.rating?.avg || 0).toFixed(1)}★</span>
                          </div>
                          <p style={styles.metaStrong}>{p.yearsExperience || 0} yrs exp</p>
                        </div>
                      </div>
                      <div style={styles.detailList}>
                        <p style={styles.meta}><strong>Age:</strong> {p.age}</p>
                        <p style={styles.meta}><strong>Email:</strong> {p.email || '-'}</p>
                      </div>
                    </article>
                  ))}
                </div>

              </div>
            )}

            <button type="button" onClick={() => setStep(3)} style={styles.primaryBtn}>Continue to Guides</button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 style={styles.stepTitle}>3. Add Guide (Optional)</h3>
            <p style={{ color: '#5e4324' }}>Would you like to book a local guide?</p>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button style={guideAddonEnabled ? styles.toggleBtnActive : styles.toggleBtn} onClick={() => setGuideAddonEnabled(true)}>Yes, Add Guide</button>
              <button style={!guideAddonEnabled ? styles.toggleBtnActive : styles.toggleBtn} onClick={() => { setGuideAddonEnabled(false); setStep(4); }}>No, Skip</button>
            </div>

            {guideAddonEnabled && (
              <div style={styles.addonCard}>
                
                <label style={styles.label}>Select Destinations</label>
                <div style={styles.ritualGrid}>
                  {placesCatalog.map(p => {
                    const isSelected = selectedPlaces.includes(p.code);
                    return (
                      <button 
                        key={p.code} 
                        type="button" 
                        onClick={() => togglePlace(p.code)}
                        style={{...styles.ritualCard, ...(isSelected ? styles.ritualCardActive : {})}}
                      >
                        <div style={styles.ritualName}>{p.name}</div>
                        <div style={styles.ritualPrice}>₹{p.price}</div>
                      </button>
                    );
                  })}
                </div>

                <label style={styles.label}>Choose a Verified Guide (Optional)</label>
                <div style={styles.personGrid}>
                  <article 
                    onClick={() => setSelectedGuideId('')}
                    style={{...styles.staffCard, ...(!selectedGuideId ? styles.staffCardActive : {})}}
                  >
                    <div style={styles.cardHead}>
                      <div style={styles.avatarFallback}>ANY</div>
                      <div style={styles.cardHeadInfo}>
                        <h3 style={styles.personName}>Any Available Guide</h3>
                        <p style={styles.metaStrong}>We'll auto-assign for you</p>
                      </div>
                    </div>
                  </article>

                  {guides.map(g => (
                    <article
                      key={g.id}
                      style={{ ...styles.staffCard, ...(selectedGuideId === g.id ? styles.staffCardActive : {}) }}
                      onClick={() => setSelectedGuideId(g.id)}
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
                                setSelectedGuideId(g.id);
                                setFullViewGuide(g);
                              }}
                            />
                          ) : (
                            <div style={styles.avatarFallback}>{(g.name || 'G').slice(0, 1).toUpperCase()}</div>
                          )}
                        </div>
                        <div style={styles.cardHeadInfo}>
                          <h3 style={styles.personName}>{g.name}</h3>
                          <div style={styles.badgeRow}>
                            <span style={styles.badgeVerified}>Verified</span>
                            <span style={styles.badgeRating}>{Number(g.rating?.avg || 0).toFixed(1)}★</span>
                          </div>
                          <p style={styles.metaStrong}>{g.yearsExperience || 0} yrs exp</p>
                        </div>
                      </div>
                      <div style={styles.detailList}>
                        <p style={styles.meta}><strong>Age:</strong> {g.age ?? '-'}</p>
                        <p style={styles.meta}><strong>Email:</strong> {g.email || '-'}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            <button type="button" onClick={handleNextStep3} style={styles.primaryBtn}>Review & Checkout</button>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 style={styles.stepTitle}>4. Review & Checkout</h3>
            
            <div style={styles.summaryCard}>
              <div style={styles.summaryRow}>
                <span>VIP Darshan Pass ({members.length} members)</span>
                <strong>₹{vipAmount}</strong>
              </div>
              
              {priestAddonEnabled && (
                <div style={styles.summaryRow}>
                  <span>Priest Add-on ({rituals.find(r => r.code === selectedRitualCode)?.name})</span>
                  <strong>₹{priestAmount}</strong>
                </div>
              )}

              {guideAddonEnabled && selectedPlaces.length > 0 && (
                <div style={styles.summaryRow}>
                  <span>Guide Add-on ({selectedPlaces.length} places)</span>
                  <strong>₹{guideAmount}</strong>
                </div>
              )}

              <div style={{ ...styles.summaryRow, borderTop: '2px solid #e0cfba', paddingTop: '10px', marginTop: '10px', fontSize: '20px' }}>
                <span>Total Amount</span>
                <strong style={{ color: '#88311d' }}>₹{total}</strong>
              </div>
            </div>

            <button type="button" onClick={handleCheckout} style={styles.checkoutBtn} disabled={loading}>
              {loading ? 'Processing...' : (total === 0 ? 'Generate QR' : `Pay ₹${total} & Generate QR`)}
            </button>
          </div>
        )}

      </div>

      {fullViewPriest && (
        <div style={styles.modalOverlay} onClick={() => setFullViewPriest(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button type="button" style={styles.modalClose} onClick={() => setFullViewPriest(null)}>×</button>
            <div style={styles.modalHeader}>
              <img src={fullViewPriest.photoUrl || 'https://placehold.co/400x400/f3e8d5/6d4c2f?text=Priest'} alt={fullViewPriest.name} style={styles.modalPhoto} />
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
              <button type="button" style={styles.modalActionBtn} onClick={() => { setSelectedPriestId(fullViewPriest.id); setFullViewPriest(null); }}>Confirm Selection</button>
            </div>
          </div>
        </div>
      )}

      {fullViewGuide && (
        <div style={styles.modalOverlay} onClick={() => setFullViewGuide(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button type="button" style={styles.modalClose} onClick={() => setFullViewGuide(null)}>×</button>
            <div style={styles.modalHeader}>
              <img src={fullViewGuide.photoUrl || 'https://placehold.co/400x400/f3e8d5/6d4c2f?text=Guide'} alt={fullViewGuide.name} style={styles.modalPhoto} />
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
              <button type="button" style={styles.modalActionBtn} onClick={() => { setSelectedGuideId(fullViewGuide.id); setFullViewGuide(null); }}>Confirm Selection</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const styles = {
  page: { minHeight: '100vh', background: 'linear-gradient(130deg, #f8f1e6 0%, #f4ecdf 55%, #efe6d9 100%)', padding: '24px' },
  card: { maxWidth: '800px', margin: '0 auto', background: '#fff', border: '1px solid #e8d9c4', borderRadius: '12px', padding: '24px' },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { margin: 0, color: '#2f1d11', fontFamily: 'Georgia, serif' },
  backBtn: { border: '1px solid #d9c4a3', background: '#fff8ed', color: '#5e3f20', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' },
  stepper: { display: 'flex', gap: '5px', marginBottom: '24px' },
  stepIndicator: { flex: 1, padding: '8px', color: '#fff', textAlign: 'center', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' },
  stepTitle: { marginTop: 0, marginBottom: '16px', color: '#3b2a1a', fontFamily: 'Georgia, serif' },
  label: { display: 'block', margin: '15px 0 8px', color: '#634b32', fontSize: '15px', fontWeight: 'bold' },
  input: { width: '100%', boxSizing: 'border-box', border: '1px solid #d6c6ad', borderRadius: '8px', padding: '10px', background: '#fff' },
  primaryBtn: { marginTop: '20px', width: '100%', border: 'none', background: '#4a1c13', color: '#fff', borderRadius: '8px', padding: '14px', cursor: 'pointer', fontWeight: '700', fontSize: '16px' },
  checkoutBtn: { marginTop: '20px', width: '100%', border: 'none', background: '#2c7a3f', color: '#fff', borderRadius: '8px', padding: '16px', cursor: 'pointer', fontWeight: '700', fontSize: '18px' },
  addBtn: { marginTop: '10px', width: '100%', border: '1px dashed #d6c6ad', background: '#fcf8f2', color: '#88311d', borderRadius: '8px', padding: '10px', cursor: 'pointer' },
  removeBtn: { border: 'none', background: '#ffe6e6', color: '#cc0000', borderRadius: '8px', padding: '0 15px', cursor: 'pointer' },
  error: { marginBottom: '15px', padding: '12px', background: '#fff1f1', border: '1px solid #efb7b7', color: '#a11f1f', borderRadius: '8px' },
  toggleBtn: { flex: 1, border: '1px solid #d6c6ad', background: '#fdfbf7', padding: '12px', borderRadius: '8px', cursor: 'pointer', color: '#634b32', fontSize: '16px' },
  toggleBtnActive: { flex: 1, border: '2px solid #88311d', background: '#fff8f5', padding: '12px', borderRadius: '8px', cursor: 'pointer', color: '#88311d', fontWeight: 'bold', fontSize: '16px' },
  addonCard: { border: '1px solid #e8d9c4', borderRadius: '12px', padding: '20px', background: '#faf6f0' },
  summaryCard: { border: '1px solid #e8d9c4', borderRadius: '12px', padding: '20px', background: '#fffaf0' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '16px', color: '#3b2a1a' },
  sectionHeading: { color: '#88311d', margin: '20px 0 10px' },

  // New visual card styles
  ritualGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' },
  ritualCard: { border: '1px solid #ead8bb', borderRadius: '8px', padding: '12px', background: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' },
  ritualCardActive: { border: '2px solid #88311d', background: '#fff8f5', boxShadow: '0 4px 12px rgba(136, 49, 29, 0.15)' },
  ritualName: { fontSize: '15px', fontWeight: 'bold', color: '#3b2a1a', marginBottom: '4px' },
  ritualPrice: { fontSize: '14px', color: '#5e4324' },

  personGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },
  staffCard: { background: '#fff', border: '1px solid #e8d9c4', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 12px rgba(61, 10, 10, 0.06)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '12px' },
  staffCardActive: { border: '2px solid #7a4520', boxShadow: '0 8px 24px rgba(87, 47, 20, 0.18)', transform: 'translateY(-2px)' },
  cardHead: { display: 'flex', gap: '12px', alignItems: 'center' },
  cardHeadInfo: { minWidth: 0, flex: 1 },
  personName: { margin: '0 0 6px', color: '#2f1f11', fontSize: '18px', fontWeight: '700' },
  badgeRow: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' },
  badgeVerified: { border: '1px solid #b8d0f0', background: '#eef5ff', color: '#1f4e8c', borderRadius: '999px', padding: '2px 8px', fontSize: '11px', fontWeight: '700' },
  badgeRating: { border: '1px solid #f6e3c5', background: '#fff8ea', color: '#a46b14', borderRadius: '999px', padding: '2px 8px', fontSize: '11px', fontWeight: '700' },
  badgeSecondary: { border: '1px solid #dcc9ad', background: '#fffaf1', color: '#6d5337', borderRadius: '999px', padding: '2px 8px', fontSize: '11px', fontWeight: '700' },
  metaStrong: { margin: '0 0 6px', color: '#6b4e31', fontSize: '12px', fontWeight: '700' },
  detailList: { marginTop: '4px', borderTop: '1px dashed #e7d8c3', paddingTop: '12px', display: 'grid', gap: '6px', fontSize: '13px' },
  meta: { margin: 0, color: '#5a4634', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  avatar: { width: '104px', height: '104px', borderRadius: '8px', border: '1px solid #ddccb5', background: '#fffaf0', cursor: 'pointer', transition: 'transform 0.2s', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  avatarFallback: { width: '104px', height: '104px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ddccb5', color: '#fff', fontSize: '24px', fontWeight: 'bold' },
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
};

export default BookPass;
