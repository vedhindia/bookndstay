import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCreditCard, FaWallet, FaMoneyBillWave, FaLock, FaShieldAlt, FaCheckCircle, FaClock } from 'react-icons/fa';
import { getToken, clearToken } from '../api/auth';

export default function PaymentPage() {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [summary, setSummary] = useState(null);
  const [amount, setAmount] = useState(0);
  const [bookingId, setBookingId] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [payKey, setPayKey] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  const apiUserBase = (() => {
    const base = import.meta.env.VITE_API_BASE || 'https://bookndstay.com/api/auth';
    const cleaned = base.replace(/\/auth\/?$/, '');
    return `${cleaned}/user`;
  })();

  // Timer Logic
  useEffect(() => {
    if (timeLeft === null) return;
    
    // Disable timer redirection for Pay at Hotel
    if (paymentMethod === 'hotel') return;

    if (timeLeft <= 0) {
      alert('Payment window expired! Please create a new booking.');
      navigate('/');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, navigate, paymentMethod]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Load payment intent from sessionStorage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('paymentIntent') || sessionStorage.getItem('selectedBooking');
      if (!raw) {
        alert('No booking found. Please create a booking first.');
        navigate('/hotels');
        return;
      }
      const data = JSON.parse(raw);
      setSummary(data);
      setBookingId(data.bookingId);
      setAmount(Math.round(data.amount || 0));
      if (data.breakdown) {
        setBreakdown(data.breakdown);
      }
    } catch (error) {
      console.error('Failed to load payment intent:', error);
      alert('Failed to load booking details');
      navigate('/hotels');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Fetch latest booking details
  useEffect(() => {
    if (!bookingId) return;
    
    const fetchBookingDetails = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const response = await fetch(`${apiUserBase}/bookings/${bookingId}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            clearToken();
            navigate('/login');
            return;
          }
          return;
        }

        const data = await response.json();
        const booking = data?.data?.booking || data?.booking;

        if (booking) {
          // Initialize timer
          if (booking.createdAt || booking.created_at) {
            const createdAt = new Date(booking.createdAt || booking.created_at).getTime();
            const deadline = createdAt + 10 * 60 * 1000;
            const diff = Math.floor((deadline - Date.now()) / 1000);
            setTimeLeft(diff > 0 ? diff : 0);
          }

          // Keep local breakdown if available to preserve frontend-only discounts
          const sessionData = sessionStorage.getItem('paymentIntent');
          const localIntent = sessionData ? JSON.parse(sessionData) : null;
          
          const shouldUseLocal = localIntent && 
                                localIntent.bookingId === bookingId && 
                                (localIntent.breakdown?.base_amount > 0 || localIntent.breakdown?.discount_amount > 0);

          if (shouldUseLocal) {
             // Only update non-critical fields or if completely missing
             if (!breakdown) {
                setBreakdown(localIntent.breakdown);
                setAmount(Math.round(localIntent.amount));
             }
          } else {
            // Fallback to server data if no valid local context
            let nights = data?.data?.nights;
            if (!nights && booking.check_in && booking.check_out) {
                const start = new Date(booking.check_in);
                const end = new Date(booking.check_out);
                nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            }

            const bd = {
              amount: data?.data?.amount ?? booking?.amount,
              base_amount: data?.data?.base_amount ?? booking?.base_amount,
              discount_amount: data?.data?.discount_amount ?? booking?.discount_amount,
              price_per_night: data?.data?.price_per_night ?? booking?.price_per_night,
              nights: nights || 1,
              coupon_applied: data?.data?.coupon_applied ?? booking?.coupon_code
            };
            setBreakdown(bd);
            setAmount(Math.round(bd.amount));

            // Restore summary if missing (e.g. on page refresh)
            if (!summary && booking) {
                setSummary({
                    hotelName: booking.hotel?.name,
                    address: booking.hotel?.address,
                    city: booking.hotel?.city,
                    checkIn: booking.check_in,
                    checkOut: booking.check_out,
                    guests: booking.guests,
                    rooms: booking.booked_room,
                    image: booking.hotel?.images?.[0]?.url
                });
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch booking details:', error);
      }
    };

    fetchBookingDetails();
  }, [bookingId, apiUserBase]);

  // Fetch Razorpay key from backend
  useEffect(() => {
    (async () => {
      try {
        const token = getToken();
        if (!token) return;
        const res = await fetch(`${apiUserBase}/payment-key`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) return;
        const data = await res.json();
        const keyId = data?.data?.key_id || data?.key_id || null;
        if (keyId) setPayKey(keyId);
      } catch {}
    })();
  }, [apiUserBase]);

  useEffect(() => {
    (async () => {
      try {
        const token = getToken();
        if (!token) return;
        const res = await fetch(`${apiUserBase}/auth/profile`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.data && data.data.user) {
          setUserProfile(data.data.user);
        }
      } catch {}
    })();
  }, [apiUserBase]);

  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handlePayAtHotel = async () => {
    const token = getToken();
    if (!token) {
      console.error('PaymentPage: No token found for payment');
      alert('Please login to proceed');
      navigate('/login');
      return;
    }

    if (!bookingId) {
      alert('Booking ID not found');
      return;
    }

    setProcessing(true);
    try {
      console.log('PaymentPage: Initiating payment for booking', bookingId, 'with token', token ? 'PRESENT' : 'MISSING');
      
      // Step 1: Create a payment record (required by backend)
      // Even for Pay at Hotel, we need to initialize the payment record
      // We use the initiate endpoint which creates a pending payment
      try {
        const initRes = await fetch(`${apiUserBase}/bookings/${bookingId}/pay`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ amount: amount })
        });
        
        console.log('PaymentPage: Init response status', initRes.status);
        
        if (initRes.status === 401) {
          console.error('PaymentPage: 401 Unauthorized during payment init');
          clearToken();
          alert('Your session has expired. Please login again.');
          navigate('/login');
          return;
        }
      } catch (e) {
        console.warn('Payment initialization warning:', e);
        if (e.message && e.message.includes('401')) {
          clearToken();
          navigate('/login');
          return;
        }
        // Continue anyway, as some backends might auto-create on complete
      }

      // Step 2: Mark payment as success (Pay at Hotel confirmed)
      const response = await fetch(`${apiUserBase}/bookings/${bookingId}/payment/complete`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'success',
          amount: amount,
          payment_method: 'PAY_AT_HOTEL'
        })
      });
      
      if (response.status === 401) {
        clearToken();
        navigate('/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to confirm booking');
      }

      const data = await response.json();
      const confirmedBooking = data?.booking || data?.data?.booking;

      // Prepare confirmation data
      const confirmationData = {
        id: confirmedBooking?.id || bookingId,
        hotelName: summary?.hotelName,
        address: summary?.address,
        city: summary?.city,
        latitude: summary?.latitude,
        longitude: summary?.longitude,
        checkIn: summary?.checkIn,
        checkOut: summary?.checkOut,
        guests: summary?.guests || 2,
        rooms: summary?.rooms || 1,
        amount: confirmedBooking?.amount || amount,
        base_amount: confirmedBooking?.base_amount || breakdown?.base_amount || amount,
        discount_amount: confirmedBooking?.discount_amount || breakdown?.discount_amount || 0,
        coupon_code: confirmedBooking?.coupon_code || breakdown?.coupon_applied,
        status: 'confirmed',
        image: summary?.image,
        paymentMethod: 'PAY_AT_HOTEL'
      };

      try {
        sessionStorage.setItem('selectedBooking', JSON.stringify(confirmationData));
        sessionStorage.removeItem('paymentIntent');
      } catch (e) {
        console.error('Failed to save booking:', e);
      }

      navigate('/booking');
    } catch (error) {
      alert(error.message || 'Failed to confirm booking');
    } finally {
      setProcessing(false);
    }
  };

  const handleRazorpayPayment = async () => {
    const ok = await loadRazorpay();
    if (!ok) {
      alert('Razorpay SDK failed to load. Please check your internet connection.');
      return;
    }

    const token = getToken();
    if (!token) {
      alert('Please login to proceed');
      navigate('/login');
      return;
    }

    if (!bookingId) {
      alert('Booking ID not found');
      return;
    }

    setProcessing(true);
    try {
      // Initiate payment
      const payResponse = await fetch(`${apiUserBase}/bookings/${bookingId}/pay`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: amount })
      });

      if (payResponse.status === 401) {
        clearToken();
        navigate('/login');
        return;
      }

      if (!payResponse.ok) {
        const errorData = await payResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to initiate payment');
      }

      const payData = await payResponse.json();
      const order = payData?.data?.order;
      const keyId = payData?.data?.key_id || payKey;

      if (!order || !order.id) {
        throw new Error('Order ID not received from server');
      }
      if (!keyId) {
        throw new Error('Razorpay key missing. Please try Pay at Hotel.');
      }

      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: summary?.hotelName || 'Hotel Booking',
        description: `Booking #${bookingId}`,
        order_id: order.id,
        handler: async function (response) {
          try {
            // Complete payment
            const completeResponse = await fetch(`${apiUserBase}/bookings/${bookingId}/payment/complete`, {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                gateway_payment_id: response.razorpay_payment_id,
                status: 'success',
                amount: amount,
                payment_method: 'ONLINE'
              })
            });

            if (!completeResponse.ok) {
              throw new Error('Failed to complete payment');
            }

            const completeData = await completeResponse.json();
            const confirmedBooking = completeData?.booking || completeData?.data?.booking;

            // Prepare confirmation data
            const confirmationData = {
              id: confirmedBooking?.id || bookingId,
              hotelName: summary?.hotelName,
              address: summary?.address,
              city: summary?.city,
              latitude: summary?.latitude,
              longitude: summary?.longitude,
              checkIn: summary?.checkIn,
              checkOut: summary?.checkOut,
              guests: summary?.guests || 2,
              rooms: summary?.rooms || 1,
              amount: confirmedBooking?.amount || amount,
              base_amount: confirmedBooking?.base_amount || breakdown?.base_amount || amount,
              discount_amount: confirmedBooking?.discount_amount || breakdown?.discount_amount || 0,
              coupon_code: confirmedBooking?.coupon_code || breakdown?.coupon_applied,
              status: 'confirmed',
              image: summary?.image,
              paymentId: response.razorpay_payment_id,
              paymentMethod: 'ONLINE'
            };

            try {
              sessionStorage.setItem('selectedBooking', JSON.stringify(confirmationData));
              sessionStorage.removeItem('paymentIntent');
            } catch (e) {
              console.error('Failed to save booking:', e);
            }

            navigate('/booking');
          } catch (error) {
            alert('Payment completed but confirmation failed. Please contact support.');
            console.error('Payment completion error:', error);
          }
        },
        prefill: {
          name: userProfile?.full_name || 'Guest',
          email: userProfile?.email,
          contact: userProfile?.phone
        },
        theme: {
          color: '#ee2e24'
        },
        modal: {
          ondismiss: async function () {
            // Payment dismissed - mark as failed
            try {
              await fetch(`${apiUserBase}/bookings/${bookingId}/payment/complete`, {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'failed' })
              });
            } catch (e) {
              console.error('Failed to mark payment as failed:', e);
            }
            setProcessing(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      
      // Handle payment failure
      if (typeof rzp.on === 'function') {
        rzp.on('payment.failed', async function (response) {
          try {
            await fetch(`${apiUserBase}/bookings/${bookingId}/payment/complete`, {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ 
                status: 'failed',
                error: response.error?.description 
              })
            });
          } catch (e) {
            console.error('Failed to mark payment as failed:', e);
          }
          alert('Payment failed: ' + (response.error?.description || 'Unknown error'));
          setProcessing(false);
        });
      }

      rzp.open();
    } catch (error) {
      alert(error.message || 'Failed to initiate payment');
      setProcessing(false);
    }
  };

  const handlePayment = () => {
    if (paymentMethod === 'hotel') {
      handlePayAtHotel();
    } else {
      handleRazorpayPayment();
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#ee2e24]"></div>
          <p className="mt-4 text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Payment</h1>
        <div className="text-sm text-gray-500 flex items-center">
          <span>Booking ID: {bookingId || 'N/A'}</span>
          <span className="mx-2">•</span>
          <span>{summary?.hotelName || 'Hotel Booking'}</span>
        </div>
      </div>
      
      {/* Timer Warning - Fixed Overlay */}
      {timeLeft !== null && timeLeft > 0 && paymentMethod !== 'hotel' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6 flex items-center justify-between text-orange-800">
          <div className="flex items-center">
            <FaClock className="mr-2 text-xl" />
            <div>
              <p className="font-semibold text-sm sm:text-base">Complete payment in</p>
              <p className="text-xs opacity-75">Booking will expire soon</p>
            </div>
          </div>
          <span className="font-bold text-xl sm:text-2xl font-mono bg-white px-3 py-1 rounded border border-orange-100 shadow-sm">
            {formatTime(timeLeft)}
          </span>
        </div>
      )}
      
      {/* Booking Summary */}
      <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-6">
        <h2 className="font-semibold text-lg mb-4">Booking Summary</h2>
        
        {/* Booking Details */}
        <div className="grid sm:grid-cols-2 gap-4 mb-4 pb-4 border-b">
          <div>
            <p className="text-sm text-gray-600">Check-in</p>
            <p className="font-semibold">{summary?.checkIn ? new Date(summary.checkIn).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Check-out</p>
            <p className="font-semibold">{summary?.checkOut ? new Date(summary.checkOut).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Guests</p>
            <p className="font-semibold">{summary?.guests || 2} {(summary?.guests || 2) === 1 ? 'Guest' : 'Guests'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Rooms</p>
            <p className="font-semibold">{summary?.rooms || 1} {(summary?.rooms || 1) === 1 ? 'Room' : 'Rooms'}</p>
          </div>
        </div>

        {/* Price Breakdown */}
        <h3 className="font-semibold mb-3">Price Breakdown</h3>
        <div className="space-y-2">
          {breakdown ? (
            <>
              {breakdown.nights && breakdown.price_per_night && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {breakdown.nights} Night{breakdown.nights > 1 ? 's' : ''} × {summary?.rooms || 1} Room{(summary?.rooms || 1) !== 1 ? 's' : ''} × ₹{Math.round(breakdown.price_per_night)}
                  </span>
                  <span>₹{Math.round(breakdown.base_amount || 0)}</span>
                </div>
              )}
              {breakdown.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Discount {breakdown.coupon_applied && `(${breakdown.coupon_applied})`}
                  </span>
                  <span className="text-green-600">−₹{Math.round(breakdown.discount_amount)}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Base Price</span>
                <span>₹{amount}</span>
              </div>
            </>
          )}
          <div className="flex justify-between font-bold text-lg pt-3 border-t">
            <span>Total Amount</span>
            <span className="text-[#ee2e24]">₹{amount}</span>
          </div>
        </div>
      </div>
      
      {/* Payment Methods */}
      <div className="bg-white border rounded-lg mb-6">
        <h2 className="font-semibold p-4 sm:p-6 border-b">Select Payment Method</h2>
        
        {/* Payment Method Tabs */}
        <div className="flex border-b">
          <button 
            className={`flex-1 py-3 px-4 flex items-center justify-center transition-colors ${
              paymentMethod === 'razorpay' 
                ? 'border-b-2 border-[#ee2e24] text-[#ee2e24] bg-red-50' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => setPaymentMethod('razorpay')}
          >
            <FaCreditCard className="mr-2" />
            <span className="font-medium">Pay Now</span>
          </button>
          <button 
            className={`flex-1 py-3 px-4 flex items-center justify-center transition-colors ${
              paymentMethod === 'hotel' 
                ? 'border-b-2 border-[#ee2e24] text-[#ee2e24] bg-red-50' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => setPaymentMethod('hotel')}
          >
            <FaMoneyBillWave className="mr-2" />
            <span className="font-medium">Pay at Hotel</span>
          </button>
        </div>
        
        {/* Payment Method Content */}
        <div className="p-4 sm:p-6">
          {paymentMethod === 'razorpay' ? (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-start">
                <FaCreditCard className="text-blue-500 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-900 mb-1">Secure Online Payment</p>
                  <p className="text-sm text-blue-700">Pay securely using Credit/Debit Card, UPI, Net Banking, or Wallets via Razorpay</p>
                </div>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p className="flex items-center">
                  <FaCheckCircle className="text-green-500 mr-2" />
                  Instant booking confirmation
                </p>
                <p className="flex items-center">
                  <FaCheckCircle className="text-green-500 mr-2" />
                  100% secure payment
                </p>
                <p className="flex items-center">
                  <FaCheckCircle className="text-green-500 mr-2" />
                  Multiple payment options available
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-start">
                <FaCheckCircle className="text-green-500 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-900 mb-1">Pay at Hotel Available</p>
                  <p className="text-sm text-green-700">Pay the full amount at the hotel during check-in with cash or card</p>
                </div>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p className="flex items-center">
                  <FaCheckCircle className="text-green-500 mr-2" />
                  No advance payment required
                </p>
                <p className="flex items-center">
                  <FaCheckCircle className="text-green-500 mr-2" />
                  Booking confirmed instantly
                </p>
                <p className="flex items-center">
                  <FaCheckCircle className="text-green-500 mr-2" />
                  Flexible payment at check-in
                </p>
                <p className="flex items-center">
                  <FaCheckCircle className="text-green-500 mr-2" />
                  Please carry valid ID proof
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Security Info */}
      <div className="flex items-center justify-center gap-6 text-sm text-gray-500 mb-6">
        <div className="flex items-center">
          <FaLock className="mr-2" />
          <span>Secure Payment</span>
        </div>
        <div className="flex items-center">
          <FaShieldAlt className="mr-2" />
          <span>256-bit Encryption</span>
        </div>
      </div>
      
      {/* Payment Button */}
      <button 
        className="w-full bg-[#ee2e24] text-white py-3 rounded-lg font-semibold text-lg hover:bg-[#d62c22] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        onClick={handlePayment}
        disabled={processing}
      >
        {processing ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : (
          paymentMethod === 'hotel' 
            ? 'Confirm Booking (Pay at Hotel)' 
            : `Pay ₹${amount}`
        )}
      </button>

      {/* Terms */}
      <p className="text-xs text-gray-500 text-center mt-4">
        By proceeding, you agree to our Terms & Conditions and Privacy Policy
      </p>
    </div>
  );
}
