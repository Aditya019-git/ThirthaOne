import React from 'react';
import PublicNavbar from '../components/PublicNavbar';

const Contact = () => {
  return (
    <div style={styles.wrapper}>
      <PublicNavbar />
      
      <div style={styles.header}>
        <h1 style={styles.title}>Contact Us</h1>
        <p style={styles.subtitle}>Get in touch with the temple administration for queries and assistance.</p>
      </div>

      <div style={styles.container}>
        <div style={styles.grid}>
          
          <div style={styles.card}>
            <div style={styles.iconWrapper}>📍</div>
            <h3 style={styles.cardTitle}>Temple Address</h3>
            <p style={styles.cardText}>
              Shri Kshetra Bhimashankar,<br />
              Taluka Khed, District Pune,<br />
              Maharashtra, India - 410509
            </p>
          </div>

          <div style={styles.card}>
            <div style={styles.iconWrapper}>📞</div>
            <h3 style={styles.cardTitle}>Phone Number</h3>
            <p style={styles.cardText}>
              For urgent queries or support regarding passes:<br />
              <strong>+91 8010950940</strong>
            </p>
          </div>

          <div style={styles.card}>
            <div style={styles.iconWrapper}>✉️</div>
            <h3 style={styles.cardTitle}>Email Address</h3>
            <p style={styles.cardText}>
              For general inquiries or feedback:<br />
              <strong>adityapande019@gmail.com</strong>
            </p>
          </div>

        </div>

        {/* Optional Map Placeholder */}
        <div style={styles.mapContainer}>
          <h2 style={styles.sectionTitle}>Location Map</h2>
          <div style={styles.mapPlaceholder}>
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d115166.74459020953!2d73.47350711928956!3d19.07185013098553!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be2cecaab68b695%3A0xc5f8cfb53e7d56e7!2sBhimashankar%20Temple!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin" 
              width="100%" 
              height="100%" 
              style={{ border: 0, borderRadius: '12px' }} 
              allowFullScreen="" 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              title="Bhimashankar Temple Map"
            />
          </div>
        </div>
      </div>

      <footer style={styles.footer}>
        <div style={styles.footerOm}>{'\u0950'}</div>
        <div style={styles.footerTitle}>TirthOne</div>
        <p style={styles.footerSub}>Official VIP Darshan Pass Portal for Bhimashankar Jyotirlinga</p>
        <p style={styles.footerCopy}>Copyright 2025 TirthOne</p>
      </footer>
    </div>
  );
};

const styles = {
  wrapper: { fontFamily: "'Georgia', serif", margin: 0, padding: 0, backgroundColor: '#fcfaf7', minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  header: {
    backgroundColor: '#6B1010',
    backgroundImage: 'radial-gradient(ellipse at center, #8B1A1A 0%, #4A0808 100%)',
    padding: '60px 20px',
    textAlign: 'center',
    color: '#fff'
  },
  title: { fontSize: '42px', fontWeight: '800', margin: '0 0 10px', color: '#E8C97A', letterSpacing: '1px' },
  subtitle: { fontSize: '18px', color: '#f0d9b5', fontFamily: 'Calibri, sans-serif', maxWidth: '600px', margin: '0 auto' },
  
  container: { maxWidth: '1000px', margin: '0 auto', padding: '40px 20px', flex: 1, width: '100%' },
  
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '50px' },
  card: { backgroundColor: '#fff', padding: '30px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #f0e6d3' },
  iconWrapper: { fontSize: '40px', marginBottom: '15px' },
  cardTitle: { margin: '0 0 12px', fontSize: '20px', color: '#3D0A0A' },
  cardText: { margin: 0, fontSize: '15px', color: '#5e4324', fontFamily: 'Calibri, sans-serif', lineHeight: '1.6' },

  mapContainer: { marginTop: '20px' },
  sectionTitle: { fontSize: '28px', color: '#3D0A0A', borderBottom: '2px solid #E8C97A', paddingBottom: '10px', marginBottom: '20px' },
  mapPlaceholder: { width: '100%', height: '400px', backgroundColor: '#e8e0d3', borderRadius: '12px', overflow: 'hidden' },

  footer: { backgroundColor: '#3D0A0A', color: '#f0e6d3', textAlign: 'center', padding: '40px 20px', marginTop: 'auto' },
  footerOm: { fontSize: '22px', color: '#E8C97A', marginBottom: '4px', fontWeight: 700 },
  footerTitle: { fontSize: '22px', fontWeight: '700', color: '#E8C97A', letterSpacing: '3px', marginBottom: '8px' },
  footerSub: { fontSize: '13px', color: '#c8a96e', marginBottom: '6px', fontFamily: 'Calibri, sans-serif' },
  footerCopy: { fontSize: '12px', color: '#a08060', fontFamily: 'Calibri, sans-serif' }
};

export default Contact;
