import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

const emptyForm = {
  name: '',
  email: '',
  mobile: '',
  age: '',
  yearsExperience: '',
  photoDataUrl: '',
  bio: '',
  destinations: []
};

const toDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read selected image.'));
    reader.readAsDataURL(file);
  });

const getApiErrorMessage = (err, fallback) => {
  const data = err?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (err?.message) return err.message;
  return fallback;
};

const validateForm = (form) => {
  const errors = {};
  const name = String(form.name || '').trim();
  const email = String(form.email || '').trim();
  const mobile = String(form.mobile || '').replace(/\D/g, '');
  const age = form.age === '' ? null : Number(form.age);
  const yearsExperience = Number(form.yearsExperience || 0);
  const bio = String(form.bio || '').trim();

  if (name.length < 3) errors.name = 'Name must be at least 3 characters.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
  if (!/^\d{10}$/.test(mobile)) errors.mobile = 'Mobile must be exactly 10 digits.';
  if (age !== null && (!Number.isFinite(age) || age < 18 || age > 90)) errors.age = 'Age must be between 18 and 90.';
  if (!Number.isFinite(yearsExperience) || yearsExperience < 0 || yearsExperience > 70) {
    errors.yearsExperience = 'Experience must be between 0 and 70 years.';
  }
  if (bio.length > 500) errors.bio = 'Bio must be 500 characters or less.';

  return errors;
};

const AdminGuideManagement = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [guides, setGuides] = useState([]);
  const [placesCatalog, setPlacesCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [refundRunning, setRefundRunning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [verifiedFilter, setVerifiedFilter] = useState('all');

  const loadGuides = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/guide/admin/guides');
      setGuides(Array.isArray(res.data?.guides) ? res.data.guides : []);
      setPlacesCatalog(Array.isArray(res.data?.placesCatalog) ? res.data.placesCatalog : []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load guide list.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuides();
  }, []);

  const guideStats = useMemo(
    () => ({
      total: guides.length,
      active: guides.filter((g) => g.isActive).length,
      verified: guides.filter((g) => g.isVerified).length
    }),
    [guides]
  );

  const filteredGuides = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return guides.filter((item) => {
      const name = String(item.name || '').toLowerCase();
      const email = String(item.email || '').toLowerCase();
      const mobile = String(item.mobile || '').toLowerCase();
      const matchesSearch = !q || name.includes(q) || email.includes(q) || mobile.includes(q);
      const matchesActive =
        activeFilter === 'all'
        || (activeFilter === 'active' && item.isActive)
        || (activeFilter === 'inactive' && !item.isActive);
      const matchesVerified =
        verifiedFilter === 'all'
        || (verifiedFilter === 'verified' && item.isVerified)
        || (verifiedFilter === 'unverified' && !item.isVerified);
      return matchesSearch && matchesActive && matchesVerified;
    });
  }, [guides, searchTerm, activeFilter, verifiedFilter]);

  const setFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const toggleDestination = (code) => {
    setForm((prev) => {
      const next = new Set(Array.isArray(prev.destinations) ? prev.destinations : []);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return { ...prev, destinations: [...next] };
    });
  };

  const handlePhotoPick = async (event) => {
    setError('');
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Image is too large. Maximum allowed size is 2MB.');
      return;
    }

    setUploadingPhoto(true);
    try {
      const dataUrl = await toDataUrl(file);
      setFormField('photoDataUrl', dataUrl);
    } catch (uploadError) {
      setError(uploadError.message || 'Unable to process image.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCreateGuide = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const nextErrors = validateForm(form);
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setError('Please correct highlighted fields before submitting.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        mobile: String(form.mobile || '').replace(/\D/g, ''),
        name: String(form.name || '').trim(),
        email: String(form.email || '').trim().toLowerCase(),
        age: form.age === '' ? null : Number(form.age),
        yearsExperience: Number(form.yearsExperience || 0),
        bio: String(form.bio || '').trim(),
        destinations: Array.isArray(form.destinations) ? form.destinations : []
      };

      const res = await API.post('/guide/admin/guides', payload);
      setMessage(res.data?.message || 'Guide added.');
      setForm(emptyForm);
      setFormErrors({});
      await loadGuides();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to add guide.'));
    } finally {
      setSaving(false);
    }
  };

  const patchGuide = async (id, payload, successMsg) => {
    setError('');
    setMessage('');
    try {
      await API.patch(`/guide/admin/guides/${id}`, payload);
      setMessage(successMsg);
      await loadGuides();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to update guide.'));
    }
  };

  const toggleActive = (item) => patchGuide(item.id, { isActive: !item.isActive }, `Guide ${item.name} updated.`);
  const toggleVerified = (item) => patchGuide(item.id, { isVerified: !item.isVerified }, `Guide ${item.name} updated.`);

  const runRefundEngine = async () => {
    setError('');
    setMessage('');
    setRefundRunning(true);
    try {
      const res = await API.post('/guide/admin/refund-engine/run');
      const result = res.data?.result;
      if (result?.todayKey) {
        setMessage(
          `Refund engine executed for ${result.todayKey}. Refunded: ${result.refundedCount || 0}, skipped: ${result.skippedCount || 0}.`
        );
      } else {
        setMessage(res.data?.message || 'Refund engine executed.');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to run refund engine.'));
    } finally {
      setRefundRunning(false);
    }
  };

  const renderDestinationsLabel = (destinations) => {
    const list = Array.isArray(destinations) ? destinations : [];
    if (list.length === 0) return 'All destinations';

    const map = new Map(placesCatalog.map((p) => [p.code, p.name]));
    return list.map((code) => map.get(code) || code).join(', ');
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Verified Guide Management</h1>
            <p style={styles.sub}>
              Admin-only onboarding for guides. Guides confirm trip requests; devotees can reassign or refund if needed.
            </p>
          </div>
          <div style={styles.headerActions}>
            <button type="button" style={styles.backBtn} onClick={() => navigate('/admin')}>
              Back
            </button>
            <button type="button" style={styles.backBtn} onClick={runRefundEngine} disabled={refundRunning}>
              {refundRunning ? 'Running Refunds…' : 'Run Refund Engine'}
            </button>
          </div>
        </header>

        <section style={styles.statsRow}>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Total Guides</span>
            <strong style={styles.statValue}>{guideStats.total}</strong>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Active</span>
            <strong style={styles.statValue}>{guideStats.active}</strong>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Verified</span>
            <strong style={styles.statValue}>{guideStats.verified}</strong>
          </div>
        </section>

        {error && <div style={styles.errorBox}>{error}</div>}
        {message && <div style={styles.successBox}>{message}</div>}

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Add Verified Guide</h2>
          <p style={styles.cardHint}>
            Better word than “Trips”: choose <strong>Destinations Covered</strong>. Leave blank to allow all destinations.
          </p>

          <form onSubmit={handleCreateGuide} style={styles.form}>
            <div style={styles.formRow}>
              <div style={styles.field}>
                <label style={styles.label}>Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setFormField('name', e.target.value)}
                  style={{ ...styles.input, ...(formErrors.name ? styles.inputError : {}) }}
                  placeholder="Guide full name"
                />
                {formErrors.name && <div style={styles.fieldError}>{formErrors.name}</div>}
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setFormField('email', e.target.value)}
                  style={{ ...styles.input, ...(formErrors.email ? styles.inputError : {}) }}
                  placeholder="guide@example.com"
                />
                {formErrors.email && <div style={styles.fieldError}>{formErrors.email}</div>}
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={styles.field}>
                <label style={styles.label}>Mobile</label>
                <input
                  value={form.mobile}
                  onChange={(e) => setFormField('mobile', e.target.value)}
                  style={{ ...styles.input, ...(formErrors.mobile ? styles.inputError : {}) }}
                  placeholder="10-digit mobile"
                />
                {formErrors.mobile && <div style={styles.fieldError}>{formErrors.mobile}</div>}
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Age (optional)</label>
                <input
                  type="number"
                  value={form.age}
                  onChange={(e) => setFormField('age', e.target.value)}
                  style={{ ...styles.input, ...(formErrors.age ? styles.inputError : {}) }}
                  placeholder="e.g. 35"
                />
                {formErrors.age && <div style={styles.fieldError}>{formErrors.age}</div>}
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Experience (years)</label>
                <input
                  type="number"
                  value={form.yearsExperience}
                  onChange={(e) => setFormField('yearsExperience', e.target.value)}
                  style={{ ...styles.input, ...(formErrors.yearsExperience ? styles.inputError : {}) }}
                  placeholder="e.g. 5"
                />
                {formErrors.yearsExperience && <div style={styles.fieldError}>{formErrors.yearsExperience}</div>}
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={styles.field}>
                <label style={styles.label}>Guide Photo</label>
                <div style={styles.photoRow}>
                  <input type="file" accept="image/*" onChange={handlePhotoPick} />
                  <button
                    type="button"
                    style={styles.ghostBtn}
                    onClick={() => setFormField('photoDataUrl', '')}
                    disabled={!form.photoDataUrl}
                  >
                    Remove
                  </button>
                  {uploadingPhoto && <span style={styles.muted}>Processing image...</span>}
                </div>
                {form.photoDataUrl && (
                  <img
                    src={form.photoDataUrl}
                    alt="Guide"
                    style={styles.photoPreview}
                  />
                )}
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setFormField('bio', e.target.value)}
                  style={{ ...styles.textarea, ...(formErrors.bio ? styles.inputError : {}) }}
                  rows={6}
                  placeholder="Short intro that devotees will see."
                />
                {formErrors.bio && <div style={styles.fieldError}>{formErrors.bio}</div>}
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Destinations Covered</label>
              <div style={styles.destGrid}>
                {placesCatalog.map((p) => {
                  const checked = (form.destinations || []).includes(p.code);
                  return (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => toggleDestination(p.code)}
                      style={{
                        ...styles.destChip,
                        ...(checked ? styles.destChipActive : {})
                      }}
                    >
                      <span style={styles.destName}>{p.name}</span>
                      <span style={styles.destPrice}>Rs. {p.price}</span>
                    </button>
                  );
                })}
              </div>
              <div style={styles.muted}>
                If you do not select anything, the guide will be shown for all destinations by default.
              </div>
            </div>

            <div style={styles.formActions}>
              <button type="submit" style={styles.primaryBtn} disabled={saving}>
                {saving ? 'Adding...' : 'Add Guide'}
              </button>
            </div>
          </form>
        </section>

        <section style={styles.card}>
          <div style={styles.listHeaderRow}>
            <h2 style={styles.cardTitle}>&nbsp;Guide List</h2>
            <div style={styles.filters}>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.input}
                placeholder="Search name/email/mobile"
              />
              <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} style={styles.select}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select value={verifiedFilter} onChange={(e) => setVerifiedFilter(e.target.value)} style={styles.select}>
                <option value="all">All</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
              <button type="button" style={styles.ghostBtn} onClick={loadGuides} disabled={loading}>
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {filteredGuides.length === 0 ? (
            <div style={styles.muted}>No guides found.</div>
          ) : (
            <div style={styles.grid}>
              {filteredGuides.map((g) => (
                <article key={g.id} style={styles.guideCard}>
                  <div style={styles.guideBanner}>
                    {g.photoUrl ? (
                      <img src={g.photoUrl} alt={g.name} style={styles.bannerImg} />
                    ) : (
                      <div style={styles.bannerFallback}>
                        {(g.name || 'G').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div style={styles.bannerOverlay} />
                    <div style={styles.bannerText}>
                      <h3 style={styles.guideName}>{g.name}</h3>
                      <div style={styles.guideMeta}>
                        <span style={styles.badge}>{g.isActive ? 'Active' : 'Inactive'}</span>
                        <span style={{ ...styles.badge, ...(g.isVerified ? styles.badgeOk : styles.badgeWarn) }}>
                          {g.isVerified ? 'Verified' : 'Unverified'}
                        </span>
                        <span style={styles.badge}>
                          {Number(g.rating?.avg || 0).toFixed(1)}★ ({g.rating?.count || 0})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.guideBody}>
                    <div style={styles.kvRow}>
                      <div>
                        <div style={styles.kLabel}>Email</div>
                        <div style={styles.kValue}>{g.email || '-'}</div>
                      </div>
                      <div>
                        <div style={styles.kLabel}>Mobile</div>
                        <div style={styles.kValue}>{g.mobile || '-'}</div>
                      </div>
                    </div>

                    <div style={styles.kvRow}>
                      <div>
                        <div style={styles.kLabel}>Experience</div>
                        <div style={styles.kValue}>{g.yearsExperience || 0} yrs</div>
                      </div>
                      <div>
                        <div style={styles.kLabel}>Age</div>
                        <div style={styles.kValue}>{g.age ?? '-'}</div>
                      </div>
                    </div>

                    <div style={styles.kBlock}>
                      <div style={styles.kLabel}>Destinations</div>
                      <div style={styles.kValue}>{renderDestinationsLabel(g.destinations)}</div>
                    </div>

                    {g.bio && (
                      <div style={styles.kBlock}>
                        <div style={styles.kLabel}>Bio</div>
                        <div style={styles.bioText}>{g.bio}</div>
                      </div>
                    )}

                    <div style={styles.cardActions}>
                      <button type="button" style={styles.secondaryBtn} onClick={() => toggleVerified(g)}>
                        {g.isVerified ? 'Unverify' : 'Verify'}
                      </button>
                      <button type="button" style={styles.primaryBtn} onClick={() => toggleActive(g)}>
                        {g.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </article>
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
    background: 'radial-gradient(circle at 18% 10%, #f9efe3 0%, #f2e9de 46%, #e9e3f2 100%)',
    padding: '22px',
    fontFamily: 'Calibri, sans-serif'
  },
  container: {
    maxWidth: '1100px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    flexWrap: 'wrap',
    background: 'linear-gradient(130deg, #1f2747 0%, #4b1f2f 60%, #6c2c1f 100%)',
    borderRadius: '16px',
    padding: '18px',
    color: '#fff',
    boxShadow: '0 14px 34px rgba(37, 22, 20, 0.25)'
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  backBtn: {
    border: '1px solid rgba(255,255,255,0.35)',
    borderRadius: '10px',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
    fontWeight: '700',
    cursor: 'pointer'
  },
  title: {
    margin: 0,
    fontFamily: 'Georgia, serif',
    fontSize: '32px',
    letterSpacing: '0.2px'
  },
  sub: {
    margin: '8px 0 0',
    color: '#efe4d8',
    lineHeight: 1.45,
    maxWidth: '780px'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '10px',
    marginTop: '12px'
  },
  statCard: {
    background: '#fff',
    border: '1px solid #e2d4c3',
    borderRadius: '14px',
    padding: '12px',
    boxShadow: '0 10px 20px rgba(44, 25, 14, 0.08)'
  },
  statLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#6d5842',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.8px'
  },
  statValue: {
    display: 'block',
    marginTop: '6px',
    fontSize: '26px',
    color: '#2f2214',
    fontFamily: 'Georgia, serif'
  },
  errorBox: {
    marginTop: '12px',
    border: '1px solid #efb7b7',
    background: '#fff1f1',
    color: '#a11f1f',
    borderRadius: '12px',
    padding: '10px'
  },
  successBox: {
    marginTop: '12px',
    border: '1px solid #b9e7c7',
    background: '#eaf8ef',
    color: '#166534',
    borderRadius: '12px',
    padding: '10px'
  },
  card: {
    marginTop: '12px',
    background: '#fff',
    border: '1px solid #e2d4c3',
    borderRadius: '16px',
    padding: '14px',
    boxShadow: '0 10px 24px rgba(44, 25, 14, 0.1)'
  },
  cardTitle: {
    margin: 0,
    fontFamily: 'Georgia, serif',
    color: '#2f2214'
  },
  cardHint: {
    margin: '6px 0 0',
    color: '#6d5842'
  },
  form: {
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '10px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#5d4122',
    textTransform: 'uppercase',
    letterSpacing: '0.7px'
  },
  input: {
    border: '1px solid #dec89f',
    borderRadius: '10px',
    padding: '10px 12px',
    outline: 'none',
    background: '#fffaf0'
  },
  textarea: {
    border: '1px solid #dec89f',
    borderRadius: '10px',
    padding: '10px 12px',
    outline: 'none',
    background: '#fffaf0',
    resize: 'vertical'
  },
  select: {
    border: '1px solid #dec89f',
    borderRadius: '10px',
    padding: '10px 12px',
    outline: 'none',
    background: '#fffaf0',
    cursor: 'pointer'
  },
  inputError: {
    borderColor: '#d97777',
    boxShadow: '0 0 0 3px rgba(217, 119, 119, 0.18)'
  },
  fieldError: {
    color: '#a11f1f',
    fontSize: '12px',
    fontWeight: '700'
  },
  photoRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  photoPreview: {
    marginTop: '8px',
    width: '180px',
    height: '180px',
    objectFit: 'cover',
    borderRadius: '12px',
    border: '1px solid #e2d4c3'
  },
  destGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '10px'
  },
  destChip: {
    border: '1px solid #ead8bb',
    background: '#fffaf0',
    borderRadius: '12px',
    padding: '10px 12px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    alignItems: 'center',
    boxShadow: '0 8px 18px rgba(44, 25, 14, 0.06)'
  },
  destChipActive: {
    borderColor: '#3D0A0A',
    background: 'linear-gradient(180deg, rgba(61,10,10,0.10) 0%, rgba(224,123,57,0.12) 100%)'
  },
  destName: {
    fontWeight: '800',
    color: '#2f2214'
  },
  destPrice: {
    fontWeight: '800',
    color: '#6d5842'
  },
  muted: {
    color: '#6d5842',
    fontSize: '12px'
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end'
  },
  primaryBtn: {
    border: 'none',
    background: '#3D0A0A',
    color: '#fff',
    borderRadius: '10px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: '800'
  },
  secondaryBtn: {
    border: 'none',
    background: '#E07B39',
    color: '#fff',
    borderRadius: '10px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: '800'
  },
  ghostBtn: {
    border: '1px solid #dec89f',
    background: '#fff',
    borderRadius: '10px',
    padding: '9px 12px',
    cursor: 'pointer',
    fontWeight: '800',
    color: '#5d4122'
  },
  listHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: '12px',
    flexWrap: 'wrap'
  },
  filters: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  grid: {
    marginTop: '12px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '12px'
  },
  guideCard: {
    border: '1px solid #ead8bb',
    borderRadius: '16px',
    overflow: 'hidden',
    background: '#fffaf0',
    boxShadow: '0 12px 26px rgba(44, 25, 14, 0.09)'
  },
  guideBanner: {
    position: 'relative',
    height: '150px',
    background: 'linear-gradient(120deg, #3D0A0A 0%, #E07B39 100%)'
  },
  bannerImg: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  bannerFallback: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    color: '#fff',
    fontSize: '46px',
    fontWeight: '900',
    fontFamily: 'Georgia, serif'
  },
  bannerOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%)'
  },
  bannerText: {
    position: 'absolute',
    left: '12px',
    right: '12px',
    bottom: '10px',
    color: '#fff'
  },
  guideName: {
    margin: 0,
    fontFamily: 'Georgia, serif',
    letterSpacing: '0.3px'
  },
  guideMeta: {
    marginTop: '6px',
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap'
  },
  badge: {
    padding: '5px 9px',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.16)',
    border: '1px solid rgba(255,255,255,0.24)',
    fontSize: '11px',
    fontWeight: '800'
  },
  badgeOk: {
    background: 'rgba(16,185,129,0.18)',
    borderColor: 'rgba(16,185,129,0.35)'
  },
  badgeWarn: {
    background: 'rgba(245,158,11,0.16)',
    borderColor: 'rgba(245,158,11,0.32)'
  },
  guideBody: {
    padding: '12px'
  },
  kvRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginBottom: '10px'
  },
  kBlock: {
    marginBottom: '10px'
  },
  kLabel: {
    color: '#6d5842',
    fontSize: '11px',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.8px'
  },
  kValue: {
    color: '#2f2214',
    fontWeight: '800'
  },
  bioText: {
    marginTop: '4px',
    color: '#4b3b2a',
    lineHeight: 1.45
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    flexWrap: 'wrap'
  }
};

export default AdminGuideManagement;
