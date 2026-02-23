import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useNavigate } from 'react-router-dom';
import { getToken } from '../api/auth';
import { FaChevronLeft, FaChevronRight, FaMapMarkerAlt, FaCrosshairs } from 'react-icons/fa';

const Hotels = ({ state, actions }) => {
  const navigate = useNavigate();
  
  // ALL useState declarations at the top
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [selectedFilters, setSelectedFilters] = useState({
    familyFriendly: false,
    neighborhoodStay: false,
    groupFriendly: false,
    localIDAccepted: false
  });
  const [originalHotels, setOriginalHotels] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(4);
  const [sortOption, setSortOption] = useState('popularity');
  const [city, setCity] = useState(state?.city || '');
  const [pagination, setPagination] = useState(null);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (state?.city && state.city !== city) {
      setCity(state.city);
    }
  }, [state?.city]);
  
  const { openRoom } = actions || {};

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
    if (typeof val === 'string') {
      if (/^https?:\/\//i.test(val)) return val;
      if (val.startsWith('/')) return `${filesBase}${val}`;
      return `${filesBase}/${val}`;
    }
    if (typeof val === 'object') {
      const candidate = val.url || val.path || val.secure_url || val.src || '';
      return resolveImageUrl(candidate);
    }
    return null;
  };

  const collectAllImages = (item) => {
    if (!item) return [];
    let all = [];
    if (Array.isArray(item.images)) all = all.concat(item.images);
    if (Array.isArray(item.photos)) all = all.concat(item.photos);
    if (Array.isArray(item.gallery)) all = all.concat(item.gallery);
    if (Array.isArray(item.media)) all = all.concat(item.media);
    
    [item.cover_photo, item.image_url, item.image, item.thumbnail, item.banner].forEach(x => {
        if (x) all.push(x);
    });

    // Deduplicate by resolved URL
    const seen = new Set();
    const result = [];
    for (const raw of all) {
        const u = resolveImageUrl(raw);
        if (u && !seen.has(u)) {
            seen.add(u);
            result.push(u);
        }
    }
    return result;
  };

  const handleImageNavigation = (hotelId, direction, e) => {
    e.stopPropagation();
    
    setHotels(prevHotels => {
      return prevHotels.map(hotel => {
        if (hotel.id === hotelId) {
          const imagesLength = hotel.images.length;
          let newIndex;
          
          if (direction === 'next') {
            newIndex = (hotel.currentImageIndex + 1) % imagesLength;
          } else {
            newIndex = (hotel.currentImageIndex - 1 + imagesLength) % imagesLength;
          }
          
          return {
            ...hotel,
            currentImageIndex: newIndex
          };
        }
        return hotel;
      });
    });
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
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: myLat, longitude: myLon } = pos.coords;
      
      // Update originalHotels with distance and sort by distance
      setOriginalHotels(prev => {
        const withDistance = prev.map(h => ({
          ...h,
          distanceKm: haversineKm(myLat, myLon, h.latitude ?? h.lat ?? 0, h.longitude ?? h.lng ?? 0),
          distance: (() => {
            const km = haversineKm(myLat, myLon, h.latitude ?? h.lat ?? 0, h.longitude ?? h.lng ?? 0);
            return (isFinite(km) ? `${km.toFixed(1)} km` : h.distance);
          })()
        }));
        // Sort by distance
        return withDistance.sort((a, b) => (a.distanceKm || Infinity) - (b.distanceKm || Infinity));
      });
      
      // Reset page to 1
      setPage(1);
      // Ensure sort option allows this order (if 'popularity' preserves order)
      if (sortOption !== 'popularity') {
          setSortOption('popularity');
      }
    });
  };


  useEffect(() => {
    let active = true;

    const fetchHotels = async () => {
      try {
        setLoading(true);
        setError('');
        
        const fetchPublic = async () => {
          let allHotels = [];
          let page = 1;
          let hasMore = true;
          
          while (hasMore) {
            try {
              const params = new URLSearchParams();
              params.set('page', String(page));
              params.set('limit', '50'); // Safe batch size
              
              const res = await fetch(`${apiVendorPublicBase}/hotels?${params.toString()}`, {
                method: 'GET',
                headers: { Accept: 'application/json' }
              });
              
              if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data?.data?.hotels)
                  ? data.data.hotels
                  : Array.isArray(data?.hotels)
                  ? data.hotels
                  : Array.isArray(data?.data)
                  ? data.data
                  : [];
                
                if (list.length === 0) {
                  hasMore = false;
                } else {
                  allHotels = [...allHotels, ...list];
                  
                  // Check pagination metadata to see if we need more
                  const meta = data?.pagination || data?.data?.pagination;
                  if (meta && page < meta.totalPages) {
                    page++;
                  } else {
                    // If no metadata or reached last page, stop
                    // Also stop if list length < limit (implies last page)
                    if (!meta && list.length < 50) hasMore = false;
                    else if (meta) hasMore = false; 
                    // (meta logic handled above: if page < totalPages we continue, else false)
                    else page++; // try next page if no meta but full page returned? (risky, stick to meta or empty)
                    // Safer: if no meta, assume single page or stop when empty. 
                    // Let's rely on list length if no meta.
                    if (!meta && list.length < 50) hasMore = false;
                  }
                }
              } else {
                hasMore = false;
              }
            } catch (e) {
              console.error('Public API fetch error:', e);
              hasMore = false;
            }
            // Safety break
            if (page > 20) hasMore = false; 
          }
          return allHotels;
        };

        const fetchUser = async () => {
          let allHotels = [];
          let page = 1;
          let hasMore = true;

          while (hasMore) {
            try {
              const token = getToken();
              const headers = { Accept: 'application/json' };
              if (token) headers.Authorization = `Bearer ${token}`;

              const params = new URLSearchParams();
              params.set('page', String(page));
              params.set('limit', '50');
              
              const res = await fetch(`${apiUserBase}/hotels/search?${params.toString()}`, { 
                method: 'GET', 
                headers 
              });
              
              if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data?.data) 
                  ? data.data 
                  : Array.isArray(data?.data?.hotels) 
                  ? data.data.hotels 
                  : Array.isArray(data?.hotels)
                  ? data.hotels
                  : [];

                if (list.length === 0) {
                  hasMore = false;
                } else {
                  allHotels = [...allHotels, ...list];
                  const meta = data?.pagination || data?.data?.pagination;
                  if (meta && page < meta.totalPages) {
                    page++;
                  } else {
                    if (!meta && list.length < 50) hasMore = false;
                    else if (meta) hasMore = false;
                    else page++;
                    if (!meta && list.length < 50) hasMore = false;
                  }
                }
              } else {
                hasMore = false;
              }
            } catch (e) {
              console.error('User API fetch error:', e);
              hasMore = false;
            }
            if (page > 20) hasMore = false;
          }
          return allHotels;
        };

        // Fetch from both sources in parallel
        const [publicHotels, userHotels] = await Promise.all([fetchPublic(), fetchUser()]);
        
        // Merge and Deduplicate
        const allRawHotels = [...publicHotels, ...userHotels];
        const seenIds = new Set();
        const uniqueHotels = [];
        
        for (const hotel of allRawHotels) {
          const id = hotel.id ?? hotel.nid ?? hotel._id;
          if (id && !seenIds.has(id)) {
            seenIds.add(id);
            uniqueHotels.push(hotel);
          }
        }

        // Map the data to consistent format
        const mapped = uniqueHotels.map((item, idx) => {
          const id = item.id ?? item.nid ?? item._id ?? `hotel_${idx + 1}`;
          const name = item.name ?? item.title ?? `Hotel ${idx + 1}`;
          const cityLoc = item.city ?? item.location ?? ['Delhi', 'Mumbai', 'Bengaluru', 'Goa'][idx % 4];
          
          // Calculate base price
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

          // Parse amenities
          const amen = (() => {
            if (Array.isArray(item.amenities)) {
              return item.amenities.slice(0, 4).map(a => 
                (typeof a === 'string' ? a : a?.name || 'Amenity')
              );
            }
            if (typeof item.amenities === 'string') {
              try {
                const arr = JSON.parse(item.amenities);
                return Array.isArray(arr) 
                  ? arr.slice(0, 4) 
                  : String(item.amenities).split(',').map(s => s.trim()).slice(0, 4);
              } catch {
                return String(item.amenities).split(',').map(s => s.trim()).slice(0, 4);
              }
            }
            if (item.facilities && Array.isArray(item.facilities)) {
              return item.facilities.slice(0, 4).map(f => f?.name || f);
            }
            return ['WiFi', 'AC', 'TV', 'Room Service'];
          })();

          // Parse images
          const imgs = (() => {
            const arr = collectAllImages(item);
            if (arr.length) return arr;
            return ['/placeholder-hotel.jpg'];
          })();

          const rating = item.rating ? parseFloat(item.rating) : 0;
          
          const reviews = item.reviewCount ? parseInt(item.reviewCount) : (item.reviews ? parseInt(item.reviews) : 0);
          
          const ratingText = rating > 4 ? 'Excellent' : rating > 3 ? 'Good' : rating > 0 ? 'Average' : 'No Ratings';

          return {
            id,
            name,
            location: cityLoc,
            description: item.description || `A comfortable stay in ${cityLoc} with modern amenities.`,
            distance: item.distance || ((1 + Math.random() * 5).toFixed(1) + ' km'),
            rating: parseFloat(rating.toFixed(1)),
            reviews,
            ratingText,
            amenities: amen,
            price: basePrice,
            originalPrice,
            discount,
            image: imgs[0],
            images: imgs,
            currentImageIndex: 0,
            companyServiced: item.companyServiced ?? ((idx % 3) === 0),
            wizardMember: item.wizardMember ?? ((idx % 4) === 0),
            bookings: (() => {
              // Priority: API fields > properties
              const v = item.bookingsToday ?? item.bookings_today ?? item.bookingsCount ?? item.todayBookings;
              const n = typeof v === 'string' ? parseInt(v) : v;
              // Debugging log (check browser console)
              if (item.name === 'Blue Lagoon Resort') {
                console.log('Blue Lagoon Data:', { 
                  bookingsToday: item.bookingsToday, 
                  reviewCount: item.reviewCount, 
                  reviews: item.reviews,
                  n
                });
              }
              return n && n > 0 ? `${n} people booked this hotel today` : null;
            })(),
            familyFriendly: item.familyFriendly ?? ((idx % 2) === 0),
            neighborhoodStay: item.neighborhoodStay ?? ((idx % 3) === 0),
            groupFriendly: item.groupFriendly ?? ((idx % 4) === 0),
            localIDAccepted: item.localIDAccepted ?? ((idx % 2) === 1),
            couplesFriendly: item.couplesFriendly ?? ((idx % 3) === 1),
            isOyoRoom: item.isOyoRoom ?? ((idx % 2) === 0),
            isTownhouse: item.isTownhouse ?? ((idx % 5) === 0),
            isOyoHome: item.isOyoHome ?? ((idx % 4) === 1),
            isHotel: item.isHotel ?? true,
            latitude: item.latitude ?? item.lat,
            longitude: item.longitude ?? item.lng,
            address: item.address,
            city: item.city,
          };
        });

        if (!active) return;

        setOriginalHotels(mapped);

        // Calculate price range
        if (mapped.length > 0) {
          const prices = mapped.map(h => h.price);
          // Always start from 0 to allow filtering from the bottom
          const min = 0; 
          const max = Math.max(...prices);
          
          // Ensure there's always a range to slide
          const effectiveMax = max === 0 ? 10000 : max;
          
          setMinPrice(min);
          setMaxPrice(effectiveMax);
          setPriceRange([min, effectiveMax]);
        }
        
      } catch (e) {
        console.error('Error fetching hotels:', e);
        if (!active) return;
        setError(e?.message || 'Failed to load hotels');
      } finally {
        if (!active) return;
        setLoading(false);
      }
    };

    fetchHotels();
    return () => { active = false; };
  }, [apiVendorPublicBase, apiUserBase, filesBase]); // Removed page, limit, city dependencies

  // Client-side filtering, sorting, and pagination
  useEffect(() => {
    let filtered = [...originalHotels];

    // 0. Filter by Name/Address/Location
    const term = (city || '').toLowerCase();
    if (term.trim().length) {
      filtered = filtered.filter(h => {
        const name = (h.name || '').toLowerCase();
        const addr = (h.address || '').toLowerCase();
        const loc = (h.location || '').toLowerCase();
        return name.includes(term) || addr.includes(term) || loc.includes(term);
      });
    }

    // 1. Filter by Price
    filtered = filtered.filter(
      hotel => hotel.price >= priceRange[0] && hotel.price <= priceRange[1]
    );

    // 2. Filter by Collections
    if (selectedFilters.familyFriendly) {
      filtered = filtered.filter(hotel => hotel.familyFriendly);
    }
    if (selectedFilters.neighborhoodStay) {
      filtered = filtered.filter(hotel => hotel.neighborhoodStay);
    }
    if (selectedFilters.groupFriendly) {
      filtered = filtered.filter(hotel => hotel.groupFriendly);
    }
    if (selectedFilters.localIDAccepted) {
      filtered = filtered.filter(hotel => hotel.localIDAccepted);
    }

    // 3. Sort
    if (sortOption === "price_low_high") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortOption === "price_high_low") {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortOption === "rating") {
      filtered.sort((a, b) => b.rating - a.rating);
    }

    // 4. Update Pagination Meta
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    
    setPagination({
      currentPage: page,
      totalPages: totalPages,
      totalItems: totalItems
    });

    // 5. Slice for current page
    // If page is out of bounds (e.g. filtered results are smaller), reset to page 1
    // We do this check inside the render or just reset page when filters change?
    // Better to let the user control, but if page > totalPages, we should show empty or last page.
    // Let's reset page to 1 if we are out of bounds? 
    // Actually, usually when filters change, we should reset page to 1.
    // But we can't do that easily inside this effect without causing loops if we depend on page.
    // We'll rely on handlers resetting page to 1.
    
    const startIndex = (page - 1) * limit;
    const sliced = filtered.slice(startIndex, startIndex + limit);
    
    setHotels(sliced);

  }, [originalHotels, selectedFilters, priceRange, sortOption, page, limit, city]);

  const handleFilterChange = (filter) => {
    const newFilters = {
      ...selectedFilters,
      [filter]: !selectedFilters[filter]
    };
    setSelectedFilters(newFilters);
    setPage(1); // Reset to first page on filter change
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      familyFriendly: false,
      neighborhoodStay: false,
      groupFriendly: false,
      localIDAccepted: false
    });
    setPriceRange([minPrice, maxPrice]);
    setPage(1);
  };

  const handleSortChange = (e) => {
    setSortOption(e.target.value);
    setPage(1);
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
    
    if (openRoom) {
      openRoom(roomData);
    }
    
    navigate(`/roomDetails?id=${hotel.id}`);
  };


  if (loading) {
    return (
      <div className="bg-light min-vh-100 d-flex justify-content-center align-items-center">
        <div className="spinner-border text-danger" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100">
      

      <div className="container-fluid px-3 px-lg-5 py-4">
        {error && (
          <div className="alert alert-info alert-dismissible fade show" role="alert">
            <strong>Note:</strong> {error}.
            <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
          </div>
        )}

        <div className="row">
          {/* Filters Sidebar */}
          <div className="col-lg-3 mb-4 mb-lg-0">
            <div className="card border-0 shadow-sm position-sticky" style={{ top: '90px', zIndex: 2 }}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0 fw-bold">Filters</h5>
                  <button className="btn btn-link text-danger text-decoration-none p-0" onClick={clearAllFilters}>
                    Clear All
                  </button>
                </div>

                {/* Price Filter */}
                <div className="mb-4">
                  <h6 className="fw-bold mb-3">Price</h6>
                  <div className="d-flex justify-content-between mb-2">
                    <small>Min: ₹{minPrice}</small>
                    <small>Max: ₹{maxPrice}</small>
                  </div>
                  <input 
                    type="range" 
                    className="form-range" 
                    min={minPrice} 
                    max={maxPrice}
                    step={1}
                    value={priceRange[1]}
                    onChange={(e) => {
                      const newMaxPrice = parseInt(e.target.value);
                      setPriceRange([minPrice, newMaxPrice]);
                      setPage(1); // Reset to first page
                    }}
                  />
                  <div className="text-end mt-1">
                    <small className="text-muted">Up to ₹{priceRange[1]}</small>
                  </div>
                </div>

                {/* Collections */}
                <div className="mb-4">
                  <h6 className="fw-bold mb-3">Collections</h6>
                  <div className="form-check mb-2">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="familyFriendly"
                      checked={selectedFilters.familyFriendly}
                      onChange={() => handleFilterChange('familyFriendly')}
                    />
                    <label className="form-check-label" htmlFor="familyFriendly">
                      Family Friendly
                    </label>
                  </div>
                  <div className="form-check mb-2">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="neighborhoodStay"
                      checked={selectedFilters.neighborhoodStay}
                      onChange={() => handleFilterChange('neighborhoodStay')}
                    />
                    <label className="form-check-label" htmlFor="neighborhoodStay">
                      Neighborhood Stay
                    </label>
                  </div>
                  <div className="form-check mb-2">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="groupFriendly"
                      checked={selectedFilters.groupFriendly}
                      onChange={() => handleFilterChange('groupFriendly')}
                    />
                    <label className="form-check-label" htmlFor="groupFriendly">
                      Group Friendly
                    </label>
                  </div>
                  <div className="form-check mb-2">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="localIDAccepted"
                      checked={selectedFilters.localIDAccepted}
                      onChange={() => handleFilterChange('localIDAccepted')}
                    />
                    <label className="form-check-label" htmlFor="localIDAccepted">
                      Local ID Accepted
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hotel Listings */}
          <div className="col-lg-9">
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-3 mb-4">
              <h5 className="mb-0 text-nowrap">
                {(pagination?.totalItems ?? hotels.length)} Hotels around you
              </h5>
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
                  >
                    <FaCrosshairs className="me-1" />
                    <span className="text-nowrap">Near Me</span>
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
                    value={sortOption}
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

            {/* Hotel Cards */}
            {hotels.length === 0 ? (
              <div className="alert alert-info">
                No hotels found matching your filters. Try adjusting your search criteria.
              </div>
            ) : (
              hotels.map(hotel => (
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
                                : encodeURIComponent((hotel.address || '') + ' ' + (hotel.city || hotel.location || ''))
                            }&z=15&output=embed`}
                            allowFullScreen
                            onClick={(e) => e.stopPropagation()}
                          ></iframe>
                        ) : (
                          <>
                            {/* Image Slider */}
                            <img 
                              src={hotel.images[hotel.currentImageIndex]} 
                              className="img-fluid rounded-start h-100 w-100" 
                              alt={hotel.name}
                              style={{ objectFit: 'cover' }}
                              onError={(e) => {
                                e.target.src = '/placeholder-hotel.jpg';
                              }}
                            />
                            
                            {/* Navigation Arrows */}
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
                                
                                {/* Image Counter */}
                                <div className="position-absolute bottom-0 start-50 translate-middle-x mb-2 bg-dark bg-opacity-75 text-white px-2 py-1 rounded-pill" style={{ fontSize: '0.8rem' }}>
                                  {hotel.currentImageIndex + 1}/{hotel.images.length}
                                </div>
                                
                                {/* Thumbnail Preview */}
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
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <h5 className="card-title fw-bold mb-1">{hotel.name}</h5>
                            <p className="text-muted mb-2">
                              {hotel.location} ❤️ {hotel.distance}
                            </p>
                            
                            {hotel.description && (
                              <p className="text-muted small mb-2 text-truncate" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', whiteSpace: 'normal', overflow: 'hidden' }}>
                                {hotel.description}
                              </p>
                            )}
                            
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <span className="badge bg-success">{hotel.rating} ★</span>
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

                          <div className="text-end ms-3">
                            <div className="mb-2">
                              <h4 className="mb-0 fw-bold">₹{hotel.price}</h4>
                              <small className="text-muted text-decoration-line-through">₹{hotel.originalPrice}</small>
                              {/* <span className="text-success ms-1">{hotel.discount}</span> */}
                            </div>
                            <small className="text-muted d-block mb-3">per room per night</small>
                            
                            <div className="d-flex flex-column gap-2">
                              <button 
                                className="btn btn-outline-dark text-danger btn-sm fw-semibold"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(hotel);
                                }}
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
              ))
            )}
            {(pagination || hotels.length > 0) && (
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div className="text-muted small">
                  {pagination 
                    ? `Page ${pagination.currentPage} of ${pagination.totalPages}` 
                    : `Page ${page}`
                  }
                </div>
                <div className="btn-group">
                  <button
                    className="btn text-dark btn-outline-secondary btn-sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </button>
                  <button
                    className="btn text-dark btn-outline-secondary btn-sm"
                    disabled={pagination ? page >= pagination.totalPages : hotels.length < limit}
                    onClick={() => setPage((p) => (pagination ? Math.min(pagination.totalPages, p + 1) : p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hotels;
