import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FaCalendarAlt, FaUsers, FaRupeeSign, FaMapMarkerAlt, FaCheckCircle, FaTimesCircle, FaClock, FaCreditCard } from 'react-icons/fa';
import { getToken } from '../api/auth';

const statusBadge = (status) => {
  const map = {
    completed: { color: 'text-green-600', icon: <FaCheckCircle className="mr-2" /> },
    confirmed: { color: 'text-green-600', icon: <FaCheckCircle className="mr-2" /> },
    pending: { color: 'text-blue-600', icon: <FaClock className="mr-2" /> },
    cancelled: { color: 'text-red-600', icon: <FaTimesCircle className="mr-2" /> },
  };
  return map[status] || { color: 'text-gray-600', icon: null };
};

export default function ViewBookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiUserBase = (() => {
    const base = (import.meta.env.VITE_API_BASE || 'http://localhost:3001/api/auth').replace(/\/+$/, '');
    const cleaned = base.replace(/\/auth\/?$/, '');
    return `${cleaned}/user`;
  })();

  const filesBase = (import.meta.env.VITE_FILES_BASE || (() => {
    try {
      const u = new URL(apiUserBase);
      return `${u.protocol}//${u.host}`;
    } catch {
      return 'http://localhost:3001';
    }
  })());

  const resolveImageUrl = (val) => {
    if (!val) return null;
    if (typeof val === 'string') {
      if (/^https?:\/\//i.test(val)) return val;
      if (val.startsWith('/src/')) return val; // Keep frontend assets relative
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
    const fetchBooking = async () => {
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        setError('');

        // Try to get booking from multiple sources
        let bookingData = location.state;
        
        if (!bookingData) {
          try {
            const stored = sessionStorage.getItem('selectedBooking');
            if (stored) {
              bookingData = JSON.parse(stored);
            }
          } catch (e) {
            console.error('Failed to parse stored booking:', e);
          }
        }

        // If we have a booking ID from URL or stored data, fetch from API
        const bookingId = searchParams.get('id') || bookingData?.id;
        
        if (bookingId) {
          const response = await fetch(`${apiUserBase}/bookings/${bookingId}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error('Failed to fetch booking details');
          }

          const data = await response.json();
          const apiBooking = data?.data?.booking || data?.booking;

          if (apiBooking) {
            let hotelFull = null;

            // Fetch hotel details to get images
            if (apiBooking.hotel_id || apiBooking.hotel?.id) {
              try {
                const hid = apiBooking.hotel_id || apiBooking.hotel?.id;
                const hRes = await fetch(`${apiUserBase}/hotels/${hid}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                if (hRes.ok) {
                  const hData = await hRes.json();
                  hotelFull = hData.data?.hotel || hData.hotel;
                }
              } catch (e) {
                console.warn('Failed to fetch hotel image', e);
              }
            }

            // Transform API data to component format
            const transformedBooking = {
              id: apiBooking.id,
              hotelId: apiBooking.hotel_id || apiBooking.hotel?.id || apiBooking.hotel?._id,
              hotelName: apiBooking.hotel?.name || bookingData?.hotelName || 'Hotel',
              address: apiBooking.hotel?.address || apiBooking.hotel?.location || bookingData?.address || '',
              latitude: apiBooking.hotel?.latitude || bookingData?.latitude,
              longitude: apiBooking.hotel?.longitude || bookingData?.longitude,
              city: apiBooking.hotel?.city || bookingData?.city,
              checkIn: apiBooking.check_in,
              checkOut: apiBooking.check_out,
              guests: apiBooking.guests || 2,
              rooms: apiBooking.booked_room || apiBooking.rooms || apiBooking.no_of_rooms || 1,
              amount: apiBooking.amount,
              base_amount: apiBooking.base_amount || apiBooking.amount,
              discount_amount: apiBooking.discount_amount || 0,
              coupon_code: apiBooking.coupon_code,
              status: apiBooking.status?.toLowerCase() || 'pending',
              image: pickPrimaryImage(hotelFull) || pickPrimaryImage(apiBooking.hotel) || pickPrimaryImage(bookingData) || '/src/assets/img/room.jpg',
              roomType: apiBooking.room_type,
              payment_id: apiBooking.payment_id,
              payment_method: apiBooking.payment_method || bookingData?.paymentMethod || bookingData?.payment_method
            };
            setBooking(transformedBooking);
          } else if (bookingData) {
            setBooking(bookingData);
          } else {
            setError('Booking not found');
          }
        } else if (bookingData) {
          setBooking(bookingData);
        } else {
          setError('No booking information available');
        }
      } catch (err) {
        console.error('Error fetching booking:', err);
        setError(err.message || 'Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [location.state, searchParams, navigate, apiUserBase]);

  const handleCancelBooking = async () => {
    if (!booking) return;

    const confirmed = window.confirm('Are you sure you want to cancel this booking?');
    if (!confirmed) return;

    const token = getToken();
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${apiUserBase}/bookings/${booking.id}/cancel`, {
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

      // Update booking status
      setBooking({ ...booking, status: 'cancelled' });
      alert('Booking cancelled successfully');
    } catch (error) {
      alert(error.message || 'Failed to cancel booking');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#ee2e24]"></div>
          <p className="mt-4 text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">{error || 'No booking found'}</h1>
          <p className="text-gray-600 mb-6">
            {error ? 'Please try again or contact support.' : 'Please select a booking from the My Bookings page.'}
          </p>
          <button 
            className="bg-[#ee2e24] text-white px-4 py-2 rounded" 
            onClick={() => navigate('/bookings')}
          >
            Go to My Bookings
          </button>
        </div>
      </div>
    );
  }

  const badge = statusBadge(booking.status);
  
  // Calculate if booking can be cancelled
  const canCancel = () => {
    if (booking.status !== 'confirmed' && booking.status !== 'pending') return false;
    const checkOutDate = new Date(booking.checkOut);
    checkOutDate.setHours(23, 59, 59);
    return checkOutDate > new Date();
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Booking Details</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="md:flex">
          {/* Image */}
          <div className="md:w-1/3 h-56 md:h-auto cursor-pointer" onClick={() => {
            const hid = booking.hotelId || booking.hotel_id || booking.hotel?.id || booking.hotel?._id;
            if (hid) {
              navigate(`/roomDetails?id=${hid}`);
            } else {
              console.warn('Hotel ID missing', booking);
              alert('Hotel details not available');
            }
          }}>
            <img src={booking.image} alt={booking.hotelName} className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
          </div>

          {/* Details */}
          <div className="p-6 md:w-2/3">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-800 mb-1">{booking.hotelName}</h2>
                <p className="text-gray-600 text-sm mb-1">Booking ID: <span className="font-medium">{booking.id}</span></p>
                {booking.roomType && (
                  <p className="text-gray-600 text-sm mb-1">Room Type: <span className="font-medium">{booking.roomType.replace('_', ' ')}</span></p>
                )}
                {booking.address && (
                  <p className="text-gray-600 text-sm mt-2 flex items-center">
                    <FaMapMarkerAlt className="mr-1 text-gray-400"/> 
                    {booking.address}
                  </p>
                )}
              </div>
              <div className={`flex items-center ${badge.color} font-medium ml-4`}>
                {badge.icon}
                <span>{booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center text-gray-700">
                <FaCalendarAlt className="mr-2 text-[#ee2e24]"/> 
                Check-in: {new Date(booking.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="flex items-center text-gray-700">
                <FaCalendarAlt className="mr-2 text-[#ee2e24]"/> 
                Check-out: {new Date(booking.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="flex items-center text-gray-700">
                <FaUsers className="mr-2 text-[#ee2e24]"/> 
                {booking.rooms} {booking.rooms === 1 ? 'Room' : 'Rooms'} • {booking.guests} {booking.guests === 1 ? 'Guest' : 'Guests'}
              </div>
              {booking.discount_amount > 0 && (
                <div className="flex items-center text-green-600 font-medium">
                  <FaCheckCircle className="mr-2"/> 
                  Coupon Discount: ₹{booking.discount_amount}
                </div>
              )}
              <div className="flex items-center text-gray-700">
                <FaRupeeSign className="mr-2 text-[#ee2e24]"/> 
                {booking.payment_method === 'PAY_AT_HOTEL' ? 'Total Payable:' : 'Total Paid:'} ₹{booking.amount}
              </div>
              <div className="flex items-center text-gray-700">
                <FaCreditCard className="mr-2 text-[#ee2e24]"/> 
                Payment Method: {booking.payment_method === 'PAY_AT_HOTEL' ? 'Pay at Hotel' : 'Online'}
              </div>
            </div>

            {/* Booking Date */}
            {booking.createdAt && (
              <div className="text-sm text-gray-500 mb-4">
                Booked on: {new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mt-4">
              <button 
                className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-50" 
                onClick={() => navigate('/bookings')}
              >
                Back to My Bookings
              </button>
              {canCancel() && (
                <button 
                  className="border border-[#ee2e24] text-[#ee2e24] px-4 py-2 rounded hover:bg-red-50"
                  onClick={handleCancelBooking}
                >
                  Cancel Booking
                </button>
              )}
              {!canCancel() && (booking.status === 'confirmed' || booking.status === 'pending') && (
                <p className="text-sm text-gray-500 flex items-center px-4 py-2">
                  <FaClock className="mr-2" />
                  Cancellation no longer available
                </p>
              )}
              {booking.status === 'completed' && (
                <button 
                  className="bg-[#ee2e24] text-white px-4 py-2 rounded hover:bg-[#d62c22]"
                  onClick={() => {
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
              {(booking.status === 'completed' || booking.status === 'confirmed') && (
                <button 
                  className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700"
                  onClick={() => {
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
            </div>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="border-t p-6">
          <h3 className="text-lg font-semibold mb-3">Price Details</h3>
          <div className="bg-gray-50 p-4 rounded">
            <div className="flex justify-between font-semibold">
              <span>{booking.payment_method === 'PAY_AT_HOTEL' ? 'Total Payable' : 'Total Paid'}</span>
              <span className="text-[#ee2e24]">₹{booking.amount}</span>
            </div>
          </div>
        </div>

        {/* Map View */}
        {(booking.latitude && booking.longitude) || booking.address ? (
          <div className="border-t p-6">
            <h3 className="text-lg font-semibold mb-3">Hotel Location</h3>
            <div className="h-[300px] w-full rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
              <iframe
                title={`${booking.hotelName} Location`}
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={`https://maps.google.com/maps?q=${
                  booking.latitude && booking.longitude 
                    ? `${booking.latitude},${booking.longitude}` 
                    : encodeURIComponent((booking.address || '') + ' ' + (booking.city || booking.hotelName || ''))
                }&z=15&output=embed`}
                allowFullScreen
              ></iframe>
            </div>
          </div>
        ) : null}

        {/* Important Information */}
        <div className="border-t p-6 bg-gray-50">
          <h3 className="text-lg font-semibold mb-3">Important Information</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p className="flex items-start">
              <FaCheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Check-in time: 12:00 PM | Check-out time: 11:00 AM</span>
            </p>
            <p className="flex items-start">
              <FaCheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Please carry a valid government-issued photo ID during check-in</span>
            </p>
            <p className="flex items-start">
              <FaCheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Early check-in and late check-out are subject to availability</span>
            </p>
            {canCancel() && (
              <p className="flex items-start">
                <FaCheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>Free cancellation available up to 24 hours before check-in</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}