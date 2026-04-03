import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    name: '', email: '', mobile: ''
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email && !form.mobile) {
      setError('Please provide at least one login identifier: email or mobile.');
      return;
    }
    setLoading(true);
    try {
      const res = await API.post('/auth/register', { ...form, role: 'devotee' });
      login(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>

      {/* Left Panel */}
      <div style={styles.leftPanel}>
        <div style={styles.leftContent}>
          <div style={styles.om}>ॐ</div>
          <h1 style={styles.leftTitle}>TirthOne</h1>
          <p style={styles.leftSub}>SACRED DARSHAN PORTAL</p>
          <div style={styles.divider}/>
          <div style={styles.steps}>
            {[
              { n: '1', t: 'Create Account',    d: 'Register with mobile or email'      },
              { n: '2', t: 'Book VIP Pass',     d: 'Select date, slot & members'       },
              { n: '3', t: 'Login with OTP',    d: 'No password needed for devotees'   },
            ].map((s, i) => (
              <div key={i} style={styles.stepItem}>
                <div style={styles.stepNum}>{s.n}</div>
                <div>
                  <div style={styles.stepTitle}>{s.t}</div>
                  <div style={styles.stepDesc}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div style={styles.rightPanel}>
        <div style={styles.formBox}>

          <div style={styles.backLink} onClick={() => navigate('/')}>
            ← Back to Home
          </div>

          <h2 style={styles.formTitle}>Create Account</h2>
          <p style={styles.formSub}>Join TirthOne with OTP login (no password required)</p>

          {error && <div style={styles.errorBox}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <label style={styles.label}>FULL NAME</label>
            <input
              style={styles.input} type="text" name="name"
              placeholder="Enter your full name"
              value={form.name} onChange={handleChange} required
            />

            <label style={styles.label}>MOBILE NUMBER</label>
            <input
              style={styles.input} type="tel" name="mobile"
              placeholder="Enter 10-digit mobile number"
              value={form.mobile} onChange={handleChange} maxLength={10}
            />

            <label style={styles.label}>EMAIL ADDRESS</label>
            <input
              style={styles.input} type="email" name="email"
              placeholder="Enter your email address"
              value={form.email} onChange={handleChange}
            />

            <button style={styles.btnPrimary} type="submit" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account →'}
            </button>
          </form>

          <div style={styles.loginLink}>
            Already have an account?{' '}
            <Link to="/login" style={styles.link}>Login here</Link>
          </div>

        </div>
      </div>
    </div>
  );
};

const styles = {
  page: { display: 'flex', minHeight: '100vh' },

  // Left panel
  leftPanel: {
    flex: 1, backgroundColor: '#3D0A0A',
    backgroundImage: 'radial-gradient(ellipse at center, #6B1010 0%, #2A0606 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '40px',
  },
  leftContent: { textAlign: 'center', maxWidth: '340px' },
  om:          { fontSize: '56px', color: '#E8C97A', marginBottom: '8px' },
  leftTitle:   { fontSize: '36px', fontWeight: '700', color: '#E8C97A', letterSpacing: '3px', fontFamily: 'Georgia, serif', margin: '0 0 4px' },
  leftSub:     { fontSize: '10px', color: '#c8a96e', letterSpacing: '4px', marginBottom: '24px', fontFamily: 'Calibri, sans-serif' },
  divider:     { width: '60px', height: '2px', backgroundColor: '#E07B39', margin: '0 auto 28px' },

  // Steps on left panel
  steps:     { textAlign: 'left' },
  stepItem:  { display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '20px' },
  stepNum:   {
    minWidth: '32px', height: '32px', borderRadius: '50%',
    backgroundColor: '#E07B39', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: '700', fontSize: '14px', fontFamily: 'Calibri, sans-serif',
  },
  stepTitle: { fontSize: '14px', fontWeight: '600', color: '#E8C97A', fontFamily: 'Calibri, sans-serif' },
  stepDesc:  { fontSize: '12px', color: '#c8a96e', fontFamily: 'Calibri, sans-serif', marginTop: '2px' },

  // Right panel
  rightPanel: {
    flex: 1, backgroundColor: '#fdf6ec',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '40px',
  },
  formBox: { width: '100%', maxWidth: '400px' },

  backLink:  { fontSize: '13px', color: '#E07B39', cursor: 'pointer', marginBottom: '28px', fontFamily: 'Calibri, sans-serif' },
  formTitle: { fontSize: '28px', fontWeight: '700', color: '#1A1A2E', fontFamily: 'Georgia, serif', marginBottom: '6px' },
  formSub:   { fontSize: '14px', color: '#888', marginBottom: '28px', fontFamily: 'Calibri, sans-serif' },

  label: {
    display: 'block', fontSize: '11px', letterSpacing: '1.5px',
    color: '#888', marginBottom: '8px', fontFamily: 'Calibri, sans-serif',
  },
  input: {
    width: '100%', padding: '14px', border: '1.5px solid #ddd',
    borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box',
    marginBottom: '16px', fontFamily: 'Calibri, sans-serif',
    backgroundColor: '#fff',
  },
  btnPrimary: {
    width: '100%', padding: '14px', backgroundColor: '#E07B39',
    color: '#fff', border: 'none', borderRadius: '8px',
    fontSize: '15px', cursor: 'pointer', fontWeight: '600',
    fontFamily: 'Calibri, sans-serif', marginTop: '4px',
  },
  errorBox: {
    backgroundColor: '#fff0f0', border: '1px solid #ffcccc',
    borderRadius: '8px', padding: '10px 14px',
    fontSize: '13px', color: '#cc0000', marginBottom: '16px',
  },
  loginLink: {
    textAlign: 'center', marginTop: '24px',
    fontSize: '13px', color: '#888', fontFamily: 'Calibri, sans-serif',
  },
  link: { color: '#E07B39', fontWeight: '600', textDecoration: 'none' },
};

export default Register;
