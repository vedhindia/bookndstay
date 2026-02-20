import React, { useEffect, useMemo, useState } from 'react';
import api from './services/apiClient';
import Pagination from './components/Pagination';

const Rooms = () => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchRooms = async () => {
    setLoading(true);
    setError('');
    try {
      const resResp = await api.get('/vendor/rooms', {
        params: {
          page,
          limit: pageSize,
          status: status !== 'All' ? status.toUpperCase() : undefined,
          q: query || undefined,
        }
      });
      const res = resResp?.data;
      const list = Array.isArray(res?.rooms)
        ? res.rooms
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.results)
        ? res.results
        : Array.isArray(res)
        ? res
        : [];
      const normalized = list.map(r => ({
        id: r.id || r._id || '',
        name: r.name || r.title || '',
        hotel: r.hotel?.name || r.hotelName || '',
        price: r.price || r.basePrice || 0,
        status: (r.status || 'ACTIVE').toString().toUpperCase(),
        capacity: r.capacity || r.maxGuests || 0
      }));
      setItems(normalized);
      const computedTotal = res?.total ?? res?.pagination?.total ?? res?.meta?.total ?? res?.count ?? normalized.length;
      setTotal(Number(computedTotal));
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [page, pageSize, status]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter(r => {
      const matches = [r.name, r.hotel, r.id].some(v => (v || '').toLowerCase().includes(q));
      const statusMatch = status === 'All' || r.status === status.toUpperCase();
      return matches && statusMatch;
    });
  }, [query, status, items]);

  const startEdit = (room) => {
    setEditing({
      id: room.id,
      name: room.name,
      price: room.price,
      capacity: room.capacity,
      status: room.status === 'ACTIVE' ? 'Active' : room.status
    });
  };

  const saveEdit = async () => {
    try {
      setLoading(true);
      const payload = {
        name: editing.name,
        price: Number(editing.price),
        capacity: Number(editing.capacity),
        status: (editing.status || 'ACTIVE').toUpperCase(),
      };
      await api.put(`/vendor/rooms/${editing.id}`, payload);
      setSuccess('Room updated successfully');
      setEditing(null);
      await fetchRooms();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to update room');
    } finally {
      setLoading(false);
      setTimeout(()=>setSuccess(''), 2500);
    }
  };

  const removeRoom = async (r) => {
    if (!window.confirm(`Delete room ${r.name}?`)) return;
    try {
      setLoading(true);
      await api.delete(`/vendor/rooms/${r.id}`);
      setSuccess('Room deleted');
      await fetchRooms();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to delete room');
    } finally {
      setLoading(false);
      setTimeout(()=>setSuccess(''), 2500);
    }
  };

  return (
    <div className="container-fluid p-3 p-md-4">
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Rooms</h4>
          <small className="text-muted">Manage your rooms</small>
        </div>
        <div className="d-flex gap-2">
          <input className="form-control" placeholder="Search rooms..." value={query} onChange={e=>{ setQuery(e.target.value); setPage(1); }} />
          <select className="form-select" value={status} onChange={e=>{ setStatus(e.target.value); setPage(1); }}>
            <option>All</option>
            <option>ACTIVE</option>
            <option>INACTIVE</option>
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
                  <th>Name</th>
                  <th>Hotel</th>
                  <th>Capacity</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-4">Loading rooms...</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id}>
                    <td className="fw-semibold">{r.name}</td>
                    <td>{r.hotel}</td>
                    <td>{r.capacity}</td>
                    <td>₹{r.price}</td>
                    <td>
                      <span className={`badge bg-${r.status === 'ACTIVE' ? 'success' : 'secondary'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="btn-group">
                        <button className="btn btn-sm btn-outline-primary" onClick={()=>startEdit(r)}>
                          <i className="fas fa-pen"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={()=>removeRoom(r)}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan="6" className="text-center text-muted py-4">No rooms found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-top d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <small className="text-muted">Showing {filtered.length} of {total} rooms</small>
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

      {/* Edit Modal */}
      {editing && (
        <div className="modal d-block" tabIndex="-1" onClick={()=>setEditing(null)}>
          <div className="modal-dialog" onClick={e=>e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Room</h5>
                <button className="btn-close" onClick={()=>setEditing(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Name</label>
                    <input className="form-control" value={editing.name} onChange={e=>setEditing({...editing, name: e.target.value})} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Price</label>
                    <input type="number" className="form-control" value={editing.price} onChange={e=>setEditing({...editing, price: e.target.value})} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Capacity</label>
                    <input type="number" className="form-control" value={editing.capacity} onChange={e=>setEditing({...editing, capacity: e.target.value})} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={editing.status} onChange={e=>setEditing({...editing, status: e.target.value})}>
                      <option>Active</option>
                      <option>INACTIVE</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={()=>setEditing(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveEdit} disabled={loading}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rooms;