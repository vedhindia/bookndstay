import { useState, useEffect } from 'react';
import { FaCheckCircle, FaShieldAlt, FaTag, FaChevronLeft, FaChevronRight, FaTimes, FaMapMarkerAlt, FaStar, FaPlus, FaMinus, FaTrash } from 'react-icons/fa';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getToken, getUser, clearToken } from '../api/auth';

const RoomDetailsPage = ({ state = {}, actions = {} }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [similarPropertiesIndex, setSimilarPropertiesIndex] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(3);
  const [roomImages, setRoomImages] = useState([]);
  const [similarProperties, setSimilarProperties] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [amenities, setAmenities] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Room and Guest Configuration
  const [selectedRoomType, setSelectedRoomType] = useState('AC');
  const [roomConfigs, setRoomConfigs] = useState([{ id: 1, guests: 2, children: 0 }]);
  const [showRoomGuestModal, setShowRoomGuestModal] = useState(false);
  
  const [checkIn, setCheckIn] = useState(() => {
    try {
      if (state?.checkIn) return String(state.checkIn).slice(0, 10);
    } catch {}
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  });
  const [checkOut, setCheckOut] = useState(() => {
    try {
      if (state?.checkOut) return String(state.checkOut).slice(0, 10);
    } catch {}
    const d = new Date();
    const d2 = new Date(d.getTime() + 24 * 60 * 60 * 1000);
    return new Date(d2.getTime() - d2.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  });
  
  const [selectedRoomPrice, setSelectedRoomPrice] = useState(() => {
    const p = state.selectedRoom?.price ?? 799;
    return Math.round(p);
  });
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [creating, setCreating] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState('');
  const [canWriteReview, setCanWriteReview] = useState(false);
  const [myReview, setMyReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const updateItemsPerView = () => {
      if (window.innerWidth >= 1024) { setItemsPerView(3); } else if (window.innerWidth >= 768) { setItemsPerView(2); } else { setItemsPerView(1); };
    };
    updateItemsPerView();
    window.addEventListener('resize', updateItemsPerView);
    return () => window.removeEventListener('resize', updateItemsPerView);
  }, []);

  const apiVendorPublicBase = (import.meta.env.VITE_VENDOR_PUBLIC_BASE || '/api/vendor/public').replace(/\/+$/, '');
  const apiUserBase = ((import.meta.env.VITE_API_BASE && import.meta.env.VITE_API_BASE.replace('/auth', '')) || '/api/user').replace(/\/+$/, '');
  const filesBase = (import.meta.env.VITE_FILES_BASE || (() => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bookndstay.com';
      const u = new URL(origin);
      return `${u.protocol}//${u.host}`;
    } catch {
      if (typeof window !== 'undefined') return window.location.origin;
      return 'https://bookndstay.com';
    }
  })());

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

  const pickPrimaryImage = (item) => {
    if (!item) return null;
    const candidates = [];
    if (Array.isArray(item.images) && item.images.length > 0) candidates.push(item.images[0]);
    if (Array.isArray(item.photos) && item.photos.length > 0) candidates.push(item.photos[0]);
    candidates.push(item.cover_photo, item.image_url, item.image, item.thumbnail, item.banner);
    
    for (const c of candidates) {
      const u = resolveImageUrl(c);
      if (u) return u;
    }
    return null;
  };

  useEffect(() => {
    let active = true;
    const sel = state?.selectedRoom || (() => {
      try { return JSON.parse(sessionStorage.getItem('selectedRoom') || 'null'); } catch { return null; }
    })();
    const id = searchParams.get('id') || sel?.id || sel?._id;
    
    // Check if session data matches current requested ID
    const isSameHotel = sel && id && (String(sel.id) === String(id) || String(sel._id) === String(id));
    // If not same hotel, strictly ignore session data to prevent merging wrong details
    const safeSel = isSameHotel ? sel : null;

    const bootstrapImages = () => {
      if (!safeSel) {
        setRoomImages(['/placeholder-hotel.jpg']);
        return;
      }
      const imgs = Array.isArray(safeSel.images) ? safeSel.images.map(resolveImageUrl).filter(Boolean) : [];
      const cover = resolveImageUrl(safeSel.imageLg || safeSel.image);
      const arr = imgs.length ? imgs : cover ? [cover] : [];
      setRoomImages(arr.length ? arr : ['/placeholder-hotel.jpg']);
    };
    bootstrapImages();

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError('');
        
        // If we have safe session data, use it initially
        if (safeSel) {
           setDetail(safeSel);
           // Also init amenities/rooms if possible from safeSel? 
           // We can let the main logic handle it by merging safeSel
        } else {
           setDetail(null);
           setAmenities([]);
           setAvailableRooms([]);
        }

        if (id) {
          const res = await fetch(`${apiVendorPublicBase}/hotels/${id}?check_in=${checkIn}&check_out=${checkOut}`, { method: 'GET', headers: { Accept: 'application/json' } });
          if (res.ok) {
            const data = await res.json();
            const hotel = data?.data?.hotel || data?.hotel || data?.data || null;
            if (hotel && active) {
              const merged = safeSel ? { ...safeSel, ...hotel } : hotel;
              setDetail(merged);
              
              const amenList = (() => {
                const src = hotel.amenities ?? safeSel?.amenities ?? [];
                if (Array.isArray(src)) return src.map((a) => (typeof a === 'string' ? a : a?.name || ''));
                if (typeof src === 'string') {
                  try { const p = JSON.parse(src); return Array.isArray(p) ? p : String(src).split(','); } catch { return String(src).split(','); }
                }
                return [];
              })().filter(Boolean).slice(0, 9);
              setAmenities(amenList);
              
              const imgs = (() => {
                if (Array.isArray(hotel.images) && hotel.images.length) {
                  const arr = hotel.images.map(resolveImageUrl).filter(Boolean);
                  if (arr.length) return arr;
                }
                const cover = resolveImageUrl(hotel.cover_photo || hotel.image);
                if (cover) return [cover];
                // Fallback to safeSel images if hotel images missing
                if (safeSel && Array.isArray(safeSel.images)) {
                   return safeSel.images.map(resolveImageUrl).filter(Boolean);
                }
                return [];
              })();
              if (imgs.length) setRoomImages(imgs);
              
              // Initialize room types from hotel AC/Non-AC prices
              const acPrice = parseFloat(hotel.ac_room_price);
              const nonAcPrice = parseFloat(hotel.non_ac_room_price);
              const acCount = parseInt(hotel.ac_rooms) || 0;
              const nonAcCount = parseInt(hotel.non_ac_rooms) || 0;
              const base = Math.round((hotel.base_price ?? hotel.price ?? safeSel?.price ?? 799));
              const initialRooms = [];
              if (!isNaN(nonAcPrice) && nonAcPrice > 0) initialRooms.push({ id: 'non-ac', name: 'Non AC', price: Math.round(nonAcPrice), available: nonAcCount });
              if (!isNaN(acPrice) && acPrice > 0) initialRooms.push({ id: 'ac', name: 'AC', price: Math.round(acPrice), available: acCount });
              if (!initialRooms.length) {
                initialRooms.push({ id: 'non-ac', name: 'Non AC', price: base, available: 5 });
                initialRooms.push({ id: 'ac', name: 'AC', price: base + 300, available: 5 });
              }
              setAvailableRooms(initialRooms);
              
              // Only reset selection if current selection is invalid for new room list
              // But strictly, we should probably default to first room
              setSelectedRoomType(initialRooms[0].name);
              setSelectedRoomPrice(Math.round(initialRooms[0].price));
            }
            
            const city = (hotel?.city || hotel?.location || safeSel?.city || safeSel?.location || '').trim();
            const params = new URLSearchParams();
            if (city) params.set('city', city);
            params.set('limit', '8');
            const resList = await fetch(`${apiVendorPublicBase}/hotels?${params.toString()}`, { method: 'GET', headers: { Accept: 'application/json' } });
            if (resList.ok && active) {
              const listData = await resList.json();
              const list = Array.isArray(listData?.data?.hotels) ? listData.data.hotels : Array.isArray(listData?.hotels) ? listData.hotels : Array.isArray(listData?.data) ? listData.data : [];
              const mapped = list.filter((h) => (h?.id ?? h?._id) !== id).slice(0, 6).map((h) => {
                const toNumber = (v) => {
                  if (v === null || v === undefined || v === '') return null;
                  const n = typeof v === 'number' ? v : parseFloat(String(v));
                  return Number.isFinite(n) ? n : null;
                };

                const hid = h.id ?? h._id ?? Math.random();
                const name = h.name ?? 'Hotel';
                const loc = h.city ?? '';
                const basePrice = toNumber(h.base_price) ?? toNumber(h.basePrice);
                const price = basePrice ?? 0;
                const image = pickPrimaryImage(h) || '/placeholder-hotel.jpg';
                const rating = typeof h.rating === 'number' ? h.rating : (typeof h.rating === 'string' ? (parseFloat(h.rating) || 0) : 0);
                return { id: hid, name, location: loc, rating, price: Math.round(price), image };
              });
              setSimilarProperties(mapped);
            }
          } else {
            if (!safeSel) setError('Failed to load hotel details');
          }
        }
      } catch (err) {
        if (active && !safeSel) setError('Network error. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchDetail();
    return () => { active = false; };
  }, [searchParams, apiVendorPublicBase, filesBase, checkIn, checkOut]);

  useEffect(() => {
    const token = getToken();
    const user = getUser();
    const hotelId = detail?.id || detail?._id;
    if (!hotelId || !token) {
      setReviews([]);
      setCanWriteReview(false);
      setMyReview(null);
      return;
    }
    let active = true;
    const loadReviews = async () => {
      try {
        setReviewsLoading(true);
        setReviewsError('');
        const res = await fetch(`${apiUserBase}/hotels/${hotelId}`, {
          method: 'GET',
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const hotel = data?.data?.hotel || data?.hotel || data?.data || null;
          const list = Array.isArray(hotel?.reviews) ? hotel.reviews : [];
          const normalized = list.map((r) => ({
            id: r.id || r._id,
            rating: r.rating || 0,
            comment: r.comment || '',
            createdAt: r.createdAt || r.created_at || null,
            userName: r.user?.full_name || 'Guest',
            userId: r.user?.id
          }));
          if (active) {
            setReviews(normalized);
            const mine = normalized.find((r) => r.userId && user && r.userId === user.id) || null;
            setMyReview(mine);
            if (mine) {
              setReviewRating(mine.rating || 0);
              setReviewComment(mine.comment || '');
            } else {
              setReviewRating(0);
              setReviewComment('');
            }
          }
        } else {
          setReviewsError('Failed to load reviews');
        }
      } catch {
        if (active) setReviewsError('Network error loading reviews');
      } finally {
        if (active) setReviewsLoading(false);
      }
    };
    const checkEligibility = async () => {
      try {
        const res = await fetch(`${apiUserBase}/bookings`, {
          method: 'GET',
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data?.bookings) ? data.bookings : Array.isArray(data?.data) ? data.data : [];
          const now = new Date();
          const eligible = list.some((b) => {
            const isSameHotel = (b.hotel_id || b.hotel?.id) == hotelId; // loose equality for string/number
            if (!isSameHotel) return false;
            
            const isCompleted = b.status === 'COMPLETED';
            const isConfirmedAndPassed = b.status === 'CONFIRMED' && new Date(b.check_out) < now;
            
            return isCompleted || isConfirmedAndPassed;
          });
          setCanWriteReview(eligible);
        } else {
          setCanWriteReview(false);
        }
      } catch {
        setCanWriteReview(false);
      }
    };
    loadReviews();
    checkEligibility();
    return () => { active = false; };
  }, [detail, apiUserBase]);

  const submitReview = async () => {
    const token = getToken();
    const hotelId = detail?.id || detail?._id;
    if (!token) {
      alert('Please login to submit a review');
      navigate('/login');
      return;
    }
    if (!hotelId) return;
    if (reviewRating < 1) {
      alert('Please select a rating');
      return;
    }
    if (String(reviewComment || '').trim().length < 3) {
      alert('Please enter a comment');
      return;
    }
    setSubmittingReview(true);
    try {
      if (myReview && myReview.id) {
        const res = await fetch(`${apiUserBase}/reviews/${myReview.id}`, {
          method: 'PUT',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ rating: reviewRating, comment: reviewComment })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to update review');
        }
      } else {
        const res = await fetch(`${apiUserBase}/reviews`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ hotel_id: hotelId, rating: reviewRating, comment: reviewComment })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to create review');
        }
      }
      const user = getUser();
      const updatedMine = { id: myReview?.id, rating: reviewRating, comment: reviewComment, userName: user?.full_name || 'You', userId: user?.id };
      const nextReviews = myReview ? reviews.map((r) => (r.id === myReview.id ? { ...r, ...updatedMine } : r)) : [{ ...updatedMine }, ...reviews];
      setReviews(nextReviews);
      setMyReview(updatedMine);
      alert('Review saved');
    } catch (e) {
      alert(e.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const deleteReview = async () => {
    const token = getToken();
    if (!token || !myReview?.id) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`${apiUserBase}/reviews/${myReview.id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to delete review');
      }
      setReviews(reviews.filter((r) => r.id !== myReview.id));
      setMyReview(null);
      setReviewRating(0);
      setReviewComment('');
      alert('Review deleted');
    } catch (e) {
      alert(e.message || 'Failed to delete review');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Room and Guest Configuration Functions
  const addRoom = () => {
    if (roomConfigs.length < 5) {
      const newId = Math.max(...roomConfigs.map(r => r.id)) + 1;
      setRoomConfigs([...roomConfigs, { id: newId, guests: 2, children: 0 }]);
    }
  };

  const deleteRoom = (id) => {
    if (roomConfigs.length > 1) {
      setRoomConfigs(roomConfigs.filter(r => r.id !== id));
    }
  };

  const updateGuestCount = (id, increment) => {
    setRoomConfigs(roomConfigs.map(r => {
      if (r.id === id) {
        const newGuests = increment ? r.guests + 1 : r.guests - 1;
        return { ...r, guests: Math.max(1, Math.min(2, newGuests)) };
      }
      return r;
    }));
  };

  const updateChildrenCount = (id, increment) => {
    setRoomConfigs(roomConfigs.map(r => {
      if (r.id === id) {
        const newChildren = increment ? r.children + 1 : r.children - 1;
        return { ...r, children: Math.max(0, Math.min(2, newChildren)) };
      }
      return r;
    }));
  };

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % roomImages.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + roomImages.length) % roomImages.length);
  const nextSimilarProperty = () => {
    if (similarPropertiesIndex < similarProperties.length - itemsPerView) {
      setSimilarPropertiesIndex(prev => prev + 1);
    }
  };
  const prevSimilarProperty = () => {
    if (similarPropertiesIndex > 0) {
      setSimilarPropertiesIndex(prev => prev - 1);
    }
  };

  const normalizeRoomType = (name) => {
    const v = String(name || '').toUpperCase().replace(/\s+/g, '_');
    if (v.includes('NON') && v.includes('AC')) return 'NON_AC';
    if (v === 'AC') return 'AC';
    return 'AC';
  };

  const nights = (() => {
    try {
      const ci = new Date(checkIn);
      const co = new Date(checkOut);
      const diff = Math.max(1, Math.ceil((co - ci) / (1000 * 60 * 60 * 24)));
      return diff;
    } catch {
      return 1;
    }
  })();

  const totalRooms = roomConfigs.length;
  const totalGuests = roomConfigs.reduce((sum, room) => sum + room.guests + (room.children || 0), 0);

  const [availableCoupons, setAvailableCoupons] = useState([]);

  // Fetch public coupons
  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE ? import.meta.env.VITE_API_BASE.replace('/auth', '') : 'https://bookndstay.com/api'}/public/coupons`);
        if (res.ok) {
          const data = await res.json();
          // The API response structure is { success: true, data: { coupons: [...] } }
          const couponsList = data.data?.coupons || data.data || [];
          
          const apiCoupons = couponsList.map(c => ({
            code: c.code,
            description: c.description || `Get ${c.value}${c.type === 'PERCENT' ? '%' : ' FLAT'} OFF`,
            discount: `${c.value}${c.type === 'PERCENT' ? '%' : ' FLAT'} OFF`,
            rate: c.type === 'PERCENT' ? c.value / 100 : 0,
            flatAmount: c.type === 'FLAT' ? c.value : 0,
            type: c.type
          }));
          
          setAvailableCoupons(apiCoupons);
        }
      } catch (err) {
        console.error('Failed to fetch coupons:', err);
      }
    };
    fetchCoupons();
  }, []);

  const applyCoupon = (codeOverride) => {
    const codeToUse = typeof codeOverride === 'string' ? codeOverride : couponCode;

    if (!codeToUse.trim()) {
      alert('Please enter a coupon code');
      return;
    }
    const code = codeToUse.trim().toUpperCase();
    const base = Math.round(selectedRoomPrice * nights * totalRooms);
    
    // Coupon logic
    const coupon = availableCoupons.find(c => c.code === code);
    
    if (coupon) {
      let discount = 0;
      if (coupon.type === 'FLAT') {
         discount = coupon.flatAmount;
      } else {
         discount = Math.round(base * coupon.rate);
      }
      
      const actualDiscount = Math.min(discount, base);
      setDiscountAmount(actualDiscount);
      setAppliedCoupon(code);
      if (typeof codeOverride === 'string') setCouponCode(code);
    } else {
      alert('Invalid coupon code');
      setDiscountAmount(0);
      setAppliedCoupon('');
    }
  };

  const removeCoupon = () => {
    setCouponCode('');
    setDiscountAmount(0);
    setAppliedCoupon('');
  };

  const createBooking = async () => {
    const token = getToken();
    if (!token) {
      alert('Please login to book');
      sessionStorage.setItem('redirectUrl', window.location.pathname + window.location.search);
      navigate('/login');
      return;
    }

    // Validate dates
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const ciDate = new Date(checkIn);
    const coDate = new Date(checkOut);
    ciDate.setHours(0, 0, 0, 0);
    coDate.setHours(0, 0, 0, 0);

    if (ciDate < todayDate) {
      alert('Check-in date cannot be in the past');
      return;
    }
    if (coDate <= ciDate) {
      alert('Check-out must be after check-in');
      return;
    }

    const hotelId = detail?.id || detail?._id;
    if (!hotelId) {
      alert('Hotel information not found');
      return;
    }

    setCreating(true);
    try {
      const currentRoom = availableRooms.find(r => r.name === selectedRoomType);
      if (currentRoom && roomConfigs.length > currentRoom.available) {
         throw new Error(`Only ${currentRoom.available} rooms available for ${selectedRoomType}`);
      }

      const roomType = normalizeRoomType(selectedRoomType);
      
      const payload = {
        hotel_id: hotelId,
        room_type: roomType,
        check_in: checkIn,
        check_out: checkOut,
        guests: totalGuests,
        rooms: roomConfigs.length,
        booked_room: roomConfigs.length // Redundant but ensures backend catches it
      };

      if (couponCode.trim()) {
        payload.coupon_code = couponCode.trim();
      }

      const response = await fetch(`${apiUserBase}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (response.status === 401) {
        clearToken();
        alert('Your session has expired. Please login again.');
        navigate('/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create booking');
      }

      const data = await response.json();
      const booking = data?.data?.booking || data?.booking;
      const bookingId = booking?.id;

      if (!bookingId) {
        throw new Error('Booking ID not received');
      }

      // Calculate final amount on frontend to match display
      const basePrice = Math.round(selectedRoomPrice * nights * roomConfigs.length);
      const finalAmount = Math.max(0, basePrice - discountAmount);

      // Prepare payment intent with booking details
      const paymentIntent = {
        bookingId: bookingId,
        hotelName: detail?.name || 'Hotel',
        address: detail?.address || detail?.location || '',
        city: detail?.city || '',
        latitude: detail?.latitude,
        longitude: detail?.longitude,
        checkIn: checkIn,
        checkOut: checkOut,
        guests: totalGuests,
        rooms: roomConfigs.length,
        amount: finalAmount,
        image: roomImages[0] || '/placeholder-hotel.jpg',
        breakdown: {
          amount: finalAmount,
          base_amount: basePrice,
          discount_amount: discountAmount,
          price_per_night: selectedRoomPrice,
          nights: nights,
          coupon_applied: appliedCoupon
        }
      };

      try {
        sessionStorage.setItem('paymentIntent', JSON.stringify(paymentIntent));
        sessionStorage.setItem('selectedBooking', JSON.stringify(paymentIntent));
      } catch (e) {
        console.error('Failed to save payment intent:', e);
      }

      // Navigate to payment page
      navigate('/payment');
    } catch (error) {
      alert(error.message || 'Failed to create booking. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-[#ee2e24]"></div>
          <p className="mt-4 text-gray-600 text-sm sm:text-base">Loading hotel details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl sm:text-5xl mb-4">⚠️</div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Oops! Something went wrong</h2>
          <p className="text-gray-600 text-sm sm:text-base mb-6">{error}</p>
          <button 
            onClick={() => navigate('/hotels')} 
            className="bg-[#ee2e24] text-white px-6 py-2.5 sm:py-3 rounded-lg hover:bg-[#d42620] font-semibold text-sm sm:text-base transition-colors"
          >
            Back to Hotels
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Image Lightbox */}
      {showLightbox && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <button onClick={() => setShowLightbox(false)} className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 transition-colors z-50">
            <FaTimes />
          </button>
          <button onClick={prevImage} className="absolute left-2 sm:left-4 text-white text-3xl sm:text-4xl hover:text-gray-300 transition-colors bg-black bg-opacity-30 hover:bg-opacity-50 rounded-full p-2">
            <FaChevronLeft />
          </button>
          <img src={roomImages[currentImageIndex]} alt="Room" className="max-w-full max-h-[90vh] object-contain" />
          <button onClick={nextImage} className="absolute right-2 sm:right-4 text-white text-3xl sm:text-4xl hover:text-gray-300 transition-colors bg-black bg-opacity-30 hover:bg-opacity-50 rounded-full p-2">
            <FaChevronRight />
          </button>
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
            {currentImageIndex + 1} / {roomImages.length}
          </div>
        </div>
      )}

      {/* Room & Guest Selection Modal */}
      {showRoomGuestModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Rooms & Guests</h3>
                <button onClick={() => setShowRoomGuestModal(false)} className="text-gray-500 hover:text-gray-700">
                  <FaTimes size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {roomConfigs.map((room, index) => (
                  <div key={room.id} className="border border-gray-300 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-gray-700">Room {index + 1}</h4>
                      {roomConfigs.length > 1 && (
                        <button
                          onClick={() => deleteRoom(room.id)}
                          className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
                        >
                          <FaTrash size={12} />
                          Delete
                        </button>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-gray-600">Guests (Max 2)</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateGuestCount(room.id, false)}
                          disabled={room.guests <= 1}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FaMinus size={12} />
                        </button>
                        <span className="font-semibold text-lg w-8 text-center">{room.guests}</span>
                        <button
                          onClick={() => updateGuestCount(room.id, true)}
                          disabled={room.guests >= 2}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FaPlus size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Children/Adults (Max 2)</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateChildrenCount(room.id, false)}
                          disabled={room.children <= 0}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FaMinus size={12} />
                        </button>
                        <span className="font-semibold text-lg w-8 text-center">{room.children}</span>
                        <button
                          onClick={() => updateChildrenCount(room.id, true)}
                          disabled={room.children >= 2}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FaPlus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {roomConfigs.length < 5 && roomConfigs.length < (availableRooms.find(r => r.name === selectedRoomType)?.available || 5) && (
                  <button
                    onClick={addRoom}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-[#ee2e24] hover:border-[#ee2e24] hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <FaPlus />
                    Add Room
                  </button>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowRoomGuestModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowRoomGuestModal(false)}
                  className="flex-1 bg-[#ee2e24] text-white py-2 rounded-lg hover:bg-[#d42620]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-1 gap-6 lg:gap-8 xl:grid-cols-3">
          {/* Left Column - Images and Details */}
          <div className="xl:col-span-2">
            {/* Image Gallery */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
              <div className="relative">
                <div className="relative h-56 sm:h-72 md:h-80 lg:h-96 bg-gray-200">
                  <img src={roomImages[currentImageIndex]} alt={`Room ${currentImageIndex + 1}`} className="w-full h-full object-cover" />
                  <button onClick={prevImage} className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 sm:p-3 transition-all shadow-lg">
                    <FaChevronLeft className="text-gray-800 text-xl" />
                  </button>
                  <button onClick={nextImage} className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 sm:p-3 transition-all shadow-lg">
                    <FaChevronRight className="text-gray-800 text-xl" />
                  </button>
                  <button onClick={() => setShowLightbox(true)} className="absolute bottom-4 right-4 bg-white hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                    View All Photos
                  </button>
                </div>
                <div className="flex gap-2 p-3 sm:p-4 overflow-x-auto">
                  {roomImages.map((img, idx) => (
                    <button key={idx} onClick={() => setCurrentImageIndex(idx)} className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${idx === currentImageIndex ? 'border-[#ee2e24]' : 'border-gray-200 hover:border-gray-400'}`}>
                      <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Hotel Information */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
              <div className="mb-4">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-2 break-words">{detail?.name || 'Hotel'}</h1>
                <div className="flex flex-wrap items-center text-gray-600">
                  <FaMapMarkerAlt className="mr-2 text-[#ee2e24]" />
                  <span>{detail?.address || detail?.location || 'Location not available'}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4">
                <div className={`flex items-center ${(Number(detail?.rating) > 0 || reviews.length > 0) ? 'bg-green-600' : 'bg-gray-500'} text-white px-3 py-1 rounded-lg`}>
                  <span className="font-bold mr-1">
                    {(detail?.rating && Number(detail.rating) > 0)
                      ? (Number(detail.rating) || 0).toFixed(1)
                      : (reviews.length
                          ? (reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1)
                          : 'New')}
                  </span>
                  {(Number(detail?.rating) > 0 || reviews.length > 0) && <span className="text-sm">★</span>}
                </div>
                <span className="text-gray-600 text-sm">({reviews.length} reviews)</span>
              </div>

              {detail?.description && (
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-2">About this Property</h3>
                  <p className="text-gray-600 leading-relaxed">{detail.description}</p>
                </div>
              )}

              {/* Amenities */}
              {amenities.length > 0 && (
                <div>
                  <h3 className="font-semibold text-base sm:text-lg mb-3">Amenities</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {amenities.map((amenity, idx) => (
                      <div key={idx} className="flex items-center text-gray-700">
                        <FaCheckCircle className="text-green-500 mr-2" />
                        <span className="text-sm">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Reviews Section */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
              <h3 className="font-semibold text-base sm:text-lg mb-3">Ratings and Reviews</h3>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4">
                <div className={`flex items-center ${(detail?.rating > 0 || reviews.length > 0) ? 'bg-green-600' : 'bg-gray-500'} text-white px-3 py-1 rounded-lg`}>
                  <span className="font-bold mr-1">
                    {(detail?.rating && detail.rating > 0) 
                      ? (parseFloat(detail.rating) || 0).toFixed(1) 
                      : (reviews.length 
                          ? (reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1) 
                          : 'New')}
                  </span>
                  {(detail?.rating > 0 || reviews.length > 0) && <span className="text-sm">★</span>}
                </div>
                <span className="text-gray-600 text-sm">({reviews.length} reviews)</span>
              </div>
              
              {reviewsLoading ? (
                <div className="text-sm text-gray-600">Loading reviews...</div>
              ) : reviewsError ? (
                <div className="text-sm text-red-600">{reviewsError}</div>
              ) : (
                <div className="space-y-4 mb-6">
                  {reviews.slice(0, 5).map((rev) => (
                    <div key={(rev.id || Math.random())} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <FaStar key={i} className={(rev.rating || 0) >= i ? 'text-yellow-500' : 'text-gray-300'} />
                          ))}
                        </div>
                        <span className="text-sm font-semibold text-gray-700">{rev.userName}</span>
                        {myReview && rev.id === myReview.id ? <span className="text-xs text-blue-600 font-semibold">(Your Review)</span> : null}
                      </div>
                      <p className="text-sm text-gray-700">{rev.comment}</p>
                      {rev.createdAt ? <p className="text-xs text-gray-500 mt-1">{new Date(rev.createdAt).toLocaleDateString()}</p> : null}
                    </div>
                  ))}
                  {reviews.length === 0 && (
                    <p className="text-sm text-gray-600">No reviews yet. Be the first to review!</p>
                  )}
                </div>
              )}

              {/* Write Review Section */}
              {canWriteReview && (
                <div className="mt-6 border-t pt-6">
                  <h4 className="font-semibold text-lg mb-3">{myReview ? 'Update Your Review' : 'Write a Review'}</h4>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Your Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <button 
                          key={i} 
                          type="button" 
                          onClick={() => setReviewRating(i)} 
                          className="focus:outline-none hover:scale-110 transition-transform"
                        >
                          <FaStar className={reviewRating >= i ? 'text-yellow-500 text-2xl sm:text-3xl' : 'text-gray-300 text-2xl sm:text-3xl'} />
                        </button>
                      ))}
                      {reviewRating > 0 && (
                        <span className="ml-3 text-gray-600 self-center">
                          {reviewRating === 1 ? 'Poor' : reviewRating === 2 ? 'Fair' : reviewRating === 3 ? 'Good' : reviewRating === 4 ? 'Very Good' : 'Excellent'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Your Review</label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      rows={4}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#ee2e24] focus:outline-none"
                      placeholder="Share your experience with other travelers..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={submitReview}
                      disabled={submittingReview}
                      className="bg-[#ee2e24] hover:bg-[#d42620] text-white px-6 py-2 rounded-lg text-sm font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {submittingReview ? 'Saving...' : (myReview ? 'Update Review' : 'Submit Review')}
                    </button>
                    {myReview && (
                      <button
                        onClick={deleteReview}
                        disabled={submittingReview}
                        className="border border-red-500 text-red-500 hover:bg-red-50 px-6 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Delete Review
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!canWriteReview && getToken() && (
                <div className="mt-6 border-t pt-6">
                  <p className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <strong>Note:</strong> You can write a review after completing a stay at this hotel.
                  </p>
                </div>
              )}
            </div>

            {/* Map Location */}
            {(detail?.latitude && detail?.longitude) || detail?.address ? (
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
                <h3 className="font-semibold text-base sm:text-lg mb-3">Location</h3>
                <div className="h-64 rounded-lg overflow-hidden">
                  <iframe
                    title="Hotel Location"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://maps.google.com/maps?q=${
                      detail.latitude && detail.longitude 
                        ? `${detail.latitude},${detail.longitude}` 
                        : encodeURIComponent(detail.address || detail.name)
                    }&z=15&output=embed`}
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            ) : null}
          </div>

          {/* Right Column - Booking Card */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:sticky lg:top-6">
              {/* Room Type Selection */}
              <div className="mb-6">
                <h3 className="font-semibold text-lg text-gray-800">Choose your room</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Available Rooms: <span className="font-medium text-[#ee2e24]">{detail?.available_rooms ?? availableRooms.reduce((acc, r) => acc + (r.available || 0), 0)}</span>
                </p>
                <div className="space-y-3">
                  {availableRooms.map((room) => (
                    <label
                      key={room.id}
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedRoomType === room.name
                          ? 'border-[#ee2e24] bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${room.available === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="radio"
                        name="roomType"
                        value={room.name}
                        checked={selectedRoomType === room.name}
                        disabled={room.available === 0}
                        onChange={() => {
                          if (room.available === 0) return;
                          setSelectedRoomType(room.name);
                          setSelectedRoomPrice(room.price);
                          if (roomConfigs.length > room.available) {
                             setRoomConfigs(roomConfigs.slice(0, room.available));
                             // Optional: alert user
                          }
                        }}
                        className="w-5 h-5 text-[#ee2e24] focus:ring-[#ee2e24]"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-800">{room.name}</span>
                          <span className="text-[#ee2e24] font-bold text-lg">₹{room.price}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                           <span className="text-sm text-gray-500">per night</span>
                           {room.available > 5 ? (
                              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">Available: {room.available}</span>
                           ) : room.available > 0 ? (
                              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">Only {room.available} left!</span>
                           ) : (
                              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Hotel is full</span>
                           )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Selection */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#ee2e24] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    min={(() => {
                      if (!checkIn) return '';
                      const d = new Date(checkIn);
                      d.setDate(d.getDate() + 1);
                      return d.toISOString().split('T')[0];
                    })()}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#ee2e24] focus:outline-none"
                  />
                </div>
              </div>

              {/* Room & Guest Selection Button */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Rooms & Guests</label>
                <button
                  onClick={() => setShowRoomGuestModal(true)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-left hover:border-gray-400 focus:ring-2 focus:ring-[#ee2e24] focus:outline-none transition-colors"
                >
                  <span className="text-gray-700">{totalRooms} Room{totalRooms > 1 ? 's' : ''}, {totalGuests} Guest{totalGuests > 1 ? 's' : ''}</span>
                </button>
              </div>

              {/* Coupon Code */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FaTag className="inline mr-1" /> Coupon Code (Optional)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Enter coupon code"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#ee2e24] focus:outline-none"
                    disabled={!!appliedCoupon}
                  />
                  {appliedCoupon ? (
                     <button
                       onClick={removeCoupon}
                       className="w-full sm:w-auto bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-300 transition-colors"
                     >
                       Remove
                     </button>
                  ) : (
                     <button
                       onClick={applyCoupon}
                       className="w-full sm:w-auto bg-[#ee2e24] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#d42620] transition-colors"
                     >
                       Apply
                     </button>
                  )}
                </div>
                {appliedCoupon && (
                  <p className="text-green-600 text-xs mt-1">
                    Coupon <strong>{appliedCoupon}</strong> applied successfully!
                  </p>
                )}

                {!appliedCoupon && (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-700">Available Coupons</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                      {availableCoupons.map((coupon) => (
                        <div key={coupon.code} className="border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50 flex justify-between items-center hover:bg-red-50 hover:border-red-200 transition-all group">
                          <div>
                            <div className="flex items-center gap-2">
                               <span className="font-bold text-gray-800 text-sm group-hover:text-[#ee2e24]">{coupon.code}</span>
                               <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded font-bold">{coupon.discount}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{coupon.description}</p>
                          </div>
                          <button
                            onClick={() => applyCoupon(coupon.code)}
                            className="text-[#ee2e24] text-xs font-bold hover:bg-[#ee2e24] hover:text-white px-3 py-1 rounded transition-colors border border-[#ee2e24]"
                          >
                            APPLY
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold mb-3 text-gray-800">Price Breakdown</h4>
                {(() => {
                  const base = Math.round(selectedRoomPrice * nights * totalRooms);
                  // Removed Service Fee and GST as requested
                  const total = Math.max(0, base - discountAmount);
                  return (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{totalRooms} Room{totalRooms > 1 ? 's' : ''} × {nights} Night{nights > 1 ? 's' : ''}</span>
                        <span className="text-gray-800">₹{base.toLocaleString()}</span>
                      </div>
                      
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600">Coupon Discount ({appliedCoupon})</span>
                          <span className="text-green-600">-₹{discountAmount.toLocaleString()}</span>
                        </div>
                      )}

                      <div className="border-t pt-2 mt-2 flex justify-between items-center">
                        <span className="font-bold text-gray-800">Total Amount</span>
                        <span className="text-2xl font-bold text-[#ee2e24]">₹{total.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Book Button */}
              <button 
                className="w-full bg-[#ee2e24] hover:bg-[#d42620] text-white py-2.5 sm:py-3 rounded-lg font-bold text-base sm:text-lg transition-colors mb-3 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
                onClick={createBooking}
                disabled={creating || !selectedRoomType || (availableRooms.find(r => r.name === selectedRoomType)?.available || 0) === 0}
              >
                {creating ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Continue to Book'
                )}
              </button>

              {/* Additional Info */}
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start">
                  <FaCheckCircle className="text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Free Cancellation within 48 hours</span>
                </div>
                <div className="flex items-start">
                  <FaCheckCircle className="text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Pay at hotel available</span>
                </div>
                <div className="flex items-start">
                  <FaCheckCircle className="text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Check-in: 12:00 PM | Check-out: 11:00 AM</span>
                </div>
                <div className="flex items-start">
                  <FaShieldAlt className="text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Secure booking with 256-bit encryption</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Properties */}
      {similarProperties.length > 0 && (
        <div className="bg-white py-8 sm:py-12 mt-6 sm:mt-8 border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">
                Similar Properties<br className="sm:hidden" /> You May Like
              </h2>
              {similarProperties.length > itemsPerView && (
                <div className="flex gap-2 self-end sm:self-auto">
                  <button
                    onClick={prevSimilarProperty}
                    disabled={similarPropertiesIndex === 0}
                    className={`p-2 rounded-full shadow-md transition-all ${
                      similarPropertiesIndex === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-white text-gray-800 hover:bg-gray-100 hover:scale-110'
                    }`}
                  >
                    <FaChevronLeft className="text-base sm:text-lg" />
                  </button>
                  <button
                    onClick={nextSimilarProperty}
                    disabled={similarPropertiesIndex >= similarProperties.length - itemsPerView}
                    className={`p-2 rounded-full shadow-md transition-all ${
                      similarPropertiesIndex >= similarProperties.length - itemsPerView
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-white text-gray-800 hover:bg-gray-100 hover:scale-110'
                    }`}
                  >
                    <FaChevronRight className="text-base sm:text-lg" />
                  </button>
                </div>
              )}
            </div>

            <div className="relative overflow-hidden">
              <div 
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${similarPropertiesIndex * (100 / itemsPerView)}%)` }}
              >
                {similarProperties.map((property) => (
                  <div 
                    key={property.id} 
                    className="flex-shrink-0 px-2 sm:px-3"
                    style={{ width: `${100 / itemsPerView}%` }}
                  >
                    <div 
                      className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 h-full cursor-pointer group border border-gray-200"
                      onClick={() => {
                        sessionStorage.setItem('selectedRoom', JSON.stringify(property));
                        navigate(`/roomDetails?id=${property.id}`);
                        window.scrollTo(0, 0);
                      }}
                    >
                      <div className="relative h-48 sm:h-52 bg-gray-200">
                        <img 
                          src={property.image} 
                          alt={property.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-0.5">
                          {property.rating}★
                        </div>
                      </div>
                      <div className="p-3 sm:p-4">
                        <h3 className="font-bold text-gray-800 text-sm sm:text-base lg:text-lg mb-1 sm:mb-2 group-hover:text-[#ee2e24] transition-colors line-clamp-1">
                          {property.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 mb-3 flex items-center line-clamp-1">
                          <FaMapMarkerAlt className="mr-1 text-gray-400 flex-shrink-0" />
                          {property.location}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2 sm:gap-3">
                          <div>
                            <div className="text-xs text-gray-500">Starting<br className="sm:hidden" /> from</div>
                            <div className="text-xl sm:text-2xl font-bold text-[#ee2e24]">₹{property.price}</div>
                            <div className="text-xs text-gray-500">per night</div>
                          </div>
                          <button 
                            className="bg-[#ee2e24] hover:bg-[#d42620] text-white px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition-colors w-full sm:w-auto whitespace-nowrap"
                            onClick={(e) => {
                              e.stopPropagation();
                              sessionStorage.setItem('selectedRoom', JSON.stringify(property));
                              navigate(`/roomDetails?id=${property.id}`);
                              window.scrollTo(0, 0);
                            }}
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomDetailsPage;
