import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FaPrint, FaDownload, FaArrowLeft } from 'react-icons/fa';
import { getToken } from '../api/auth';

export default function InvoicePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiUserBase = (() => {
    const base = import.meta.env.VITE_API_BASE || 'https://bookndstay.com/api/auth';
    const cleaned = base.replace(/\/auth\/?$/, '');
    return `${cleaned}/user`;
  })();

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
            const transformedBooking = {
              id: apiBooking.id,
              hotelName: apiBooking.hotel?.name || bookingData?.hotelName || 'Hotel',
              address: apiBooking.hotel?.address || apiBooking.hotel?.location || bookingData?.address || '',
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
              roomType: apiBooking.room_type,
              payment_id: apiBooking.payment_id,
              payment_method: apiBooking.payment_method,
              createdAt: apiBooking.created_at || apiBooking.createdAt
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

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-[#ee2e24]"></div>
          <p className="mt-4 text-sm sm:text-base text-gray-600">Generating Invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6 text-center">
          <div className="text-red-500 text-4xl mb-3">⚠️</div>
          <p className="text-red-600 text-sm sm:text-base mb-4">{error || 'Invoice not found'}</p>
          <button 
            onClick={() => navigate('/bookings')} 
            className="bg-[#ee2e24] text-white px-6 py-2.5 rounded-lg text-sm sm:text-base hover:bg-[#d62c22] transition-colors font-semibold"
          >
            Back to Bookings
          </button>
        </div>
      </div>
    );
  }

  const roomCharges = Math.round((Number(booking.base_amount) || Number(booking.amount) || 0));
  const bookingIdDisplay = booking.id ? String(booking.id).slice(-6).toUpperCase() : 'N/A';

  const calculateNights = () => {
    try {
      if (!booking.checkIn || !booking.checkOut) return 1;
      const start = new Date(booking.checkIn);
      const end = new Date(booking.checkOut);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 1;
    } catch (e) {
      return 1;
    }
  };

  const nights = calculateNights();

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-8 print:bg-white print:py-0">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl print:max-w-none print:px-0">
          
          {/* Action Buttons - Hidden on Print */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-6 print:hidden">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center justify-center sm:justify-start text-gray-700 hover:text-gray-900 px-4 py-2.5 bg-white rounded-lg shadow-sm hover:shadow transition-all text-sm sm:text-base font-medium border border-gray-200"
            >
              <FaArrowLeft className="mr-2" /> Back
            </button>
            
            <div className="flex gap-3">
              <button 
                onClick={handleDownload}
                className="flex-1 sm:flex-none flex items-center justify-center bg-gray-700 text-white px-5 py-2.5 rounded-lg hover:bg-gray-800 shadow hover:shadow-lg transition-all text-sm sm:text-base font-semibold"
              >
                <FaDownload className="mr-2" /> Download
              </button>
              <button 
                onClick={handlePrint}
                className="flex-1 sm:flex-none flex items-center justify-center bg-[#ee2e24] text-white px-5 py-2.5 rounded-lg hover:bg-[#d62c22] shadow hover:shadow-lg transition-all text-sm sm:text-base font-semibold"
              >
                <FaPrint className="mr-2" /> Print
              </button>
            </div>
          </div>

          {/* Invoice Card */}
          <div className="bg-white rounded-xl shadow-lg print:shadow-none print:rounded-none overflow-hidden">
            <div className="p-6 sm:p-8 lg:p-10 print:p-8">
              
              {/* Header Section */}
              <div className="border-b-2 border-dashed border-gray-300 pb-6 mb-6 print:border-gray-400">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  {/* Logo & Branding */}
                  <div className="text-center sm:text-left">
                    <h1 className="text-3xl sm:text-4xl font-bold text-[#ee2e24] mb-1 print:text-black">OYO</h1>
                    <p className="text-sm text-gray-600 print:text-gray-700">Hotel Booking Platform</p>
                  </div>
                  
                  {/* Invoice Info */}
                  <div className="text-center sm:text-right">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 print:text-black">INVOICE</h2>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-700 print:text-black">
                        <span className="font-semibold">Invoice #:</span> {bookingIdDisplay}
                      </p>
                      <p className="text-gray-700 print:text-black">
                        <span className="font-semibold">Date:</span> {new Date().toLocaleDateString('en-IN', { 
                          day: '2-digit',
                          month: 'short', 
                          year: 'numeric'
                        })}
                      </p>
                      {booking.payment_id && (
                        <p className="text-xs text-gray-500 mt-2 print:text-gray-600 break-all">
                          Payment ID: {booking.payment_id}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hotel Information */}
              <div className="mb-6 pb-6 border-b border-dashed border-gray-300 print:border-gray-400">
                <h3 className="font-bold text-gray-800 mb-3 uppercase text-sm tracking-wide print:text-black">Hotel Information</h3>
                <div className="bg-gray-50 print:bg-gray-100 p-4 rounded-lg print:rounded-none">
                  <p className="font-bold text-lg text-gray-900 print:text-black mb-1">{booking.hotelName || 'Hotel Name'}</p>
                  {booking.address && <p className="text-sm text-gray-600 print:text-gray-700">{booking.address}</p>}
                  {booking.city && <p className="text-sm text-gray-600 print:text-gray-700 mt-0.5">{booking.city}</p>}
                </div>
              </div>

              {/* Two Column Layout for Guest & Booking Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-dashed border-gray-300 print:border-gray-400">
                
                {/* Guest Details */}
                <div>
                  <h3 className="font-bold text-gray-800 mb-3 uppercase text-sm tracking-wide print:text-black">Guest Details</h3>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 print:text-gray-700">Guest Name:</span>
                      <span className="font-semibold text-gray-900 print:text-black">Guest</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 print:text-gray-700">Number of Guests:</span>
                      <span className="font-semibold text-gray-900 print:text-black">{booking.guests || 1}</span>
                    </div>
                  </div>
                </div>

                {/* Booking Details */}
                <div>
                  <h3 className="font-bold text-gray-800 mb-3 uppercase text-sm tracking-wide print:text-black">Booking Details</h3>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 print:text-gray-700">Check-in:</span>
                      <span className="font-semibold text-gray-900 print:text-black">
                        {booking.checkIn ? new Date(booking.checkIn).toLocaleDateString('en-IN', { 
                          day: '2-digit',
                          month: 'short', 
                          year: 'numeric'
                        }) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 print:text-gray-700">Check-out:</span>
                      <span className="font-semibold text-gray-900 print:text-black">
                        {booking.checkOut ? new Date(booking.checkOut).toLocaleDateString('en-IN', { 
                          day: '2-digit',
                          month: 'short', 
                          year: 'numeric'
                        }) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 print:text-gray-700">Nights:</span>
                      <span className="font-semibold text-gray-900 print:text-black">{nights}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Room Details */}
              <div className="mb-6 pb-6 border-b border-dashed border-gray-300 print:border-gray-400">
                <h3 className="font-bold text-gray-800 mb-3 uppercase text-sm tracking-wide print:text-black">Room Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 print:bg-gray-100 p-3 rounded-lg print:rounded-none text-center">
                    <p className="text-xs text-gray-600 print:text-gray-700 mb-1">Room Type</p>
                    <p className="font-semibold text-gray-900 print:text-black capitalize">
                      {booking.roomType?.replace('_', ' ') || 'Standard'}
                    </p>
                  </div>
                  <div className="bg-gray-50 print:bg-gray-100 p-3 rounded-lg print:rounded-none text-center">
                    <p className="text-xs text-gray-600 print:text-gray-700 mb-1">Rooms</p>
                    <p className="font-semibold text-gray-900 print:text-black">{booking.rooms || 1}</p>
                  </div>
                  <div className="bg-gray-50 print:bg-gray-100 p-3 rounded-lg print:rounded-none text-center">
                    <p className="text-xs text-gray-600 print:text-gray-700 mb-1">Status</p>
                    <p className={`font-semibold uppercase text-xs px-2 py-1 rounded inline-block ${
                      booking.status === 'confirmed' || booking.status === 'completed' 
                        ? 'bg-green-100 text-green-800 print:bg-green-200 print:text-black' 
                        : 'bg-yellow-100 text-yellow-800 print:bg-yellow-200 print:text-black'
                    }`}>
                      {(booking.status || 'pending')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Breakdown */}
              <div className="mb-6 pb-6 border-b-2 border-dashed border-gray-300 print:border-gray-400">
                <h3 className="font-bold text-gray-800 mb-4 uppercase text-sm tracking-wide print:text-black">Payment Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-700 print:text-gray-800 text-sm font-medium">Base Price</p>
                      <p className="text-xs text-gray-500 print:text-gray-600 mt-0.5">
                        {booking.rooms || 1} Room{(booking.rooms || 1) > 1 ? 's' : ''} × {nights} Night{nights > 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className="font-semibold text-gray-900 print:text-black">
                      ₹{roomCharges.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {booking.discount_amount > 0 && (
                    <div className="flex justify-between items-start text-green-600">
                      <div>
                        <p className="text-sm font-medium">Coupon Discount</p>
                        {booking.coupon_code && <p className="text-xs mt-0.5">Code: {booking.coupon_code}</p>}
                      </div>
                      <span className="font-semibold">
                        -₹{booking.discount_amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Total Amount */}
              <div className="mb-6">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 print:bg-gray-200 p-5 rounded-lg print:rounded-none border-2 border-gray-200 print:border-gray-400">
                  <div className="flex justify-between items-center">
                    <span className="text-lg sm:text-xl font-bold text-gray-800 print:text-black">TOTAL AMOUNT</span>
                    <span className="text-2xl sm:text-3xl font-bold text-[#ee2e24] print:text-black">
                      ₹{(booking.amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Confirmation */}
              {booking.payment_id && (
                <div className="mb-6 pb-6 border-b border-dashed border-gray-300 print:border-gray-400">
                  <div className={`bg-${booking.payment_method === 'PAY_AT_HOTEL' ? 'yellow' : 'green'}-50 print:bg-${booking.payment_method === 'PAY_AT_HOTEL' ? 'yellow' : 'green'}-100 border-2 border-${booking.payment_method === 'PAY_AT_HOTEL' ? 'yellow' : 'green'}-200 print:border-${booking.payment_method === 'PAY_AT_HOTEL' ? 'yellow' : 'green'}-300 p-4 rounded-lg print:rounded-none`}>
                    <div className="text-center">
                      <p className={`text-${booking.payment_method === 'PAY_AT_HOTEL' ? 'yellow' : 'green'}-700 print:text-black font-bold text-lg mb-2`}>
                        {booking.payment_method === 'PAY_AT_HOTEL' ? '⚠ PAY AT HOTEL' : '✓ PAYMENT CONFIRMED'}
                      </p>
                      {booking.payment_method !== 'PAY_AT_HOTEL' && (
                        <p className="text-xs text-green-600 print:text-gray-700 break-all">
                          Transaction ID: {booking.payment_id}
                        </p>
                      )}
                      {booking.payment_method === 'PAY_AT_HOTEL' && (
                        <p className="text-xs text-yellow-600 print:text-gray-700">
                          Please pay at the hotel desk upon arrival.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Terms & Conditions */}
              <div className="mb-6 pb-6 border-b border-dashed border-gray-300 print:border-gray-400">
                <h3 className="font-bold text-gray-800 mb-3 uppercase text-sm tracking-wide print:text-black">Terms & Conditions</h3>
                <div className="text-xs text-gray-600 print:text-gray-700 space-y-1.5">
                  <p>• Check-in time: 2:00 PM | Check-out time: 11:00 AM</p>
                  <p>• Valid government-issued ID proof required at check-in</p>
                  <p>• Cancellation charges may apply as per hotel policy</p>
                  <p>• Smoking is prohibited in rooms and public areas</p>
                  <p>• Outside food and beverages are not allowed</p>
                </div>
              </div>

              {/* Footer - Contact Information */}
              <div className="text-center space-y-4">
                <div className="border-t border-dashed border-gray-300 print:border-gray-400 pt-4">
                  <p className="text-base font-semibold text-gray-800 print:text-black mb-3">
                    Thank you for choosing OYO!
                  </p>
                  <div className="text-sm text-gray-600 print:text-gray-700 space-y-1">
                    <p className="font-medium mb-2">For support & queries:</p>
                    <p>📧 support@oyo.com | 📞 +91-124-4565656</p>
                    <p className="mt-2">🌐 www.oyo.com</p>
                  </div>
                </div>

                <div className="border-t border-dashed border-gray-300 print:border-gray-400 pt-3">
                  <p className="text-xs text-gray-500 print:text-gray-600">
                    This is a computer-generated invoice and does not require a signature.
                  </p>
                  <p className="text-xs text-gray-500 print:text-gray-600 mt-1">
                    Generated on: {new Date().toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Bottom Spacing for Mobile */}
          <div className="h-6 print:hidden"></div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          @page {
            size: A4 portrait;
            margin: 1.5cm;
          }
          
          body {
            background: white !important;
            margin: 0;
            padding: 0;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:bg-white {
            background-color: white !important;
          }
          
          .print\\:bg-gray-100 {
            background-color: #f3f4f6 !important;
          }
          
          .print\\:bg-gray-200 {
            background-color: #e5e7eb !important;
          }
          
          .print\\:bg-green-100 {
            background-color: #d1fae5 !important;
          }
          
          .print\\:bg-green-200 {
            background-color: #a7f3d0 !important;
          }
          
          .print\\:bg-yellow-200 {
            background-color: #fef08a !important;
          }
          
          .print\\:text-black {
            color: black !important;
          }
          
          .print\\:text-gray-600 {
            color: #4b5563 !important;
          }
          
          .print\\:text-gray-700 {
            color: #374151 !important;
          }
          
          .print\\:text-gray-800 {
            color: #1f2937 !important;
          }
          
          .print\\:border-gray-400 {
            border-color: #9ca3af !important;
          }
          
          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }
          
          .print\\:border-green-300 {
            border-color: #86efac !important;
          }
          
          .print\\:py-0 {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          
          .print\\:px-0 {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          
          .print\\:p-8 {
            padding: 2rem !important;
          }
          
          .print\\:max-w-none {
            max-width: 100% !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          
          /* Ensure borders print correctly */
          .border-dashed {
            border-style: dashed !important;
          }
          
          /* Prevent page breaks within important sections */
          .border-b,
          .pb-6,
          .mb-6 {
            page-break-inside: avoid;
          }
          
          /* Ensure the total amount section stays together */
          .bg-gradient-to-r {
            page-break-inside: avoid;
          }
        }
        
        /* Mobile responsiveness improvements */
        @media (max-width: 640px) {
          .container {
            padding-left: 1rem;
            padding-right: 1rem;
          }
        }
      `}</style>
    </>
  );
}