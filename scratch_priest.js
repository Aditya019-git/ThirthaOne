const fs = require('fs');
let content = fs.readFileSync('client/src/pages/PriestBooking.jsx', 'utf8');

// 1. Add loadRazorpayScript and ReviewsModal import
content = content.replace(
  /const toDataUrl = [\s\S]*?const PriestBooking = \(\) => {/,
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

const PriestBooking = () => {`
);

// 2. State variables
content = content.replace(
  /const \[proofLoading.*?useState\(false\);\n.*?const \[uploadingShot.*?useState\(false\);\n/,
  ''
);
content = content.replace(
  /const \[utr, setUtr\] = useState\(''\);\n.*?const \[screenshotDataUrl, setScreenshotDataUrl\] = useState\(''\);\n/,
  'const [reviewModalTarget, setReviewModalTarget] = useState(null);\n'
);

// 3. Instead of handleSubmitProof, add notifyPaymentFailed and openRazorpayCheckout
content = content.replace(
  /const handleScreenshotPick = async \(event\) => {[\s\S]*?const goToFeedback = \(\) => {/m,
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
      name: 'TirthOne Priest Abhishek',
      description: 'Payment for Priest Service',
      theme: { color: '#7a2d17' },
      handler: async (gatewayResponse) => {
        try {
          await API.post(\`/priest/bookings/\${bookingId}/verify-payment\`, gatewayResponse);
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

  const goToFeedback = () => {`
);

// 4. Update handleCreateBooking
content = content.replace(
  /const booking = res.data\?\.booking \|\| null;[\s\S]*?setSuccess\(res\.data\?\.message \|\| 'Priest booking request created\.'\);/,
  `const booking = res.data?.booking || null;
      setLatestBooking(booking);
      setLatestPayment(booking?.payment || null);
      
      if (res.data?.paymentRequired && res.data?.payment?.orderId) {
        setSuccess('Initiating payment gateway...');
        await openRazorpayCheckout({ bookingId: booking.id, paymentConfig: res.data.payment });
      } else {
        setSuccess(res.data?.message || 'Priest booking request created.');
      }`
);

// 5. Update UI for Reviews
content = content.replace(
  /<span style=\{styles\.priestBadge\}>Age \{priest\.age\}<\/span>/,
  `<span style={styles.priestBadge}>Age {priest.age}</span>
                        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ff9800' }}>{Number(priest.rating?.avg || 0).toFixed(1)}★</span>
                          <button type="button" onClick={(e)=>{ e.stopPropagation(); setReviewModalTarget({ id: priest.id, name: priest.name }); }} style={{ backgroundColor: 'transparent', border: '1px solid #dcc9ad', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', padding: '2px 6px' }}>Reviews</button>
                        </div>`
);

// 6. Delete old Proof UI
content = content.replace(
  /\{latestBooking\.status === 'pending' && latestPayment && \([\s\S]*?<\/div>[\s\n]*\)[\s\n]*\}\s*\{latestBooking\.status === 'payment_submitted'/m,
  `{latestBooking.status === 'pending' && latestPayment && (
                    <div style={styles.infoBox}>
                      <p>Complete your payment via Razorpay to confirm.</p>
                      <button style={styles.submitBtn} onClick={() => openRazorpayCheckout({ bookingId: latestBooking.id, paymentConfig: { keyId: 'YOUR_KEY_HERE', orderId: latestPayment.razorpayOrderId, amount: latestPayment.amount * 100 }})}>Retry Payment</button>
                    </div>
                  )}
                  {latestBooking.status === 'payment_submitted'`
);

// 7. Remove canSubmitProof
content = content.replace(
  /const canSubmitProof = Boolean\([\s\S]*?\);/,
  ''
);

// 8. Add Modal
content = content.replace(
  /<\/div>\s*<\/div>\s*\);\s*}\s*;\s*const styles = \{/m,
  `</div>
      {reviewModalTarget && <ReviewsModal type="priest" targetId={reviewModalTarget.id} targetName={reviewModalTarget.name} onClose={() => setReviewModalTarget(null)} />}
    </div>
  );
};

const styles = {`
);

fs.writeFileSync('client/src/pages/PriestBooking.jsx', content, 'utf8');
console.log('PriestBooking.jsx updated.');
