import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHotel, FaCalendarAlt, FaUsers, FaRupeeSign, FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa';
import { getToken } from '../api/auth';

export default function MyBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
        params.set('limit', '50');
        if (statusFilter !== 'all') {
          params.set('status', statusFilter.toUpperCase());
        }

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
            setError('Your session has expired. Please login again.');
            setTimeout(() => navigate('/login'), 2000);
            return;
          }
          let message = 'Failed to fetch bookings';
          try {
            const errData = await response.json();
            message = errData?.message || message;
          } catch {}
          throw new Error(message);
        }

        const data = await response.json();
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
                    // Store by both id and _id to be safe
                    if (hotel.id) hotelImagesMap[hotel.id] = hotel;
                    if (hotel._id) hotelImagesMap[hotel._id] = hotel;
                    // Also store by the requested hid
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
          // Try to pick image from fetched full hotel details, or fallback to booking's hotel object
          const displayImage = pickPrimaryImage(hotelFull) || pickPrimaryImage(booking.hotel) || '/src/assets/img/room.jpg';
          
          return {
          id: booking.id,
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

        setBookings(transformedBookings);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setError(err.message || 'Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [apiUserBase, navigate, statusFilter]);
  
  // Format date to display in a readable format
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };
  
  // Get status color based on booking status
  const getStatusColor = (status) => {
    switch(status) {
      case 'confirmed':
        return 'text-green-600';
      case 'pending':
        return 'text-blue-600';
      case 'cancelled':
        return 'text-red-600';
      case 'completed':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };
  
  // Get status icon based on booking status
  const getStatusIcon = (status) => {
    switch(status) {
      case 'confirmed':
        return <FaCheckCircle className="mr-2" />;
      case 'pending':
        return <FaClock className="mr-2" />;
      case 'cancelled':
        return <FaTimesCircle className="mr-2" />;
      case 'completed':
        return <FaCheckCircle className="mr-2" />;
      default:
        return null;
    }
  };

  // Helper: determine if a booking is currently active (today between check-in and check-out)
  const isCurrentBooking = (booking) => {
    const today = new Date();
    const start = new Date(booking.checkIn);
    const end = new Date(booking.checkOut);
    // Normalize times to ignore time-of-day
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    return t >= s && t <= e && (booking.status === 'confirmed' || booking.status === 'pending');
  };

  // Helper: determine if a booking is upcoming
  const isUpcoming = (booking) => {
    const today = new Date();
    const start = new Date(booking.checkIn);
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    return start > today && (booking.status === 'confirmed' || booking.status === 'pending');
  };

  const currentBookings = bookings.filter(isCurrentBooking);
  const upcomingBookings = bookings.filter(b => !isCurrentBooking(b) && isUpcoming(b));
  const pastBookings = bookings.filter(b => !isCurrentBooking(b) && !isUpcoming(b));

  const handleCancelBooking = async (bookingId) => {
    const confirmed = window.confirm('Are you sure you want to cancel this booking?');
    if (!confirmed) return;

    const token = getToken();
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${apiUserBase}/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to cancel booking');
      }

      // Refresh bookings
      setBookings(bookings.map(b => 
        b.id === bookingId ? { ...b, status: 'cancelled' } : b
      ));

      alert('Booking cancelled successfully');
    } catch (error) {
      alert(error.message || 'Failed to cancel booking');
    }
  };

  const BookingCard = ({ booking, isCurrent = false }) => (
    <div 
      className={`bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow ${isCurrent ? 'border-2 border-green-500' : ''}`}
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
              <span>{isCurrent ? 'Ongoing' : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</span>
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
            {(booking.status === 'confirmed' || booking.status === 'pending') && (isUpcoming(booking) || isCurrentBooking(booking)) && (
              <button 
                className="border border-[#ee2e24] text-[#ee2e24] px-3 py-1.5 sm:px-4 sm:py-2 rounded text-xs sm:text-sm hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelBooking(booking.id);
                }}
              >
                Cancel Booking
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
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#ee2e24]"></div>
          <p className="mt-4 text-gray-600">Loading your bookings...</p>
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
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-8 text-gray-800">My Bookings</h1>

      {/* Status Filter */}
      <div className="mb-6 flex gap-3 flex-wrap">
        {['all', 'confirmed', 'pending', 'cancelled', 'completed'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-[#ee2e24] text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>
      
      {bookings.length > 0 ? (
        <div className="space-y-6 sm:space-y-8">
          {/* Current Booking section */}
          {currentBookings.length > 0 && (
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 flex items-center">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm mr-3">
                  Active Now
                </span>
                Current Booking
              </h2>
              <div className="space-y-4">
                {currentBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} isCurrent={true} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Bookings */}
          {upcomingBookings.length > 0 && (
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                Upcoming Bookings
              </h2>
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            </div>
          )}

          {/* Past Bookings */}
          {pastBookings.length > 0 && (
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                Past Bookings
              </h2>
              <div className="space-y-4">
                {pastBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-8 text-center">
          <FaHotel className="mx-auto text-4xl sm:text-5xl text-gray-400 mb-3 sm:mb-4" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2 sm:mb-3">No Bookings Found</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
            {statusFilter !== 'all' 
              ? `You don't have any ${statusFilter} bookings.`
              : "You haven't made any bookings yet."}
          </p>
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
