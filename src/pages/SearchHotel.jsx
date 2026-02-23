import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaChevronLeft, FaChevronRight, FaMapMarkerAlt, FaCrosshairs } from 'react-icons/fa';
import { getToken } from '../api/auth';
 
const SearchHotel = ({ state, actions }) => {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [city, setCity] = useState(state?.city || '');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [sort, setSort] = useState('popularity');
  const [showMap, setShowMap] = useState(false);
  const [nearMeLoading, setNearMeLoading] = useState(false);

  useEffect(() => {
    if (state?.city && state.city !== city) {
      setCity(state.city);
    }
  }, [state?.city]);
 
  const apiVendorPublicBase = (import.meta.env.VITE_VENDOR_PUBLIC_BASE || '/api/vendor/public').replace(/\/+$/, '');
  const apiUserBase = ((import.meta.env.VITE_API_BASE && import.meta.env.VITE_API_BASE.replace('/auth', '')) || '/api/user').replace(/\/+$/, '');
  const filesBase = (() => {
    const raw = import.meta.env.VITE_FILES_BASE;
    if (raw && typeof raw === 'string') {
      return raw.replace(/\/+$/, '');
    }
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
      const u = new URL(origin);
      if (u.hostname === 'localhost' && u.port && u.port !== '3001') {
        return 'http://localhost:3001';
      }
      return `${u.protocol}//${u.host}`;
    } catch {
      if (typeof window !== 'undefined') return window.location.origin;
      return 'http://localhost:3001';
    }
  })();
 
  const resolveImageUrl = (val) => {
    if (!val) return null;
    if (typeof val === 'string' && /^https?:\/\//i.test(val)) return val;
    if (typeof val === 'string' && val.startsWith('/')) return `${filesBase}${val}`;
    if (typeof val === 'object' && val.url) return `${filesBase}${val.url}`;
    if (typeof val === 'object' && val.path) return `${filesBase}${val.path}`;
    if (typeof val === 'string') return `${filesBase}/${val}`;
    return null;
  };
 
  const mapHotels = (list) => {
    return list.map((item, idx) => {
      const id = item.id ?? item.nid ?? item._id ?? `hotel_${idx + 1}`;
      const name = item.name ?? item.title ?? `Hotel ${idx + 1}`;
      const cityLoc = (item.city ?? item.location ?? city) ?? ['Delhi', 'Mumbai', 'Bengaluru', 'Goa'][idx % 4];
 
      const basePrice = (() => {
        const p = item.base_price ?? item.price;
        if (typeof p === 'number' && p > 0) return p;
        if (typeof p === 'string') {
          const m = p.match(/[0-9]+(?:\.[0-9]+)?/);
          return m ? parseFloat(m[0]) : 1000;
        }
        return 1000 + (idx * 100);
      })();
 
      const originalPrice = Math.round(basePrice * 1.3);
      const discount = Math.round(((originalPrice - basePrice) / originalPrice) * 100) + '% off';
 
      const amen = (() => {
        if (Array.isArray(item.amenities)) {
          return item.amenities.slice(0, 4).map(a => (typeof a === 'string' ? a : a?.name || 'Amenity'));
        }
        if (typeof item.amenities === 'string') {
          try {
            const arr = JSON.parse(item.amenities);
            return Array.isArray(arr) ? arr.slice(0, 4) : String(item.amenities).split(',').map(s => s.trim()).slice(0, 4);
          } catch {
            return String(item.amenities).split(',').map(s => s.trim()).slice(0, 4);
          }
        }
        if (item.facilities && Array.isArray(item.facilities)) {
          return item.facilities.slice(0, 4).map(f => f?.name || f);
        }
        return ['WiFi', 'AC', 'TV', 'Room Service'];
      })();
 
      const imgs = (() => {
        if (Array.isArray(item.images) && item.images.length) {
          const arr = item.images.map(resolveImageUrl).filter(Boolean);
          if (arr.length) return arr;
        }
        const cover = resolveImageUrl(item.cover_photo || item.image);
        if (cover) return [cover];
        return ['/placeholder-hotel.jpg'];
      })();
 
      const rawRating = item.rating ? parseFloat(item.rating) : 0;
      const reviews = item.reviewCount ? parseInt(item.reviewCount) : (item.reviews ? parseInt(item.reviews) : 0);
      const rating = reviews > 0 ? rawRating : 0;
      const ratingText = reviews > 0 ? (rating > 4 ? 'Excellent' : rating > 3 ? 'Good' : 'Average') : 'No Ratings';
      const distance = item.distance || ((1 + Math.random() * 5).toFixed(1) + ' km');
      const companyServiced = item.companyServiced ?? ((idx % 3) === 0);
      const wizardMember = item.wizardMember ?? ((idx % 4) === 0);
      const bookingsToday = item.bookingsToday ? parseInt(item.bookingsToday) : 0;
      const bookings = bookingsToday > 0 ? `${bookingsToday} people booked this hotel today` : null;
      const description = item.description || item.details || item.about || `A comfortable stay in ${cityLoc}`;
 
      return {
        id,
        name,
        location: cityLoc,
        address: item.address || item.street || item.area || null,
        distance,
        rating: parseFloat(rating.toFixed(1)),
        reviews,
        ratingText,
        description,
        amenities: amen,
        price: basePrice,
        originalPrice,
        discount,
        taxes: '₹' + Math.round(basePrice * 0.15) + ' taxes & fees',
        image: imgs[0],
        images: imgs,
        currentImageIndex: 0,
        latitude: parseFloat(item.latitude ?? item.lat ?? 0),
        longitude: parseFloat(item.longitude ?? item.lng ?? 0),
        companyServiced,
        wizardMember,
        bookings,
      };
    });
  };
 
  useEffect(() => {
    let active = true;
    const fetchResults = async () => {
      try {
        setLoading(true);
        setError('');
        let list = [];
        // Simple robust fetch: try approved first, then ALL as fallback
        try {
          const res = await fetch(`${apiVendorPublicBase}/hotels`, {
            method: 'GET',
            headers: { Accept: 'application/json' }
          });
          if (res.ok) {
            const data = await res.json();
            list = Array.isArray(data?.data?.hotels)
              ? data.data.hotels
              : Array.isArray(data?.hotels)
              ? data.hotels
              : Array.isArray(data?.data)
              ? data.data
              : [];
          } else {
            setError(`Failed to fetch hotels (${res.status})`);
          }
          if (!Array.isArray(list) || list.length === 0) {
            const res2 = await fetch(`${apiVendorPublicBase}/hotels?status=ALL`, {
              method: 'GET',
              headers: { Accept: 'application/json' }
            });
            if (res2.ok) {
              const data2 = await res2.json();
              list = Array.isArray(data2?.data?.hotels)
                ? data2.data.hotels
                : Array.isArray(data2?.hotels)
                ? data2.hotels
                : Array.isArray(data2?.data)
                ? data2.data
                : [];
            }
          }
        } catch (err) {
          setError('Network error. Please try again.');
        }

        if (!active) return;
        // Deduplicate list if needed
        const seenIds = new Set();
        const uniqueList = [];
        for (const item of list) {
             const id = item.id ?? item.nid ?? item._id;
             if (id && !seenIds.has(id)) {
                 seenIds.add(id);
                 uniqueList.push(item);
             } else if (!id) {
                 uniqueList.push(item);
             }
        }
        
        setHotels(mapHotels(uniqueList));
      } catch (e) {
        if (!active) return;
        setError(e?.message || 'Failed to load search results');
      } finally {
        if (!active) return;
        setLoading(false);
      }
    };
    fetchResults();
    return () => { active = false; };
  }, [apiVendorPublicBase]); // Removed page/limit/city from deps as we fetch all now
 
  const handleImageNavigation = (hotelId, direction, e) => {
    e.stopPropagation();
    setHotels(prevHotels => prevHotels.map(hotel => {
      if (hotel.id === hotelId) {
        const imagesLength = hotel.images.length;
        const newIndex = direction === 'next'
          ? (hotel.currentImageIndex + 1) % imagesLength
          : (hotel.currentImageIndex - 1 + imagesLength) % imagesLength;
        return { ...hotel, currentImageIndex: newIndex };
      }
      return hotel;
    }));
  };
 
  const haversineKm = (lat1, lon1, lat2, lon2) => {
    if (![lat1, lon1, lat2, lon2].every(n => typeof n === 'number' && !isNaN(n))) return Infinity;
    const R = 6371;
    const toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
 
  const handleNearMe = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    setError('');
    setNearMeLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: myLat, longitude: myLon } = pos.coords;
        setHotels(prev => {
          const withDistance = prev.map(h => ({
            ...h,
            distanceKm: haversineKm(myLat, myLon, h.latitude, h.longitude),
            distance: (() => {
              const km = haversineKm(myLat, myLon, h.latitude, h.longitude);
              return (isFinite(km) ? `${km.toFixed(1)} km` : h.distance);
            })()
          }));
          return withDistance.sort((a, b) => (a.distanceKm || Infinity) - (b.distanceKm || Infinity));
        });
        setNearMeLoading(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        if (err.code === 1) {
          setError('Location permission denied. Please allow access to use Near me.');
        } else if (err.code === 2) {
          setError('Location is unavailable right now. Please check your connection or try again.');
        } else if (err.code === 3) {
          setError('Location request timed out. Please try again.');
        } else {
          setError('Unable to retrieve your location. Please enable location services.');
        }
        setNearMeLoading(false);
      }
    );
  };
 
  const handleSortChange = (e) => {
    const value = e.target.value;
    setSort(value);
    setHotels(prev => {
      const sorted = [...prev];
      if (value === "price_low_high") {
        sorted.sort((a, b) => a.price - b.price);
      } else if (value === "price_high_low") {
        sorted.sort((a, b) => b.price - a.price);
      } else if (value === "rating") {
        sorted.sort((a, b) => b.rating - a.rating);
      }
      return sorted;
    });
  };
 
  const handleViewDetails = (hotel) => {
    const roomData = {
      id: hotel.id,
      name: hotel.name,
      description: `Luxurious stay in ${hotel.location}`,
      price: hotel.price,
      originalPrice: hotel.originalPrice,
      discount: hotel.discount,
      taxes: hotel.taxes,
      location: hotel.location,
      distance: hotel.distance,
      size: "30 m²",
      maxPerson: 2,
      image: hotel.images[hotel.currentImageIndex],
      imageLg: hotel.images[hotel.currentImageIndex],
      facilities: hotel.amenities.map(amenity => ({ name: amenity })),
      rating: hotel.rating,
      reviews: hotel.reviews,
      ratingText: hotel.ratingText,
      images: hotel.images
    };
    sessionStorage.setItem('selectedRoom', JSON.stringify(roomData));
    actions.navigate('roomDetails', { id: hotel.id });
  };


  useEffect(() => {
    if (loading || hotels.length === 0) return;
    
    // Check for "nearMe" intent from URL or state
    const params = new URLSearchParams(window.location.search);
    const isNearMe = params.get('nearMe') === 'true' || state?.nearMe === 'true' || state?.nearMe === true;
    
    if (isNearMe) {
      // Check if already processed to avoid loops (checking if distanceKm exists on first item)
      if (hotels[0] && hotels[0].distanceKm === undefined) {
        handleNearMe();
      }
    }
  }, [loading, hotels.length, state]);
 
  if (loading) {
    return (
      <div className="bg-light min-vh-100 d-flex justify-content-center align-items-center">
        <div className="spinner-border text-danger" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Search + Pagination Logic
  const normalized = (s) => (s || '').toString().toLowerCase();
  const query = normalized(city);
  const filteredHotels = hotels.filter(h => {
    if (!query) return true;
    const name = normalized(h.name);
    const loc = normalized(h.location);
    const addr = normalized(h.address);
    return name.includes(query) || loc.includes(query) || addr.includes(query);
  });
  const totalItems = filteredHotels.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedHotels = filteredHotels.slice(startIndex, startIndex + limit);

  console.log('SearchHotel Render (v2):', { hotels: hotels.length, loading, error, page, totalPages });

  return (
    <div className="bg-light min-h-screen flex flex-col">
     
      <div className="container-fluid px-3 px-lg-5 py-4 flex-grow-1">
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-3 mb-4">
          <h5 className="mb-0 text-nowrap">{filteredHotels.length} Hotels around you</h5>
          <div className="d-flex flex-wrap gap-2 gap-md-3 align-items-center w-100 w-lg-auto">
            <div className="form-check form-switch me-2">
              <input 
                className="form-check-input" 
                type="checkbox" 
                id="mapView" 
                checked={showMap}
                onChange={(e) => setShowMap(e.target.checked)}
              />
              <label className="form-check-label text-nowrap" htmlFor="mapView">Map View</label>
            </div>
            <div className="input-group flex-grow-1 flex-md-grow-0" style={{ minWidth: '260px', maxWidth: '360px' }}>
              <span className="input-group-text bg-white border-end-0">
                <FaMapMarkerAlt className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control form-control-sm border-start-0"
                placeholder="Search hotel, city or address"
                value={city}
                onChange={(e) => { setCity(e.target.value); setPage(1); }}
              />
              <button 
                className="btn btn-sm d-flex align-items-center justify-content-center px-3 text-[#ee2e24] bg-white border-start-0 border rounded-end-pill fw-medium text-capitalize" 
                type="button" 
                onClick={handleNearMe}
                disabled={nearMeLoading}
                style={{ borderColor: '#ee2e24' }}
              >
                {nearMeLoading ? (
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                ) : (
                  <FaCrosshairs className="me-1" />
                )}
                <span className="text-nowrap">{nearMeLoading ? 'Locating...' : 'Near Me'}</span>
              </button>
            </div>
            <div className="d-flex gap-2 flex-grow-1 flex-md-grow-0">
              <select
                className="form-select form-select-sm"
                style={{ minWidth: '80px' }}
                value={limit}
                onChange={(e) => { setLimit(parseInt(e.target.value) || 10); setPage(1); }}
              >
                <option value={5}>5 / page</option>
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
              </select>
              <select 
                className="form-select form-select-sm" 
                style={{ minWidth: '140px' }}
                value={sort}
                onChange={handleSortChange}
              >
                <option value="popularity">Popularity</option>
                <option value="price_low_high">Price: Low to High</option>
                <option value="price_high_low">Price: High to Low</option>
                <option value="rating">Rating</option>
              </select>
            </div>
          </div>
        </div>
 
        {error && (
          <div className="alert alert-info alert-dismissible fade show" role="alert">
            <strong>Note:</strong> {error}.
            <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
          </div>
        )}
 
        {filteredHotels.length === 0 ? (
          <div className="alert alert-info">No hotels found. Try another search.</div>
        ) : (
          <>
          {paginatedHotels.map(hotel => (
            <div 
              key={hotel.id} 
              className="card mb-3 border-0 shadow-sm" 
              onClick={() => handleViewDetails(hotel)}
              style={{ cursor: 'pointer' }}
            >
              <div className="row g-0">
                <div className="col-md-4">
                  <div className="position-relative" style={{ height: '250px' }}>
                    {showMap ? (
                      <iframe
                        title={`${hotel.name} Location`}
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        style={{ border: 0 }}
                        src={`https://maps.google.com/maps?q=${
                          hotel.latitude && hotel.longitude 
                            ? `${hotel.latitude},${hotel.longitude}` 
                            : encodeURIComponent(hotel.location || hotel.name)
                        }&z=15&output=embed`}
                        allowFullScreen
                      ></iframe>
                    ) : (
                      <>
                        <img 
                          src={hotel.images[hotel.currentImageIndex]} 
                          className="img-fluid rounded-start h-100 w-100" 
                          alt={hotel.name}
                          style={{ objectFit: 'cover', cursor: 'pointer' }}
                          onClick={() => handleViewDetails(hotel)}
                          onError={(e) => {
                            e.target.src = '/placeholder-hotel.jpg';
                          }}
                        />
                        
                        {hotel.images.length > 1 && (
                          <>
                            <button 
                              className="position-absolute top-50 start-0 translate-middle-y bg-white bg-opacity-75 border-0 rounded-circle p-2 ms-2"
                              onClick={(e) => handleImageNavigation(hotel.id, 'prev', e)}
                              style={{ zIndex: 2 }}
                            >
                              <FaChevronLeft />
                            </button>
                            
                            <button 
                              className="position-absolute top-50 end-0 translate-middle-y bg-white bg-opacity-75 border-0 rounded-circle p-2 me-2"
                              onClick={(e) => handleImageNavigation(hotel.id, 'next', e)}
                              style={{ zIndex: 2 }}
                            >
                              <FaChevronRight />
                            </button>
                            
                            <div className="position-absolute bottom-0 start-50 translate-middle-x mb-2 bg-dark bg-opacity-75 text-white px-2 py-1 rounded-pill" style={{ fontSize: '0.8rem' }}>
                              {hotel.currentImageIndex + 1}/{hotel.images.length}
                            </div>
                            
                            <div className="position-absolute bottom-0 start-0 end-0 d-flex justify-content-center mb-4">
                              {hotel.images.map((img, idx) => (
                                <div 
                                  key={idx}
                                  className={`mx-1 rounded-circle ${idx === hotel.currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'}`}
                                  style={{ 
                                    width: '8px', 
                                    height: '8px', 
                                    cursor: 'pointer' 
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setHotels(prevHotels => {
                                      return prevHotels.map(h => {
                                        if (h.id === hotel.id) {
                                          return { ...h, currentImageIndex: idx };
                                        }
                                        return h;
                                      });
                                    });
                                  }}
                                />
                              ))}
                            </div>
                          </>
                        )}
                        
                        {hotel.companyServiced && (
                          <span className="position-absolute top-0 start-0 badge bg-dark m-2" style={{ zIndex: 1 }}>
                            🏢 Company Serviced
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="col-md-8">
                  <div className="card-body">
                    <div className="d-flex flex-column flex-md-row justify-content-between">
                      <div className="flex-grow-1">
                        <h5 className="card-title fw-bold mb-1">{hotel.name}</h5>
                        <p className="text-muted mb-2">
                          {hotel.location} ❤️ {hotel.distance}
                        </p>
                        {hotel.description ? (
                          <p
                            className="text-muted mb-2"
                            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                          >
                            {hotel.description}
                          </p>
                        ) : null}
                        
                        <div className="d-flex align-items-center gap-2 mb-2">
                        <span className={`badge ${hotel.rating > 0 ? 'bg-success' : 'bg-secondary'}`}>
                          {hotel.rating > 0 ? `${hotel.rating} ★` : 'New'}
                        </span>
                        <small className="text-muted">({hotel.reviews} Ratings) - {hotel.ratingText}</small>
                      </div>
  
                        <div className="d-flex flex-wrap gap-2 mb-2">
                          {hotel.amenities.map((amenity, idx) => (
                            <span key={idx} className="badge bg-light text-dark border">
                              {amenity}
                            </span>
                          ))}
                        </div>
  
                      
  
                        {hotel.bookings && (
                          <p className="text-danger mt-2 mb-0">
                            <small>🔥 {hotel.bookings}</small>
                          </p>
                        )}
                      </div>
  
                      <div className="mt-3 mt-md-0 ms-md-3 d-flex flex-column align-items-start align-items-md-end flex-shrink-0">
                        <div className="mb-2 text-start text-md-end">
                          <h4 className="mb-0 fw-bold">₹{hotel.price}</h4>
                          <small className="text-muted text-decoration-line-through">₹{hotel.originalPrice}</small>
                          <span className="text-success ms-1">{hotel.discount}</span>
                        </div>
                        <small className="text-muted d-block mb-3 text-start text-md-end">per room per night</small>
                        
                        <div className="d-flex flex-column gap-2 w-100 w-md-auto">
                          <button 
                            className="btn btn-outline-dark text-danger btn-sm fw-semibold"
                            onClick={() => handleViewDetails(hotel)}
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Pagination Controls */}
          {hotels.length > 0 && (
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mt-4 pt-3 border-top">
              <div className="text-muted mb-2 mb-md-0 small">
                Showing <span className="fw-semibold">{startIndex + 1}</span>-
                <span className="fw-semibold">{Math.min(startIndex + limit, totalItems)}</span> of{' '}
                <span className="fw-semibold">{totalItems}</span> hotels
              </div>
              
              <nav aria-label="Hotel search pagination">
                <ul className="pagination mb-0 border rounded-pill overflow-hidden">
                  <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link bg-light border-0 px-3 d-flex align-items-center gap-1"
                      onClick={() => {
                        setPage((p) => Math.max(1, p - 1));
                        window.scrollTo(0, 0);
                      }}
                      disabled={page <= 1}
                      style={{ color: page <= 1 ? '#9ca3af' : '#111827' }}
                    >
                      <FaChevronLeft className="small" /> <span className="d-none d-sm-inline">Previous</span>
                    </button>
                  </li>
                  
                  <li className="page-item disabled d-none d-sm-block">
                    <span className="page-link border-0 text-dark fw-semibold bg-white small px-3">
                      Page {page} of {totalPages}
                    </span>
                  </li>

                  <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                    <button
                      className="page-link bg-light border-0 px-3 d-flex align-items-center gap-1"
                      onClick={() => {
                        setPage((p) => Math.min(totalPages, p + 1));
                        window.scrollTo(0, 0);
                      }}
                      disabled={page >= totalPages}
                      style={{ color: page >= totalPages ? '#9ca3af' : '#ee2e24' }}
                    >
                      <span className="d-none d-sm-inline">Next</span> <FaChevronRight className="small" />
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
};
 
export default SearchHotel;
