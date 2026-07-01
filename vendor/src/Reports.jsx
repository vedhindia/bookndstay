import React, { useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import api from './services/apiClient';
import Pagination from './components/Pagination';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const Reports = () => {
  const formatDateTimeIST = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const [commissionSummary, setCommissionSummary] = useState({
    percent: 10,
    allTime: { gross: 0, commission: 0, net: 0 },
    thisWeek: { weekStart: null, weekEnd: null, gross: 0, commission: 0, net: 0 }
  });
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [errorSummary, setErrorSummary] = useState('');

  const [weeklyRevenue, setWeeklyRevenue] = useState({
    weekStart: null,
    weekEnd: null,
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    series: [0, 0, 0, 0, 0, 0, 0]
  });
  const [loadingWeeklyRevenue, setLoadingWeeklyRevenue] = useState(false);
  const [errorWeeklyRevenue, setErrorWeeklyRevenue] = useState('');

  const [settlementHistory, setSettlementHistory] = useState({
    percent: 10,
    items: [],
    page: 1,
    totalItems: 0,
    totalPages: 1
  });
  const [loadingSettlementHistory, setLoadingSettlementHistory] = useState(false);
  const [errorSettlementHistory, setErrorSettlementHistory] = useState('');

  const fetchCommissionSummary = async () => {
    setLoadingSummary(true);
    setErrorSummary('');
    try {
      const resp = await api.get('/vendor/reports/commission-summary');
      const data = resp?.data?.data || {};
      const online = data.online || {};
      const totals = data.totals || {};
      const thisWeek = data.unsettled_this_week || {};
      setCommissionSummary({
        percent: Number(data.percent || 10),
        allTime: {
          gross: Number(online.gross_amount || totals.gross_amount || 0),
          commission: Number(totals.commission_amount || online.commission_amount || 0),
          net: Number(totals.net_amount || online.net_amount || 0)
        },
        thisWeek: {
          weekStart: thisWeek.week_start || null,
          weekEnd: thisWeek.week_end || null,
          gross: Number(thisWeek.gross_amount || 0),
          commission: Number(thisWeek.commission_amount || 0),
          net: Number(thisWeek.net_amount || 0)
        }
      });
    } catch (e) {
      setErrorSummary(e?.response?.data?.message || e?.message || 'Failed to load payout summary.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchWeeklyRevenue = async () => {
    setLoadingWeeklyRevenue(true);
    setErrorWeeklyRevenue('');
    try {
      const resp = await api.get('/vendor/reports/revenue/weekly');
      const payload = resp?.data;
      const data = payload?.data || payload || {};
      const labels = Array.isArray(data.labels) && data.labels.length === 7 ? data.labels : weeklyRevenue.labels;
      const series = Array.isArray(data.revenue) && data.revenue.length === 7 ? data.revenue : weeklyRevenue.series;
      setWeeklyRevenue({
        weekStart: data.week_start || null,
        weekEnd: data.week_end || null,
        labels,
        series: series.map((n) => Number(n || 0))
      });
    } catch (e) {
      setErrorWeeklyRevenue(e?.response?.data?.message || e?.message || 'Failed to load weekly revenue.');
    } finally {
      setLoadingWeeklyRevenue(false);
    }
  };

  const fetchSettlementHistory = async (targetPage = settlementHistory.page) => {
    setLoadingSettlementHistory(true);
    setErrorSettlementHistory('');
    try {
      const resp = await api.get('/vendor/reports/settlements/history', {
        params: { page: targetPage, limit: 10 }
      });
      const data = resp?.data?.data || {};
      const pagination = data.pagination || {};
      setSettlementHistory({
        percent: Number(data.percent || 10),
        items: Array.isArray(data.items) ? data.items : [],
        page: Number(pagination.page || targetPage || 1),
        totalItems: Number(pagination.totalItems || 0),
        totalPages: Number(pagination.totalPages || 1)
      });
    } catch (e) {
      setErrorSettlementHistory(e?.response?.data?.message || e?.message || 'Failed to load settlement history.');
      setSettlementHistory((prev) => ({ ...prev, items: [] }));
    } finally {
      setLoadingSettlementHistory(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchCommissionSummary(), fetchWeeklyRevenue(), fetchSettlementHistory(1)]);
    setSettlementHistory((prev) => ({ ...prev, page: 1 }));
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const revenueChart = useMemo(() => {
    return {
      labels: weeklyRevenue.labels,
      datasets: [
        {
          label: 'Net Payout',
          data: weeklyRevenue.series,
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.25)',
          tension: 0.4,
          fill: true
        }
      ]
    };
  }, [weeklyRevenue.labels, weeklyRevenue.series]);

  return (
    <div className="container-fluid p-3 p-md-4">
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Reports</h4>
          <small className="text-muted">Payouts, settlements, and weekly net payout</small>
        </div>
        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={refreshAll}
          disabled={loadingSummary || loadingWeeklyRevenue || loadingSettlementHistory}
        >
          {(loadingSummary || loadingWeeklyRevenue || loadingSettlementHistory) ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {errorSummary && <div className="alert alert-warning py-2">{errorSummary}</div>}

      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="fw-semibold">All-Time Totals</div>
      </div>
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="text-muted small">Online Booking Amount</div>
              <div className="fs-4 fw-bold">₹{Number(commissionSummary.allTime.gross || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="text-muted small">Total Admin Commission ({Number(commissionSummary.percent || 10)}%)</div>
              <div className="fs-4 fw-bold">₹{Number(commissionSummary.allTime.commission || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="text-muted small">Net Amount (After Commission)</div>
              <div className="fs-4 fw-bold text-success">₹{Number(commissionSummary.allTime.net || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="fw-semibold">This Week Totals (Unsettled)</div>
        {commissionSummary.thisWeek.weekStart && commissionSummary.thisWeek.weekEnd ? (
          <div className="text-muted small">
            {commissionSummary.thisWeek.weekStart} to {commissionSummary.thisWeek.weekEnd}
          </div>
        ) : null}
      </div>
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="text-muted small">Online Booking Amount</div>
              <div className="fs-4 fw-bold">₹{Number(commissionSummary.thisWeek.gross || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="text-muted small">Admin Commission ({Number(commissionSummary.percent || 10)}%)</div>
              <div className="fs-4 fw-bold">₹{Number(commissionSummary.thisWeek.commission || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="text-muted small">Vendor Payable (After Commission)</div>
              <div className="fs-4 fw-bold text-success">₹{Number(commissionSummary.thisWeek.net || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-0">Net Payout (Weekly)</h6>
                  {weeklyRevenue.weekStart && weeklyRevenue.weekEnd && (
                    <small className="text-muted">
                      {weeklyRevenue.weekStart} to {weeklyRevenue.weekEnd}
                    </small>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={fetchWeeklyRevenue}
                  disabled={loadingWeeklyRevenue}
                >
                  {loadingWeeklyRevenue ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>
            <div className="card-body">
              {errorWeeklyRevenue && <div className="alert alert-warning py-2">{errorWeeklyRevenue}</div>}
              <div style={{ position: 'relative', height: 320 }}>
                <Line
                  data={revenueChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0">
              <h6 className="mb-0">Settlements</h6>
            </div>
            <div className="card-body">
              <div className="text-muted small">This week (unsettled)</div>
              <div className="fs-5 fw-bold text-success">₹{Number(commissionSummary.thisWeek.net || 0).toLocaleString()}</div>
              <div className="text-muted small mt-3">All-time (net)</div>
              <div className="fs-5 fw-bold">₹{Number(commissionSummary.allTime.net || 0).toLocaleString()}</div>
              <div className="text-muted small mt-3">Commission rate</div>
              <div className="fw-semibold">{Number(commissionSummary.percent || 10)}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="fw-semibold">Weekly Settled History</div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => fetchSettlementHistory(1)}
          disabled={loadingSettlementHistory}
        >
          {loadingSettlementHistory ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {errorSettlementHistory && <div className="alert alert-warning py-2">{errorSettlementHistory}</div>}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="px-3">Week</th>
                  <th className="text-end">Gross</th>
                  <th className="text-end">Commission</th>
                  <th className="text-end">Net Paid</th>
                  <th>Ref</th>
                  <th>Settled At</th>
                </tr>
              </thead>
              <tbody>
                {loadingSettlementHistory ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      Loading settlement history...
                    </td>
                  </tr>
                ) : settlementHistory.items.length > 0 ? (
                  settlementHistory.items.map((s) => (
                    <tr key={String(s.week_start || '')}>
                      <td className="px-3">
                        <div className="fw-semibold">
                          {s.week_start && s.week_end ? `${s.week_start} to ${s.week_end}` : (s.week_start || 'N/A')}
                        </div>
                        <div className="text-muted small">{Number(s.booking_count || 0)} bookings</div>
                      </td>
                      <td className="text-end">₹{Number(s.gross_amount || 0).toLocaleString()}</td>
                      <td className="text-end">₹{Number(s.commission_amount || 0).toLocaleString()}</td>
                      <td className="text-end fw-semibold text-success">₹{Number(s.net_amount || 0).toLocaleString()}</td>
                      <td className="text-truncate" style={{ maxWidth: 180 }}>{s.settlement_ref || '-'}</td>
                      <td>{s.settled_at ? formatDateTimeIST(s.settled_at) : '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      No settled weeks found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {settlementHistory.totalPages > 1 && (
          <div className="d-flex justify-content-end p-3 border-top">
            <Pagination
              current={settlementHistory.page}
              total={settlementHistory.totalItems}
              pageSize={10}
              onChange={(p) => {
                setSettlementHistory((prev) => ({ ...prev, page: p }));
                fetchSettlementHistory(p);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
