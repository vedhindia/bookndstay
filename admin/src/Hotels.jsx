import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminHotels } from "./services/adminApi";
import Pagination from "./components/Pagination";

const mockHotels = [
  { id: "H001", name: "Grand Plaza", city: "Mumbai", vendor: "Apex Travels", status: "PENDING", rooms: 120, rating: 4.3 },
  { id: "H002", name: "Beach Resort", city: "Goa", vendor: "SeaLine", status: "APPROVED", rooms: 80, rating: 4.6 },
  { id: "H003", name: "Mountain View", city: "Manali", vendor: "HighPeak", status: "REJECTED", rooms: 60, rating: 4.1 },
];

const StatusBadge = ({ status }) => {
  const color =
    status === "APPROVED" ? "success" :
      status === "PENDING" ? "warning" :
        status === "REJECTED" ? "danger" : "secondary";
  return <span className={`badge bg-${color}`}>{status}</span>;
};

const Hotels = ({ vendorId }) => {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchHotels = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminHotels.list({
        page,
        limit: pageSize,
        vendor_id: vendorId || undefined,
        status: status !== "All" ? status : undefined,
        search: query || undefined,
      });

      const list = Array.isArray(res?.data?.hotels)
        ? res.data.hotels
        : Array.isArray(res?.hotels)
          ? res.hotels
          : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
              ? res
              : [];

      const normalized = list.map((h) => ({
        id: h.id || h.hotel_id || h._id || "",
        name: h.name || h.full_name || "Hotel",
        city: h.city || h.address || "",
        vendor: h.vendor?.full_name || h.vendor_name || h.owner || "",
        status: (h.status || "PENDING").toString().toUpperCase(),
        // Fix: check total_rooms as well
        rooms: h.rooms?.length || h.roomsCount || h.total_rooms || h.totalRooms || 0,
        // Preserve raw total_rooms for details view fallback
        total_rooms: h.total_rooms || h.totalRooms || 0,
        rating: h.rating || h.averageRating || 0,
        address: h.address || "",
        amenities: h.amenities ? JSON.parse(h.amenities) : [],
        vendorDetails: h.vendor || {},
        // Preserve other raw data if needed
        email: h.email || "",
        phone: h.phone || h.contact_number || "",
        check_in_time: h.check_in_time || "",
        check_out_time: h.check_out_time || "",
        price_range: h.price_range || "",
        ac_room_price: h.ac_room_price,
        non_ac_room_price: h.non_ac_room_price,
        base_price: h.base_price
      }));

      setItems(normalized);
      const computedTotal = res?.total ?? res?.pagination?.total ?? res?.meta?.total ?? res?.count ?? normalized.length;
      setTotal(Number(computedTotal));
    } catch (e) {
      console.warn("Failed to load hotels, using mock", e?.message);
      // Only use mock data if it's a real error, not just empty results
      if (items.length === 0) {
          // Keep current items or empty if really failed
          setItems([]);
      }
      setError("Could not load hotels from server. " + (e?.response?.data?.message || e?.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, [page, pageSize, status, vendorId, query]);

  const filtered = items;

  const handleViewDetails = async (hotel) => {
    setSelected(hotel);
    setLoadingDetails(true);
    try {
      const res = await adminHotels.getById(hotel.id);
      
      // Unwrap the response to find the hotel object
      // Robust unwrapping to handle {data: {hotel: ...}} or {hotel: ...} structure
      let data = {};
      if (res.data && res.data.hotel) {
        data = res.data.hotel;
      } else if (res.hotel) {
        data = res.hotel;
      } else if (res.data) {
        data = res.data;
      } else {
        data = res;
      }

      console.log("Fetched hotel details:", data);

      // Merge fetched details with existing basic info
      // Note: We prioritize data from API (data) over list data (hotel)
      const fullDetails = {
        ...hotel,
        ...data,
        // Ensure critical fields are preserved/mapped if API returns different structure
        vendorDetails: data.vendor || data.vendorDetails || hotel.vendorDetails || {},
        amenities: data.amenities ? (typeof data.amenities === 'string' ? JSON.parse(data.amenities) : data.amenities) : hotel.amenities,
        images: data.images ? (typeof data.images === 'string' ? JSON.parse(data.images) : data.images) : [],
        description: data.description || hotel.description || "No description available.",
        phone: data.phone || data.contact_number || hotel.phone || "N/A",
        email: data.email || hotel.email || "N/A",
        checkIn: data.check_in_time || hotel.check_in_time || "N/A",
        checkOut: data.check_out_time || hotel.check_out_time || "N/A",
        rooms: data.rooms_count !== undefined ? data.rooms_count : (hotel.total_rooms || hotel.rooms),
        price_range: data.price_range || hotel.price_range || calculatePriceRange(hotel),
        
        // Extended Details Mapping
        state: data.state || hotel.state || "N/A",
        pincode: data.pincode || hotel.pincode || "N/A",
        country: data.country || hotel.country || "India",
        latitude: data.latitude || hotel.latitude || null,
        longitude: data.longitude || hotel.longitude || null,
        map_url: data.map_url || hotel.map_url || null,
        
        booked_room: data.booked_room || hotel.booked_room || 0,
        available_rooms: data.available_rooms || hotel.available_rooms || 0,
        ac_rooms: data.ac_rooms || hotel.ac_rooms || 0,
        non_ac_rooms: data.non_ac_rooms || hotel.non_ac_rooms || 0,
        
        ac_room_price: data.ac_room_price || hotel.ac_room_price || "N/A",
        non_ac_room_price: data.non_ac_room_price || hotel.non_ac_room_price || "N/A",
        base_price: data.base_price || hotel.base_price || "N/A",
        
        gst_number: data.gst_number || hotel.gst_number || "N/A",
        cancellation_policy: data.cancellation_policy || hotel.cancellation_policy || "No policy specified",
        
        hotel_features: data.hotel_features ? (typeof data.hotel_features === 'string' ? JSON.parse(data.hotel_features) : data.hotel_features) : (hotel.hotel_features ? (typeof hotel.hotel_features === 'string' ? JSON.parse(hotel.hotel_features) : hotel.hotel_features) : []),
        featured: data.featured !== undefined ? data.featured : (hotel.featured || false),
        createdAt: data.createdAt || hotel.createdAt || null,
        updatedAt: data.updatedAt || hotel.updatedAt || null,
      };
      console.log("Full details object:", fullDetails);
      setSelected(fullDetails);
    } catch (err) {
      console.error("Failed to fetch hotel details:", err);
      // Fallback to list data with calculated fields if API fails
      const fallbackDetails = {
        ...hotel,
        vendorDetails: hotel.vendorDetails || {},
        amenities: hotel.amenities ? (typeof hotel.amenities === 'string' ? JSON.parse(hotel.amenities) : hotel.amenities) : [],
        images: hotel.images ? (typeof hotel.images === 'string' ? JSON.parse(hotel.images) : hotel.images) : [],
        description: hotel.description || "No description available.",
        phone: hotel.phone || hotel.contact_number || "N/A",
        email: hotel.email || "N/A",
        checkIn: hotel.check_in_time || "N/A",
        checkOut: hotel.check_out_time || "N/A",
        rooms: hotel.total_rooms || hotel.rooms,
        price_range: hotel.price_range || calculatePriceRange(hotel),
        
        // Extended Fallback
        state: hotel.state || "N/A",
        pincode: hotel.pincode || "N/A",
        country: hotel.country || "India",
        map_url: hotel.map_url || null,
        booked_room: hotel.booked_room || 0,
        available_rooms: hotel.available_rooms || 0,
        ac_rooms: hotel.ac_rooms || 0,
        non_ac_rooms: hotel.non_ac_rooms || 0,
        ac_room_price: hotel.ac_room_price || "N/A",
        non_ac_room_price: hotel.non_ac_room_price || "N/A",
        base_price: hotel.base_price || "N/A",
        gst_number: hotel.gst_number || "N/A",
        cancellation_policy: hotel.cancellation_policy || "No policy specified",
        hotel_features: hotel.hotel_features ? (typeof hotel.hotel_features === 'string' ? JSON.parse(hotel.hotel_features) : hotel.hotel_features) : [],
        featured: hotel.featured || false,
        createdAt: hotel.createdAt || null,
        updatedAt: hotel.updatedAt || null,
      };
      setSelected(fallbackDetails);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Helper to calculate price range on client side
  const calculatePriceRange = (hotel) => {
    if (!hotel) return "N/A";
    const acPrice = Number(hotel.ac_room_price) || 0;
    const nonAcPrice = Number(hotel.non_ac_room_price) || 0;
    const basePrice = Number(hotel.base_price) || 0;

    if (acPrice > 0 && nonAcPrice > 0) {
      const min = Math.min(acPrice, nonAcPrice);
      const max = Math.max(acPrice, nonAcPrice);
      return min === max ? `₹${min}` : `₹${min} - ₹${max}`;
    } else if (basePrice > 0) {
      return `₹${basePrice}`;
    }
    return "N/A";
  };

  const [targetHotel, setTargetHotel] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  const openStatusModal = (hotel) => {
    setTargetHotel(hotel);
    setNewStatus(hotel.status);
    setShowStatusModal(true);
    setError("");
    setSuccess("");
  };

  const handleSaveStatus = async () => {
    if (!targetHotel || !newStatus) return;
    
    setUpdating(true);
    setError("");
    
    try {
      await adminHotels.updateStatus(targetHotel.id, newStatus);
      setSuccess(`Status for "${targetHotel.name}" updated to ${newStatus}`);
      setShowStatusModal(false);
      fetchHotels(); // Refresh list
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Failed to update status:", err);
      setError(err?.response?.data?.message || "Failed to update hotel status");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="container-fluid p-3 p-md-4">
      {/* Header */}
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Hotels</h4>
          <small className="text-muted">View and manage hotel listings</small>
        </div>
        <div className="d-flex gap-2">
          <input
            className="form-control"
            placeholder="Search hotels..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>All</option>
            <option>PENDING</option>
            <option>APPROVED</option>
            <option>REJECTED</option>
          </select>
        </div>
      </div>

      {/* Alerts */}
      {success && <div className="alert alert-success py-2">{success}</div>}
      {error && <div className="alert alert-warning py-2">{error}</div>}

      {/* Hotels Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Sr No.</th>
                  <th>Hotel</th>
                  <th>City</th>
                  <th>Vendor</th>
                  <th>Rooms</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      Loading hotels...
                    </td>
                  </tr>
                ) : filtered.map((h, index) => (
                  <tr key={h.id}>
                    <td>{(page - 1) * pageSize + index + 1}</td>
                    <td>{h.name}</td>
                    <td>{h.city}</td>
                    <td>{h.vendor}</td>
                    <td>{h.rooms}</td>
                    <td><i className="fas fa-star text-warning me-1"></i>{h.rating}</td>
                    <td><StatusBadge status={h.status} /></td>
                    <td className="text-end">
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-outline-primary"
                                 onClick={() => setSelected(h)}
                          title="View Details"
                        >
                          <i className="fas fa-eye"></i> View
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => openStatusModal(h)}
                          title="Update Status"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center text-muted py-4">
                      No hotels found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="p-3 border-top d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <small className="text-muted">
              Showing {filtered.length} of {total} hotels
            </small>
            <select
              className="form-select form-select-sm"
              style={{ width: "auto" }}
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

      {/* Hotel Details Offcanvas */}
      {selected && (
        <div className="offcanvas offcanvas-end show" tabIndex="-1" style={{ visibility: "visible", width: "600px" }}>
          <div className="offcanvas-header bg-light">
            <h5 className="offcanvas-title">Hotel Details - {selected.name}</h5>
            <button type="button" className="btn-close" onClick={() => setSelected(null)}></button>
          </div>
          <div className="offcanvas-body">
            {loadingDetails && (
              <div className="d-flex justify-content-center my-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading details...</span>
                </div>
              </div>
            )}
            
            <div className={`fade ${!loadingDetails ? "show" : ""}`}>
              {/* Status Section */}
              <div className="d-flex align-items-center justify-content-between mb-4 p-3 bg-light rounded">
                <div className="d-flex align-items-center gap-2">
                  <strong>Current Status:</strong> <StatusBadge status={selected.status} />
                  {selected.featured && <span className="badge bg-warning text-dark"><i className="fas fa-star me-1"></i>Featured</span>}
                </div>
                <button 
                  className="btn btn-sm btn-link p-0 text-decoration-none"
                  onClick={() => {
                    setSelected(null);
                    openStatusModal(selected);
                  }}
                >
                  (Change Status)
                </button>
              </div>

              {/* Images Preview (if available) */}
              {selected.images && selected.images.length > 0 && (
                <div className="mb-4">
                  <h6 className="border-bottom pb-2 mb-3">Gallery</h6>
                  <div className="d-flex gap-2 overflow-auto pb-2">
                    {selected.images.map((img, idx) => (
                      <img 
                        key={idx} 
                        src={typeof img === 'string' ? img : img.url} 
                        alt={`Hotel ${idx}`} 
                        className="rounded"
                        style={{ width: '120px', height: '80px', objectFit: 'cover' }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="row g-4">
                {/* Basic Info & Location */}
                <div className="col-12">
                  <h6 className="border-bottom pb-2 mb-3 text-primary"><i className="fas fa-info-circle me-2"></i>Basic Information</h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <small className="text-muted d-block">Location</small>
                      <span className="fw-medium">{selected.city}, {selected.state}</span>
                      <div className="small text-muted">{selected.country} - {selected.pincode}</div>
                    </div>
                    <div className="col-md-6">
                      <small className="text-muted d-block">Rating</small>
                      <span><i className="fas fa-star text-warning me-1"></i>{selected.rating} / 5</span>
                    </div>
                    <div className="col-12">
                      <small className="text-muted d-block">Full Address</small>
                      <p className="mb-0 small">{selected.address}</p>
                      {selected.latitude && selected.longitude && (
                        <div className="mt-1 small">
                          <i className="fas fa-map-marker-alt me-1 text-danger"></i>
                          {selected.latitude}, {selected.longitude}
                          {selected.map_url && (
                            <a href={selected.map_url} target="_blank" rel="noopener noreferrer" className="ms-2">
                              View on Map
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="col-12">
                      <small className="text-muted d-block">Description</small>
                      <p className="text-muted small mb-0">{selected.description}</p>
                    </div>
                  </div>
                </div>

                {/* Room Statistics */}
                <div className="col-12">
                  <h6 className="border-bottom pb-2 mb-3 text-primary"><i className="fas fa-bed me-2"></i>Room Statistics</h6>
                  <div className="row g-3">
                    <div className="col-4 text-center">
                      <div className="border rounded p-2">
                        <small className="text-muted d-block">Total</small>
                        <strong className="h5 mb-0">{selected.total_rooms || selected.rooms}</strong>
                      </div>
                    </div>
                    <div className="col-4 text-center">
                      <div className="border rounded p-2 bg-success-subtle">
                        <small className="text-muted d-block">Available</small>
                        <strong className="h5 mb-0 text-success">{selected.available_rooms}</strong>
                      </div>
                    </div>
                    <div className="col-4 text-center">
                      <div className="border rounded p-2 bg-warning-subtle">
                        <small className="text-muted d-block">Booked</small>
                        <strong className="h5 mb-0 text-warning">{selected.booked_room}</strong>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="d-flex justify-content-between border-bottom pb-1">
                        <small>AC Rooms:</small>
                        <strong>{selected.ac_rooms}</strong>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="d-flex justify-content-between border-bottom pb-1">
                        <small>Non-AC Rooms:</small>
                        <strong>{selected.non_ac_rooms}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pricing Details */}
                <div className="col-12">
                  <h6 className="border-bottom pb-2 mb-3 text-primary"><i className="fas fa-tag me-2"></i>Pricing Details</h6>
                  <div className="row g-3">
                     <div className="col-6">
                      <small className="text-muted d-block">Price Range</small>
                      <span className="fw-bold text-success">{selected.price_range}</span>
                    </div>
                    <div className="col-6">
                      <small className="text-muted d-block">Base Price</small>
                      <span>₹{selected.base_price}</span>
                    </div>
                    <div className="col-6">
                      <small className="text-muted d-block">AC Room Price</small>
                      <span>{selected.ac_room_price ? `₹${selected.ac_room_price}` : 'N/A'}</span>
                    </div>
                    <div className="col-6">
                      <small className="text-muted d-block">Non-AC Price</small>
                      <span>{selected.non_ac_room_price ? `₹${selected.non_ac_room_price}` : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Contact & Policies */}
                <div className="col-12">
                  <h6 className="border-bottom pb-2 mb-3 text-primary"><i className="fas fa-address-book me-2"></i>Contact & Policies</h6>
                  <div className="row g-3">
                    <div className="col-6">
                      <small className="text-muted d-block">Phone</small>
                      <span>{selected.phone || "N/A"}</span>
                    </div>
                    <div className="col-6">
                      <small className="text-muted d-block">Email</small>
                      <span className="text-break">{selected.email || "N/A"}</span>
                    </div>
                    <div className="col-6">
                      <small className="text-muted d-block">Check-in / Out</small>
                      <span>{selected.checkIn} / {selected.checkOut}</span>
                    </div>
                    <div className="col-6">
                      <small className="text-muted d-block">GST Number</small>
                      <span>{selected.gst_number}</span>
                    </div>
                    <div className="col-12">
                      <small className="text-muted d-block">Cancellation Policy</small>
                      <p className="small text-muted mb-0">{selected.cancellation_policy}</p>
                    </div>
                  </div>
                </div>

                {/* Vendor Details */}
                <div className="col-12">
                  <h6 className="border-bottom pb-2 mb-3 text-primary"><i className="fas fa-user-tie me-2"></i>Vendor Information</h6>
                  <div className="p-3 bg-light rounded border">
                    <div className="d-flex justify-content-between">
                       <div>
                         <p className="mb-1"><strong>{selected.vendorDetails?.full_name || selected.vendor}</strong></p>
                         <p className="mb-1 small text-muted">{selected.vendorDetails?.business_name}</p>
                       </div>
                       <div className="text-end">
                         <p className="mb-1 small">{selected.vendorDetails?.email || "N/A"}</p>
                         <p className="mb-0 small">{selected.vendorDetails?.phone || "N/A"}</p>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Amenities & Features */}
                <div className="col-12">
                  <h6 className="border-bottom pb-2 mb-3 text-primary"><i className="fas fa-concierge-bell me-2"></i>Amenities & Features</h6>
                  
                  {selected.amenities && selected.amenities.length > 0 && (
                    <div className="mb-3">
                      <small className="text-muted d-block mb-2">Amenities</small>
                      <div className="d-flex flex-wrap gap-2">
                        {selected.amenities.map((amenity, idx) => (
                          <span key={idx} className="badge bg-secondary fw-normal">
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selected.hotel_features && selected.hotel_features.length > 0 && (
                    <div>
                      <small className="text-muted d-block mb-2">Hotel Features</small>
                      <div className="d-flex flex-wrap gap-2">
                        {selected.hotel_features.map((feature, idx) => (
                          <span key={idx} className="badge bg-info text-dark fw-normal">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {(!selected.amenities?.length && !selected.hotel_features?.length) && (
                     <span className="text-muted small">No amenities or features listed</span>
                  )}
                </div>
                
                {/* Meta Info */}
                <div className="col-12 border-top pt-3 text-muted small">
                   <div className="d-flex justify-content-between">
                      <span>ID: {selected.id}</span>
                      <div>
                        <span className="me-3">Registered: {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : 'N/A'}</span>
                        <span>Last Updated: {selected.updatedAt ? new Date(selected.updatedAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                   </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && targetHotel && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Update Status - {targetHotel.name}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => !updating && setShowStatusModal(false)}
                  disabled={updating}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Select New Status</label>
                  <select 
                    className="form-select" 
                    value={newStatus} 
                    onChange={(e) => setNewStatus(e.target.value)}
                    disabled={updating}
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
                <div className="alert alert-info small">
                  <i className="fas fa-info-circle me-2"></i>
                  Changing status will affect the hotel's visibility and operations.
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowStatusModal(false)}
                  disabled={updating}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleSaveStatus}
                  disabled={updating}
                >
                  {updating ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Updating...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hotels;
