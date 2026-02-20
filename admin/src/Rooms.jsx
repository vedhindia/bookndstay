import React, { useEffect, useMemo, useState } from 'react';
import { adminRooms } from './services/adminApi';
import Pagination from './components/Pagination';

const Rooms = () => {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All'); // All | Active | Inactive
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchRooms = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminRooms.list({ page, limit: pageSize, status: status !== 'All' ? status.toUpperCase() : undefined, q: query || undefined });
      const list = Array.isArray(res?.rooms)
        ? res.rooms
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.results)
        ? res.results
        : Array.isArray(res)
        ? res
        : [];
      const normalized = list.map((r) => ({
        id: r.id || r.room_id || r._id || '',
        hotel: r.hotel?.name || r.hotelName || '-',
        name: r.name || r.title || 'Room',
        type: r.type || r.category || 'Standard',
        price: r.price || r.basePrice || 0,
        capacity: r.capacity || r.maxGuests || 2,
        status: (r.status || 'ACTIVE').toString().toUpperCase(),
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

  useEffect(() => { fetchRooms(); }, [page, pageSize, status]);

  const filtered = useMemo(() => {
    return items.filter(r => {
      const q = query.toLowerCase();
      const textMatch = [r.name, r.type, r.hotel].filter(Boolean).some(v => String(v).toLowerCase().includes(q));
      const statusMatch = status === 'All' || r.status === status.toUpperCase();
      return textMatch && statusMatch;
    });
  }, [items, query, status]);

  const openEdit = (r) => {
    setEditing({ ...r });
  };

  const saveRoom = async () => {
    if (!editing) return;
    try {
      setLoading(true);
      const payload = {
        name: editing.name,
        type: editing.type,
        price: Number(editing.price),
        capacity: Number(editing.capacity),
        status: editing.status,
      };
      await adminRooms.update(editing.id, payload);
      setSuccess('Room updated successfully');
      setEditing(null);
      await fetchRooms();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to update room');
    } finally {
      setLoading(false);
      setTimeout(()=>setSuccess(''), 2200);
    }
  };

  const remove = async (r) => {
    if (!window.confirm('Delete this room?')) return;
    try {
      setLoading(true);
      await adminRooms.remove(r.id);
      setSuccess('Room deleted');
      await fetchRooms();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to delete room');
    } finally {
      setLoading(false);
      setTimeout(()=>setSuccess(''), 2200);
    }
  };

  return (
    <div className="container-fluid p-3 p-md-4">
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Rooms</h4>
          <small className="text-muted">Manage all rooms across hotels</small>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <input className="form-control" placeholder="Search by room/hotel/type" value={query} onChange={e=>setQuery(e.target.value)} />
          <select className="form-select" value={status} onChange={e=>{ setStatus(e.target.value); setPage(1); }}>
            <option>All</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
          <select className="form-select" value={pageSize} onChange={e=>{ setPageSize(Number(e.target.value)); setPage(1); }}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
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
                  <th>Room</th>
                  <th>Type</th>
                  <th>Capacity</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" className="text-center py-4">Loading rooms...</td></tr>
                ) : filtered.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.hotel}</td>
                    <td>{r.name}</td>
                    <td>{r.type}</td>
                    <td>{r.capacity}</td>
                    <td>₹{r.price}</td>
                    <td><span className={`badge ${r.status==='ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>{r.status}</span></td>
                    <td className="text-end">
                      <div className="btn-group">
                        <button className="btn btn-sm btn-outline-primary" onClick={()=>openEdit(r)}><i className="fas fa-edit"></i></button>
                        <button className="btn btn-sm btn-outline-danger" onClick={()=>remove(r)} disabled={loading}><i className="fas fa-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan="8" className="text-center text-muted py-4">No rooms found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-top d-flex justify-content-between align-items-center">
            <small className="text-muted">Showing {filtered.length} of {total} rooms</small>
            <Pagination current={page} total={total} pageSize={pageSize} onChange={setPage} />
          </div>
        </div>
      </div>

      {editing && (
        <div className="modal d-block" tabIndex="-1" role="dialog" onClick={()=>setEditing(null)}>
          <div className="modal-dialog modal-lg modal-dialog-centered" role="document" onClick={e=>e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Room - {editing.name}</h5>
                <button type="button" className="btn-close" onClick={()=>setEditing(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Room Name</label>
                    <input className="form-control" value={editing.name} onChange={e=>setEditing({...editing, name: e.target.value})} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Type</label>
                    <input className="form-control" value={editing.type} onChange={e=>setEditing({...editing, type: e.target.value})} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Capacity</label>
                    <input type="number" className="form-control" value={editing.capacity} onChange={e=>setEditing({...editing, capacity: e.target.value})} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Price (₹)</label>
                    <input type="number" className="form-control" value={editing.price} onChange={e=>setEditing({...editing, price: e.target.value})} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={editing.status} onChange={e=>setEditing({...editing, status: e.target.value})}>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={()=>setEditing(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveRoom} disabled={loading}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rooms;
