import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';

const WriteReviewPage = () => {
  const navigate = useNavigate();
  const stored = typeof window !== 'undefined' ? sessionStorage.getItem('selectedBooking') : null;
  const booking = useMemo(() => {
    try {
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, [stored]);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const hotelName = booking?.hotel || booking?.hotelName || 'OYO Hotel';
  const bookingId = booking?.id || 'TEMP-BOOKING';

  const validate = () => {
    if (rating < 1) return 'Please select a rating.';
    if (comment.trim().length < 10) return 'Review must be at least 10 characters.';
    return '';
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        bookingId,
        hotelName,
        rating,
        title: title.trim(),
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
      };
      const existing = sessionStorage.getItem('reviews');
      const list = existing ? JSON.parse(existing) : [];
      list.push(payload);
      sessionStorage.setItem('reviews', JSON.stringify(list));
      setSuccess('Thank you! Your review has been submitted.');
      setTimeout(() => navigate('/bookings'), 800);
    } catch {
      setError('Failed to save your review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Write a Review</h1>
          <p className="text-gray-600 mb-1">{hotelName}</p>
          {booking && (
            <p className="text-sm text-gray-500">Booking ID: <span className="font-semibold">{bookingId}</span></p>
          )}
        </div>

        <form onSubmit={onSubmit} className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Your rating</label>
            <div className="flex items-center gap-2">
              {[1,2,3,4,5].map((star) => {
                const active = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                    aria-label={`Rate ${star} star${star>1?'s':''}`}
                  >
                    <FaStar className={active ? 'text-yellow-500 text-2xl' : 'text-gray-300 text-2xl'} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#ee2e24] focus:border-[#ee2e24]"
              placeholder="Great stay, friendly staff!"
            />
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Your review</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#ee2e24] focus:border-[#ee2e24]"
              placeholder="Share details about cleanliness, staff, location, amenities, etc."
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 10 characters. Be respectful and avoid personal information.</p>
          </div>

          {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
          {success && <div className="text-green-600 text-sm mb-4">{success}</div>}

          <div className="flex justify-between">
            <button
              type="button"
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`bg-[#ee2e24] text-white px-4 py-2 rounded-lg font-semibold ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#d62c22]'}`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WriteReviewPage;