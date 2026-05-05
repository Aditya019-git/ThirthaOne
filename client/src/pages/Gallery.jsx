import React from 'react';
import PublicNavbar from '../components/PublicNavbar';

const PROFILE_GALLERY_IMAGES = [
  {
    src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Devotees_at_Kedarnath_temple%2C_Uttrakhand_01.jpg',
    title: 'Devotees in Darshan Queue'
  },
  {
    src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Devotees_at_Kedarnath_temple%2C_Uttrakhand_02.jpg',
    title: 'Pilgrims During Temple Visit'
  },
  {
    src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bhimashankar_temple_front.jpg',
    title: 'Bhimashankar Temple View'
  },
  {
    src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bhimashankar_temple%2C_Maharashtra.JPG',
    title: 'Sacred Architecture'
  },
  {
    src: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Bhimashankar_Temple_Pune_MH_India.jpg',
    title: 'Temple Stone Architecture'
  },
  {
    src: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Bhimashankar_Jyotirlinga_Temple.jpg',
    title: 'Jyotirlinga Shrine'
  }
];

const Gallery = () => {
  return (
    <div style={styles.wrapper}>
      <PublicNavbar />
      
      <div style={styles.header}>
        <h1 style={styles.title}>Temple & Devotee Gallery</h1>
        <p style={styles.subtitle}>Inspiration for your upcoming darshan journey.</p>
      </div>

      <div style={styles.container}>
        <div style={styles.grid}>
          {PROFILE_GALLERY_IMAGES.map((item, idx) => (
            <article key={idx} style={styles.card}>
              <img src={item.src} alt={item.title} style={styles.image} loading="lazy" />
              <div style={styles.caption}>{item.title}</div>
            </article>
          ))}
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
  
  container: { maxWidth: '1100px', margin: '0 auto', padding: '50px 20px', flex: 1, width: '100%' },
  
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px' },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: '16px', 
    overflow: 'hidden',
    boxShadow: '0 6px 20px rgba(94, 63, 32, 0.08)', 
    border: '1px solid #f0e6d3',
    transition: 'transform 0.2s'
  },
  image: {
    width: '100%',
    height: '240px',
    objectFit: 'cover',
    display: 'block'
  },
  caption: {
    padding: '15px',
    color: '#39291c',
    fontSize: '16px',
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'Calibri, sans-serif'
  },

  footer: { backgroundColor: '#3D0A0A', color: '#f0e6d3', textAlign: 'center', padding: '40px 20px', marginTop: 'auto' },
  footerOm: { fontSize: '22px', color: '#E8C97A', marginBottom: '4px', fontWeight: 700 },
  footerTitle: { fontSize: '22px', fontWeight: '700', color: '#E8C97A', letterSpacing: '3px', marginBottom: '8px' },
  footerSub: { fontSize: '13px', color: '#c8a96e', marginBottom: '6px', fontFamily: 'Calibri, sans-serif' },
  footerCopy: { fontSize: '12px', color: '#a08060', fontFamily: 'Calibri, sans-serif' }
};

export default Gallery;
