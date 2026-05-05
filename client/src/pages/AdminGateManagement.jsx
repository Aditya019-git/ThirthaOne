import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

const emptyForm = {
  name: '',
  email: '',
  mobile: '',
  password: ''
};

const getApiErrorMessage = (err, fallback) => {
  const data = err?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (err?.message) return err.message;
  return fallback;
};

const AdminGateManagement = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadOfficers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/admin/gate-officers');
      setOfficers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load gate officers.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOfficers();
  }, []);

  const handleCreateOfficer = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!form.name || !form.password) {
      setError('Name and password are required.');
      return;
    }
    if (!form.email && !form.mobile) {
      setError('At least one of email or mobile is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        mobile: form.mobile.replace(/\D/g, ''),
        password: form.password
      };
      const res = await API.post('/admin/gate-officers', payload);
      setMessage(res.data?.message || 'Gate Officer added.');
      setForm(emptyForm);
      await loadOfficers();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to add gate officer.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this gate officer?')) return;
    setError('');
    setMessage('');
    try {
      await API.delete(`/admin/gate-officers/${id}`);
      setMessage('Gate officer removed.');
      await loadOfficers();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to delete gate officer.'));
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <section style={styles.hero}>
          <h1 style={styles.heroTitle}>Gate Officer Setup</h1>
          <p style={styles.heroSub}>Manage the staff who handle scanner operations at the temple gates.</p>
        </section>

        {error && <div style={styles.errorBox}>{error}</div>}
        {message && <div style={styles.successBox}>{message}</div>}

        <div style={styles.contentGrid}>
          {/* Add Form */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Add New Gate Officer</h2>
            <form onSubmit={handleCreateOfficer} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Full Name</label>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="Enter name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div style={styles.row}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Email Address</label>
                  <input
                    style={styles.input}
                    type="email"
                    placeholder="Enter email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Mobile Number</label>
                  <input
                    style={styles.input}
                    type="text"
                    placeholder="10 digit number"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Initial Password</label>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="Set temporary password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>

              <button type="submit" disabled={saving} style={styles.submitBtn}>
                {saving ? 'Adding...' : 'Add Gate Officer'}
              </button>
            </form>
          </div>

          {/* List */}
          <div style={styles.card}>
            <div style={styles.listHeader}>
              <h2 style={styles.cardTitle}>Active Officers ({officers.length})</h2>
              <button 
                onClick={() => navigate('/gate')}
                style={styles.scannerBtn}
              >
                Launch Scanner Portal ⛩️
              </button>
            </div>
            
            {loading ? (
              <p style={{ color: '#6d5842' }}>Loading officers...</p>
            ) : officers.length === 0 ? (
              <p style={{ color: '#6d5842' }}>No gate officers found. Add one to get started.</p>
            ) : (
              <div style={styles.officerList}>
                {officers.map(officer => (
                  <div key={officer._id} style={styles.officerRow}>
                    <div style={styles.officerInfo}>
                      <h4 style={styles.officerName}>{officer.name}</h4>
                      <p style={styles.officerContact}>
                        {officer.mobile && <span>📱 {officer.mobile} </span>}
                        {officer.email && <span>✉️ {officer.email}</span>}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDelete(officer._id)}
                      style={styles.deleteBtn}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: '#FAF6E9',
    padding: '22px',
    fontFamily: 'Calibri, sans-serif'
  },
  container: {
    maxWidth: '1100px',
    margin: '0 auto'
  },
  hero: {
    background: 'linear-gradient(120deg, #4b130f, #7a2d17)',
    borderRadius: '12px',
    padding: '24px',
    color: '#fff',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  },
  heroTitle: {
    margin: 0,
    fontFamily: 'Georgia, serif',
    fontSize: '28px'
  },
  heroSub: {
    margin: '8px 0 0',
    color: '#efe4d8'
  },
  errorBox: {
    marginBottom: '20px',
    border: '1px solid #efb7b7',
    background: '#fff1f1',
    color: '#a11f1f',
    borderRadius: '8px',
    padding: '12px'
  },
  successBox: {
    marginBottom: '20px',
    border: '1px solid #b9e7c7',
    background: '#eaf8ef',
    color: '#166534',
    borderRadius: '8px',
    padding: '12px'
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    alignItems: 'start'
  },
  card: {
    background: '#fff',
    border: '1px solid #E8C97A',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(61, 10, 10, 0.08)'
  },
  cardTitle: {
    margin: '0 0 20px',
    color: '#3D0A0A',
    fontFamily: 'Georgia, serif',
    borderBottom: '2px solid #E8C97A',
    paddingBottom: '8px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#3D0A0A',
    textTransform: 'uppercase'
  },
  input: {
    padding: '10px 14px',
    border: '1px solid #d4c5b3',
    borderRadius: '6px',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: '#fffcf7'
  },
  submitBtn: {
    marginTop: '10px',
    padding: '12px',
    backgroundColor: '#3D0A0A',
    color: '#E8C97A',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '2px solid #E8C97A',
    paddingBottom: '8px'
  },
  scannerBtn: {
    padding: '8px 14px',
    backgroundColor: '#E8C97A',
    color: '#3D0A0A',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  officerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  officerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    border: '1px solid #d4c5b3',
    borderRadius: '8px',
    backgroundColor: '#fffcf7'
  },
  officerInfo: {},
  officerName: {
    margin: '0 0 4px 0',
    color: '#3D0A0A',
    fontSize: '16px'
  },
  officerContact: {
    margin: 0,
    color: '#6d5842',
    fontSize: '13px',
    display: 'flex',
    gap: '10px'
  },
  deleteBtn: {
    padding: '6px 12px',
    backgroundColor: '#fff1f1',
    color: '#a11f1f',
    border: '1px solid #efb7b7',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold'
  }
};

export default AdminGateManagement;
