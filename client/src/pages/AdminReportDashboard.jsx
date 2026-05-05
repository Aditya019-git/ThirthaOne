import React, { useEffect, useState } from 'react';
import API from '../api/axios';

const AdminReportDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState([]);
  const [refundBookingId, setRefundBookingId] = useState('');
  const [refundMessage, setRefundMessage] = useState('');

  const fetchComplaints = async () => {
    try {
      const res = await API.get('/admin/complaints');
      setComplaints(res.data.complaints);
    } catch (err) {
      console.error('Failed to fetch complaints', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleResolveComplaint = async (id, targetType, targetId, applyPenalty) => {
    try {
      await API.patch(`/admin/complaints/${id}/resolve`, {
        status: 'Resolved',
        applyPenalty
      });
      fetchComplaints();
    } catch (err) {
      alert('Failed to resolve complaint.');
    }
  };

  const handleDeleteComplaint = async (id) => {
    if (!window.confirm('Are you sure you want to delete this complaint permanently?')) return;
    try {
      await API.delete(`/admin/complaints/${id}`);
      fetchComplaints();
    } catch (err) {
      alert('Failed to delete complaint.');
    }
  };

  const handleManualRefund = async (e) => {
    e.preventDefault();
    setRefundMessage('');
    try {
      const res = await API.post('/admin/refund', { bookingId: refundBookingId });
      setRefundMessage(res.data.message);
      setRefundBookingId('');
    } catch (err) {
      setRefundMessage(err.response?.data?.message || 'Refund failed.');
    }
  };

  const downloadCsv = async () => {
    try {
      const res = await API.get('/admin/ledger-csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `daily_ledger_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download ledger.');
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.hero}>
          <h2 style={styles.heroTitle}>Complaints & Manual Reporting</h2>
          <p style={styles.heroSub}>Handle devotee issues, process refunds, and download ledgers.</p>
        </div>

        <div style={styles.row}>
          <div style={{ ...styles.card, flex: 1 }}>
            <h3 style={styles.cardTitle}>Manual Override & Refund</h3>
            <p style={{ color: '#6d5842', marginBottom: '14px' }}>Force refund a Devotee, Priest, or Guide booking.</p>
            <form onSubmit={handleManualRefund} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Enter Booking ID"
                style={styles.input}
                value={refundBookingId}
                onChange={(e) => setRefundBookingId(e.target.value)}
                required
              />
              <button type="submit" style={styles.btnDanger}>Process Refund</button>
            </form>
            {refundMessage && <p style={{ marginTop: '10px', color: '#88311d', fontWeight: 'bold' }}>{refundMessage}</p>}
          </div>

          <div style={{ ...styles.card, flex: 1 }}>
            <h3 style={styles.cardTitle}>Daily Reports</h3>
            <p style={{ color: '#6d5842', marginBottom: '14px' }}>Generate irreversible daily financial ledger for Treasury mapping.</p>
            <button onClick={downloadCsv} style={styles.btnAlt}>Download CSV Ledger</button>
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Complaints & Penalties Inbox</h3>
          {loading ? <p>Loading...</p> : complaints.length === 0 ? <p style={{ color: '#6d5842' }}>No complaints.</p> : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Target</th>
                  <th style={styles.th}>Issue</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map(c => (
                  <tr key={c._id}>
                    <td style={styles.td}>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td style={styles.td}>{c.targetType}</td>
                    <td style={styles.td}>{c.issueDescription}</td>
                    <td style={styles.td}>
                      <span style={{
                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                        backgroundColor: c.status === 'Resolved' ? '#e2f4ea' : '#fce8e6',
                        color: c.status === 'Resolved' ? '#1e8e3e' : '#d93025'
                      }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {c.status !== 'Resolved' && (
                          <>
                            <button style={styles.btnSm} onClick={() => handleResolveComplaint(c._id, c.targetType, c.targetId, false)}>Resolve (Normal)</button>
                            <button style={styles.btnDangerSm} onClick={() => handleResolveComplaint(c._id, c.targetType, c.targetId, true)}>Resolve & Suspend Staff</button>
                          </>
                        )}
                        <button style={styles.btnDangerSm} onClick={() => handleDeleteComplaint(c._id)}>Delete</button>
                        {c.penaltyApplied && <span style={{color: '#b42318', marginLeft: '5px', fontWeight: 'bold'}}>Suspended</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: { padding: '30px', fontFamily: 'Calibri, sans-serif' },
  container: { maxWidth: '1200px', margin: '0 auto' },
  hero: {
    background: 'linear-gradient(120deg, #4b130f, #7a2d17)',
    color: '#fff',
    borderRadius: '14px',
    padding: '30px 24px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  },
  heroTitle: {
    margin: '0 0 6px',
    fontSize: '32px',
    fontFamily: 'Georgia, serif',
    color: '#fff'
  },
  heroSub: {
    margin: 0,
    opacity: 0.92,
    fontSize: '16px',
    color: '#fcfaf7'
  },
  row: { display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' },
  card: { backgroundColor: '#fff', border: '1px solid #E8C97A', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(61, 10, 10, 0.08)' },
  cardTitle: { margin: '0 0 15px 0', color: '#3D0A0A', fontSize: '18px', borderBottom: '2px solid #f0e6d3', paddingBottom: '10px' },
  input: { padding: '12px 14px', borderRadius: '8px', border: '1px solid #c8a96e', flex: 1, fontFamily: 'inherit', outlineColor: '#3D0A0A' },
  btnDanger: { padding: '12px 18px', backgroundColor: '#3D0A0A', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  btnAlt: { padding: '12px 18px', backgroundColor: '#fcfaf7', color: '#3D0A0A', border: '1px solid #E8C97A', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  btnSm: { padding: '6px 12px', backgroundColor: '#E07B39', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  btnDangerSm: { padding: '6px 12px', backgroundColor: '#b42318', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #e2d5c3', color: '#88311d', fontSize: '13px', textTransform: 'uppercase' },
  td: { padding: '14px 12px', borderBottom: '1px solid #f0e6d3', color: '#4a3b2c', fontSize: '14px' }
};

export default AdminReportDashboard;
