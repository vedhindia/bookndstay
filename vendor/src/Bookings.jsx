import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from './services/apiClient';
import Pagination from './components/Pagination';

const mockBookings = [
  { id: 'B001', user: 'John Doe', userId: 'U001', hotel: 'Grand Plaza', checkIn: '2025-09-20', checkOut: '2025-09-22', guests: 2, price: 250, status: 'Confirmed' },
  { id: 'B002', user: 'Jane Smith', userId: 'U002', hotel: 'Beach Resort', checkIn: '2025-10-05', checkOut: '2025-10-08', guests: 3, price: 420, status: 'Pending' },
  { id: 'B003', user: 'Michael Chen', userId: 'U003', hotel: 'Mountain View', checkIn: '2025-11-01', checkOut: '2025-11-04', guests: 2, price: 300, status: 'Cancelled' },
];

const StatusBadge = ({ status }) => {
  const color = status === 'Confirmed' ? 'success' : status === 'Pending' ? 'warning' : status === 'Cancelled' ? 'danger' : 'secondary';
  return <span className={`badge bg-${color}`}>{status}</span>;
};

const Bookings = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const userFilter = location.state?.userId ? {
    userId: location.state.userId,
    userName: location.state.userName,
    userEmail: location.state.userEmail
  } : null;

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [seenBookingIds, setSeenBookingIds] = useState(() => new Set());
  const [checkInLoading, setCheckInLoading] = useState(false);

  const formatDateIST = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateTimeIST = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return 'N/A';
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

  const formatWhen = (booking, dateString) => {
    const mode = String(booking?.bookingMode || booking?.booking_mode || 'NIGHTLY').toUpperCase();
    return mode === 'HOURLY' ? formatDateTimeIST(dateString) : formatDateIST(dateString);
  };

  const formatRoomType = (value) => {
    const v = String(value || '').trim().toUpperCase();
    if (!v) return 'N/A';
    if (v === 'AC') return 'AC';
    if (v === 'NON_AC' || v === 'NON-AC' || v === 'NON AC') return 'Non-AC';
    return v;
  };

  const normalizeBookingFromApi = (b) => {
    const bookingMode = String(b?.booking_mode || b?.bookingMode || 'NIGHTLY').toUpperCase();
    const childAgesRaw = b?.child_ages ?? b?.childAges ?? [];
    const childAges = Array.isArray(childAgesRaw)
      ? childAgesRaw
      : (() => {
          try {
            const parsed = JSON.parse(childAgesRaw || '[]');
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })();
    const normalized = {
      id: b?.id || b?.booking_id || b?._id || '',
      userId: b?.user?.id || b?.user?._id || b?.userId || '',
      user: b?.user?.full_name || b?.user?.name || b?.userName || '',
      userEmail: b?.user?.email || b?.userEmail || '',
      hotel: b?.hotel?.name || b?.hotelName || '',
      roomType: b?.room_type || b?.roomType || b?.room || b?.type || '',
      bookingMode,
      checkIn: bookingMode === 'HOURLY'
        ? (b?.check_in_at || b?.checkInAt || b?.check_in || b?.checkInDate || b?.checkIn || '')
        : (b?.check_in || b?.checkInDate || b?.checkIn || ''),
      checkOut: bookingMode === 'HOURLY'
        ? (b?.check_out_at || b?.checkOutAt || b?.check_out || b?.checkOutDate || b?.checkOut || '')
        : (b?.check_out || b?.checkOutDate || b?.checkOut || ''),
      guests: b?.guests || b?.noOfGuests || 0,
      price: b?.amount || b?.finalAmount || 0,
      status: (b?.status || 'PENDING').toString().charAt(0).toUpperCase() + (b?.status || 'PENDING').toString().slice(1).toLowerCase(),
      paymentMethod: b?.payment_method || b?.paymentMethod || null,
      checkedInAt: b?.checked_in_at || b?.checkedInAt || null,
      paymentReceivedAt: b?.payment_received_at || b?.paymentReceivedAt || null,
      paymentReceivedMethod: b?.payment_received_method || b?.paymentReceivedMethod || null,
      paymentReceivedAmount: b?.payment_received_amount || b?.paymentReceivedAmount || null,
      commissionPercent: b?.commission_percent ?? b?.commissionPercent ?? null,
      commissionAmount: b?.commission_amount ?? b?.commissionAmount ?? null,
      adultsCount: Number(b?.adults_count ?? b?.adultsCount ?? Math.max(0, Number(b?.guests || 0) - childAges.length) ?? 0),
      childrenCount: Number(b?.children_count ?? b?.childrenCount ?? childAges.length ?? 0),
      childAges,
      chargeableChildCount: Number(b?.chargeable_child_count ?? b?.chargeableChildCount ?? childAges.filter((age) => Number(age) > 8).length),
      childSurchargeAmount: Number(b?.child_surcharge_amount ?? b?.childSurchargeAmount ?? 0)
    };
    return normalized;
  };

  const markBookingAsSeen = (bookingId) => {
    if (!bookingId) return;
    try {
      const key = 'vendor_seen_booking_ids_v1';
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      const set = new Set(Array.isArray(arr) ? arr.map((v) => String(v)) : []);
      set.add(String(bookingId));
      localStorage.setItem(key, JSON.stringify(Array.from(set)));
    } catch {
      void 0;
    }
    setSeenBookingIds((prev) => {
      const next = new Set(prev instanceof Set ? Array.from(prev) : []);
      next.add(String(bookingId));
      return next;
    });
    try {
      window.dispatchEvent(new CustomEvent('vendor_booking_seen', { detail: { bookingId: String(bookingId) } }));
    } catch {
      void 0;
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('vendor_seen_booking_ids_v1');
      const parsed = raw ? JSON.parse(raw) : [];
      setSeenBookingIds(new Set(Array.isArray(parsed) ? parsed.map((v) => String(v)) : []));
    } catch {
      setSeenBookingIds(new Set());
    }
  }, []);

  useEffect(() => {
    const onSectionSeen = (e) => {
      const section = e?.detail?.section;
      const ids = Array.isArray(e?.detail?.ids) ? e.detail.ids : [];
      if (section !== 'bookings' || ids.length === 0) return;
      setSeenBookingIds((prev) => {
        const next = new Set(prev instanceof Set ? Array.from(prev) : []);
        ids.forEach((id) => next.add(String(id)));
        return next;
      });
    };
    window.addEventListener('vendor_section_seen', onSectionSeen);
    return () => window.removeEventListener('vendor_section_seen', onSectionSeen);
  }, []);

  const isNewBooking = (b) => {
    const id = b?.id;
    if (!id) return false;
    const st = String(b?.status || '').toLowerCase();
    if (st !== 'confirmed' && st !== 'completed') return false;
    return !(seenBookingIds instanceof Set ? seenBookingIds.has(String(id)) : false);
  };

  const openBookingDetails = async (booking) => {
    const bookingId = booking?.id;
    if (!bookingId) return;
    markBookingAsSeen(bookingId);
    setSelected(booking);
    setDetailLoading(true);
    setError('');
    try {
      const resp = await api.get(`/vendor/bookings/${bookingId}`);
      const raw = resp?.data?.data ?? resp?.data ?? null;
      if (raw) {
        const normalized = normalizeBookingFromApi(raw);
        setSelected(normalized);
      }
    } catch (e) {
      setError('Failed to load booking details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshSelectedFromApiPayload = (payload) => {
    if (!payload) return;
    const normalized = normalizeBookingFromApi(payload);
    setSelected(normalized);
  };

  const markCheckedIn = async () => {
    if (!selected?.id) return;
    setCheckInLoading(true);
    setError('');
    setSuccess('');
    try {
      const resp = await api.put(`/vendor/bookings/${selected.id}/check-in`, {});
      const raw = resp?.data?.data?.booking ?? resp?.data?.data ?? null;
      if (raw) refreshSelectedFromApiPayload(raw);
      setSuccess('Checked-in recorded');
    } catch (e) {
      setError('Failed to record checked-in.');
    } finally {
      setCheckInLoading(false);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const searchTerm = query.trim();
      const resResp = await api.get('/vendor/bookings', {
        params: {
          page,
          limit: pageSize,
          status: status !== 'All' ? status.toUpperCase() : undefined,
          userId: userFilter?.userId || undefined,
          user_id: userFilter?.userId || undefined,
          q: searchTerm || undefined,
          search: searchTerm || undefined,
          start_date: dateFrom || undefined,
          end_date: dateTo || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined
        }
      });
      const res = resResp?.data;
      const list = Array.isArray(res?.bookings)
        ? res.bookings
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.results)
        ? res.results
        : Array.isArray(res)
        ? res
        : [];
      const normalized = list.map((b) => ({
        id: b.id || b.booking_id || b._id || '',
        userId: b.user?.id || b.user?._id || b.userId || '',
        user: b.user?.full_name || b.user?.name || b.userName || '',
        userEmail: b.user?.email || b.userEmail || '',
        hotel: b.hotel?.name || b.hotelName || '',
        roomType: b.room_type || b.roomType || b.room || b.type || '',
        bookingMode: String(b.booking_mode || b.bookingMode || 'NIGHTLY').toUpperCase(),
        checkIn:
          String(b.booking_mode || b.bookingMode || 'NIGHTLY').toUpperCase() === 'HOURLY'
            ? (b.check_in_at || b.checkInAt || b.check_in || b.checkInDate || b.checkIn || '')
            : (b.check_in || b.checkInDate || b.checkIn || ''),
        checkOut:
          String(b.booking_mode || b.bookingMode || 'NIGHTLY').toUpperCase() === 'HOURLY'
            ? (b.check_out_at || b.checkOutAt || b.check_out || b.checkOutDate || b.checkOut || '')
            : (b.check_out || b.checkOutDate || b.checkOut || ''),
        guests: b.guests || b.noOfGuests || 0,
        price: b.amount || b.finalAmount || 0,
        status: (b.status || 'PENDING').toString().charAt(0).toUpperCase() + (b.status || 'PENDING').toString().slice(1).toLowerCase(),
        paymentMethod: b.payment_method || b.paymentMethod || null,
        checkedInAt: b.checked_in_at || b.checkedInAt || null,
        paymentReceivedAt: b.payment_received_at || b.paymentReceivedAt || null,
      }));
      setItems(normalized);
      const computedTotal =
        res?.total ??
        res?.pagination?.totalItems ??
        res?.pagination?.total ??
        res?.meta?.total ??
        res?.count ??
        normalized.length;
      setTotal(Number(computedTotal));
    } catch (e) {
      console.warn('Failed to load bookings, using mock', e?.message);
      const mockData = userFilter 
        ? mockBookings.filter(b => b.userId === userFilter.userId)
        : mockBookings;
      setItems(mockData);
      setError('Could not load bookings from server. Showing mock data.');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchBookings();
  }, [page, pageSize, status, dateFrom, dateTo, userFilter?.userId, query]);

  const clearUserFilter = () => {
    navigate('/dashboard/bookings', { replace: true, state: {} });
    window.location.reload();
  };

  return (
    <div className="container-fluid p-3 p-md-4">
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Bookings</h4>
          <small className="text-muted">Search, filter and manage bookings</small>
        </div>
        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={() => navigate('/dashboard/reports')}
        >
          Reports
        </button>
      </div>

      {userFilter && (
        <div className="alert alert-info d-flex justify-content-between align-items-center py-2 mb-3">
          <div>
            <i className="fas fa-filter me-2"></i>
            <strong>Filtered by User:</strong> {userFilter.userName} ({userFilter.userEmail})
          </div>
          <button 
            className="btn btn-sm btn-outline-secondary" 
            onClick={clearUserFilter}
          >
            <i className="fas fa-times me-1"></i>Clear Filter
          </button>
        </div>
      )}

      {/* Filters Section */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-5">
              <label className="form-label small text-muted mb-1">Search</label>
              <input 
                className="form-control" 
                placeholder="Search by user, hotel or ID" 
                value={query} 
                onChange={e => { setQuery(e.target.value); setPage(1); }} 
              />
            </div>

            <div className="col-md-2">
              <label className="form-label small text-muted mb-1">Status</label>
              <select 
                className="form-select" 
                value={status} 
                onChange={e => { setStatus(e.target.value); setPage(1); }}
              >
                <option>All</option>
                <option>Confirmed</option>
                <option>Completed</option>
                <option>Pending</option>
                <option>Cancelled</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small text-muted mb-1">Check-in From</label>
              <input 
                type="date" 
                className="form-control" 
                value={dateFrom} 
                onChange={e => { setDateFrom(e.target.value); setPage(1); }} 
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small text-muted mb-1">Check-out To</label>
              <input 
                type="date" 
                className="form-control" 
                value={dateTo} 
                onChange={e => { setDateTo(e.target.value); setPage(1); }} 
              />
            </div>
            <div className="col-md-1 d-flex align-items-end">
              <button 
                className="btn btn-outline-secondary w-100" 
                onClick={() => {
                  setQuery('');
                  setStatus('All');
                  setDateFrom('');
                  setDateTo('');
                  setPage(1);
                }}
              >
                <i className="fas fa-redo"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {success && (
        <div className="alert alert-success alert-dismissible fade show py-2" role="alert">
          <i className="fas fa-check-circle me-2"></i>{success}
          <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
        </div>
      )}
      {error && (
        <div className="alert alert-warning alert-dismissible fade show py-2" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>{error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {/* Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="px-3">Sr No.</th>
                  <th>User</th>
                  <th>Hotel</th>
                  <th className="text-center">Booking Method</th>
                  <th className="text-center">Checked-in</th>
                  <th className="text-center">Payment</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th className="text-center">Guests</th>
                  <th className="text-end">Price</th>
                  <th className="text-center">Status</th>
                  <th className="text-end px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="12" className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <div className="mt-2 text-muted">Loading bookings...</div>
                    </td>
                  </tr>
                ) : items.length > 0 ? (
                  items.map((b, index) => (
                    <tr key={b.id}>
                      <td className="px-3">
                        <span className="badge bg-light text-dark">
                          {(page - 1) * pageSize + index + 1}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex flex-column">
                          <span className="fw-semibold">{b.user}</span>
                          {b.userEmail && (
                            <small className="text-muted">{b.userEmail}</small>
                          )}
                        </div>
                      </td>
                      <td>{b.hotel}</td>
                      <td className="text-center">
                        {String(b.paymentMethod || '').toUpperCase() === 'PAY_AT_HOTEL' ? (
                          <span className="badge bg-warning text-dark">Pay at Hotel</span>
                        ) : (
                          <span className="badge bg-success">Online</span>
                        )}
                      </td>
                      <td className="text-center">
                        {b.checkedInAt ? (
                          <span className="badge bg-success">Yes</span>
                        ) : (
                          <span className="badge bg-secondary">No</span>
                        )}
                      </td>
                      <td className="text-center">
                        {b.paymentReceivedAt ? (
                          <span className="badge bg-success">Received</span>
                        ) : (
                          <span className="badge bg-secondary">Pending</span>
                        )}
                      </td>
                      <td><small>{formatWhen(b, b.checkIn)}</small></td>
                      <td><small>{formatWhen(b, b.checkOut)}</small></td>
                      <td className="text-center">
                        <span className="badge bg-light text-dark">{b.guests}</span>
                      </td>
                      <td className="text-end fw-semibold">₹{b.price}</td>
                      <td className="text-center">
                        <div className="d-inline-flex align-items-center gap-2">
                          <StatusBadge status={b.status} />
                          {isNewBooking(b) && <span className="badge bg-danger">New</span>}
                        </div>
                      </td>
                      <td className="text-end px-3">
                        <div className="btn-group">
                          <button 
                            className="btn btn-sm btn-outline-primary" 
                            onClick={() => {
                              openBookingDetails(b);
                            }}
                            title="View Details"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="12" className="text-center text-muted py-5">
                      <i className="fas fa-inbox fa-3x mb-3 d-block"></i>
                      <div>No bookings found</div>
                      {(query || status !== 'All' || dateFrom || dateTo || userFilter) && (
                        <small className="text-muted">Try adjusting your filters</small>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-top d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <small className="text-muted">
                Showing {Math.min((page - 1) * pageSize + 1, total)} to {Math.min(page * pageSize, total)} of <strong>{total}</strong> bookings
              </small>
              <select 
                className="form-select form-select-sm" 
                style={{ width: 'auto' }} 
                value={pageSize} 
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
            <Pagination current={page} total={total} pageSize={pageSize} onChange={setPage} />
          </div>
        </div>
      </div>

      {/* Booking Details Modal */}
      {selected && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Booking Details</h5>
                <button type="button" className="btn-close" onClick={() => setSelected(null)}></button>
              </div>
              <div className="modal-body">
                {detailLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <div className="mt-2 text-muted">Loading booking details...</div>
                  </div>
                ) : (
                  <div className="row g-3">
                    <div className="col-md-6">
                      <h6 className="text-muted text-uppercase small mb-2">Booking Reference</h6>
                      <div className="d-flex align-items-center mb-2">
                        <span className="text-muted me-2">ID:</span>
                        <span className="fw-bold">{selected.id}</span>
                      </div>
                      <div className="d-flex align-items-center mb-2">
                        <span className="text-muted me-2">Status:</span>
                        <StatusBadge status={selected.status} />
                      </div>
                      <div className="d-flex align-items-center">
                        <span className="text-muted me-2">Total Price:</span>
                        <span className="fw-bold text-success">₹{selected.price}</span>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <h6 className="text-muted text-uppercase small mb-2">Hotel Information</h6>
                      <div className="mb-2">
                        <i className="fas fa-hotel text-muted me-2"></i>
                        <span className="fw-semibold">{selected.hotel}</span>
                      </div>
                      <div className="mb-2">
                        <i className="fas fa-bed text-muted me-2"></i>
                        <span>Room Type: <strong>{formatRoomType(selected.roomType)}</strong></span>
                      </div>
                    </div>
                    
                    <div className="col-12"><hr className="my-3" /></div>

                    <div className="col-md-6">
                      <h6 className="text-muted text-uppercase small mb-2">Guest Verification</h6>
                      <div className="mb-2">
                        <i className="fas fa-user-friends text-muted me-2"></i>
                        <span>Adults: <strong>{selected.adultsCount ?? Math.max(0, Number(selected.guests || 0) - Number(selected.childrenCount || 0))}</strong></span>
                      </div>
                      <div className="mb-2">
                        <i className="fas fa-child text-muted me-2"></i>
                        <span>Children: <strong>{selected.childrenCount ?? 0}</strong></span>
                      </div>
                      <div className="mb-2">
                        <i className="fas fa-id-badge text-muted me-2"></i>
                        <span>Chargeable Children: <strong>{selected.chargeableChildCount ?? 0}</strong></span>
                      </div>
                      <div>
                        <i className="fas fa-list-ol text-muted me-2"></i>
                        <span>
                          Child Ages: <strong>{Array.isArray(selected.childAges) && selected.childAges.length ? selected.childAges.join(', ') : 'None'}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <h6 className="text-muted text-uppercase small mb-2">Child Pricing</h6>
                      <div className="mb-2">
                        <i className="fas fa-info-circle text-muted me-2"></i>
                        <span>Rule: <strong>Above 8 years = Rs 300 per child</strong></span>
                      </div>
                      <div className="mb-2">
                        <i className="fas fa-rupee-sign text-muted me-2"></i>
                        <span>Child Surcharge: <strong>₹{Number(selected.childSurchargeAmount || 0).toLocaleString('en-IN')}</strong></span>
                      </div>
                      <div className="text-muted small">
                        Ages shown here are the values entered by the guest at booking time for check-in verification.
                      </div>
                    </div>

                    <div className="col-12"><hr className="my-3" /></div>
                    
                    <div className="col-md-6">
                      <h6 className="text-muted text-uppercase small mb-2">Guest Details</h6>
                      <div className="mb-2">
                        <i className="fas fa-user text-muted me-2"></i>
                        <span>{selected.user}</span>
                      </div>
                      <div className="mb-2">
                        <i className="fas fa-envelope text-muted me-2"></i>
                        <span>{selected.userEmail || 'N/A'}</span>
                      </div>
                      <div>
                        <i className="fas fa-users text-muted me-2"></i>
                        <span>{selected.guests} Guests</span>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <h6 className="text-muted text-uppercase small mb-2">Stay Schedule</h6>
                      <div className="mb-2">
                        <i className="fas fa-calendar-check text-muted me-2"></i>
                        <span>Check-in: <strong>{formatWhen(selected, selected.checkIn)}</strong></span>
                      </div>
                      <div className="mb-2">
                        <i className="fas fa-calendar-times text-muted me-2"></i>
                        <span>Check-out: <strong>{formatWhen(selected, selected.checkOut)}</strong></span>
                      </div>
                      <div>
                        <i className="fas fa-moon text-muted me-2"></i>
                        <span>
                          {selected.checkIn && selected.checkOut 
                            ? Math.max(0, Math.ceil((new Date(selected.checkOut) - new Date(selected.checkIn)) / (1000 * 60 * 60 * 24))) 
                            : 0} Nights
                        </span>
                      </div>
                    </div>

                    <div className="col-12"><hr className="my-3" /></div>

                    <div className="col-md-6">
                      <h6 className="text-muted text-uppercase small mb-2">Operational Status</h6>
                      <div className="mb-2">
                        <span className="text-muted me-2">Payment Method:</span>
                        <span className="fw-semibold">{String(selected.paymentMethod || '').toUpperCase() === 'PAY_AT_HOTEL' ? 'Pay at Hotel' : 'Online'}</span>
                      </div>
                      <div className="mb-2">
                        <span className="text-muted me-2">Checked-in:</span>
                        <span className="fw-semibold">{selected.checkedInAt ? formatDateTimeIST(selected.checkedInAt) : 'No'}</span>
                      </div>
                      <div>
                        <span className="text-muted me-2">Payment Received:</span>
                        <span className="fw-semibold">{selected.paymentReceivedAt ? formatDateTimeIST(selected.paymentReceivedAt) : 'No'}</span>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <h6 className="text-muted text-uppercase small mb-2">Commission</h6>
                      <div className="mb-2">
                        <span className="text-muted me-2">Commission %:</span>
                        <span className="fw-semibold">{selected.commissionPercent ?? '-'}</span>
                      </div>
                      <div className="mb-2">
                        <span className="text-muted me-2">Commission Amount:</span>
                        <span className="fw-semibold">₹{selected.commissionAmount ?? '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted me-2">Payment Received Amount:</span>
                        <span className="fw-semibold">₹{selected.paymentReceivedAmount ?? '-'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <div className="d-flex flex-wrap gap-2 w-100 justify-content-between align-items-center">
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={markCheckedIn}
                      disabled={
                        detailLoading ||
                        checkInLoading ||
                        !!selected.checkedInAt ||
                        !['confirmed', 'completed'].includes(String(selected.status || '').toLowerCase())
                      }
                    >
                      {selected.checkedInAt ? 'Checked-in' : checkInLoading ? 'Saving...' : 'Mark Checked-in'}
                    </button>
                  </div>

                  <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;
