import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useAuth } from '../context/AuthContext';

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-IN');
};

const MODE = {
  CAMERA: 'camera',
  PASS_CODE: 'pass_code'
};
const SCAN_FPS = 24;
const SCAN_BOX_RATIO = 0.55;
const CAMERA_START_TIMEOUT_MS = 6000;
const DUPLICATE_COOLDOWN_MS = 900;
const RESUME_DELAY_MS = 220;

const normalizePassCode = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const startWithTimeout = async (promise, timeoutMs = 10000) => {
  let timeoutId;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Camera start timed out.')), timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const toFriendlyCameraError = (rawMessage = '') => {
  const message = String(rawMessage || '');
  if (/notallowed|permission|denied/i.test(message)) {
    return 'Camera permission was denied. Allow camera access in browser settings, then tap Open Camera.';
  }
  if (/notfound|no camera|devicesnotfound/i.test(message)) {
    return 'No camera device was found. Connect a camera and try again.';
  }
  if (/notreadable|trackstart|in use|could not start/i.test(message)) {
    return 'Camera is busy in another app/tab. Close other camera apps and tap Open Camera.';
  }
  return 'Unable to open camera right now. Tap Open Camera to retry.';
};

const GateScan = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState(MODE.CAMERA);
  const [passCodeInput, setPassCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [booking, setBooking] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraBooting, setCameraBooting] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanHint, setScanHint] = useState('Initializing quick scan...');
  const [lastScannedText, setLastScannedText] = useState('');
  const [scanFeedback, setScanFeedback] = useState('idle');
  const [scanLogs, setScanLogs] = useState([]);
  const [scanLogsLoading, setScanLogsLoading] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);

  const scannerRef = useRef(null);
  const processingRef = useRef(false);
  const cooldownUntilRef = useRef(0);
  const lastPayloadRef = useRef('');
  const sessionRef = useRef(0);
  const startingRef = useRef(false);
  const mountedRef = useRef(false);
  const feedbackTimeoutRef = useRef(null);
  const audioContextRef = useRef(null);

  const getAudioContext = useCallback(() => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      if (!audioContextRef.current) {
        audioContextRef.current = new Ctx();
      }
      return audioContextRef.current;
    } catch (_error) {
      return null;
    }
  }, []);

  const playFeedbackTone = useCallback(async (type) => {
    const audio = getAudioContext();
    if (!audio) return;

    try {
      if (audio.state === 'suspended') {
        await audio.resume();
      }

      const playBeep = (freq, durationSec, offsetSec, gainValue) => {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audio.currentTime + offsetSec);
        gain.gain.setValueAtTime(0.0001, audio.currentTime + offsetSec);
        gain.gain.exponentialRampToValueAtTime(
          gainValue,
          audio.currentTime + offsetSec + 0.015
        );
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          audio.currentTime + offsetSec + durationSec
        );
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start(audio.currentTime + offsetSec);
        osc.stop(audio.currentTime + offsetSec + durationSec + 0.02);
      };

      if (type === 'success') {
        playBeep(980, 0.09, 0, 0.055);
        playBeep(1320, 0.1, 0.12, 0.05);
      } else if (type === 'error') {
        playBeep(260, 0.2, 0, 0.06);
      }
    } catch (_error) {
      // no-op: audio feedback is optional
    }
  }, [getAudioContext]);

  const triggerScanFeedback = useCallback((type) => {
    setScanFeedback(type);
    playFeedbackTone(type);
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = setTimeout(() => {
      setScanFeedback('idle');
    }, 520);
  }, [playFeedbackTone]);

  const loadScanLogs = useCallback(async () => {
    setScanLogsLoading(true);
    try {
      const res = await API.get('/booking/scan-logs', { params: { limit: 8 } });
      setScanLogs(Array.isArray(res.data?.logs) ? res.data.logs : []);
    } catch (_error) {
      setScanLogs([]);
    } finally {
      setScanLogsLoading(false);
    }
  }, []);

  const submitScanPayload = useCallback(async (payload) => {
    setLoading(true);
    setError('');
    setMessage('');
    setBooking(null);

    try {
      const res = await API.post('/booking/scan', payload);
      setMessage(res.data?.message || 'Check-in successful.');
      setBooking(res.data?.booking || null);
      await loadScanLogs();
      return { ok: true, booking: res.data?.booking || null };
    } catch (err) {
      setError(err.response?.data?.message || 'Scan failed.');
      if (err.response?.data?.booking) {
        setBooking(err.response.data.booking);
      }
      await loadScanLogs();
      return { ok: false, booking: err.response?.data?.booking || null };
    } finally {
      setLoading(false);
    }
  }, [loadScanLogs]);

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setCameraBooting(false);

    if (!scanner) {
      setCameraActive(false);
      return;
    }

    try {
      await scanner.stop();
      await scanner.clear();
    } catch (_error) {
      // scanner can already be stopped by browser lifecycle.
    } finally {
      setCameraActive(false);
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    setCameraBooting(true);
    const sessionId = ++sessionRef.current;
    setCameraError('');
    setScanHint('Starting camera...');

    try {
      await stopCamera();

      const scanner = new Html5Qrcode('gate-qr-reader');
      scannerRef.current = scanner;

      const scanConfig = {
        fps: SCAN_FPS,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * SCAN_BOX_RATIO);
          return { width: size, height: size };
        },
        aspectRatio: 1,
        disableFlip: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      const onDecoded = async (decodedText) => {
        if (!mountedRef.current || sessionId !== sessionRef.current) return;
        const payloadText = String(decodedText || '').trim();
        if (!payloadText) return;

        const now = Date.now();
        if (processingRef.current) return;
        if (payloadText === lastPayloadRef.current && now < cooldownUntilRef.current) return;

        processingRef.current = true;
        lastPayloadRef.current = payloadText;
        cooldownUntilRef.current = now + DUPLICATE_COOLDOWN_MS;
        setLastScannedText(payloadText);
        setScanHint('Pass detected. Validating...');

        try {
          if (typeof scanner.pause === 'function') {
            scanner.pause(true);
          }
        } catch (_pauseError) {
          // continue with validation even if pause is unsupported.
        }

        const scanResult = await submitScanPayload({ qrData: payloadText });
        triggerScanFeedback(scanResult.ok ? 'success' : 'error');
        setScanHint(scanResult.ok ? 'Ready for next pass.' : 'Issue found. Ready to scan next.');

        window.setTimeout(() => {
          const activeScanner = scannerRef.current;
          if (!mountedRef.current || sessionId !== sessionRef.current) {
            processingRef.current = false;
            return;
          }
          if (activeScanner && typeof activeScanner.resume === 'function') {
            try {
              activeScanner.resume();
            } catch (_resumeError) {
              // keep camera active even if resume throws.
            }
          }
          processingRef.current = false;
        }, RESUME_DELAY_MS);
      };

      const attemptedErrors = [];
      const cameraSourceCandidates = [
        { facingMode: { exact: 'environment' } },
        { facingMode: 'environment' },
        { facingMode: { exact: 'user' } },
        { facingMode: 'user' }
      ];

      let started = false;
      for (const source of cameraSourceCandidates) {
        try {
          await startWithTimeout(
            scanner.start(source, scanConfig, onDecoded, () => {}),
            CAMERA_START_TIMEOUT_MS
          );
          started = true;
          break;
        } catch (startError) {
          attemptedErrors.push(startError?.message || 'Unknown camera source error.');
        }
      }

      if (!started) {
        const cameras = await Html5Qrcode.getCameras();
        if (Array.isArray(cameras) && cameras.length > 0) {
          const preferred = [
            ...cameras.filter((cam) => /(back|rear|environment)/i.test(cam.label || '')),
            ...cameras.filter((cam) => !/(back|rear|environment)/i.test(cam.label || ''))
          ];

          for (const cam of preferred) {
            try {
              await startWithTimeout(
                scanner.start(cam.id, scanConfig, onDecoded, () => {}),
                CAMERA_START_TIMEOUT_MS
              );
              started = true;
              break;
            } catch (startError) {
              attemptedErrors.push(startError?.message || 'Unknown camera id error.');
            }
          }
        }
      }

      if (!started) {
        throw new Error(attemptedErrors.find(Boolean) || 'No working camera source found.');
      }

      if (!mountedRef.current || sessionId !== sessionRef.current) {
        try {
          await scanner.stop();
          await scanner.clear();
        } catch (_error) {
          // no-op
        }
        return;
      }

      setCameraActive(true);
      setCameraBooting(false);
      setScanHint('Camera live. Keep QR inside the frame for instant check-in.');
    } catch (cameraStartError) {
      setCameraError(toFriendlyCameraError(cameraStartError?.message || ''));
      setScanHint('Failed to start scanner.');
      setCameraBooting(false);
      await stopCamera();
    } finally {
      setCameraBooting(false);
      startingRef.current = false;
    }
  }, [stopCamera, submitScanPayload, triggerScanFeedback]);

  useEffect(() => {
    if (mode === MODE.CAMERA) {
      startCamera();
    } else {
      stopCamera();
      setCameraError('');
      setScanHint('Manual pass code mode enabled.');
    }
  }, [mode, startCamera, stopCamera]);

  useEffect(() => {
    loadScanLogs();
  }, [loadScanLogs]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sessionRef.current += 1;
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      const reasonText = String(event?.reason?.message || event?.reason || '');
      if (
        reasonText.includes('play() request was interrupted because the media was removed from the document')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

  useEffect(
    () => () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      if (audioContextRef.current && typeof audioContextRef.current.close === 'function') {
        audioContextRef.current.close().catch(() => {});
      }
    },
    []
  );

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    const normalized = normalizePassCode(passCodeInput);
    if (!normalized) return;
    await submitScanPayload({ bookingCode: normalized });
    setPassCodeInput('');
  };

  const handleAdminOverride = async (action) => {
    if (!booking?._id) return;

    const reason = overrideReason.trim();
    if (reason.length < 5) {
      setError('Please enter override reason (at least 5 characters).');
      return;
    }

    setOverrideLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await API.post(`/booking/${booking._id}/admin-override`, {
        action,
        reason
      });
      setBooking(res.data?.booking || booking);
      setMessage(res.data?.message || 'Admin override applied.');
      setOverrideReason('');
      triggerScanFeedback('success');
      await loadScanLogs();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply admin override.');
      triggerScanFeedback('error');
    } finally {
      setOverrideLoading(false);
    }
  };

  const statusChipStyle = booking?.status === 'visited' ? styles.statusChipVisited : styles.statusChipDefault;
  const isAdmin = user?.role === 'admin';

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>VIP Gate Check-In</h2>
            <p style={styles.subtitle}>Fast lane mode for gate team: continuous QR scan or quick pass code entry.</p>
          </div>
          <button style={styles.backBtn} type="button" onClick={() => navigate('/gate')}>
            Back
          </button>
        </div>

        <div style={styles.modeTabs}>
          <button
            type="button"
            onClick={() => setMode(MODE.CAMERA)}
            style={mode === MODE.CAMERA ? styles.modeTabActive : styles.modeTab}
          >
            Quick Scan (Camera)
          </button>
          <button
            type="button"
            onClick={() => setMode(MODE.PASS_CODE)}
            style={mode === MODE.PASS_CODE ? styles.modeTabActive : styles.modeTab}
          >
            Enter Pass Code
          </button>
        </div>

        {mode === MODE.CAMERA && (
          <section style={styles.scanSection}>
            <div style={styles.scanSectionHeader}>
              <div style={styles.statusDotWrap}>
                <span style={cameraActive ? styles.statusDotActive : styles.statusDotIdle} />
                <span style={styles.statusText}>{scanHint}</span>
              </div>
              <div style={styles.scanActionWrap}>
                <button type="button" style={styles.openCameraBtn} onClick={startCamera} disabled={cameraBooting}>
                  {cameraBooting ? 'Opening...' : 'Open Camera'}
                </button>
                <span style={styles.autoChip}>Auto mode</span>
              </div>
            </div>

            <div
              style={{
                ...styles.readerShell,
                ...(scanFeedback === 'success' ? styles.readerShellSuccess : {}),
                ...(scanFeedback === 'error' ? styles.readerShellError : {})
              }}
            >
              {!cameraActive && (
                <div style={styles.cameraPlaceholder}>
                  {cameraBooting ? 'Opening camera...' : 'Tap Open Camera to start scanning.'}
                </div>
              )}
              <div id="gate-qr-reader" style={styles.cameraReader} />
              {cameraActive && <div style={styles.scanFrame} />}
            </div>

            {scanFeedback !== 'idle' && (
              <div
                style={
                  scanFeedback === 'success'
                    ? styles.feedbackPillSuccess
                    : styles.feedbackPillError
                }
              >
                {scanFeedback === 'success' ? 'Entry approved' : 'Duplicate / invalid pass'}
              </div>
            )}

            {lastScannedText && (
              <div style={styles.lastScanned}>
                Last scan captured and processed.
              </div>
            )}
            {cameraError && (
              <div style={styles.error}>
                {cameraError}
                <button type="button" style={styles.retryBtn} onClick={startCamera}>
                  Retry Camera
                </button>
              </div>
            )}
          </section>
        )}

        {mode === MODE.PASS_CODE && (
          <section style={styles.manualSection}>
            <form onSubmit={handleCodeSubmit}>
              <label style={styles.label}>Pass Code</label>
              <input
                style={styles.input}
                placeholder="Example: 7H9K2P3R"
                value={passCodeInput}
                onChange={(e) => setPassCodeInput(normalizePassCode(e.target.value))}
                required
              />
              <button style={styles.scanBtn} type="submit" disabled={loading}>
                {loading ? 'Validating...' : 'Validate Pass'}
              </button>
            </form>
          </section>
        )}

        {message && <div style={styles.success}>{message}</div>}
        {error && <div style={styles.error}>{error}</div>}

        {booking && (
          <section style={styles.resultCard}>
            <div style={styles.resultTop}>
              <h3 style={styles.resultTitle}>Check-In Result</h3>
              <span style={{ ...styles.resultStatusChip, ...statusChipStyle }}>{booking.status}</span>
            </div>
            <p style={styles.row}><strong>Pass Code:</strong> {booking.bookingCode || '-'}</p>
            <p style={styles.row}><strong>Booking Ref:</strong> {booking._id}</p>
            <p style={styles.row}><strong>Head Devotee:</strong> {booking.headDevoteeName}</p>
            <p style={styles.row}><strong>Date:</strong> {formatDateTime(booking.bookingDate)}</p>
            <p style={styles.row}><strong>Slot:</strong> {booking.timeSlot}</p>
            <p style={styles.row}><strong>Total People:</strong> {booking.memberCount}</p>
            <p style={styles.row}><strong>Visited At:</strong> {formatDateTime(booking.visitedAt)}</p>

            {isAdmin && (
              <div style={styles.overridePanel}>
                <p style={styles.overrideTitle}>Admin Override Controls</p>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Reason for override (required for audit log)"
                  style={styles.overrideInput}
                />
                <div style={styles.overrideActions}>
                  <button
                    type="button"
                    style={styles.overridePrimaryBtn}
                    disabled={overrideLoading}
                    onClick={() => handleAdminOverride('mark_visited')}
                  >
                    {overrideLoading ? 'Applying...' : 'Force Check-In'}
                  </button>
                  <button
                    type="button"
                    style={styles.overrideSecondaryBtn}
                    disabled={overrideLoading || booking.status !== 'visited'}
                    onClick={() => handleAdminOverride('reopen_pass')}
                  >
                    Reopen Pass
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        <section style={styles.activityCard}>
          <div style={styles.activityHeader}>
            <h3 style={styles.activityTitle}>Recent Gate Activity</h3>
            <button type="button" style={styles.refreshBtn} onClick={loadScanLogs} disabled={scanLogsLoading}>
              {scanLogsLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {scanLogs.length === 0 ? (
            <p style={styles.activityEmpty}>No scan activity yet.</p>
          ) : (
            <div style={styles.activityList}>
              {scanLogs.map((log) => (
                <div key={log.id} style={styles.activityItem}>
                  <div style={styles.activityTopRow}>
                    <strong style={styles.activityCode}>{log.bookingCode || '-'}</strong>
                    <span
                      style={
                        log.result === 'success' || log.result === 'override'
                          ? styles.activityBadgeSuccess
                          : log.result === 'reopen'
                            ? styles.activityBadgeReopen
                            : styles.activityBadgeRejected
                      }
                    >
                      {log.result}
                    </span>
                  </div>
                  <p style={styles.activityMeta}>
                    {log.headDevoteeName || '-'} | {log.memberCount || 0} people | {log.mode}
                  </p>
                  <p style={styles.activityMeta}>
                    By: {log.scannedBy?.name || log.scannerRole || '-'} | {formatDateTime(log.createdAt)}
                  </p>
                  {log.reason ? <p style={styles.activityReason}>{log.reason}</p> : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    padding: '24px',
    background: 'radial-gradient(circle at 15% 10%, #fdf6ea 0%, #f8ede3 42%, #ece8ff 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    fontFamily: 'Calibri, sans-serif'
  },
  card: {
    width: '100%',
    maxWidth: '900px',
    background: '#fff',
    borderRadius: '16px',
    padding: '18px',
    border: '1px solid #ded8ff',
    boxShadow: '0 14px 34px rgba(41, 31, 78, 0.15)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '10px',
    marginBottom: '10px',
    flexWrap: 'wrap'
  },
  title: {
    margin: 0,
    color: '#3D0A0A',
    fontFamily: 'Georgia, serif',
    fontSize: '32px'
  },
  subtitle: {
    margin: '4px 0 0',
    color: '#6d5842',
    fontSize: '14px'
  },
  backBtn: {
    border: '1px solid #E8C97A',
    background: '#FAF6E9',
    borderRadius: '8px',
    padding: '8px 12px',
    cursor: 'pointer',
    color: '#3D0A0A',
    fontWeight: '700'
  },
  modeTabs: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '12px'
  },
  modeTab: {
    border: '1px solid transparent',
    borderRadius: '10px',
    padding: '10px',
    background: '#fff',
    color: '#6d5842',
    cursor: 'pointer',
    fontWeight: '700'
  },
  modeTabActive: {
    border: '1px solid #E8C97A',
    borderRadius: '10px',
    padding: '10px',
    background: '#FAF6E9',
    color: '#3D0A0A',
    cursor: 'pointer',
    fontWeight: '700'
  },
  scanSection: {
    border: '1px solid #e2d5c3',
    background: '#fff',
    borderRadius: '12px',
    padding: '12px',
    marginBottom: '10px',
    boxShadow: '0 4px 15px rgba(61, 10, 10, 0.05)'
  },
  scanSectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
    flexWrap: 'wrap'
  },
  statusDotWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  statusDotActive: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#16a34a'
  },
  statusDotIdle: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#94a3b8'
  },
  statusText: {
    color: '#3D0A0A',
    fontSize: '13px',
    fontWeight: '700'
  },
  autoChip: {
    border: '1px solid #E8C97A',
    borderRadius: '999px',
    padding: '4px 10px',
    background: '#FAF6E9',
    color: '#3D0A0A',
    fontSize: '12px',
    fontWeight: '700'
  },
  scanActionWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  openCameraBtn: {
    border: 'none',
    background: '#E8C97A',
    color: '#3D0A0A',
    borderRadius: '8px',
    padding: '7px 12px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '12px'
  },
  readerShell: {
    position: 'relative',
    width: '100%',
    maxWidth: '460px',
    margin: '0 auto',
    borderRadius: '14px',
    overflow: 'hidden',
    background: '#0f172a',
    border: '2px solid #E8C97A'
  },
  readerShellSuccess: {
    border: '2px solid #16a34a',
    boxShadow: '0 0 0 3px rgba(34,197,94,0.25), 0 0 28px rgba(34,197,94,0.35)'
  },
  readerShellError: {
    border: '2px solid #b42318',
    boxShadow: '0 0 0 3px rgba(244,63,94,0.23), 0 0 24px rgba(220,38,38,0.33)'
  },
  cameraPlaceholder: {
    position: 'absolute',
    inset: 0,
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#c4d6ff',
    fontWeight: '700',
    background: 'linear-gradient(180deg, rgba(11,18,32,0.9), rgba(10,22,52,0.86))'
  },
  cameraReader: {
    width: '100%',
    minHeight: '300px',
    position: 'relative',
    zIndex: 1
  },
  scanFrame: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '72%',
    aspectRatio: '1 / 1',
    border: '3px solid rgba(74, 222, 128, 0.95)',
    borderRadius: '14px',
    boxShadow: '0 0 0 9999px rgba(10, 7, 24, 0.24)',
    pointerEvents: 'none'
  },
  lastScanned: {
    marginTop: '8px',
    color: '#3D0A0A',
    fontSize: '12px',
    textAlign: 'center',
    fontWeight: '700'
  },
  feedbackPillSuccess: {
    marginTop: '8px',
    border: '1px solid #9edab1',
    background: '#ecfff3',
    color: '#166534',
    borderRadius: '999px',
    padding: '6px 12px',
    fontWeight: '700',
    fontSize: '12px',
    width: 'fit-content',
    marginLeft: 'auto',
    marginRight: 'auto'
  },
  feedbackPillError: {
    marginTop: '8px',
    border: '1px solid #f0b3b3',
    background: '#fff3f3',
    color: '#9f1d1d',
    borderRadius: '999px',
    padding: '6px 12px',
    fontWeight: '700',
    fontSize: '12px',
    width: 'fit-content',
    marginLeft: 'auto',
    marginRight: 'auto'
  },
  manualSection: {
    border: '1px solid #e2d5c3',
    background: '#fff',
    borderRadius: '12px',
    padding: '12px',
    marginBottom: '10px'
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    color: '#6d5842',
    fontSize: '12px',
    fontWeight: '700'
  },
  input: {
    width: '100%',
    border: '1px solid #e2d5c3',
    borderRadius: '10px',
    padding: '11px',
    boxSizing: 'border-box',
    fontSize: '14px',
    letterSpacing: '1px',
    fontWeight: '700'
  },
  scanBtn: {
    marginTop: '10px',
    border: 'none',
    background: '#3D0A0A',
    color: '#fff',
    borderRadius: '8px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: '700'
  },
  retryBtn: {
    marginLeft: '10px',
    border: '1px solid #E8C97A',
    background: '#FAF6E9',
    color: '#3D0A0A',
    borderRadius: '7px',
    padding: '6px 10px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '12px'
  },
  success: {
    marginTop: '12px',
    border: '1px solid #a6ddba',
    background: '#ecfff3',
    color: '#166534',
    borderRadius: '10px',
    padding: '10px'
  },
  error: {
    marginTop: '12px',
    border: '1px solid #f1bcbc',
    background: '#fff2f2',
    color: '#9f1d1d',
    borderRadius: '10px',
    padding: '10px'
  },
  resultCard: {
    marginTop: '12px',
    border: '1px solid #e2d5c3',
    background: '#fff',
    borderRadius: '12px',
    padding: '12px'
  },
  overridePanel: {
    marginTop: '10px',
    border: '1px solid #E8C97A',
    background: '#FAF6E9',
    borderRadius: '10px',
    padding: '10px'
  },
  overrideTitle: {
    margin: '0 0 8px',
    color: '#3D0A0A',
    fontWeight: '700'
  },
  overrideInput: {
    width: '100%',
    minHeight: '70px',
    border: '1px solid #e2d5c3',
    borderRadius: '8px',
    padding: '8px',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'Calibri, sans-serif'
  },
  overrideActions: {
    marginTop: '8px',
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  overridePrimaryBtn: {
    border: 'none',
    background: '#3D0A0A',
    color: '#fff',
    borderRadius: '8px',
    padding: '9px 12px',
    cursor: 'pointer',
    fontWeight: '700'
  },
  overrideSecondaryBtn: {
    border: '1px solid #E8C97A',
    background: '#fff',
    color: '#3D0A0A',
    borderRadius: '8px',
    padding: '9px 12px',
    cursor: 'pointer',
    fontWeight: '700'
  },
  activityCard: {
    marginTop: '12px',
    border: '1px solid #e2d5c3',
    background: '#fff',
    borderRadius: '12px',
    padding: '12px',
    boxShadow: '0 2px 8px rgba(61, 10, 10, 0.05)'
  },
  activityHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    flexWrap: 'wrap'
  },
  activityTitle: {
    margin: 0,
    color: '#3D0A0A',
    fontFamily: 'Georgia, serif'
  },
  refreshBtn: {
    border: '1px solid #E8C97A',
    background: '#FAF6E9',
    color: '#3D0A0A',
    borderRadius: '8px',
    padding: '7px 10px',
    cursor: 'pointer',
    fontWeight: '700'
  },
  activityEmpty: {
    margin: 0,
    color: '#5a7087',
    fontSize: '13px'
  },
  activityList: {
    display: 'grid',
    gap: '8px'
  },
  activityItem: {
    border: '1px solid #dbe5f0',
    background: '#fff',
    borderRadius: '10px',
    padding: '9px'
  },
  activityTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px'
  },
  activityCode: {
    color: '#1f3347'
  },
  activityBadgeSuccess: {
    borderRadius: '999px',
    padding: '2px 8px',
    background: '#e8f8ee',
    color: '#17653b',
    border: '1px solid #b7e5c9',
    fontSize: '12px',
    textTransform: 'capitalize'
  },
  activityBadgeReopen: {
    borderRadius: '999px',
    padding: '2px 8px',
    background: '#f1edff',
    color: '#4936a3',
    border: '1px solid #d4cbff',
    fontSize: '12px',
    textTransform: 'capitalize'
  },
  activityBadgeRejected: {
    borderRadius: '999px',
    padding: '2px 8px',
    background: '#fff0f0',
    color: '#ab1f1f',
    border: '1px solid #f2c5c5',
    fontSize: '12px',
    textTransform: 'capitalize'
  },
  activityMeta: {
    margin: '4px 0 0',
    color: '#587087',
    fontSize: '12px'
  },
  activityReason: {
    margin: '4px 0 0',
    color: '#3e5a70',
    fontSize: '12px'
  },
  resultTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px'
  },
  resultTitle: {
    margin: 0,
    color: '#2b1846'
  },
  resultStatusChip: {
    borderRadius: '999px',
    padding: '5px 10px',
    textTransform: 'capitalize',
    fontSize: '12px',
    fontWeight: '700',
    border: '1px solid transparent'
  },
  statusChipVisited: {
    background: '#dff3e9',
    color: '#166534',
    borderColor: '#b9e7c7'
  },
  statusChipDefault: {
    background: '#ece8ff',
    color: '#40397f',
    borderColor: '#ccc4ff'
  },
  row: {
    margin: '5px 0',
    color: '#3e355f'
  }
};

export default GateScan;
