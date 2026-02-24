import React, { useEffect, useMemo, useState } from 'react';
import api from './services/apiClient';
import Pagination from './components/Pagination';
import { API_BASE_URL } from './config';

// Full form aligned to your DB columns
const initialForm = {
  id: null,
  vendor_id: '',
  name: '',
  description: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  latitude: '',
  longitude: '',
  map_url: '',
  amenitiesText: '',
  hotelFeaturesText: '',
  phone: '',
    email: '',
    // rating: '', // Removed manual rating
    total_rooms: '',
  available_rooms: '',
  ac_rooms: '',
  non_ac_rooms: '',
  base_price: '',
  ac_room_price: '',
  non_ac_room_price: '',
  check_in_time: '',
  check_out_time: '',
  cancellation_policy: '',
  gst_number: '',
  featured: false,
  status: 'APPROVED',
};

const STATUS_OPTIONS = ['APPROVED', 'PENDING', 'REJECTED'];

// Try to extract vendor id from localStorage
const getVendorIdFromLocalStorage = () => {
  try {
    const raw = localStorage.getItem('vendorUser');
    if (!raw) return undefined;
    const obj = JSON.parse(raw);
    return (
      obj.vendor_id ??
      obj.vendorId ??
      obj.id ??
      obj.userId ??
      (typeof obj.vendor === 'object' ? (obj.vendor.id ?? obj.vendor.vendor_id) : undefined)
    );
  } catch {
    return undefined;
  }
};

  // Ensure image URLs are absolute or at least app-root relative
  const toAbsoluteUrl = (u) => {
    if (!u) return '';
    // Already absolute
    if (/^https?:\/\//i.test(u)) return u;
    // Protocol-relative
    if (u.startsWith('//')) return (typeof window !== 'undefined' ? window.location.protocol : 'https:') + u;
    
    // Construct base from API_BASE_URL (removing /api if present, to get root)
    let base = API_BASE_URL.endsWith('/api') 
      ? API_BASE_URL.slice(0, -4) 
      : API_BASE_URL;

    // If base is empty or relative (e.g. from proxy), and we need absolute URL for images
    // (because proxy might not cover /uploads), fallback to localhost:3001 for dev
    if (!base || base.startsWith('/')) {
       base = 'https://bookndstay.com';
    }

    // Root-relative
    if (u.startsWith('/')) {
        // If it's like /uploads/..., prepend base
        return `${base}${u}`;
    }
    // Relative path, prepend base + /
    return `${base}/${u}`;
  };

// Extract image URL and id safely from various shapes
const toImageItem = (img) => {
  if (!img) return null;
  if (typeof img === 'string') return { id: undefined, url: toAbsoluteUrl(img) };

  const raw =
    img.url ||
    img.image_url ||
    img.imageUrl ||
    img.src ||
    img.path ||
    img.file ||
    img.file_url ||
    img.fileUrl ||
    img.filePath ||
    img.image ||
    img.imagePath ||
    img.location ||
    '';

  const id = img.id || img._id || img.image_id || undefined;
  const url = toAbsoluteUrl(raw);
  if (!url) return null;
  return { id, url };
};

// Parse amenities to array from backend
const parseAmenitiesToArray = (amen) => {
  if (!amen && amen !== '') return [];
  if (Array.isArray(amen)) return amen.map(String);
  if (typeof amen === 'string') {
    const trimmed = amen.trim();
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('"') || trimmed.startsWith("'"))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch { /* fall through */ }
    }
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

const Hotels = () => {
  // Table state
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // CRUD state
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editOriginal, setEditOriginal] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  // Images modal state
  const [showImages, setShowImages] = useState(false);
  const [imagesHotel, setImagesHotel] = useState(null);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);

  // Normalizer from API -> UI row and form
  const normalize = (h) => {
    const amenitiesArr = parseAmenitiesToArray(h.amenities);
    const hotelFeaturesArr = parseAmenitiesToArray(h.hotel_features);

    const imgListRaw = h.images || h.photos || h.gallery || [];
    const imgList = Array.isArray(imgListRaw)
      ? imgListRaw.map(toImageItem).filter(Boolean)
      : [];

    const statusUp = String(h.status || 'PENDING').toUpperCase();
    const finalStatus = STATUS_OPTIONS.includes(statusUp) ? statusUp : 'PENDING';

    return {
      id: h.id || h._id || h.hotel_id || '',
      vendor_id: h.vendor_id ?? '',
      name: h.name || '',
      description: h.description || '',
      address: h.address || '',
      city: h.city || '',
      state: h.state || '',
      pincode: h.pincode || '',
      country: h.country || 'India',
      latitude: h.latitude ?? '',
      longitude: h.longitude ?? '',
      map_url: h.map_url || '',
      amenitiesText: amenitiesArr.join(', '),
      hotelFeaturesText: hotelFeaturesArr.join(', '),
      phone: h.phone || '',
      email: h.email || '',
      rating: h.rating ?? '',
      total_rooms: h.total_rooms ?? '',
      available_rooms: h.available_rooms ?? '',
      ac_rooms: h.ac_rooms ?? '',
      non_ac_rooms: h.non_ac_rooms ?? '',
      base_price: h.base_price ?? '',
      ac_room_price: h.ac_room_price ?? '',
      non_ac_room_price: h.non_ac_room_price ?? '',
      check_in_time: h.check_in_time || '',
      check_out_time: h.check_out_time || '',
      cancellation_policy: h.cancellation_policy || '',
      gst_number: h.gst_number || '',
      featured: h.featured ?? false,
      status: finalStatus,
      images: imgList,
      createdAt: h.createdAt || h.created_at || h.created_date || '',
      updatedAt: h.updatedAt || h.updated_at || '',
    };
  };

  const fetchHotels = async () => {
    setLoading(true);
    setError('');
    try {
      const resResp = await api.get('/vendor/hotels', {
        params: {
          page,
          limit: pageSize,
          status: status !== 'All' ? status : undefined,
        },
      });
      const res = resResp?.data;
      const list = Array.isArray(res?.hotels)
        ? res.hotels
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.results)
        ? res.results
        : Array.isArray(res)
        ? res
        : [];
      const normalized = list.map(normalize);
      setItems(normalized);
      const computedTotal =
        res?.total ?? res?.pagination?.total ?? res?.meta?.total ?? res?.count ?? normalized.length;
      setTotal(Number(computedTotal));
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load hotels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, [page, pageSize, status]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q && status === 'All') return items;
    return items.filter((h) => {
      const matchesQuery = q
        ? [h.name, h.address, h.city, h.id]
            .some((v) => (v || '').toString().toLowerCase().includes(q))
        : true;
      const matchesStatus = status === 'All' || h.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [items, query, status]);

  // Handlers
  const openCreate = () => {
    setForm({ ...initialForm, status: 'APPROVED', country: 'India', featured: false });
    const vid = getVendorIdFromLocalStorage();
    if (vid !== undefined && vid !== '' && !Number.isNaN(Number(vid))) {
      setForm((f) => ({ ...f, vendor_id: String(vid) }));
    }
    setShowCreate(true);
  };

  const openEdit = (h) => {
    const normalized = { ...h };
    setEditOriginal(normalized);
    setForm({
      ...initialForm,
      ...normalized,
    });
    setShowEdit(true);
  };

  const closeModals = () => {
    setShowCreate(false);
    setShowEdit(false);
    setForm(initialForm);
    setEditOriginal(null);
  };

  // Build UI -> API payload for create
  const buildCreatePayload = (f) => {
    const amenitiesArr = f.amenitiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const hotelFeaturesArr = f.hotelFeaturesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      name: f.name?.trim(),
      description: f.description?.trim() || undefined,
      address: f.address?.trim() || '',
      city: f.city?.trim() || '',
      state: f.state?.trim() || '',
      pincode: f.pincode?.trim() || '',
      country: f.country?.trim() || 'India',
      map_url: f.map_url?.trim() || undefined,
      amenities: amenitiesArr,
      hotel_features: hotelFeaturesArr,
      phone: f.phone?.trim() || undefined,
      email: f.email?.trim() || undefined,
      total_rooms: f.total_rooms !== '' && f.total_rooms !== null && f.total_rooms !== undefined ? Number(f.total_rooms) : undefined,
      available_rooms: f.available_rooms !== '' && f.available_rooms !== null && f.available_rooms !== undefined ? Number(f.available_rooms) : undefined,
      ac_rooms: f.ac_rooms !== '' && f.ac_rooms !== null && f.ac_rooms !== undefined ? Number(f.ac_rooms) : undefined,
      non_ac_rooms: f.non_ac_rooms !== '' && f.non_ac_rooms !== null && f.non_ac_rooms !== undefined ? Number(f.non_ac_rooms) : undefined,
      base_price: f.base_price !== '' && f.base_price !== null && f.base_price !== undefined ? Number(f.base_price) : undefined,
      ac_room_price: f.ac_room_price !== '' && f.ac_room_price !== null && f.ac_room_price !== undefined ? Number(f.ac_room_price) : undefined,
      non_ac_room_price: f.non_ac_room_price !== '' && f.non_ac_room_price !== null && f.non_ac_room_price !== undefined ? Number(f.non_ac_room_price) : undefined,
      check_in_time: f.check_in_time?.trim() || undefined,
      check_out_time: f.check_out_time?.trim() || undefined,
      cancellation_policy: f.cancellation_policy?.trim() || undefined,
      gst_number: f.gst_number?.trim() || undefined,
      featured: Boolean(f.featured),
    };

    if (f.latitude !== '' && f.latitude !== null && f.latitude !== undefined) {
      const lat = Number(f.latitude);
      if (!Number.isNaN(lat)) payload.latitude = lat;
    }
    if (f.longitude !== '' && f.longitude !== null && f.longitude !== undefined) {
      const lng = Number(f.longitude);
      if (!Number.isNaN(lng)) payload.longitude = lng;
    }

    // Clean undefined values
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });

    return payload;
  };

  // Build UI -> API payload for update
  const buildUpdatePayload = (f) => {
    const amenitiesArr = f.amenitiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const hotelFeaturesArr = f.hotelFeaturesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      name: f.name?.trim(),
      description: f.description?.trim() || undefined,
      address: f.address?.trim() || '',
      city: f.city?.trim() || '',
      state: f.state?.trim() || '',
      pincode: f.pincode?.trim() || '',
      country: f.country?.trim() || 'India',
      map_url: f.map_url?.trim() || undefined,
      amenities: amenitiesArr,
      hotel_features: hotelFeaturesArr,
      phone: f.phone?.trim() || undefined,
      email: f.email?.trim() || undefined,
      total_rooms: f.total_rooms !== '' && f.total_rooms !== null && f.total_rooms !== undefined ? Number(f.total_rooms) : undefined,
      available_rooms: f.available_rooms !== '' && f.available_rooms !== null && f.available_rooms !== undefined ? Number(f.available_rooms) : undefined,
      ac_rooms: f.ac_rooms !== '' && f.ac_rooms !== null && f.ac_rooms !== undefined ? Number(f.ac_rooms) : undefined,
      non_ac_rooms: f.non_ac_rooms !== '' && f.non_ac_rooms !== null && f.non_ac_rooms !== undefined ? Number(f.non_ac_rooms) : undefined,
      base_price: f.base_price !== '' && f.base_price !== null && f.base_price !== undefined ? Number(f.base_price) : undefined,
      ac_room_price: f.ac_room_price !== '' && f.ac_room_price !== null && f.ac_room_price !== undefined ? Number(f.ac_room_price) : undefined,
      non_ac_room_price: f.non_ac_room_price !== '' && f.non_ac_room_price !== null && f.non_ac_room_price !== undefined ? Number(f.non_ac_room_price) : undefined,
      check_in_time: f.check_in_time?.trim() || undefined,
      check_out_time: f.check_out_time?.trim() || undefined,
      cancellation_policy: f.cancellation_policy?.trim() || undefined,
      gst_number: f.gst_number?.trim() || undefined,
      featured: Boolean(f.featured),
    };

    if (f.latitude !== '' && f.latitude !== null && f.latitude !== undefined) {
      const lat = Number(f.latitude);
      if (!Number.isNaN(lat)) payload.latitude = lat;
    }
    if (f.longitude !== '' && f.longitude !== null && f.longitude !== undefined) {
      const lng = Number(f.longitude);
      if (!Number.isNaN(lng)) payload.longitude = lng;
    }

    // Clean undefined values
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });

    return payload;
  };

  const validate = (f, forCreate = false) => {
    if (!f.name?.trim()) return 'Name is required';
    if (!f.address?.trim()) return 'Address is required';
    if (!f.city?.trim()) return 'City is required';
    return '';
  };

  const createHotel = async () => {
    const v = validate(form, true);
    if (v) {
      setError(v);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = buildCreatePayload(form);
      await api.post('/vendor/hotels', payload);
      setSuccess('Hotel created successfully');
      closeModals();
      await fetchHotels();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to create hotel');
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(''), 2500);
    }
  };

  const updateHotel = async () => {
    if (!form.id) return;
    const v = validate(form, false);
    if (v) {
      setError(v);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = buildUpdatePayload(form);

      await api.put(`/vendor/hotels/${form.id}`, payload);
      setSuccess('Hotel updated successfully');
      closeModals();
      await fetchHotels();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to update hotel');
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(''), 2500);
    }
  };

  const confirmDelete = (h) => {
    setToDelete(h);
    setDeleting(true);
  };

  const deleteHotel = async () => {
    if (!toDelete?.id) {
      setDeleting(false);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.delete(`/vendor/hotels/${toDelete.id}`);
      setSuccess('Hotel deleted');
      setDeleting(false);
      setToDelete(null);
      await fetchHotels();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to delete hotel');
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(''), 2500);
    }
  };

  const statusBadgeClass = (s) => {
    switch (s) {
      case 'APPROVED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'REJECTED':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  // Images management
  const openImages = async (hotel) => {
    setImagesHotel(hotel);
    setFiles([]);
    setShowImages(true);
    try {
      const resp = await api.get(`/vendor/hotels/${hotel.id}/images`);
      const payload = resp?.data;
      const list = Array.isArray(payload?.data?.images)
        ? payload.data.images
        : Array.isArray(payload?.images)
        ? payload.images
        : Array.isArray(payload)
        ? payload
        : [];
      const normalized = list.map(toImageItem).filter(Boolean);
      if (normalized.length > 0) {
        setImages(normalized);
        return;
      }
    } catch { /* ignore */ }
    setImages((hotel.images || []).map(toImageItem).filter(Boolean));
  };

  const closeImages = () => {
    setShowImages(false);
    setImagesHotel(null);
    setImages([]);
    setFiles([]);
  };

  const uploadImages = async () => {
    if (!imagesHotel?.id || files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('images', f));

      const postResp = await api.post(`/vendor/hotels/${imagesHotel.id}/images`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const postPayload = postResp?.data;
      const postImages = Array.isArray(postPayload?.data?.images)
        ? postPayload.data.images
        : Array.isArray(postPayload?.images)
        ? postPayload.images
        : [];

      if (postImages.length > 0) {
        const normalized = postImages.map(toImageItem).filter(Boolean);
        setImages(normalized);
      } else {
        try {
          const resp = await api.get(`/vendor/hotels/${imagesHotel.id}/images`);
          const payload = resp?.data;
          const list = Array.isArray(payload?.data?.images)
            ? payload.data.images
            : Array.isArray(payload?.images)
            ? payload.images
            : Array.isArray(payload)
            ? payload
            : [];
          const normalized = list.map(toImageItem).filter(Boolean);
          setImages(normalized);
        } catch {
          await fetchHotels();
          const updated = (items.find((x) => x.id === imagesHotel.id) || imagesHotel).images || [];
          setImages(updated.map(toImageItem).filter(Boolean));
        }
      }

      setSuccess('Images uploaded');
      setFiles([]);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to upload images');
    } finally {
      setUploading(false);
      setTimeout(() => setSuccess(''), 2500);
    }
  };

  const removeImage = async (img) => {
    if (!imagesHotel?.id) return;
    if (!img?.id) {
      setError('Cannot delete this image because it has no ID.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setUploading(true);
    setError('');
    try {
      await api.delete(`/vendor/images/${img.id}`);

      try {
        const resp = await api.get(`/vendor/hotels/${imagesHotel.id}/images`);
        const payload = resp?.data;
        const list = Array.isArray(payload?.data?.images)
          ? payload.data.images
          : Array.isArray(payload?.images)
          ? payload.images
          : Array.isArray(payload)
          ? payload
          : [];
        const normalized = list.map(toImageItem).filter(Boolean);
        setImages(normalized);
      } catch {
        await fetchHotels();
        const updated = (items.find((x) => x.id === imagesHotel.id) || imagesHotel).images || [];
        setImages(updated.map(toImageItem).filter(Boolean));
      }

      setSuccess('Image deleted');
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to delete image');
    } finally {
      setUploading(false);
      setTimeout(() => setSuccess(''), 2500);
    }
  };

  return (
    <div className="container-fluid p-3 p-md-4">
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Hotels</h4>
          <small className="text-muted">Manage your properties</small>
        </div>
        <div className="d-flex gap-2">
          <input
            className="form-control form-control-sm"
            placeholder="Search by name, address, city or ID"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="form-select form-select-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option>All</option>
            <option>APPROVED</option>
            <option>PENDING</option>
            <option>REJECTED</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <i className="fas fa-plus me-2"></i>New Hotel
          </button>
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
      <th>Sr.No</th>
      <th>Name</th>
      <th>Address</th>
      <th>City</th>
      <th>State</th>
      <th>Pincode</th>
      <th>Country</th>
      <th>Phone</th>
      <th>Email</th>
      <th>Rating</th>
      <th>Total Rooms</th>
      <th>Available Rooms</th>
      <th>Price (₹)</th>
      <th>Amenities</th>
      <th>Status</th>
      <th>Featured</th>
      <th>Added</th>
      <th className="text-end">Actions</th>
    </tr>
  </thead>
  <tbody>
    {loading ? (
      <tr>
        <td colSpan="18" className="text-center py-4">
          Loading hotels...
        </td>
      </tr>
    ) : (
      filteredItems.map((h, index) => {
        const serialNumber = index + 1;

        // ✅ Safely handle numeric fields
        const rating =
          typeof h.rating === 'number'
            ? h.rating.toFixed(1)
            : h.rating
            ? Number(h.rating).toFixed(1)
            : '-';

        return (
          <tr key={h.id}>
            <td>
              <span className="badge bg-light text-dark">{serialNumber}</span>
            </td>
            <td className="fw-semibold">{h.name || '-'}</td>
            <td className="text-truncate" style={{ maxWidth: 220 }}>
              {h.address || '-'}
            </td>
            <td>{h.city || '-'}</td>
            <td>{h.state || '-'}</td>
            <td>{h.pincode || '-'}</td>
            <td>{h.country || '-'}</td>
            <td>{h.phone || '-'}</td>
            <td>{h.email || '-'}</td>
            <td>{rating}</td>
            <td>{h.total_rooms || '-'}</td>
            <td>{h.available_rooms || '-'}</td>
            <td>{h.base_price ? `₹${h.base_price}` : '-'}</td>
            <td className="text-truncate" style={{ maxWidth: 200 }}>
              {h.amenitiesText || '-'}
            </td>
            <td>
              <span className={`badge bg-${statusBadgeClass(h.status)}`}>
                {h.status}
              </span>
            </td>
            <td>
              {h.featured ? (
                <span className="badge bg-success">Yes</span>
              ) : (
                <span className="badge bg-secondary">No</span>
              )}
            </td>
            <td>{(h.createdAt || '').slice(0, 10)}</td>
            <td className="text-end">
              <div className="btn-group">
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => openEdit(h)}
                  title="Edit"
                >
                  <i className="fas fa-pen"></i>
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => openImages(h)}
                  title="Images"
                >
                  <i className="fas fa-image"></i>
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => confirmDelete(h)}
                  title="Delete"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        );
      })
    )}
    {!loading && filteredItems.length === 0 && (
      <tr>
        <td colSpan="18" className="text-center text-muted py-4">
          No hotels found
        </td>
      </tr>
    )}
  </tbody>
</table>


          </div>
          <div className="p-3 border-top d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <small className="text-muted">
                Showing {filteredItems.length} of {total} hotels
              </small>
              <select
                className="form-select form-select-sm"
                style={{ width: 'auto' }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <Pagination current={page} total={total} pageSize={pageSize} onChange={setPage} />
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal d-block" tabIndex="-1" onClick={closeModals}>
          <div className="modal-dialog modal-xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">New Hotel</h5>
                <button className="btn-close" onClick={closeModals}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label">Name <span className="text-danger">*</span></label>
                    <input
                      className="form-control"
                      placeholder="Grand Plaza Hotel"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Featured</label>
                    <select
                      className="form-select"
                      value={form.featured ? 'true' : 'false'}
                      onChange={(e) => setForm({ ...form, featured: e.target.value === 'true' })}
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </div>

                  <div className="col-md-12">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="A luxurious 5-star hotel in the heart of the city"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Address <span className="text-danger">*</span></label>
                    <input
                      className="form-control"
                      placeholder="123 Main Street"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">City <span className="text-danger">*</span></label>
                    <input
                      className="form-control"
                      placeholder="Mumbai"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">State</label>
                    <input
                      className="form-control"
                      placeholder="Maharashtra"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Pincode</label>
                    <input
                      className="form-control"
                      placeholder="400001"
                      value={form.pincode}
                      onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Country</label>
                    <input
                      className="form-control"
                      placeholder="India"
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Latitude</label>
                    <input
                      className="form-control"
                      type="number"
                      step="any"
                      placeholder="19.0760"
                      value={form.latitude}
                      onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Longitude</label>
                    <input
                      className="form-control"
                      type="number"
                      step="any"
                      placeholder="72.8777"
                      value={form.longitude}
                      onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                    />
                  </div>
                  <div className="col-md-12">
                    <label className="form-label">Map URL</label>
                    <input
                      className="form-control"
                      placeholder="https://maps.google.com/..."
                      value={form.map_url}
                      onChange={(e) => setForm({ ...form, map_url: e.target.value })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Phone</label>
                    <input
                      className="form-control"
                      placeholder="+91-22-12345678"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input
                      className="form-control"
                      type="email"
                      placeholder="contact@grandplaza.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>


                  <div className="col-md-3">
                    <label className="form-label">Total Rooms</label>
                    <input
                      className="form-control"
                      type="number"
                      placeholder="50"
                      value={form.total_rooms}
                      onChange={(e) => setForm({ ...form, total_rooms: e.target.value })}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Available Rooms</label>
                    <input
                      className="form-control"
                      type="number"
                      placeholder="50"
                      value={form.available_rooms}
                      onChange={(e) => setForm({ ...form, available_rooms: e.target.value })}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">AC Rooms</label>
                    <input
                      className="form-control"
                      type="number"
                      placeholder="25"
                      value={form.ac_rooms}
                      onChange={(e) => setForm({ ...form, ac_rooms: e.target.value })}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Non-AC Rooms</label>
                    <input
                      className="form-control"
                      type="number"
                      placeholder="25"
                      value={form.non_ac_rooms}
                      onChange={(e) => setForm({ ...form, non_ac_rooms: e.target.value })}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Base Price (₹)</label>
                    <input
                      className="form-control"
                      type="number"
                      step="0.01"
                      placeholder="2499.00"
                      value={form.base_price}
                      onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">AC Room Price (₹)</label>
                    <input
                      className="form-control"
                      type="number"
                      step="0.01"
                      placeholder="2999.00"
                      value={form.ac_room_price}
                      onChange={(e) => setForm({ ...form, ac_room_price: e.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Non-AC Room Price (₹)</label>
                    <input
                      className="form-control"
                      type="number"
                      step="0.01"
                      placeholder="1999.00"
                      value={form.non_ac_room_price}
                      onChange={(e) => setForm({ ...form, non_ac_room_price: e.target.value })}
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Check-in Time</label>
                    <input
                      className="form-control"
                      placeholder="12:00 PM"
                      value={form.check_in_time}
                      onChange={(e) => setForm({ ...form, check_in_time: e.target.value })}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Check-out Time</label>
                    <input
                      className="form-control"
                      placeholder="11:00 AM"
                      value={form.check_out_time}
                      onChange={(e) => setForm({ ...form, check_out_time: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">GST Number</label>
                    <input
                      className="form-control"
                      placeholder="GSTIN123456789"
                      value={form.gst_number}
                      onChange={(e) => setForm({ ...form, gst_number: e.target.value })}
                    />
                  </div>

                  <div className="col-md-12">
                    <label className="form-label">Cancellation Policy</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Free cancellation up to 24 hours before check-in."
                      value={form.cancellation_policy}
                      onChange={(e) => setForm({ ...form, cancellation_policy: e.target.value })}
                    />
                  </div>

                  <div className="col-md-12">
                    <label className="form-label">Amenities (comma-separated)</label>
                    <input
                      className="form-control"
                      placeholder="WiFi, Pool, Gym, Spa, Restaurant, Parking"
                      value={form.amenitiesText}
                      onChange={(e) => setForm({ ...form, amenitiesText: e.target.value })}
                    />
                    <div className="form-text">Separate amenities with commas</div>
                  </div>
                  <div className="col-md-12">
                    <label className="form-label">Hotel Features (comma-separated)</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Sea View, Near Airport, 24/7 Security"
                      value={form.hotelFeaturesText}
                      onChange={(e) => setForm({ ...form, hotelFeaturesText: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeModals}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={createHotel} disabled={saving}>
                  {saving ? 'Creating...' : 'Create Hotel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="modal d-block" tabIndex="-1" onClick={closeModals}>
          <div className="modal-dialog modal-xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Hotel</h5>
                <button className="btn-close" onClick={closeModals}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label">Name <span className="text-danger">*</span></label>
                    <input
                      className="form-control"
                      placeholder="Grand Plaza Hotel"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Featured</label>
                    <select
                      className="form-select"
                      value={form.featured ? 'true' : 'false'}
                      onChange={(e) => setForm({ ...form, featured: e.target.value === 'true' })}
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </div>

                  <div className="col-md-12">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="A luxurious 5-star hotel in the heart of the city"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Address <span className="text-danger">*</span></label>
                    <input
                      className="form-control"
                      placeholder="123 Main Street"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">City <span className="text-danger">*</span></label>
                    <input
                      className="form-control"
                      placeholder="Mumbai"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">State</label>
                    <input
                      className="form-control"
                      placeholder="Maharashtra"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Pincode</label>
                    <input
                      className="form-control"
                      placeholder="400001"
                      value={form.pincode}
                      onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Country</label>
                    <input
                      className="form-control"
                      placeholder="India"
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Latitude</label>
                    <input
                      className="form-control"
                      type="number"
                      step="any"
                      placeholder="19.0760"
                      value={form.latitude}
                      onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Longitude</label>
                    <input
                      className="form-control"
                      type="number"
                      step="any"
                      placeholder="72.8777"
                      value={form.longitude}
                      onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                    />
                  </div>
                  <div className="col-md-12">
                    <label className="form-label">Map URL</label>
                    <input
                      className="form-control"
                      placeholder="https://maps.google.com/..."
                      value={form.map_url}
                      onChange={(e) => setForm({ ...form, map_url: e.target.value })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Phone</label>
                    <input
                      className="form-control"
                      placeholder="+91-22-12345678"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input
                      className="form-control"
                      type="email"
                      placeholder="contact@grandplaza.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>


                  <div className="col-md-3">
                    <label className="form-label">Total Rooms</label>
                    <input
                      className="form-control"
                      type="number"
                      placeholder="50"
                      value={form.total_rooms}
                      onChange={(e) => setForm({ ...form, total_rooms: e.target.value })}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Available Rooms</label>
                    <input
                      className="form-control"
                      type="number"
                      placeholder="50"
                      value={form.available_rooms}
                      onChange={(e) => setForm({ ...form, available_rooms: e.target.value })}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">AC Rooms</label>
                    <input
                      className="form-control"
                      type="number"
                      placeholder="25"
                      value={form.ac_rooms}
                      onChange={(e) => setForm({ ...form, ac_rooms: e.target.value })}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Non-AC Rooms</label>
                    <input
                      className="form-control"
                      type="number"
                      placeholder="25"
                      value={form.non_ac_rooms}
                      onChange={(e) => setForm({ ...form, non_ac_rooms: e.target.value })}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Base Price (₹)</label>
                    <input
                      className="form-control"
                      type="number"
                      step="0.01"
                      placeholder="2499.00"
                      value={form.base_price}
                      onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">AC Room Price (₹)</label>
                    <input
                      className="form-control"
                      type="number"
                      step="0.01"
                      placeholder="2999.00"
                      value={form.ac_room_price}
                      onChange={(e) => setForm({ ...form, ac_room_price: e.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Non-AC Room Price (₹)</label>
                    <input
                      className="form-control"
                      type="number"
                      step="0.01"
                      placeholder="1999.00"
                      value={form.non_ac_room_price}
                      onChange={(e) => setForm({ ...form, non_ac_room_price: e.target.value })}
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Check-in Time</label>
                    <input
                      className="form-control"
                      placeholder="12:00 PM"
                      value={form.check_in_time}
                      onChange={(e) => setForm({ ...form, check_in_time: e.target.value })}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Check-out Time</label>
                    <input
                      className="form-control"
                      placeholder="11:00 AM"
                      value={form.check_out_time}
                      onChange={(e) => setForm({ ...form, check_out_time: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">GST Number</label>
                    <input
                      className="form-control"
                      placeholder="GSTIN123456789"
                      value={form.gst_number}
                      onChange={(e) => setForm({ ...form, gst_number: e.target.value })}
                    />
                  </div>

                  <div className="col-md-12">
                    <label className="form-label">Cancellation Policy</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Free cancellation up to 24 hours before check-in."
                      value={form.cancellation_policy}
                      onChange={(e) => setForm({ ...form, cancellation_policy: e.target.value })}
                    />
                  </div>

                  <div className="col-md-12">
                    <label className="form-label">Amenities (comma-separated)</label>
                    <input
                      className="form-control"
                      placeholder="WiFi, Pool, Gym, Spa, Restaurant, Parking"
                      value={form.amenitiesText}
                      onChange={(e) => setForm({ ...form, amenitiesText: e.target.value })}
                    />
                    <div className="form-text">Separate amenities with commas</div>
                  </div>
                  <div className="col-md-12">
                    <label className="form-label">Hotel Features (comma-separated)</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Sea View, Near Airport, 24/7 Security"
                      value={form.hotelFeaturesText}
                      onChange={(e) => setForm({ ...form, hotelFeaturesText: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeModals}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={updateHotel} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Images Modal */}
      {showImages && (
        <div className="modal d-block" tabIndex="-1" onClick={closeImages}>
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Images: {imagesHotel?.name}</h5>
                <button className="btn-close" onClick={closeImages}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="form-control"
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  />
                  <div className="form-text">Select one or more images to upload (max 10).</div>
                </div>

                <div className="d-flex flex-wrap gap-3">
                  {images.length === 0 && <div className="text-muted">No images found</div>}
                  {images.map((img, idx) => (
                    <div key={img.id || img.url || idx} className="card" style={{ width: 160 }}>
                      <img src={img.url} alt="Hotel" className="card-img-top" style={{ height: 100, objectFit: 'cover' }} />
                      <div className="card-body p-2 d-flex justify-content-between">
                        <a href={img.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary">
                          View
                        </a>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removeImage(img)}
                          disabled={uploading}
                          title={img.id ? 'Delete' : 'Cannot delete without image ID'}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeImages}>
                  Close
                </button>
                <button className="btn btn-primary" onClick={uploadImages} disabled={uploading || files.length === 0}>
                  {uploading ? 'Uploading...' : 'Upload Selected'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleting && (
        <div className="modal d-block" tabIndex="-1" onClick={() => setDeleting(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Delete Hotel</h5>
                <button className="btn-close" onClick={() => setDeleting(false)}></button>
              </div>
              <div className="modal-body">
                Are you sure you want to delete <strong>{toDelete?.name}</strong>?
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setDeleting(false)}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={deleteHotel} disabled={saving}>
                  {saving ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal backdrop styles */}
      <style>{`
        .modal.d-block {
          background: rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </div>
  );
};

export default Hotels;
