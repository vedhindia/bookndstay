import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHotel, FaCalendarAlt, FaUsers, FaRupeeSign, FaCheckCircle, FaTimesCircle, FaSearch } from 'react-icons/fa';
import { getToken } from '../api/auth';

export default function BookingHistoryPage() {
  const navigate = useNavigate();
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fixed API base URL construction
  const apiUserBase = (() => {
    const base = (import.meta.env.VITE_API_BASE || '/api/auth').replace(/\/+$/, '');
    const cleaned = base.replace(/\/auth\/?$/, '');
    return `${cleaned}/user`;
  })();

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

  // Fetch bookings from API
  useEffect(() => {
    const fetchBookings = async () => {
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        setError('');

        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('limit', '100');

        console.log('Fetching from:', `${apiUserBase}/bookings?${params.toString()}`);

        let response = await fetch(`${apiUserBase}/bookings?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        // Fallback: retry without pagination params if initial request fails with 400
        if (!response.ok && response.status === 400) {
          console.warn('Pagination fetch failed, retrying without params');
          response = await fetch(`${apiUserBase}/bookings`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
        }

        if (!response.ok) {
          if (response.status === 401) {
             // Handle 401 specifically
             throw new Error('Session expired'); 
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch bookings');
        }

        const data = await response.json();
        // data.data is the array from sendPaginatedResponse
        const bookingsList = Array.isArray(data.data) ? data.data : (data.bookings || []);
        
        // Fetch hotel images separately since they are not included in booking response
        const uniqueHotelIds = [...new Set(bookingsList.map(b => b.hotel_id || b.hotel?.id || b.hotel?._id))].filter(Boolean);
        const hotelImagesMap = {};
        
        if (uniqueHotelIds.length > 0) {
          try {
            await Promise.all(uniqueHotelIds.map(async (hid) => {
              try {
                const hRes = await fetch(`${apiUserBase}/hotels/${hid}`, {
                  method: 'GET',
                  headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                  }
                });
                if (hRes.ok) {
                  const hData = await hRes.json();
                  const hotel = hData.data?.hotel || hData.hotel;
                  if (hotel) {
                    if (hotel.id) hotelImagesMap[hotel.id] = hotel;
                    if (hotel._id) hotelImagesMap[hotel._id] = hotel;
                    hotelImagesMap[hid] = hotel;
                  }
                }
              } catch (e) {
                console.warn(`Failed to fetch image for hotel ${hid}`, e);
              }
            }));
          } catch (e) {
             console.warn('Error fetching hotel images', e);
          }
        }

        // Transform API data to component format
        const transformedBookings = bookingsList.map(booking => {
          const hotelId = booking.hotel_id || booking.hotel?.id || booking.hotel?._id;
          const hotelFull = hotelImagesMap[hotelId];
          const displayImage = pickPrimaryImage(hotelFull) || pickPrimaryImage(booking.hotel) || '/src/assets/img/room.jpg';
          
          return {
          id: booking.id || booking._id || booking.booking_id || booking.bookingId,
          hotelId: hotelId,
          hotelName: booking.hotel?.name || 'Hotel',
          address: booking.hotel?.address || booking.hotel?.location || '',
          latitude: booking.hotel?.latitude,
          longitude: booking.hotel?.longitude,
          city: booking.hotel?.city,
          checkIn: booking.check_in,
          checkOut: booking.check_out,
          guests: booking.guests || 2,
          rooms: booking.booked_room || booking.rooms || booking.no_of_rooms || 1,
          amount: booking.amount,
          status: booking.status?.toLowerCase() || 'pending',
          image: displayImage,
          roomType: booking.room_type
        }});

        setAllBookings(transformedBookings);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        if (err.message === 'Session expired' || err.message.includes('401')) {
           setError('Your session has expired. Please login again.');
           setTimeout(() => navigate('/login'), 2000);
        } else {
           setError(err.message || 'Failed to load bookings');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [apiUserBase, navigate]);

  // Filter to show only completed and cancelled bookings (history)
  // Modified: User requested to show ALL bookings in history
  const onlyHistory = useMemo(
    () => allBookings, // .filter(b => b.status === 'completed' || b.status === 'cancelled'),
    [allBookings]
  );

  // Apply search and status filters
  const filtered = useMemo(() => {
    return onlyHistory.filter(b => {
      const statusOk = statusFilter === 'all' ? true : b.status === statusFilter;
      const queryLower = query.trim().toLowerCase();
      
      const hotelName = b.hotelName ? String(b.hotelName).toLowerCase() : '';
      const bookingId = b.id ? String(b.id).toLowerCase() : '';
      
      const textOk = query.trim() === '' ? true : (
        hotelName.includes(queryLower) || 
        bookingId.includes(queryLower)
      );
      return statusOk && textOk;
    });
  }, [onlyHistory, query, statusFilter]);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'confirmed':
        return 'text-green-600';
      case 'pending':
        return 'text-blue-600';
      case 'completed':
        return 'text-gray-600';
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'confirmed':
        return <FaCheckCircle className="mr-2" />;
      case 'pending':
        return <FaClock className="mr-2" />;
      case 'completed':
        return <FaCheckCircle className="mr-2" />;
      case 'cancelled':
        return <FaTimesCircle className="mr-2" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#ee2e24]"></div>
          <p className="mt-4 text-gray-600">Loading booking history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-[#ee2e24] text-white px-6 py-2 rounded-lg hover:bg-[#d62c22]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-800">Booking History</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
          <div className="flex-1 flex items-center border border-gray-300 rounded-lg px-3 py-2">
            <FaSearch className="text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search by hotel or booking ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full text-sm focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 font-medium">Status:</label>
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#ee2e24] focus:outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-4 sm:space-y-6">
          {filtered.map((booking) => (
            <div 
              key={booking.id} 
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => {
                if (booking.hotelId) {
                  navigate(`/roomDetails?id=${booking.hotelId}`);
                } else {
                  console.warn('Hotel ID missing', booking);
                  alert('Hotel details not available');
                }
              }}
            >
              <div className="md:flex">
                {/* Hotel Image */}
                <div className="md:w-1/4 h-40 sm:h-48 md:h-auto">
                  <img 
                    src={booking.image} 
                    alt={booking.hotelName} 
                    className="w-full h-full object-cover hover:opacity-90 transition-opacity" 
                  />
                </div>

                {/* Booking Details */}
                <div className="p-4 sm:p-6 md:w-3/4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4">
                    <div className="flex-1">
                      <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1 sm:mb-2">{booking.hotelName}</h2>
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">Booking ID: {booking.id}</p>
                      {booking.roomType && (
                        <p className="text-xs sm:text-sm text-gray-600">Room Type: {booking.roomType.replace('_', ' ')}</p>
                      )}
                    </div>
                    <div className={`flex items-center font-medium ${getStatusColor(booking.status)} text-xs sm:text-sm mt-2 sm:mt-0`}>
                      {getStatusIcon(booking.status)}
                      <span>{booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
                    <div className="flex items-center text-gray-600 text-xs sm:text-sm">
                      <FaCalendarAlt className="mr-2 text-[#ee2e24]" />
                      <span>Check-in: {formatDate(booking.checkIn)}</span>
                    </div>
                    <div className="flex items-center text-gray-600 text-xs sm:text-sm">
                      <FaCalendarAlt className="mr-2 text-[#ee2e24]" />
                      <span>Check-out: {formatDate(booking.checkOut)}</span>
                    </div>
                    <div className="flex items-center text-gray-600 text-xs sm:text-sm">
                      <FaUsers className="mr-2 text-[#ee2e24]" />
                      <span>{booking.rooms} Room{booking.rooms !== 1 ? 's' : ''}, {booking.guests} Guest{booking.guests !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center text-gray-600 text-xs sm:text-sm">
                      <FaRupeeSign className="mr-2 text-[#ee2e24]" />
                      <span>₹{booking.amount}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-3 sm:mt-4">
                    <button
                      className="bg-[#ee2e24] text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded text-xs sm:text-sm hover:bg-[#d62c22]"
                      onClick={(e) => {
                        e.stopPropagation();
                        try { 
                          sessionStorage.setItem('selectedBooking', JSON.stringify(booking)); 
                        } catch (e) {
                          console.error('Failed to save booking:', e);
                        }
                        navigate('/viewBooking');
                      }}
                    >
                      View Details
                    </button>
                    {(booking.status === 'completed' || booking.status === 'confirmed') && (
                      <button
                        className="border border-gray-300 text-gray-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded text-xs sm:text-sm hover:bg-gray-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                      sessionStorage.setItem('selectedBooking', JSON.stringify(booking));
                    } catch (e) {
                      console.error('Failed to save booking:', e);
                    }
                    navigate(`/invoice?id=${booking.id}`);
                  }}
                >
                  View Invoice
                      </button>
                    )}
                    {booking.status === 'completed' && (
                      <button
                        className="border border-gray-300 text-gray-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded text-xs sm:text-sm hover:bg-gray-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          try { 
                            sessionStorage.setItem('selectedBooking', JSON.stringify(booking)); 
                          } catch (e) {
                            console.error('Failed to save booking:', e);
                          }
                          navigate('/writeReview');
                        }}
                      >
                        Write Review
                      </button>
                    )}
                    {booking.status === 'cancelled' && (
                      <button
                        className="border border-[#ee2e24] text-[#ee2e24] px-3 py-1.5 sm:px-4 sm:py-2 rounded text-xs sm:text-sm hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/hotels');
                        }}
                      >
                        Book Again
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-8 text-center">
          <FaHotel className="mx-auto text-4xl sm:text-5xl text-gray-400 mb-3 sm:mb-4" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2 sm:mb-3">No History Found</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
            {query || statusFilter !== 'all' 
              ? 'No bookings match your search criteria.' 
              : 'You have no completed or cancelled bookings yet.'}
          </p>
          {(query || statusFilter !== 'all') ? (
            <button 
              onClick={() => {
                setQuery('');
                setStatusFilter('all');
              }}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm sm:text-base hover:bg-gray-300 mr-3"
            >
              Clear Filters
            </button>
          ) : null}
          <button 
            onClick={() => navigate('/hotels')}
            className="bg-[#ee2e24] text-white px-4 py-2 rounded text-sm sm:text-base hover:bg-[#d62c22]"
          >
            Browse Hotels
          </button>
        </div>
      )}
    </div>
  );
}
