const QR_INFO_CARDS = [
  {
    icon: '\uD83D\uDCCB',
    title: 'What to Carry',
    desc: 'Carry original Aadhaar card of the head member. All devotees must be present together at the VIP darshan gate for entry.'
  },
  {
    icon: '\uD83D\uDCF1',
    title: 'QR Pass Details',
    desc: "Your QR pass encodes devotee names, head member's Aadhaar (masked), booking date, slot, and booking ID."
  },
  {
    icon: '\u23F0',
    title: 'Arrival Time',
    desc: 'Arrive at least 30 minutes before your chosen darshan slot. Late arrivals may forfeit their VIP pass slot.'
  }
];

const QrInfoCards = () => {
  return (
    <section style={styles.infoSection}>
      {QR_INFO_CARDS.map((card, i) => (
        <div key={i} style={styles.infoCard}>
          <div style={styles.infoIcon}>{card.icon}</div>
          <h3 style={styles.infoTitle}>{card.title}</h3>
          <p style={styles.infoDesc}>{card.desc}</p>
        </div>
      ))}
    </section>
  );
};

const styles = {
  infoSection: {
    display: 'flex',
    gap: '24px',
    padding: '60px 40px',
    backgroundColor: '#fdf6ec',
    justifyContent: 'center',
    flexWrap: 'wrap',
    maxWidth: '1000px',
    margin: '0 auto'
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '28px',
    flex: '1',
    minWidth: '220px',
    maxWidth: '300px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
  },
  infoIcon: {
    fontSize: '36px',
    marginBottom: '16px'
  },
  infoTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: '10px'
  },
  infoDesc: {
    fontSize: '13px',
    color: '#666',
    lineHeight: '1.7',
    fontFamily: 'Calibri, sans-serif'
  }
};

export default QrInfoCards;
