import React, { useEffect, useMemo, useState } from 'react';
import { Line, Pie } from 'react-chartjs-2';
import Pagination from './components/Pagination';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import api from './services/apiClient';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const DashboardHome = () => {
  const [stats, setStats] = useState({
    totalBookings: 0,
    revenue: 0,
    occupancyRate: 0,
    activeRooms: 0,
    totalHotels: 0,
    confirmed: 0,
    pending: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [errorStats, setErrorStats] = useState('');
  const [errorBookings, setErrorBookings] = useState('');
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const PAGE_SIZE = 5;

  const fetchStats = async () => {
    setLoadingStats(true);
    setErrorStats('');
    try {
      const resp = await api.get('/vendor/dashboard/stats');
      const payload = resp?.data;
      // Handle nested structure: data.stats
      const s = payload?.data?.stats || payload?.data || payload || {};
      
      setStats({
        totalBookings: s.totalBookings ?? s.total_bookings ?? 0,
        revenue: s.totalRevenue ?? s.total_revenue ?? s.revenue ?? 0,
        occupancyRate: s.occupancyRate ?? s.occupancy_rate ?? 0,
        activeRooms: s.totalRooms ?? s.total_rooms ?? s.activeRooms ?? 0,
        totalHotels: s.totalHotels ?? s.total_hotels ?? 0,
        confirmed: s.confirmedBookings ?? 0,
        pending: s.pendingBookings ?? 0
      });
    } catch (e) {
      setErrorStats(e?.response?.data?.message || e?.message || 'Failed to load stats.');
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchRecent = async () => {
    setLoadingBookings(true);
    setErrorBookings('');
    try {
      const rbResp = await api.get('/vendor/bookings', {
        params: { page, limit: PAGE_SIZE, sortBy: 'createdAt', sortOrder: 'desc' }
      });
      const rb = rbResp?.data;
      
      // Try to find pagination info
      const pagination = rb?.pagination || rb?.data?.pagination || {};
      if (pagination.totalItems) {
        setTotalItems(pagination.totalItems);
      } else if (rb?.count) {
         setTotalItems(rb.count);
      }

      const list = Array.isArray(rb?.bookings)
        ? rb.bookings
        : Array.isArray(rb?.data)
        ? rb.data
        : Array.isArray(rb)
        ? rb
        : [];
      const normalized = list.map((b, index) => ({
        serial: (page - 1) * PAGE_SIZE + index + 1, // ✅ serial number with pagination
        id: b.id || b._id || b.booking_id || '',
        user: b.user?.full_name || b.user?.name || b.userName || '',
        hotel: b.hotel?.name || b.hotelName || '',
        date: b.createdAt || b.date || '',
        amount: b.amount || b.finalAmount || 0,
        status: (b.status || 'PENDING').toString().toUpperCase(),
      }));
      setRecentBookings(normalized);
    } catch (e) {
      setErrorBookings(e?.response?.data?.message || e?.message || 'Failed to load recent bookings.');
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchRecent();
  }, [page]);

  const revenueSparkline = useMemo(() => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = [12, 19, 3, 5, 2, 3, 9].map(n => n * (Math.max(stats.revenue, 1) / 50));
    return {
      labels,
      datasets: [
        {
          label: 'Revenue',
          data,
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.25)',
          tension: 0.4,
          fill: true
        }
      ]
    };
  }, [stats.revenue]);

  const bookingsPie = useMemo(() => {
    const confirmed = recentBookings.filter(b => b.status === 'CONFIRMED').length;
    const pending = recentBookings.filter(b => b.status === 'PENDING').length;
    const cancelled = recentBookings.filter(b => b.status === 'CANCELLED').length;
    return {
      labels: ['Confirmed', 'Pending', 'Cancelled'],
      datasets: [
        {
          data: [confirmed, pending, cancelled],
          backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
          borderWidth: 1
        }
      ]
    };
  }, [recentBookings]);

  return (
    <div className="container-fluid p-3 p-md-4">
      <h4 className="mb-3">Dashboard</h4>

      {/* Stats cards */}
      <div className="row g-3 mb-3">
        {[
          { label: 'Total Bookings', value: stats.totalBookings, icon: 'fa-calendar-check', color: 'primary' },
          { label: 'Revenue', value: `₹${stats.revenue}`, icon: 'fa-rupee-sign', color: 'success' },
          { label: 'Occupancy', value: `${stats.occupancyRate}%`, icon: 'fa-bed', color: 'warning' },
          { label: 'Total Hotels', value: stats.totalHotels, icon: 'fa-hotel', color: 'info' }
        ].map((card, idx) => (
          <div key={idx} className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-muted">{card.label}</div>
                    <div className="h4 mb-0">{loadingStats ? '...' : card.value}</div>
                  </div>
                  <i className={`fas ${card.icon} text-${card.color} fs-3`}></i>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {errorStats && <div className="alert alert-warning py-2">{errorStats}</div>}

      {/* Charts */}
      <div className="row g-3 mb-3">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0">
              <h6 className="mb-0">Revenue (Weekly)</h6>
            </div>
            <div className="card-body">
              <Line
                data={revenueSparkline}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true } }
                }}
                height={120}
              />
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0">
              <h6 className="mb-0">Bookings Breakdown</h6>
            </div>
            <div className="card-body d-flex align-items-center justify-content-center">
              <Pie
                data={bookingsPie}
                options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }}
                height={180}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bookings Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-0">
          <h6 className="mb-0">Recent Bookings</h6>
        </div>
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Sr No.</th>
                <th>Booking ID</th>
                <th>User</th>
                <th>Hotel</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingBookings ? (
                <tr>
                  <td colSpan="7" className="text-center py-4">Loading...</td>
                </tr>
              ) : recentBookings.length > 0 ? (
                recentBookings.map((b) => (
                  <tr key={b.id}>
                    <td>{b.serial}</td>
                    <td>{b.id}</td>
                    <td>{b.user}</td>
                    <td>{b.hotel}</td>
                    <td>{new Date(b.date).toLocaleDateString()}</td>
                    <td>₹{b.amount}</td>
                    <td>
                      <span
                        className={`badge bg-${
                          b.status === 'CONFIRMED'
                            ? 'success'
                            : b.status === 'PENDING'
                            ? 'warning'
                            : 'danger'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    {errorBookings ? <span className="text-danger">{errorBookings}</span> : 'No recent bookings found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="d-flex justify-content-end p-3">
            <Pagination 
                current={page} 
                total={totalItems} 
                pageSize={PAGE_SIZE} 
                onChange={(p) => setPage(p)} 
            />
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
