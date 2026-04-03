import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const showTestOtp = process.env.NODE_ENV !== 'production';

  const [authMethod, setAuthMethod] = useState('mobile');
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [testOtp, setTestOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const identifierLabel = authMethod === 'email' ? email : mobile;

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setTestOtp('');
    setLoading(true);

    try {
      const payload = {
        authMethod,
        ...(authMethod === 'email' ? { email } : { mobile })
      };
      const res = await API.post('/auth/send-otp', payload);

      if (showTestOtp && res.data?.otp) {
        setTestOtp(res.data.otp);
      }

      setMessage(`OTP sent via ${authMethod} to ${identifierLabel}`);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        authMethod,
        otp,
        ...(authMethod === 'email' ? { email } : { mobile })
      };
      const res = await API.post('/auth/verify-otp', payload);
      login(res.data.user, res.data.token);

      const redirectTo = location.state?.from?.pathname;
      if (redirectTo) {
        navigate(redirectTo, { replace: true });
        return;
      }

      const role = res.data.user.role;
      if (role === 'admin') navigate('/admin');
      else if (role === 'gate_officer') navigate('/gate');
      else if (role === 'priest') navigate('/priest');
      else if (role === 'guide') navigate('/guide');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  const resetToStepOne = () => {
    setStep(1);
    setOtp('');
    setTestOtp('');
    setMessage('');
    setError('');
  };

  return (
    <div style={styles.page}>
      <div style={styles.leftPanel}>
        <div style={styles.leftContent}>
          <div style={styles.om}>&#2384;</div>
          <h1 style={styles.leftTitle}>TirthOne</h1>
          <p style={styles.leftSub}>SACRED DARSHAN PORTAL</p>
          <div style={styles.divider} />
          <p style={styles.leftDesc}>
            Choose your preferred OTP method and login instantly.
          </p>
        </div>
      </div>

      <div style={styles.rightPanel}>
        <div style={styles.formBox}>
          <div style={styles.backLink} onClick={() => navigate('/')}>
            {'<-'} Back to Home
          </div>

          <h2 style={styles.formTitle}>Welcome Back</h2>
          <p style={styles.formSub}>Login using Email OTP or Mobile OTP</p>

          <div style={styles.methodRow}>
            <button
              type="button"
              style={authMethod === 'mobile' ? styles.methodBtnActive : styles.methodBtn}
              onClick={() => {
                setAuthMethod('mobile');
                resetToStepOne();
              }}
            >
              Mobile OTP
            </button>
            <button
              type="button"
              style={authMethod === 'email' ? styles.methodBtnActive : styles.methodBtn}
              onClick={() => {
                setAuthMethod('email');
                resetToStepOne();
              }}
            >
              Email OTP
            </button>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}
          {message && <div style={styles.successBox}>{message}</div>}

          {step === 1 && (
            <form onSubmit={handleSendOTP}>
              {authMethod === 'email' ? (
                <>
                  <label style={styles.label}>EMAIL ADDRESS</label>
                  <input
                    style={styles.input}
                    type="email"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </>
              ) : (
                <>
                  <label style={styles.label}>MOBILE NUMBER</label>
                  <input
                    style={styles.input}
                    type="tel"
                    placeholder="Enter your 10-digit mobile number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    maxLength={10}
                    required
                  />
                </>
              )}

              <button style={styles.btnPrimary} type="submit" disabled={loading}>
                {loading ? 'Sending OTP...' : `Send OTP via ${authMethod}`}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOTP}>
              <div style={styles.otpInfo}>
                OTP sent via <strong>{authMethod}</strong> to <strong>{identifierLabel}</strong>
              </div>

              {showTestOtp && testOtp && (
                <div style={styles.devOtpBox}>
                  Test OTP (dev only): <strong>{testOtp}</strong>
                </div>
              )}

              <label style={styles.label}>ENTER OTP</label>
              <input
                style={{ ...styles.input, textAlign: 'center', fontSize: '22px', letterSpacing: '10px' }}
                type="text"
                placeholder="------"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                required
              />

              <button style={styles.btnPrimary} type="submit" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify And Login'}
              </button>

              <button style={styles.btnGhost} type="button" onClick={resetToStepOne}>
                {'<-'} Change Method Or Identifier
              </button>
            </form>
          )}

          <div style={styles.registerLink}>
            New devotee? <Link to="/register" style={styles.link}>Create account here</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: { display: 'flex', minHeight: '100vh' },
  leftPanel: {
    flex: 1,
    backgroundColor: '#3D0A0A',
    backgroundImage: 'radial-gradient(ellipse at center, #6B1010 0%, #2A0606 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px'
  },
  leftContent: { textAlign: 'center', maxWidth: '320px' },
  om: { fontSize: '56px', color: '#E8C97A', marginBottom: '8px' },
  leftTitle: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#E8C97A',
    letterSpacing: '3px',
    fontFamily: 'Georgia, serif',
    margin: '0 0 4px'
  },
  leftSub: {
    fontSize: '10px',
    color: '#c8a96e',
    letterSpacing: '4px',
    marginBottom: '24px',
    fontFamily: 'Calibri, sans-serif'
  },
  divider: { width: '60px', height: '2px', backgroundColor: '#E07B39', margin: '0 auto 24px' },
  leftDesc: {
    fontSize: '14px',
    color: '#d4b896',
    lineHeight: '1.8',
    fontFamily: 'Calibri, sans-serif'
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#fdf6ec',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px'
  },
  formBox: { width: '100%', maxWidth: '400px' },
  backLink: {
    fontSize: '13px',
    color: '#E07B39',
    cursor: 'pointer',
    marginBottom: '28px',
    fontFamily: 'Calibri, sans-serif'
  },
  formTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1A1A2E',
    fontFamily: 'Georgia, serif',
    marginBottom: '6px'
  },
  formSub: {
    fontSize: '14px',
    color: '#888',
    marginBottom: '18px',
    fontFamily: 'Calibri, sans-serif'
  },
  methodRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '16px'
  },
  methodBtn: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    background: '#fff',
    color: '#444',
    cursor: 'pointer',
    fontWeight: '600'
  },
  methodBtnActive: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #E07B39',
    background: '#fff3e8',
    color: '#9b4f1f',
    cursor: 'pointer',
    fontWeight: '700'
  },
  label: {
    display: 'block',
    fontSize: '11px',
    letterSpacing: '1.5px',
    color: '#888',
    marginBottom: '8px',
    fontFamily: 'Calibri, sans-serif'
  },
  input: {
    width: '100%',
    padding: '14px',
    border: '1.5px solid #ddd',
    borderRadius: '8px',
    fontSize: '15px',
    boxSizing: 'border-box',
    marginBottom: '16px',
    fontFamily: 'Calibri, sans-serif',
    backgroundColor: '#fff',
    outline: 'none'
  },
  btnPrimary: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#E07B39',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    cursor: 'pointer',
    fontWeight: '600',
    fontFamily: 'Calibri, sans-serif',
    marginBottom: '10px'
  },
  btnGhost: {
    width: '100%',
    padding: '12px',
    backgroundColor: 'transparent',
    color: '#888',
    border: '1.5px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'Calibri, sans-serif'
  },
  otpInfo: {
    backgroundColor: '#fff5ef',
    border: '1px solid #E07B39',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#666',
    marginBottom: '16px',
    fontFamily: 'Calibri, sans-serif'
  },
  devOtpBox: {
    backgroundColor: '#eef6ff',
    border: '1px solid #8cb8f7',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#124076',
    marginBottom: '16px',
    fontFamily: 'Calibri, sans-serif'
  },
  errorBox: {
    backgroundColor: '#fff0f0',
    border: '1px solid #ffcccc',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#cc0000',
    marginBottom: '16px'
  },
  successBox: {
    backgroundColor: '#f0fff4',
    border: '1px solid #b2f5c8',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#1a7a3c',
    marginBottom: '16px'
  },
  registerLink: {
    textAlign: 'center',
    marginTop: '24px',
    fontSize: '13px',
    color: '#888',
    fontFamily: 'Calibri, sans-serif'
  },
  link: { color: '#E07B39', fontWeight: '600', textDecoration: 'none' }
};

export default Login;
