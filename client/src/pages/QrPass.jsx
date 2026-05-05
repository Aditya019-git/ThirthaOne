import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../api/axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const [priestService, setPriestService] = useState(null);
  const [guideService, setGuideService] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const passRef = useRef(null);

  useEffect(() => {
    const fetchQrPass = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await API.get(`/booking/${bookingId}/qr`);
        setBooking(res.data.booking || null);
        setQrCode(res.data.qrCode || '');
        setPriestService(res.data.priestService || null);
        setGuideService(res.data.guideService || null);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load QR pass.');
      } finally {
        setLoading(false);
      }
    };

    fetchQrPass();
  }, [bookingId]);

  const handleDownload = async () => {
    if (!passRef.current) return;
    setDownloading(true);
    try {
      const element = passRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#fffdfa'
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`VIP_Darshan_Pass_${bookingId}.pdf`);
    } catch (err) {
      alert('Error generating PDF download. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

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
            
            {/* The element we capture for PDF */}
            <div ref={passRef} style={styles.printableArea}>
              <div style={styles.qrCol}>
                {qrCode ? (
                  <img src={qrCode} alt="VIP Darshan QR Pass" style={styles.qrImage} />
                ) : (
                  <div style={styles.qrFallback}>QR not available</div>
                )}
                <div style={styles.qrText}>Scan at Temple Gate</div>
              </div>

              <div style={styles.detailsCol}>
                <h2 style={styles.detailsTitle}>Booking Details</h2>
                <p style={styles.row}><strong>Booking ID:</strong> {booking._id}</p>
                {booking.bookingCode && <p style={styles.row}><strong>Pass Code:</strong> <span style={{ color: '#88311d', fontWeight: 'bold', fontSize: '18px', letterSpacing: '2px' }}>{booking.bookingCode}</span></p>}
                <p style={styles.row}><strong>Head Devotee:</strong> {booking.headDevoteeName}</p>
                <p style={styles.row}><strong>Date:</strong> {formatDate(booking.bookingDate)}</p>
                <p style={styles.row}><strong>Time Slot:</strong> {booking.timeSlot}</p>
                <p style={styles.row}><strong>Total People:</strong> {booking.memberCount}</p>

                <div style={styles.memberListWrap}>
                  <strong>Devotees:</strong>
                  <ul style={styles.memberList}>
                    {(booking.members || []).map((member, index) => (
                      <li key={`${member.name}-${index}`}>{member.name}</li>
                    ))}
                  </ul>
                </div>

                <hr style={styles.divider} />
                <h3 style={styles.sectionTitle}>Add-on Services</h3>
                
                <div style={styles.addonBlock}>
                  <strong>Priest Add-on: </strong> 
                  {priestService ? (
                    <span>
                      {priestService.priestName} ({priestService.ritualType}) 
                      {priestService.priestMobile ? ` - ${priestService.priestMobile}` : ''}
                    </span>
                  ) : (
                    <span style={styles.noneText}>None</span>
                  )}
                </div>

                <div style={styles.addonBlock}>
                  <strong>Guide Add-on: </strong> 
                  {guideService ? (
                    <span>
                      {guideService.guideName} 
                      {guideService.guideMobile ? ` - ${guideService.guideMobile}` : ''}
                      <br/>
                      <span style={{ fontSize: '12px', color: '#555' }}>
                        Places: {guideService.places.map(p => p.name).join(', ')}
                      </span>
                    </span>
                  ) : (
                    <span style={styles.noneText}>None</span>
                  )}
                </div>

              </div>
            </div>

            <div style={styles.actionRow}>
              <button 
                style={styles.primaryBtn} 
                type="button" 
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? 'Generating PDF...' : 'Download Pass (PDF)'}
              </button>
              <button style={styles.secondaryBtn} type="button" onClick={() => navigate('/book-pass')}>
                Book Another Pass
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: { minHeight: '100vh', background: 'linear-gradient(130deg, #f8f1e6 0%, #f4ecdf 55%, #efe6d9 100%)', padding: '24px' },
  container: { maxWidth: '800px', margin: '0 auto' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' },
  title: { margin: 0, color: '#2f1d11', fontFamily: 'Georgia, serif' },
  ghostBtn: { border: '1px solid #d9c4a3', background: 'transparent', color: '#5e3f20', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' },
  infoBox: { border: '1px solid #d6e2f4', background: '#f2f7ff', color: '#1f4e8c', borderRadius: '10px', padding: '14px', marginBottom: '14px' },
  errorBox: { border: '1px solid #efb7b7', background: '#fff1f1', color: '#a11f1f', borderRadius: '10px', padding: '14px', marginBottom: '14px' },
  passCard: { border: '1px solid #e8d9c4', borderRadius: '16px', background: '#fff', padding: '24px', boxShadow: '0 8px 30px rgba(71,41,20,0.1)' },
  printableArea: { display: 'flex', gap: '24px', flexWrap: 'wrap', padding: '16px', background: '#fffdfa', border: '2px dashed #ead8bb', borderRadius: '12px' },
  qrCol: { flex: '1 1 200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #ead8bb', borderRadius: '12px', padding: '20px' },
  qrImage: { width: '200px', height: '200px', objectFit: 'contain' },
  qrFallback: { width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', color: '#999', borderRadius: '12px' },
  qrText: { marginTop: '12px', fontSize: '14px', fontWeight: 'bold', color: '#88311d', textAlign: 'center' },
  detailsCol: { flex: '2 1 300px' },
  detailsTitle: { margin: '0 0 16px', color: '#3b2a1a', fontFamily: 'Georgia, serif', fontSize: '22px' },
  row: { margin: '8px 0', color: '#4a3623', fontSize: '15px' },
  memberListWrap: { marginTop: '14px', padding: '12px', background: '#fcf8f2', borderRadius: '8px', border: '1px solid #f0e6d3' },
  memberList: { margin: '6px 0 0', paddingLeft: '20px', color: '#5e4630', fontSize: '14px' },
  divider: { border: 'none', borderTop: '1px solid #ead8bb', margin: '20px 0' },
  sectionTitle: { margin: '0 0 12px', color: '#3b2a1a', fontFamily: 'Georgia, serif', fontSize: '18px' },
  addonBlock: { marginBottom: '10px', padding: '10px', background: '#fcf8f2', borderRadius: '8px', border: '1px solid #f0e6d3', color: '#4a3623', fontSize: '14px' },
  noneText: { color: '#888', fontStyle: 'italic' },
  actionRow: { display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' },
  primaryBtn: { border: 'none', background: '#88311d', color: '#fff', borderRadius: '8px', padding: '12px 20px', cursor: 'pointer', fontWeight: '700', fontSize: '15px' },
  secondaryBtn: { border: '1px solid #d9c4a3', background: '#fff8ed', color: '#5e3f20', borderRadius: '8px', padding: '12px 20px', cursor: 'pointer', fontWeight: '600' }
};

export default QrPass;
