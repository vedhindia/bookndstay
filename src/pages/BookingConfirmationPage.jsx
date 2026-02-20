import { useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaMapMarkerAlt, FaCalendarAlt, FaUsers, FaPrint, FaHome } from 'react-icons/fa';

const BookingConfirmationPage = () => {
  const navigate = useNavigate();

  // Retrieve booking details from sessionStorage
  const selectedRoomRaw = typeof window !== 'undefined' ? sessionStorage.getItem('selectedBooking') : null;
  let roomDetails = null;
  if (selectedRoomRaw) {
    try {
      roomDetails = JSON.parse(selectedRoomRaw);
    } catch (e) {
      console.error('Failed to parse booking details:', e);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const hotelName = roomDetails?.hotelName || 'Hotel';
  const address = roomDetails?.address || roomDetails?.location || '';
  const price = roomDetails?.amount || 0;
  const image = roomDetails?.image || null;
  const latitude = roomDetails?.latitude;
  const longitude = roomDetails?.longitude;
  const city = roomDetails?.city;
  const bookingId = roomDetails?.id || 'N/A';
  const checkIn = roomDetails?.checkIn;
  const checkOut = roomDetails?.checkOut;
  const guests = roomDetails?.guests || 2;
  const rooms = roomDetails?.rooms || 1;
  const paymentMethod = roomDetails?.paymentMethod || roomDetails?.payment_method;
  const basePrice = roomDetails?.base_amount || price;
  const discount = roomDetails?.discount_amount || 0;
  const couponCode = roomDetails?.coupon_code;

  if (!roomDetails) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">No Booking Found</h1>
          <p className="text-gray-600 mb-6">We couldn't find your booking confirmation. Please check your bookings page.</p>
          <button 
            className="bg-[#ee2e24] text-white px-6 py-3 rounded-lg hover:bg-[#d62c22]"
            onClick={() => navigate('/bookings')}
          >
            Go to My Bookings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Success Message */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 text-center">
          <FaCheckCircle className="text-green-500 text-5xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-600">
            Your booking has been confirmed. Booking ID: <span className="font-semibold">{bookingId}</span>
          </p>
          <p className="text-sm text-gray-500 mt-2">A confirmation has been sent to your email and phone</p>
        </div>

        {/* Booking Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b">Booking Details</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-start mb-4">
                <div 
                  className="h-20 w-20 bg-gray-200 rounded-md mr-4 flex-shrink-0 overflow-hidden cursor-pointer" 
                  onClick={() => navigate(`/roomDetails?id=${bookingId}`)}
                >
                  {image ? (
                    <img src={image} alt={hotelName} className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                  ) : (
                    <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                      <FaHome className="text-gray-400 text-2xl" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{hotelName}</h3>
                  {address && (
                    <p className="text-sm text-gray-600 flex items-center mt-1">
                      <FaMapMarkerAlt className="text-gray-400 mr-1" />
                      {address}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <p className="text-sm text-gray-500">Check-in</p>
                  <p className="font-semibold flex items-center">
                    <FaCalendarAlt className="text-[#ee2e24] mr-2" />
                    {checkIn ? new Date(checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500">From 12:00 PM</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Check-out</p>
                  <p className="font-semibold flex items-center">
                    <FaCalendarAlt className="text-[#ee2e24] mr-2" />
                    {checkOut ? new Date(checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500">Until 11:00 AM</p>
                </div>
              </div>
              
              <div className="mt-6">
                <p className="text-sm text-gray-500">Guests & Rooms</p>
                <p className="font-semibold flex items-center">
                  <FaUsers className="text-[#ee2e24] mr-2" />
                  {guests} {guests === 1 ? 'Guest' : 'Guests'} • {rooms} {rooms === 1 ? 'Room' : 'Rooms'}
                </p>
              </div>
            </div>
            
            <div className="border-t md:border-t-0 md:border-l pt-6 md:pt-0 md:pl-6">
              <h3 className="font-semibold text-gray-800 mb-4">Payment Summary</h3>
              
              {discount > 0 && (
                <div className="space-y-2 mb-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                     <span>Base Amount</span>
                     <span>₹{Math.round(basePrice)}</span>
                  </div>
                  <div className="flex justify-between text-green-600 font-medium">
                     <span>Coupon Discount {couponCode && `(${couponCode})`}</span>
                     <span>-₹{Math.round(discount)}</span>
                  </div>
                </div>
              )}

              <div className="border-t pt-4 flex justify-between font-bold">
                <span>{paymentMethod === 'PAY_AT_HOTEL' ? 'Total Payable Amount' : 'Total Amount Paid'}</span>
                <span className="text-[#ee2e24]">₹{Math.round(price)}</span>
              </div>
              
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button 
                  className="flex-1 bg-[#ee2e24] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#d62c22] flex items-center justify-center"
                  onClick={() => {
                    try {
                      sessionStorage.setItem('selectedBooking', JSON.stringify(roomDetails));
                    } catch (e) {
                      console.error('Failed to save booking:', e);
                    }
                    navigate('/viewBooking');
                  }}
                >
                  View Booking Details
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Map View */}
        {(latitude && longitude) || address ? (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 print:hidden">
            <h3 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b">Hotel Location</h3>
            <div className="h-[300px] w-full rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
              <iframe
                title={`${hotelName} Location`}
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={`https://maps.google.com/maps?q=${
                  latitude && longitude 
                    ? `${latitude},${longitude}` 
                    : encodeURIComponent((address || '') + ' ' + (city || hotelName || ''))
                }&z=15&output=embed`}
                allowFullScreen
              ></iframe>
            </div>
          </div>
        ) : null}
        
        {/* What's Next */}
        <div className="bg-white rounded-lg shadow-sm p-6 print:hidden">
          <h2 className="text-xl font-bold text-gray-800 mb-4">What's Next?</h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
              <div className="bg-blue-50 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <FaCalendarAlt className="text-blue-500" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">Manage Booking</h3>
              <p className="text-sm text-gray-600 mb-3">View, modify or cancel your booking</p>
              <button 
                className="text-[#ee2e24] text-sm font-semibold hover:underline"
                onClick={() => navigate('/bookings')}
              >
                View Bookings →
              </button>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
              <div className="bg-green-50 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <FaCheckCircle className="text-green-500" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">Online Check-in</h3>
              <p className="text-sm text-gray-600 mb-3">Save time with our online check-in</p>
              <button 
                className="text-[#ee2e24] text-sm font-semibold hover:underline"
                onClick={() => alert('Online check-in will be available 24 hours before your check-in date')}
              >
                Coming Soon
              </button>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
              <div className="bg-purple-50 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <FaUsers className="text-purple-500" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">24/7 Support</h3>
              <p className="text-sm text-gray-600 mb-3">Need help? Contact our support team</p>
              <button 
                className="text-[#ee2e24] text-sm font-semibold hover:underline"
                onClick={() => alert('Support: +91 1234567890 | support@hotel.com')}
              >
                Get Help →
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-center gap-4 print:hidden">
          <button
            className="bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50"
            onClick={() => navigate('/hotels')}
          >
            Book Another Hotel
          </button>
          <button
            className="bg-[#ee2e24] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#d62c22]"
            onClick={() => navigate('/bookings')}
          >
            View All Bookings
          </button>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .bg-gray-50 {
            background: white;
          }
        }
      `}</style>
    </div>
  );
};

export default BookingConfirmationPage;