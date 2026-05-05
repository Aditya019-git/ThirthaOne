import React from 'react';
import PublicNavbar from '../components/PublicNavbar';

const About = () => {
  return (
    <div style={styles.wrapper}>
      <PublicNavbar />
      
      <div style={styles.header}>
        <h1 style={styles.title}>About Shri Bhimashankar Jyotirlinga</h1>
        <p style={styles.subtitle}>Discover the rich history, architecture, and sacred schedule of the temple.</p>
      </div>

      <div style={styles.container}>
        {/* History Section */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>History & Significance</h2>
          <div style={styles.contentBox}>
            <p style={styles.paragraph}>
              Bhimashankar Temple is a Jyotirlinga shrine located 50 km northwest of Khed, near Pune, in India. It is located 127 km from Shivaji Nagar (Pune) in the Ghat region of the Sahyadri hills. Bhimashankar is also the source of the river Bhima, which flows southeast and merges with the Krishna river near Raichur.
            </p>
            <p style={styles.paragraph}>
              According to the Shiva Purana, Lord Shiva took an incarnation in the form of Bhimashankar to destroy the demon Tripurasura. After the battle, on the request of the Gods, Lord Shiva manifested himself in the form of the Bhimashankar Jyotirlinga for the well-being of the universe.
            </p>
          </div>
        </section>

        {/* Architecture Section */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Architecture</h2>
          <div style={styles.contentBox}>
            <p style={styles.paragraph}>
              The temple is a composite of old and the new structures in the Nagara style of architecture. It is a modest yet graceful temple and it dates back to the 13th century. The shikhara (spire) was built by Nana Phadnavis.
            </p>
            <p style={styles.paragraph}>
              The temple boasts exquisite carvings of divine and human beings on the pillars and the doorframes. The deeply intricate craftsmanship on the stones is a testament to the ancient Indian architectural brilliance, specifically reflecting the Hemadpanthi style.
            </p>
          </div>
        </section>

        {/* Daily Schedule Section */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Daily Temple Schedule</h2>
          <div style={styles.tableCard}>
            <table style={styles.table}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #ead8bb' }}>
                  <td style={styles.tdTime}><strong>05:00 AM</strong></td>
                  <td style={styles.tdEvent}>Temple Opens</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ead8bb' }}>
                  <td style={styles.tdTime}><strong>05:00 AM – 05:30 AM</strong></td>
                  <td style={styles.tdEvent}>Morning Aarti</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ead8bb' }}>
                  <td style={styles.tdTime}><strong>05:30 AM – 12:00 PM</strong></td>
                  <td style={styles.tdEvent}>Darshan and Abhishek</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ead8bb' }}>
                  <td style={styles.tdTime}><strong>12:00 PM – 12:20 PM</strong></td>
                  <td style={styles.tdEvent}>Naivedyam Pooja (Bhog)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ead8bb' }}>
                  <td style={styles.tdTime}><strong>12:20 PM – 02:45 PM</strong></td>
                  <td style={styles.tdEvent}>Darshan and Abhishek</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ead8bb' }}>
                  <td style={styles.tdTime}><strong>02:45 PM – 03:20 PM</strong></td>
                  <td style={styles.tdEvent}>Afternoon Aarti</td>
                </tr>
                <tr>
                  <td style={styles.tdTime}><strong>03:20 PM – 07:30 PM</strong></td>
                  <td style={styles.tdEvent}>Evening Darshan</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Special Festivals Section */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Special Festivals & Ceremonies</h2>
          <div style={styles.tableCard}>
            <table style={styles.table}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #ead8bb' }}>
                  <td style={styles.tdTime}><strong>Mahashivratri</strong></td>
                  <td style={styles.tdEvent}>Mahaposhakha, Mahaarti and Palkhi ceremony of Shri is celebrated.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ead8bb' }}>
                  <td style={styles.tdTime}><strong>Shravan Maas</strong></td>
                  <td style={styles.tdEvent}>Special Abhishek, Mahapuja, and continuous Darshan throughout the holy month.</td>
                </tr>
                <tr>
                  <td style={styles.tdTime}><strong>Kartik Purnima</strong></td>
                  <td style={styles.tdEvent}>Deepotsav (Festival of Lights) and special lighting of the temple complex.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Trustees Section */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Board of Trustees</h2>
          <div style={styles.trusteeGrid}>
            <div style={styles.trusteeCard}>
              <h3 style={styles.trusteeName}>Shri. Advocate Suresh N. Kaudare</h3>
              <p style={styles.trusteeRole}>Chairman</p>
            </div>
            <div style={styles.trusteeCard}>
              <h3 style={styles.trusteeName}>Shri. Madhukar S. Gavande</h3>
              <p style={styles.trusteeRole}>Executive Trustee</p>
            </div>
            <div style={styles.trusteeCard}>
              <h3 style={styles.trusteeName}>Shri. Dattatray B. Kodilkar</h3>
              <p style={styles.trusteeRole}>Trustee</p>
            </div>
            <div style={styles.trusteeCard}>
              <h3 style={styles.trusteeName}>Shri. Ratnakar N. Kaudare</h3>
              <p style={styles.trusteeRole}>Trustee</p>
            </div>
          </div>
        </section>
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
  container: { maxWidth: '1000px', margin: '0 auto', padding: '40px 20px', flex: 1 },
  section: { marginBottom: '50px' },
  sectionTitle: { fontSize: '28px', color: '#3D0A0A', borderBottom: '2px solid #E8C97A', paddingBottom: '10px', marginBottom: '20px' },
  contentBox: { backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #f0e6d3' },
  paragraph: { fontSize: '16px', lineHeight: '1.8', color: '#4a3b2c', fontFamily: 'Calibri, sans-serif', marginBottom: '15px' },
  
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
    border: '1px solid #E8C97A',
    overflow: 'hidden'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  tdTime: {
    padding: '16px',
    width: '35%',
    color: '#3D0A0A',
    borderRight: '1px solid #ead8bb',
    fontFamily: 'Calibri, sans-serif'
  },
  tdEvent: {
    padding: '16px',
    color: '#4a3b2c',
    fontFamily: 'Calibri, sans-serif'
  },

  trusteeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' },
  trusteeCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.04)', border: '1px solid #f0e6d3' },
  trusteeName: { margin: '0 0 8px', fontSize: '16px', color: '#3D0A0A', fontWeight: 'bold' },
  trusteeRole: { margin: 0, fontSize: '14px', color: '#888', fontFamily: 'Calibri, sans-serif' },

  footer: { backgroundColor: '#3D0A0A', color: '#f0e6d3', textAlign: 'center', padding: '40px 20px', marginTop: 'auto' },
  footerOm: { fontSize: '22px', color: '#E8C97A', marginBottom: '4px', fontWeight: 700 },
  footerTitle: { fontSize: '22px', fontWeight: '700', color: '#E8C97A', letterSpacing: '3px', marginBottom: '8px' },
  footerSub: { fontSize: '13px', color: '#c8a96e', marginBottom: '6px', fontFamily: 'Calibri, sans-serif' },
  footerCopy: { fontSize: '12px', color: '#a08060', fontFamily: 'Calibri, sans-serif' }
};

export default About;
