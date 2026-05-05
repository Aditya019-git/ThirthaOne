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
  upiId: '',
  upiName: '',
  bankAccountName: '',
  bankName: '',
  bankAccountNumber: '',
  bankIfsc: '',
  photoDataUrl: '',
  bio: ''
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
  const age = Number(form.age);
  const yearsExperience = Number(form.yearsExperience || 0);
  const upiId = String(form.upiId || '').trim();
  const bio = String(form.bio || '').trim();

  if (name.length < 3) errors.name = 'Name must be at least 3 characters.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
  if (!/^\d{10}$/.test(mobile)) errors.mobile = 'Mobile must be exactly 10 digits.';
  if (!Number.isFinite(age) || age < 18 || age > 90) errors.age = 'Age must be between 18 and 90.';
  if (!Number.isFinite(yearsExperience) || yearsExperience < 0 || yearsExperience > 70) {
    errors.yearsExperience = 'Experience must be between 0 and 70 years.';
  }
  if (!upiId || upiId.length < 6 || upiId.length > 80 || !upiId.includes('@')) {
    errors.upiId = 'UPI ID is required (example: name@bank).';
  }
  if (bio.length > 500) errors.bio = 'Bio must be 500 characters or less.';

  return errors;
};

const AdminPriestManagement = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [priests, setPriests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [verifiedFilter, setVerifiedFilter] = useState('all');
  const [editId, setEditId] = useState(null);

  const loadPriests = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/priest/admin/priests');
      setPriests(Array.isArray(res.data?.priests) ? res.data.priests : []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load priest list.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPriests();
  }, []);

  const priestStats = useMemo(() => ({
    total: priests.length,
    active: priests.filter((item) => item.isActive).length,
    verified: priests.filter((item) => item.isVerified).length
  }), [priests]);

  const filteredPriests = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return priests.filter((item) => {
      const name = String(item.name || '').toLowerCase();
      const email = String(item.email || '').toLowerCase();
      const mobile = String(item.mobile || '').toLowerCase();
      const matchesSearch = !q || name.includes(q) || email.includes(q) || mobile.includes(q);
      const matchesActive = activeFilter === 'all'
        || (activeFilter === 'active' && item.isActive)
        || (activeFilter === 'inactive' && !item.isActive);
      const matchesVerified = verifiedFilter === 'all'
        || (verifiedFilter === 'verified' && item.isVerified)
        || (verifiedFilter === 'unverified' && !item.isVerified);
      return matchesSearch && matchesActive && matchesVerified;
    });
  }, [priests, searchTerm, activeFilter, verifiedFilter]);

  const setFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
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

  const handleSavePriest = async (e) => {
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
        age: Number(form.age),
        yearsExperience: Number(form.yearsExperience || 0),
        mobile: String(form.mobile || '').replace(/\D/g, ''),
        name: String(form.name || '').trim(),
        email: String(form.email || '').trim().toLowerCase(),
        bio: String(form.bio || '').trim(),
        upiId: String(form.upiId || '').trim(),
        upiName: String(form.upiName || '').trim(),
        bankDetails: {
          accountName: String(form.bankAccountName || '').trim(),
          bankName: String(form.bankName || '').trim(),
          accountNumber: String(form.bankAccountNumber || '').trim(),
          ifsc: String(form.bankIfsc || '').trim().toUpperCase()
        }
      };

      if (editId) {
        const res = await API.patch(`/priest/admin/priests/${editId}`, payload);
        setMessage(res.data?.message || 'Priest updated successfully.');
      } else {
        const res = await API.post('/priest/admin/priests', payload);
        setMessage(res.data?.message || 'Priest added successfully.');
      }

      setForm(emptyForm);
      setFormErrors({});
      setEditId(null);
      await loadPriests();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(getApiErrorMessage(err, editId ? 'Unable to update priest.' : 'Unable to add priest.'));
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (item) => {
    setEditId(item.id);
    setForm({
      name: item.name || '',
      email: item.email || '',
      mobile: item.mobile || '',
      age: item.age || '',
      yearsExperience: item.yearsExperience || '',
      upiId: item.upiId || '',
      upiName: item.upiName || '',
      bankAccountName: item.bankDetails?.accountName || '',
      bankName: item.bankDetails?.bankName || '',
      bankAccountNumber: item.bankDetails?.accountNumber || '',
      bankIfsc: item.bankDetails?.ifsc || '',
      photoDataUrl: item.photoUrl || '',
      bio: item.bio || ''
    });
    setFormErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleActive = async (item) => {
    setError('');
    setMessage('');
    try {
      await API.patch(`/priest/admin/priests/${item.id}`, {
        isActive: !item.isActive
      });
      setMessage(`Priest ${item.name} is now ${!item.isActive ? 'active' : 'inactive'}.`);
      await loadPriests();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to update priest status.'));
    }
  };

  const toggleVerified = async (item) => {
    setError('');
    setMessage('');
    try {
      await API.patch(`/priest/admin/priests/${item.id}`, {
        isVerified: !item.isVerified
      });
      setMessage(`Priest ${item.name} verification updated.`);
      await loadPriests();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to update priest verification.'));
    }
  };

  const handleDeletePriest = async () => {
    if (!editId) return;
    if (!window.confirm('Are you sure you want to completely delete this priest? This action cannot be undone.')) return;
    
    setError('');
    setMessage('');
    setSaving(true);
    try {
      await API.delete(`/priest/admin/priests/${editId}`);
      setMessage('Priest deleted successfully.');
      setForm(emptyForm);
      setFormErrors({});
      setEditId(null);
      await loadPriests();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to delete priest.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <section style={styles.hero}>
          <h1 style={styles.heroTitle}>Verified Priest Management</h1>
          <p style={styles.heroSub}>Manage and onboard verified temple priests.</p>
        </section>

        <section style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Priests</div>
            <div style={styles.statValue}>{priestStats.total}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Active</div>
            <div style={styles.statValue}>{priestStats.active}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Verified</div>
            <div style={styles.statValue}>{priestStats.verified}</div>
          </div>
        </section>

        {error && <div style={styles.errorBox}>{error}</div>}
        {message && <div style={styles.successBox}>{message}</div>}

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>{editId ? 'Edit Priest Profile' : 'Add Verified Priest'}</h2>
          <p style={styles.metaNote}>
            Priest self-registration is blocked. Only admin can onboard verified priests.
          </p>

          <form onSubmit={handleSavePriest}>
            <div style={styles.grid}>
              <div>
                <input
                  style={{ ...styles.input, ...(formErrors.name ? styles.inputError : {}) }}
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => setFormField('name', e.target.value)}
                  required
                />
                {formErrors.name && <p style={styles.fieldError}>{formErrors.name}</p>}
              </div>
              <div>
                <input
                  style={{ ...styles.input, ...(formErrors.email ? styles.inputError : {}) }}
                  placeholder="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setFormField('email', e.target.value)}
                  required
                />
                {formErrors.email && <p style={styles.fieldError}>{formErrors.email}</p>}
              </div>
              <div>
                <input
                  style={{ ...styles.input, ...(formErrors.mobile ? styles.inputError : {}) }}
                  placeholder="Mobile (10 digits)"
                  value={form.mobile}
                  maxLength={10}
                  onChange={(e) => setFormField('mobile', e.target.value.replace(/\D/g, ''))}
                  required
                />
                {formErrors.mobile && <p style={styles.fieldError}>{formErrors.mobile}</p>}
              </div>
              <div>
                <input
                  style={{ ...styles.input, ...(formErrors.upiId ? styles.inputError : {}) }}
                  placeholder="UPI ID (example@bank)"
                  value={form.upiId}
                  onChange={(e) => setFormField('upiId', e.target.value)}
                  required
                />
                {formErrors.upiId && <p style={styles.fieldError}>{formErrors.upiId}</p>}
              </div>
              <div>
                <input
                  style={styles.input}
                  placeholder="UPI Payee Name (optional)"
                  value={form.upiName}
                  onChange={(e) => setFormField('upiName', e.target.value)}
                />
              </div>
              <div>
                <input
                  style={{ ...styles.input, ...(formErrors.age ? styles.inputError : {}) }}
                  placeholder="Age"
                  type="number"
                  value={form.age}
                  onChange={(e) => setFormField('age', e.target.value)}
                  required
                />
                {formErrors.age && <p style={styles.fieldError}>{formErrors.age}</p>}
              </div>
              <div>
                <input
                  style={{ ...styles.input, ...(formErrors.yearsExperience ? styles.inputError : {}) }}
                  placeholder="Years Experience"
                  type="number"
                  value={form.yearsExperience}
                  onChange={(e) => setFormField('yearsExperience', e.target.value)}
                />
                {formErrors.yearsExperience && <p style={styles.fieldError}>{formErrors.yearsExperience}</p>}
              </div>
              <div>
                <input
                  style={styles.input}
                  placeholder="Bank Account Name (optional)"
                  value={form.bankAccountName}
                  onChange={(e) => setFormField('bankAccountName', e.target.value)}
                />
              </div>
              <div>
                <input
                  style={styles.input}
                  placeholder="Bank Name (optional)"
                  value={form.bankName}
                  onChange={(e) => setFormField('bankName', e.target.value)}
                />
              </div>
              <div>
                <input
                  style={styles.input}
                  placeholder="Bank Account Number (optional)"
                  value={form.bankAccountNumber}
                  onChange={(e) => setFormField('bankAccountNumber', e.target.value)}
                />
              </div>
              <div>
                <input
                  style={styles.input}
                  placeholder="IFSC (optional)"
                  value={form.bankIfsc}
                  onChange={(e) => setFormField('bankIfsc', e.target.value)}
                />
              </div>
              <label style={styles.uploadLabel}>
                <span style={styles.uploadTitle}>Priest Photo</span>
                <input
                  style={styles.hiddenFile}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoPick}
                />
                <span style={styles.uploadBtn}>
                  {uploadingPhoto ? 'Processing...' : form.photoDataUrl ? 'Change Photo' : 'Upload Photo'}
                </span>
              </label>
            </div>

            {form.photoDataUrl ? (
              <div style={styles.previewWrap}>
                <img src={form.photoDataUrl} alt="Priest preview" style={styles.previewImage} />
                <button
                  type="button"
                  style={styles.clearPhotoBtn}
                  onClick={() => setFormField('photoDataUrl', '')}
                >
                  Remove Photo
                </button>
              </div>
            ) : null}

            <textarea
              style={{ ...styles.textArea, ...(formErrors.bio ? styles.inputError : {}) }}
              placeholder="Short bio (max 500 chars)"
              value={form.bio}
              onChange={(e) => setFormField('bio', e.target.value)}
            />
            {formErrors.bio && <p style={styles.fieldError}>{formErrors.bio}</p>}

            <button style={styles.submitBtn} type="submit" disabled={saving || uploadingPhoto}>
              {saving ? 'Saving...' : editId ? 'Update Priest' : 'Add Priest'}
            </button>
            {editId && (
              <>
                <button
                  type="button"
                  style={{ ...styles.submitBtn, background: '#6d5842', marginLeft: '10px' }}
                  onClick={() => {
                    setEditId(null);
                    setForm(emptyForm);
                    setFormErrors({});
                  }}
                >
                  Cancel Edit
                </button>
                <button
                  type="button"
                  style={{ ...styles.submitBtn, background: '#a11f1f', marginLeft: '10px' }}
                  onClick={handleDeletePriest}
                  disabled={saving}
                >
                  Delete Priest
                </button>
              </>
            )}
          </form>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Priest Template List</h2>

          <div style={styles.filterRow}>
            <input
              style={styles.filterInput}
              placeholder="Search by name, email, mobile"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select style={styles.filterSelect} value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
              <option value="all">All Activity</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
            <select style={styles.filterSelect} value={verifiedFilter} onChange={(e) => setVerifiedFilter(e.target.value)}>
              <option value="all">All Verification</option>
              <option value="verified">Verified Only</option>
              <option value="unverified">Unverified Only</option>
            </select>
          </div>
          <p style={styles.resultMeta}>Showing {filteredPriests.length} priest(s)</p>

          {loading && <div style={styles.infoBox}>Loading priests...</div>}
          {!loading && priests.length === 0 && (
            <div style={styles.infoBox}>No priests added yet.</div>
          )}
          {!loading && priests.length > 0 && filteredPriests.length === 0 && (
            <div style={styles.infoBox}>No priests matched your filters.</div>
          )}
          {!loading && filteredPriests.length > 0 && (
            <div style={styles.priestGrid}>
              {filteredPriests.map((item) => (
                <article key={item.id} style={styles.priestCard}>
                  <div style={styles.cardHead}>
                    <img
                      src={item.photoUrl || 'https://placehold.co/240x170/ece2d4/7f6342?text=Priest'}
                      alt={item.name}
                      style={styles.photo}
                    />
                    <div style={styles.cardHeadInfo}>
                      <h3 style={styles.priestName}>{item.name}</h3>
                      <div style={styles.badgeRow}>
                        <span style={item.isActive ? styles.badgeActive : styles.badgeInactive}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span style={item.isVerified ? styles.badgeVerified : styles.badgeUnverified}>
                          {item.isVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                      <p style={styles.metaStrong}>{item.yearsExperience || 0} years experience</p>
                    </div>
                  </div>

                  <div style={styles.detailList}>
                    <p style={styles.meta}><strong>Age:</strong> {item.age}</p>
                    <p style={styles.meta}><strong>Email:</strong> {item.email || '-'}</p>
                    <p style={styles.meta}><strong>Mobile:</strong> {item.mobile || '-'}</p>
                    <p style={styles.meta}><strong>UPI:</strong> {item.upiId || '-'}</p>
                  </div>

                  <div style={styles.actionRow}>
                    <button style={{...styles.verifyBtn, gridColumn: '1 / -1'}} type="button" onClick={() => handleEditClick(item)}>
                      Edit
                    </button>
                    <button style={styles.verifyBtn} type="button" onClick={() => toggleVerified(item)}>
                      {item.isVerified ? 'Unverify' : 'Verify'}
                    </button>
                    <button style={styles.toggleBtn} type="button" onClick={() => toggleActive(item)}>
                      {item.isActive ? 'Deactivate' : 'Activate'}
                    </button>
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
    background: 'linear-gradient(130deg, #f8f1e6 0%, #f4ecdf 55%, #efe6d9 100%)',
    padding: '24px'
  },
  container: {
    maxWidth: '1100px',
    margin: '0 auto'
  },
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
    fontFamily: 'Georgia, serif'
  },
  heroSub: {
    margin: 0,
    opacity: 0.92,
    fontSize: '16px',
    color: '#fcfaf7'
  },
  backBtn: {
    border: '1px solid #d9c4a3',
    background: '#fff8ed',
    color: '#5e3f20',
    borderRadius: '8px',
    padding: '8px 12px',
    cursor: 'pointer'
  },
  statsRow: {
    marginTop: '12px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '10px'
  },
  statCard: {
    border: '1px solid #E8C97A',
    borderRadius: '12px',
    background: '#fff',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(61, 10, 10, 0.08)'
  },
  statLabel: {
    fontSize: '13px',
    color: '#6d5842',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statValue: {
    marginTop: '8px',
    fontSize: '28px',
    color: '#3D0A0A',
    fontWeight: 'bold'
  },
  section: {
    marginTop: '20px',
    background: '#fff',
    border: '1px solid #e2d5c3',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(61, 10, 10, 0.08)'
  },
  sectionTitle: {
    marginTop: 0,
    color: '#3D0A0A',
    fontSize: '18px',
    borderBottom: '2px solid #f0e6d3',
    paddingBottom: '10px',
    marginBottom: '15px'
  },
  metaNote: {
    margin: '0 0 15px',
    color: '#6d5842',
    fontSize: '14px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '15px'
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #c8a96e',
    borderRadius: '8px',
    padding: '12px',
    fontFamily: 'inherit',
    outlineColor: '#3D0A0A'
  },
  inputError: {
    borderColor: '#d24343',
    background: '#fff7f7'
  },
  fieldError: {
    margin: '5px 0 0',
    color: '#aa2c2c',
    fontSize: '12px'
  },
  uploadLabel: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    border: '1px dashed #E8C97A',
    borderRadius: '8px',
    padding: '10px',
    minHeight: '44px'
  },
  uploadTitle: {
    color: '#6d5842',
    fontSize: '12px',
    marginBottom: '6px'
  },
  hiddenFile: {
    display: 'none'
  },
  uploadBtn: {
    display: 'inline-block',
    border: '1px solid #E8C97A',
    background: '#fcfaf7',
    color: '#3D0A0A',
    borderRadius: '7px',
    padding: '7px 9px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    width: 'fit-content'
  },
  previewWrap: {
    marginTop: '10px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    flexWrap: 'wrap'
  },
  previewImage: {
    width: '150px',
    height: '110px',
    objectFit: 'cover',
    borderRadius: '8px',
    border: '1px solid #dfceb8'
  },
  clearPhotoBtn: {
    border: '1px solid #d6b09a',
    background: '#fff3ed',
    color: '#7b2f16',
    borderRadius: '8px',
    padding: '8px 10px',
    cursor: 'pointer'
  },
  textArea: {
    marginTop: '15px',
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #c8a96e',
    borderRadius: '8px',
    padding: '12px',
    minHeight: '80px',
    resize: 'vertical',
    fontFamily: 'inherit',
    outlineColor: '#3D0A0A'
  },
  submitBtn: {
    marginTop: '15px',
    border: 'none',
    background: '#3D0A0A',
    color: '#fff',
    borderRadius: '8px',
    padding: '12px 18px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px'
  },
  filterRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(200px, 1fr) 180px 180px',
    gap: '10px'
  },
  filterInput: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #c8a96e',
    borderRadius: '8px',
    padding: '12px',
    fontFamily: 'inherit',
    outlineColor: '#3D0A0A'
  },
  filterSelect: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #c8a96e',
    borderRadius: '8px',
    padding: '12px',
    background: '#fff',
    fontFamily: 'inherit',
    outlineColor: '#3D0A0A'
  },
  resultMeta: {
    margin: '10px 0 0',
    color: '#6d563f',
    fontSize: '13px',
    fontWeight: '700'
  },
  infoBox: {
    marginTop: '10px',
    border: '1px solid #d6e2f4',
    background: '#f2f7ff',
    color: '#1f4e8c',
    borderRadius: '10px',
    padding: '10px'
  },
  errorBox: {
    marginTop: '10px',
    border: '1px solid #efb7b7',
    background: '#fff1f1',
    color: '#a11f1f',
    borderRadius: '10px',
    padding: '10px'
  },
  successBox: {
    marginTop: '10px',
    border: '1px solid #a8deb7',
    background: '#f0fbf4',
    color: '#166534',
    borderRadius: '10px',
    padding: '10px'
  },
  priestGrid: {
    marginTop: '10px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px'
  },
  priestCard: {
    border: '1px solid #E8C97A',
    borderRadius: '12px',
    background: '#fff',
    padding: '16px',
    boxShadow: '0 4px 12px rgba(61, 10, 10, 0.08)',
    display: 'flex',
    flexDirection: 'column'
  },
  cardHead: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  cardHeadInfo: {
    minWidth: 0,
    flex: 1
  },
  photo: {
    width: '104px',
    height: '104px',
    borderRadius: '8px',
    objectFit: 'cover',
    objectPosition: 'center top',
    border: '1px solid #ddccb5'
  },
  priestName: {
    margin: '0 0 4px',
    color: '#2f1f11'
  },
  badgeRow: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    marginBottom: '6px'
  },
  badgeActive: {
    border: '1px solid #b7e0c8',
    background: '#ecfff3',
    color: '#17613a',
    borderRadius: '999px',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: '700'
  },
  badgeInactive: {
    border: '1px solid #efc1c1',
    background: '#fff2f2',
    color: '#9f2121',
    borderRadius: '999px',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: '700'
  },
  badgeVerified: {
    border: '1px solid #b8d0f0',
    background: '#eef5ff',
    color: '#1f4e8c',
    borderRadius: '999px',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: '700'
  },
  badgeUnverified: {
    border: '1px solid #e4d8be',
    background: '#fff8ea',
    color: '#8a6b2a',
    borderRadius: '999px',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: '700'
  },
  metaStrong: {
    margin: 0,
    color: '#6b4e31',
    fontSize: '12px',
    fontWeight: '700'
  },
  detailList: {
    marginTop: '10px',
    borderTop: '1px dashed #e7d8c3',
    paddingTop: '8px'
  },
  meta: {
    margin: '3px 0',
    color: '#735c45',
    fontSize: '13px'
  },
  actionRow: {
    marginTop: 'auto',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px'
  },
  toggleBtn: {
    border: 'none',
    borderRadius: '8px',
    background: '#3D0A0A',
    color: '#fff',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: '700'
  },
  verifyBtn: {
    border: '1px solid #E8C97A',
    borderRadius: '8px',
    background: '#fcfaf7',
    color: '#3D0A0A',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: '700'
  }
};

export default AdminPriestManagement;
