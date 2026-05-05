import React from 'react';
import PublicNavbar from '../components/PublicNavbar';

const NEARBY_PLACES = [
  {
    name: 'Hanuman Lake',
    distance: '2 km',
    description: 'There are two main temples on the lake, Hanuman Temple and Anjani Mata Temple. Long ago there was an ashram of sage Jabhalya here.',
    icon: '🌊'
  },
  {
    name: 'Gupta Bheem & Sakshi-Vinayak',
    distance: '2 km',
    description: 'A small temple of Lord Ganesha and a small waterfall where water keeps falling on the Shivalinga continuously.',
    icon: '💦'
  },
  {
    name: 'Mumbai Point',
    distance: '100 m',
    description: 'Offers an amazing view of the Konkan from a height of 3000 feet.',
    icon: '🌅'
  },
  {
    name: 'Mahadev Van',
    distance: '500 m',
    description: 'A large garden with various types of plants. Features Vanaspati Point which offers stunning natural views.',
    icon: '🌳'
  },
  {
    name: 'Hawthorn (Nagfani) Point',
    distance: '500 m from Hanuman Lake',
    description: 'Offers a beautiful panoramic view of the Konkan region and Kalavantin Palace.',
    icon: '⛰️'
  },
  {
    name: 'Bhima River Source',
    distance: '50 m',
    description: 'A small Kund (water well) which is the actual starting point of the Bhima River.',
    icon: '💧'
  },
  {
    name: 'Kondhwal Waterfall',
    distance: '5-6 km',
    description: 'Also known as "Bird Point". A variety of rare birds are present here in the Bhimashankar Wildlife Sanctuary.',
    icon: '🦆'
  },
  {
    name: 'Koteshwar Mahadev',
    distance: '6-7 km',
    description: 'A temple of Lord Shiva in the village Bhorgiri, accessible through a scenic forest trekking route.',
    icon: '🛕'
  }
];

const NearbyPlaces = () => {
  return (
    <div style={styles.wrapper}>
      <PublicNavbar />
      
      <div style={styles.header}>
        <h1 style={styles.title}>Explore Nearby Attractions</h1>
        <p style={styles.subtitle}>Discover the natural beauty and spiritual sites surrounding Shri Bhimashankar.</p>
      </div>

      <div style={styles.container}>
        <div style={styles.grid}>
          {NEARBY_PLACES.map((place, index) => (
            <div key={index} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.icon}>{place.icon}</span>
                <div style={styles.cardTitleBox}>
                  <h3 style={styles.placeName}>{place.name}</h3>
                  <span style={styles.distanceBadge}>{place.distance}</span>
                </div>
              </div>
              <p style={styles.description}>{place.description}</p>
            </div>
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
    padding: '25px', 
    borderRadius: '16px', 
    boxShadow: '0 6px 20px rgba(94, 63, 32, 0.08)', 
    border: '1px solid #f0e6d3',
    transition: 'transform 0.2s'
  },
  cardHeader: { display: 'flex', alignItems: 'flex-start', gap: '15px', marginBottom: '15px' },
  icon: { fontSize: '32px' },
  cardTitleBox: { flex: 1 },
  placeName: { margin: '0 0 6px', fontSize: '20px', color: '#3D0A0A', fontWeight: 'bold' },
  distanceBadge: { display: 'inline-block', backgroundColor: '#f4ecdf', color: '#88311d', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', fontFamily: 'Calibri, sans-serif' },
  description: { margin: 0, fontSize: '15px', color: '#5e4324', fontFamily: 'Calibri, sans-serif', lineHeight: '1.6' },

  footer: { backgroundColor: '#3D0A0A', color: '#f0e6d3', textAlign: 'center', padding: '40px 20px', marginTop: 'auto' },
  footerOm: { fontSize: '22px', color: '#E8C97A', marginBottom: '4px', fontWeight: 700 },
  footerTitle: { fontSize: '22px', fontWeight: '700', color: '#E8C97A', letterSpacing: '3px', marginBottom: '8px' },
  footerSub: { fontSize: '13px', color: '#c8a96e', marginBottom: '6px', fontFamily: 'Calibri, sans-serif' },
  footerCopy: { fontSize: '12px', color: '#a08060', fontFamily: 'Calibri, sans-serif' }
};

export default NearbyPlaces;
