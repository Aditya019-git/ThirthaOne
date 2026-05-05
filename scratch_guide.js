const fs = require('fs');
let content = fs.readFileSync('client/src/pages/GuideBooking.jsx', 'utf8');

// 1. Add loadRazorpayScript and ReviewsModal import
content = content.replace(
  /const GuideBooking = \(\) => {/,
  `const loadRazorpayScript = () =>
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

import ReviewsModal from '../components/ReviewsModal';

const GuideBooking = () => {`
);

// 2. Add reviewModalTarget state
content = content.replace(
  /const \[myBookings, setMyBookings\] = useState\(\[\]\);/,
  `const [myBookings, setMyBookings] = useState([]);
  const [reviewModalTarget, setReviewModalTarget] = useState(null);`
);

// 3. Add openRazorpayCheckout
content = content.replace(
  /const submitBooking = async \(\) => {/m,
  `const notifyPaymentFailed = async (bookingId, reason) => {
    try {
      await API.post(\`/booking/\${bookingId}/payment-failed\`, { reason });
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
          await API.post(\`/guide/bookings/\${bookingId}/verify-payment\`, gatewayResponse);
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

  const submitBooking = async () => {`
);

// 4. Update submitBooking logic for payment Required
content = content.replace(
  /const res = await API\.post\('\/guide\/book', payload\);[\s\n]*setSuccess\(res\.data\?\.message \|\| 'Trip request created\.'\);[\s\n]*setSelectedPlaces\(\[\]\);[\s\n]*await loadAll\(\);/,
  `const res = await API.post('/guide/book', payload);
      if (res.data?.paymentRequired && res.data?.payment?.orderId) {
        setSuccess('Initiating payment gateway...');
        await openRazorpayCheckout({ bookingId: res.data.booking.id, paymentConfig: res.data.payment });
      } else {
        setSuccess(res.data?.message || 'Trip request created.');
        setSelectedPlaces([]);
        await loadAll();
      }`
);

// 5. Replace reviews UI in "guidesGrid" reassign
content = content.replace(
  /<div style=\{styles\.guidePickMeta\}>[\s\S]*?<\/div>/,
  `<div style={styles.guidePickMeta}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ff9800' }}>{Number(g.rating?.avg || 0).toFixed(1)}★</span>
                      <button type="button" onClick={(e)=>{ e.stopPropagation(); setReviewModalTarget({ id: g.id, name: g.name }); }} style={{ backgroundColor: 'transparent', border: '1px solid #dcc9ad', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', padding: '2px 6px' }}>Reviews</button>
                      <span style={styles.smallChip}>{g.yearsExperience || 0} yrs</span>
                    </div>`
);

// 6. Replace reviews UI in "guidesGrid" pick
content = content.replace(
  /<div style=\{styles\.guideMeta\}>[\s\S]*?<\/div>/,
  `<div style={styles.guideMeta}>
                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ff9800' }}>{Number(g.rating?.avg || 0).toFixed(1)}★</span>
                          <button type="button" onClick={(e)=>{ e.stopPropagation(); setReviewModalTarget({ id: g.id, name: g.name }); }} style={{ backgroundColor: 'transparent', border: '1px solid #dcc9ad', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', padding: '2px 6px' }}>Reviews</button>
                          <span style={styles.smallChip}>{g.yearsExperience || 0} yrs exp</span>
                        </div>`
);

// 7. Add Modal at bottom
content = content.replace(
  /<\/div>\s*<\/div>\s*\);\s*}\s*;\s*const styles = \{/m,
  `</div>
      {reviewModalTarget && <ReviewsModal type="guide" targetId={reviewModalTarget.id} targetName={reviewModalTarget.name} onClose={() => setReviewModalTarget(null)} />}
    </div>
  );
};

const styles = {`
);

// 8. change "Guide Didn't Attend" to "Issue Complaint / Refund"
content = content.replace(
  /Guide Didn’t Attend/g,
  'Raise Complaint / Issue Refund'
);

// 9. change "report-no-show" function label
content = content.replace(
  /No-show reported/g,
  'Complaint sent'
);


fs.writeFileSync('client/src/pages/GuideBooking.jsx', content, 'utf8');
console.log('GuideBooking.jsx updated.');
