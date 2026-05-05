import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import { 
  Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, 
  LinearScale, BarElement, Title, PointElement, LineElement, Filler
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  ArcElement, Tooltip, Legend, CategoryScale, LinearScale, 
  BarElement, Title, PointElement, LineElement, Filler
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [barChartData, setBarChartData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }),
    []
  );

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await API.get('/admin/metrics');
        setStats(res.data.stats);
        setChartData({
          labels: res.data.chartData.labels,
          datasets: [
            {
              label: 'Revenue',
              data: res.data.chartData.data,
              borderColor: '#E07B39',
              backgroundColor: 'rgba(224, 123, 57, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: '#E07B39'
            }
          ]
        });

        setBarChartData({
          labels: res.data.signupsData.labels,
          datasets: [
            {
              label: 'Sign-ups',
              data: res.data.signupsData.data,
              backgroundColor: '#3D0A0A',
              borderRadius: 4
            }
          ]
        });

        setTransactions(res.data.recentTransactions);
      } catch (err) {
        console.error('Failed to load metrics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  // Dynamic data for Pie chart (Bookings Ratio)
  const pieChartData = stats ? {
    labels: ['Visited', 'Remaining'],
    datasets: [{
      data: [stats.visitedBookings, stats.remainingBookings],
      backgroundColor: ['#3D0A0A', '#E07B39'],
      borderWidth: 0
    }]
  } : null;



  if (loading) return <div style={styles.page}>Loading metrics...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        
        {/* Header Area */}
        <section style={styles.hero}>
          <div>
            <h1 style={styles.heroTitle}>Welcome Back, {user?.name || 'Admin'}!</h1>
            <p style={styles.heroSub}>Overview of your temple operations.</p>
          </div>
          <div style={styles.heroDate}>
            {todayLabel}
          </div>
        </section>

        {/* Row 1: 4 Stat Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Daily Revenue</span>
            <p style={styles.statNumber}>₹{stats?.totalRevenue?.toLocaleString() || '4,580'}</p>
            <span style={{...styles.statDelta, color: '#1e8e3e'}}>+12.5% vs yesterday</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Active Users (Devotees)</span>
            <p style={styles.statNumber}>{stats?.activeUsers?.toLocaleString() || 0}</p>
            <span style={{...styles.statDelta, color: '#1e8e3e'}}>Total Registered</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Scheduled Services</span>
            <p style={styles.statNumber}>{stats?.scheduledServices || 0}</p>
            <span style={{...styles.statDelta, color: '#888'}}>Confirmed today</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Pending Finance Tasks</span>
            <p style={styles.statNumber}>{stats?.pendingTasks || 0}</p>
            <span style={{...styles.statDelta, color: '#d93025'}}>Requires Action</span>
          </div>
        </div>

        {/* Row 2: Charts */}
        <div style={styles.chartsRow}>
          <div style={styles.chartCardLarge}>
            <div style={styles.cardHeaderFlex}>
              <h3 style={styles.cardTitle}>Daily Revenue (Last 30 Days)</h3>
            </div>
            <div style={styles.chartWrapper}>
              {chartData && (
                <Line 
                  data={chartData} 
                  options={{ 
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                  }} 
                />
              )}
            </div>
          </div>
          <div style={styles.chartCardSmall}>
            <h3 style={styles.cardTitle}>New Devotee Sign-ups (Weekly)</h3>
            <div style={styles.chartWrapper}>
              {barChartData && (
                <Bar 
                  data={barChartData} 
                  options={{ 
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { x: { grid: { display: false } } }
                  }} 
                />
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Table and Pie Chart */}
        <div style={styles.chartsRow}>
          <div style={styles.chartCardLarge}>
            <h3 style={styles.cardTitle}>Recent Financial Transactions</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Devotee</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, idx) => (
                  <tr key={idx}>
                    <td style={styles.td}>{t.id}</td>
                    <td style={styles.td}>{t.type}</td>
                    <td style={styles.td}>{t.name}</td>
                    <td style={styles.td}>{t.amount}</td>
                    <td style={styles.td}>
                      <span style={styles.statusBadge}>{t.status}</span>
                    </td>
                    <td style={styles.td}>{t.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={styles.chartCardSmall}>
            <h3 style={styles.cardTitle}>Bookings Ratio Today</h3>
            <div style={styles.chartWrapperPie}>
              {pieChartData && (
                <Pie 
                  data={pieChartData} 
                  options={{ 
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'right' } } 
                  }} 
                />
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const styles = {
  page: {
    padding: '30px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  hero: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    background: 'linear-gradient(120deg, #4b130f, #7a2d17)',
    color: '#fff',
    borderRadius: '14px',
    padding: '30px 24px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
  },
  heroTitle: {
    margin: '0 0 6px',
    fontSize: '32px',
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'Georgia, serif'
  },
  heroSub: {
    margin: 0,
    color: '#fcfaf7',
    fontSize: '16px',
    opacity: 0.92
  },
  heroDate: {
    color: '#E8C97A',
    fontSize: '15px',
    fontWeight: 'bold',
    marginTop: '5px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '20px'
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(61, 10, 10, 0.08)',
    border: '1px solid #E8C97A'
  },
  statLabel: {
    display: 'block',
    fontSize: '13px',
    color: '#6d5842',
    fontWeight: '700',
    marginBottom: '10px',
    textTransform: 'uppercase'
  },
  statNumber: {
    margin: '0 0 5px 0',
    fontSize: '28px',
    color: '#3D0A0A',
    fontWeight: 'bold'
  },
  statDelta: {
    fontSize: '12px',
    fontWeight: '600'
  },
  chartsRow: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px'
  },
  chartCardLarge: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(61, 10, 10, 0.08)',
    border: '1px solid #e2d5c3',
    flex: 2,
    minWidth: '500px'
  },
  chartCardSmall: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(61, 10, 10, 0.08)',
    border: '1px solid #e2d5c3',
    flex: 1,
    minWidth: '300px'
  },
  cardHeaderFlex: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  cardTitle: {
    margin: '0 0 15px 0',
    color: '#3D0A0A',
    fontSize: '18px',
    fontWeight: 'bold',
    borderBottom: '2px solid #f0e6d3',
    paddingBottom: '10px'
  },
  chartWrapper: {
    position: 'relative',
    height: '250px',
    width: '100%'
  },
  chartWrapperPie: {
    position: 'relative',
    height: '250px',
    width: '100%',
    display: 'flex',
    justifyContent: 'center'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    textAlign: 'left',
    padding: '12px 10px',
    borderBottom: '2px solid #e2d5c3',
    color: '#88311d',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  td: {
    padding: '14px 10px',
    borderBottom: '1px solid #f0e6d3',
    color: '#4a3b2c',
    fontSize: '14px'
  },
  statusBadge: {
    backgroundColor: '#FAF6E9',
    color: '#3D0A0A',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 'bold',
    border: '1px solid #E8C97A'
  }
};

export default AdminDashboard;
