import React, { useEffect, useMemo, useState } from 'react';
import Pagination from './components/Pagination';

const Reviews = () => {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All'); // All | Visible | Hidden | Flagged
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchReviews = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminReviews.list({ page, limit: pageSize, status: status !== 'All' ? status.toUpperCase() : undefined, q: query || undefined });
      const list = Array.isArray(res?.reviews)
        ? res.reviews
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.results)
        ? res.results
        : Array.isArray(res)
        ? res
        : [];
      const normalized = list.map((r) => ({
        id: r.id || r.review_id || r._id || '',
        hotel: r.hotel?.name || r.hotelName || '-',
        user: r.user?.full_name || r.user?.name || '-',
        rating: Number(r.rating || r.stars || 0),
        comment: r.comment || r.text || '',
        status: (r.status || (r.visible === false ? 'HIDDEN' : 'VISIBLE')).toString().toUpperCase(),
        createdAt: r.createdAt?.slice(0,10) || '',
      }));
      setItems(normalized);
      const computedTotal = res?.total ?? res?.pagination?.total ?? res?.meta?.total ?? res?.count ?? normalized.length;
      setTotal(Number(computedTotal));
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, [page, pageSize, status]);

  const filtered = useMemo(() => {
    return items.filter((r) => {
      const txtMatch = [r.hotel, r.user, r.comment].filter(Boolean).some(v => String(v).toLowerCase().includes(query.toLowerCase()));
      const statusMatch = status === 'All' || r.status === status.toUpperCase();
      return txtMatch && statusMatch;
    });
  }, [items, query, status]);

  const moderate = async (r, newStatus) => {
    try {
      setLoading(true);
      await adminReviews.moderate(r.id, { status: newStatus.toUpperCase() });
      setSuccess(`Review ${newStatus.toLowerCase()} successfully`);
      await fetchReviews();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to update review');
    } finally {
      setLoading(false);
      setTimeout(()=>setSuccess(''), 2200);
    }
  };

  const remove = async (r) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      setLoading(true);
      await adminReviews.remove(r.id);
      setSuccess('Review deleted');
      await fetchReviews();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to delete review');
    } finally {
      setLoading(false);
      setTimeout(()=>setSuccess(''), 2200);
    }
  };

  return (
    <div className="container-fluid p-3 p-md-4">
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Reviews</h4>
          <small className="text-muted">Moderate hotel reviews</small>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <input className="form-control" placeholder="Search by hotel, user, comment" value={query} onChange={e=>setQuery(e.target.value)} />
          <select className="form-select" value={status} onChange={e=>setStatus(e.target.value)}>
            <option>All</option>
            <option>Visible</option>
            <option>Hidden</option>
            <option>Flagged</option>
          </select>
        </div>
      </div>

      {success && <div className="alert alert-success py-2">{success}</div>}
      {error && <div className="alert alert-warning py-2">{error}</div>}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th>ID</th>
                  <th>Hotel</th>
                  <th>User</th>
                  <th>Rating</th>
                  <th>Comment</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" className="text-center py-4">Loading reviews...</td></tr>
                ) : filtered.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.hotel}</td>
                    <td>{r.user}</td>
                    <td>
                      <span className="badge bg-warning text-dark"><i className="fas fa-star me-1"></i>{r.rating}</span>
                    </td>
                    <td className="text-truncate" style={{maxWidth:'360px'}} title={r.comment}>{r.comment}</td>
                    <td>
                      <span className={`badge ${r.status==='VISIBLE'?'bg-success': r.status==='HIDDEN'?'bg-secondary':'bg-warning text-dark'}`}>{r.status}</span>
                    </td>
                    <td>{r.createdAt}</td>
                    <td className="text-end">
                      <div className="btn-group">
                        {r.status !== 'VISIBLE' && (
                          <button className="btn btn-sm btn-outline-success" onClick={()=>moderate(r,'VISIBLE')} disabled={loading}><i className="fas fa-eye"></i></button>
                        )}
                        {r.status !== 'HIDDEN' && (
                          <button className="btn btn-sm btn-outline-secondary" onClick={()=>moderate(r,'HIDDEN')} disabled={loading}><i className="fas fa-eye-slash"></i></button>
                        )}
                        <button className="btn btn-sm btn-outline-danger" onClick={()=>remove(r)} disabled={loading}><i className="fas fa-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan="8" className="text-center text-muted py-4">No reviews found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-top d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <small className="text-muted">Showing {filtered.length} of {total} reviews</small>
              <select className="form-select form-select-sm" style={{width: 'auto'}} value={pageSize} onChange={e=>{ setPageSize(Number(e.target.value)); setPage(1); }}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <Pagination current={page} total={total} pageSize={pageSize} onChange={setPage} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reviews;
