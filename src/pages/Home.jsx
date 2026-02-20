import { FaMapMarkerAlt, FaCalendarAlt, FaSearch, FaTag, FaPercent, FaWallet, FaBuilding, FaStar, FaShieldAlt, FaHeadset, FaThumbsUp, FaCrosshairs, FaCopy, FaCheck } from 'react-icons/fa';
import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import images from '../assets';

const Home = ({ state, actions }) => {
  const [homeHotels, setHomeHotels] = useState([]);
  const [homeLoading, setHomeLoading] = useState(true);
  const [homeError, setHomeError] = useState('');
  const [activeCoupons, setActiveCoupons] = useState([]); // State for dynamic coupons
  const [copied, setCopied] = useState(false); // State for coupon copy feedback
  const [showMap, setShowMap] = useState(false);
  const searchRef = useRef(null);

  // API Configuration
  const apiVendorPublicBase = (import.meta.env.VITE_VENDOR_PUBLIC_BASE || 'http://localhost:3001/api/vendor/public').replace(/\/+$/, '');
  const filesBase = (import.meta.env.VITE_FILES_BASE || (() => {
    try {
      const u = new URL(apiVendorPublicBase);
      return `${u.protocol}//${u.host}`;
    } catch {
      return 'http://localhost:3001';
    }
  })());

  // Image URL Resolution Helper
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

  // Pick Primary Image from Hotel Data
  const pickPrimaryImage = (item) => {
    const candidates = [];
    if (Array.isArray(item.images)) candidates.push(item.images[0]);
    if (Array.isArray(item.photos)) candidates.push(item.photos[0]);
    if (Array.isArray(item.gallery)) candidates.push(item.gallery[0]);
    if (Array.isArray(item.media)) candidates.push(item.media[0]);
    candidates.push(item.cover_photo, item.image_url, item.image, item.thumbnail, item.banner);
    for (const c of candidates) {
      const u = resolveImageUrl(c);
      if (u) return u;
    }
    return null;
  };

  // Fetch Coupons
  useEffect(() => {
    let active = true;
    const fetchCoupons = async () => {
      try {
        // Construct API URL: replace /vendor/public with /public/coupons
        const baseUrl = apiVendorPublicBase.includes('/vendor/public') 
          ? apiVendorPublicBase.replace('/vendor/public', '/public/coupons')
          : 'http://localhost:3001/api/public/coupons';

        const res = await fetch(baseUrl, {
          headers: { Accept: 'application/json' }
        });
        
        if (res.ok) {
          const data = await res.json();
          const coupons = data?.data?.coupons || data?.coupons || [];
          if (active) {
            setActiveCoupons(coupons.filter(c => c.active));
          }
        }
      } catch (e) {
        console.warn('Failed to fetch coupons', e);
      }
    };
    fetchCoupons();
    return () => { active = false; };
  }, [apiVendorPublicBase]);

  // Offers Data
  const offers = useMemo(() => {
    // Styles for coupons to cycle through
    const couponStyles = [
      { icon: FaTag, bubbleBg: 'bg-[#ffe8e7]', cardFrom: 'from-pink-50', borderColor: 'border-pink-100' },
      { icon: FaPercent, bubbleBg: 'bg-[#e7f0ff]', cardFrom: 'from-blue-50', borderColor: 'border-blue-100' },
      { icon: FaWallet, bubbleBg: 'bg-[#e8f7ee]', cardFrom: 'from-green-50', borderColor: 'border-green-100' },
      { icon: FaBuilding, bubbleBg: 'bg-[#fff4cf]', cardFrom: 'from-yellow-50', borderColor: 'border-yellow-100' },
    ];

    if (activeCoupons.length > 0) {
      return activeCoupons.map((c, i) => {
        const style = couponStyles[i % couponStyles.length];
        return {
          id: c.code,
          title: c.code,
          description: c.description || `Get ${c.type === 'FLAT' ? '₹' + c.value : c.value + '%'} off`,
          ...style
        };
      });
    }

    return [
      {
        id: 'OYOFIRST',
        title: 'OYOFIRST',
        description: 'Get 25% off on your first booking',
        icon: FaTag,
        bubbleBg: 'bg-[#ffe8e7]',
        cardFrom: 'from-pink-50',
        borderColor: 'border-pink-100',
      },
      {
        id: 'WEEKEND25',
        title: 'WEEKEND25',
        description: '25% off on weekend stays',
        icon: FaPercent,
        bubbleBg: 'bg-[#e7f0ff]',
        cardFrom: 'from-blue-50',
        borderColor: 'border-blue-100',
      },
      {
        id: 'OYOWIZARD',
        title: 'OYOWIZARD',
        description: 'Additional 10% for members',
        icon: FaWallet,
        bubbleBg: 'bg-[#e8f7ee]',
        cardFrom: 'from-green-50',
        borderColor: 'border-green-100',
      },
      {
        id: 'LONGSTAY',
        title: 'LONGSTAY',
        description: '30% off on stays of 7+ nights',
        icon: FaBuilding,
        bubbleBg: 'bg-[#fff4cf]',
        cardFrom: 'from-yellow-50',
        borderColor: 'border-yellow-100',
      },
    ];
  }, [activeCoupons]);

  // Featured Coupon for Blue Banner
  const featuredCoupon = useMemo(() => {
    if (activeCoupons.length > 0) {
      const c = activeCoupons[0];
      const discountText = c.description || (c.type === 'FLAT' ? `₹${c.value} off` : `${c.value}% off`);
      return {
        title: 'Special Offer!',
        code: c.code,
        description: discountText
      };
    }
    return {
      title: 'Special Summer Offer!',
      code: 'SUMMER25',
      description: '25% off on all bookings'
    };
  }, [activeCoupons]);

  const handleCopyCode = () => {
    if (featuredCoupon?.code) {
      navigator.clipboard.writeText(featuredCoupon.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // City Picks Data
  const cityPicks = useMemo(() => ([
    { name: 'Delhi', image: images.Room1Img },
    { name: 'Mumbai', image: images.Room2Img },
    { name: 'Bengaluru', image: images.Room3Img },
    { name: 'Goa', image: images.Room4Img },
    { name: 'Hyderabad', image: images.Room5Img },
    { name: 'Chennai', image: images.Room6Img },
    { name: 'Pune', image: images.Room7Img },
    { name: 'Jaipur', image: images.Room8Img },
  ]), []);

  // Fetch Hotels on Mount and City Change
  useEffect(() => {
    let active = true;
    const fetchHomeHotels = async () => {
      try {
        setHomeLoading(true);
        setHomeError('');
        
        let allHotels = [];
        let page = 1;
        let hasMore = true;
        
        // Fetch up to 5 pages (enough for ~250 hotels) to get the latest ones
        // If we really want the absolute last 4 from the entire DB, we might need more, 
        // but 5 pages is a good balance for "Popular Hotels" on home page performance.
        while (hasMore) {
          const params = new URLSearchParams();
          params.set('page', String(page));
          params.set('limit', '50');
          // do not filter by city here; keep popular list generic
          
          const res = await fetch(`${apiVendorPublicBase}/hotels?${params.toString()}`, {
            method: 'GET',
            headers: { Accept: 'application/json' }
          });
          
          if (!active) break;
          
          if (res.ok) {
            const data = await res.json();
            console.log('Home: fetch response', data);
            const list = Array.isArray(data?.data?.hotels)
              ? data.data.hotels
              : Array.isArray(data?.hotels)
              ? data.hotels
              : Array.isArray(data?.data)
              ? data.data
              : [];
            
            console.log('Home: parsed list length', list.length);
              
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
                if (!meta && list.length < 50) hasMore = false;
              }
            }
          } else {
            console.error('Home: fetch failed', res.status, res.statusText);
            setHomeError(`Fetch failed: ${res.status} ${res.statusText}`);
            hasMore = false;
          }
          if (page > 5) hasMore = false; // Limit to 5 pages (250 items) for home page performance
        }
        
        if (!active) return;
        
        // Deduplicate
        const seenIds = new Set();
        const uniqueList = [];
        for (const item of allHotels) {
             const id = item.id ?? item.nid ?? item._id;
             if (id && !seenIds.has(id)) {
                 seenIds.add(id);
                 uniqueList.push(item);
             } else if (!id) {
                 uniqueList.push(item);
             }
        }

        // Take the last 4 from the full unique list
        const tail = uniqueList.slice(-4).reverse();
        const mapped = tail.map((item, idx) => {
            const id = item.id ?? item.nid ?? item._id ?? `hotel_${idx + 1}`;
            const name = item.name ?? item.title ?? `Hotel ${idx + 1}`;
            const cityLoc = item.city ?? item.location ?? '';
            
            const basePrice = (() => {
              const p = item.base_price ?? item.price;
              if (typeof p === 'number' && p > 0) return p;
              if (typeof p === 'string') {
                const m = p.match(/[0-9]+(?:\.[0-9]+)?/);
                return m ? parseFloat(m[0]) : 1000;
              }
              return 1000;
            })();
            
            const primary = pickPrimaryImage(item) || '/placeholder-hotel.jpg';
            
            const rating = (() => {
              const r = item.rating;
              if (typeof r === 'number') return Math.min(5, Math.max(0, r));
              if (typeof r === 'string') {
                const m = r.match(/[0-9]+(?:\.[0-9]+)?/);
                return m ? Math.min(5, Math.max(0, parseFloat(m[0]))) : 0;
              }
              return 0;
            })();
            
            const originalPrice = Math.round(basePrice * 1.25);
            const discount = originalPrice > 0
              ? Math.max(0, Math.min(90, Math.round((1 - basePrice / originalPrice) * 100)))
              : 0;
            
            return { 
              id, 
              name, 
              city: cityLoc, 
              price: basePrice, 
              originalPrice, 
              image: primary, 
              rating, 
              discount 
            };
          });
          
          setHomeHotels(mapped);
      } catch (e) {
        if (!active) return;
        setHomeError(e?.message || 'Failed to load hotels');
        setHomeHotels([]);
      } finally {
        if (!active) return;
        setHomeLoading(false);
      }
    };
    
    fetchHomeHotels();
    return () => { active = false; };
  }, [apiVendorPublicBase]);

  // Hero Carousel Configuration
  const heroSlides = [images.Slider1, images.Slider2, images.Slider3];
  const [heroIndex, setHeroIndex] = useState(0);
  
  useEffect(() => {
    const id = setInterval(() => setHeroIndex((i) => (i + 1) % heroSlides.length), 5000);
    return () => clearInterval(id);
  }, [heroSlides.length]);
  
  const heroPrev = () => setHeroIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length);
  const heroNext = () => setHeroIndex((i) => (i + 1) % heroSlides.length);

  // Search Handler
  const handleSearch = async () => {
    try {
      const cityVal = String(state.city || '').trim();
      const apiBase = (import.meta.env.VITE_VENDOR_PUBLIC_BASE || 'http://localhost:3001/api/vendor/public');
      const params = new URLSearchParams();
      if (cityVal) params.set('city', cityVal);
      const res = await fetch(`${apiBase}/hotels?${params.toString()}`, { 
        method: 'GET', 
        headers: { Accept: 'application/json' } 
      });
      const data = await res.json();
      const list = Array.isArray(data?.data?.hotels)
        ? data.data.hotels
        : Array.isArray(data?.hotels)
        ? data.hotels
        : Array.isArray(data?.data)
        ? data.data
        : [];
      try {
        sessionStorage.setItem('lastSearchResults', JSON.stringify(list));
      } catch {}
      // do not mutate city state here
    } catch (_) {}
    actions.navigate('searchhotel');
  };

  const handleNearMe = () => {
    // Navigate to searchhotel with nearMe param
    // We assume actions.navigate handles params or we construct url
    // Since we don't know exact navigate impl, we'll try passing object
    // If that fails, we might need to use window.location or similar, but let's try standard way
    actions.navigate('searchhotel', { nearMe: 'true' });
  };

  // Get today's date in YYYY-MM-DD format for min date attribute
  const todayDate = new Date();
  const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

  const getMinCheckOut = () => {
    const base = state.checkIn || todayStr;
    const d = new Date(base);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className='relative h-[280px] sm:h-[320px] md:h-[480px] lg:h-[560px] overflow-hidden'>
        <div className='absolute inset-0'>
          <AnimatePresence mode="wait">
            <motion.div
              key={heroIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className='absolute inset-0 bg-cover bg-center'
              style={{ backgroundImage: `url(${heroSlides[heroIndex]})` }}
            />
          </AnimatePresence>
          <div className='absolute inset-0 bg-gradient-to-b from-black/30 via-black/25 to-black/50' />
          <div className='absolute -top-24 -left-24 h-72 w-72 bg-[#ee2e24]/20 rounded-full blur-3xl' />
          <div className='absolute -bottom-24 -right-24 h-72 w-72 bg-[#2b6ef2]/20 rounded-full blur-3xl' />
        </div>
        
        <div className='relative container mx-auto px-4 h-full flex items-center justify-between'>
          <div className='text-white max-w-xl'>
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className='text-3xl sm:text-5xl md:text-6xl font-extrabold mb-3 leading-tight'
            >
              Find your perfect stay
            </motion.h1>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className='opacity-90 text-sm sm:text-base md:text-lg'
            >
              Handpicked hotels at great prices in top locations.
            </motion.p>
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className='mt-4 flex items-center gap-2 sm:gap-3'
            >
              <button
                onClick={() => searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                type='button'
                className='bg-[#ee2e24] text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-semibold shadow-md hover:bg-[#d42620] transition-colors'
              >
                Search Stays
              </button>
              <button
                onClick={() => actions.navigate('hotels')}
                type='button'
                className='bg-white/90 backdrop-blur text-gray-900 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-semibold shadow hover:bg-white transition-colors'
              >
                Explore Hotels
              </button>
            </motion.div>
          </div>
          
          <div className='hidden md:flex items-center gap-2'>
            <motion.button
              onClick={heroPrev}
              type='button'
              aria-label='Previous slide'
              whileTap={{ scale: 0.95 }}
              className='bg-white/80 hover:bg-white text-gray-800 h-10 w-10 rounded-full shadow flex items-center justify-center transition-colors text-xl font-semibold'
            >
              ‹
            </motion.button>
            <motion.button
              onClick={heroNext}
              type='button'
              aria-label='Next slide'
              whileTap={{ scale: 0.95 }}
              className='bg-white/80 hover:bg-white text-gray-800 h-10 w-10 rounded-full shadow flex items-center justify-center transition-colors text-xl font-semibold'
            >
              ›
            </motion.button>
          </div>
        </div>
        
        <div className='absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2'>
          {heroSlides.map((_, i) => (
            <motion.button
              key={i}
              type='button'
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setHeroIndex(i)}
              whileTap={{ scale: 0.9 }}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${heroIndex === i ? 'bg-white' : 'bg-white/50'}`}
            />
          ))}
        </div>
    
      </section>
      
      {/* Search Bar Section */}
      <div className="container mx-auto px-4 py-3" ref={searchRef}>
        <div className='w-full bg-white border border-gray-200 shadow-sm rounded-xl md:rounded-full overflow-hidden'>
          <div className='grid grid-cols-12 gap-0'>
            <div className='col-span-12 sm:col-span-6 md:col-span-3 flex items-center gap-2 px-3 sm:px-4 h-12 md:h-16 relative'>
              <FaMapMarkerAlt className='text-gray-600 flex-shrink-0' />
              <input
                value={state.city}
                onChange={(e) => { 
                  actions.setCity(e.target.value);
                }}
                placeholder='Search city, area or landmark'
                className='w-full min-w-0 bg-transparent border-0 focus:outline-none focus:ring-0 text-sm placeholder-gray-500 leading-none appearance-none'
                aria-label='Location'
              />
              <button 
                type="button"
                onClick={handleNearMe}
                className="text-xs flex items-center gap-1 text-[#ee2e24] font-medium whitespace-nowrap hover:bg-red-50 px-2 py-1 rounded-full transition-colors"
              >
                <FaCrosshairs /> Near Me
              </button>
            </div>
            
            <div className='col-span-12 sm:col-span-6 md:col-span-3 flex items-center gap-3 sm:gap-4 px-3 sm:px-4 h-12 md:h-16 md:border-l md:border-gray-200'>
              <FaCalendarAlt className='text-gray-600 flex-shrink-0' />
              <input
                type='date'
                value={state.checkIn}
                min={todayStr}
                onChange={(e) => { 
                  actions.setCheckIn(e.target.value); 
                  actions.triggerSearch(); 
                }}
                className='w-full min-w-0 bg-transparent border-0 focus:outline-none focus:ring-0 text-sm placeholder-gray-500 leading-none appearance-none'
                aria-label='Check-in'
              />
            </div>
            
            <div className='col-span-12 sm:col-span-6 md:col-span-3 flex items-center gap-3 sm:gap-4 px-3 sm:px-4 h-12 md:h-16 md:border-l md:border-gray-200'>
              <FaCalendarAlt className='text-gray-600 flex-shrink-0' />
              <input
                type='date'
                value={state.checkOut}
                min={getMinCheckOut()}
                onChange={(e) => { 
                  actions.setCheckOut(e.target.value); 
                  actions.triggerSearch(); 
                }}
                className='w-full min-w-0 bg-transparent border-0 focus:outline-none focus:ring-0 text-sm placeholder-gray-500 leading-none appearance-none'
                aria-label='Check-out'
              />
            </div>
            
            <div className='col-span-12 md:col-span-3 flex items-center justify-center px-3 sm:px-4 h-14 md:h-16 md:border-l md:border-gray-200'>
              <button
                onClick={handleSearch}
                className='h-12 w-12 md:h-14 md:w-14 p-3 rounded-full bg-[#ee2e24] hover:bg-[#d42620] text-white flex items-center justify-center shadow-sm transition-colors'
                aria-label='Search'
                type="button"
              >
                <FaSearch className='text-white' />
              </button>
            </div>
          </div>
        </div>
        
       
      </div>
      
     
      
      {/* Popular Hotels Section */}
      <div className="py-4 sm:py-6 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Popular Hotels</h2>
            <button
              className="text-[#ee2e24] text-xs sm:text-sm font-medium hover:underline"
              onClick={() => actions.navigate('hotels')}
              type="button"
              aria-label="Explore more hotels"
            >
              Explore more
            </button>
          </div>

          {homeLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white border rounded-xl shadow-sm overflow-hidden">
                  <div className="w-full h-44 bg-gray-200 animate-pulse" />
                  <div className="p-4">
                    <div className="h-5 bg-gray-200 animate-pulse mb-2 rounded" />
                    <div className="h-3 bg-gray-200 animate-pulse w-2/3 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : homeError ? (
            <div className="text-sm text-red-600 bg-red-50 p-4 rounded-lg">
              {homeError}
            </div>
          ) : homeHotels.length === 0 ? (
            <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg text-center">
              No hotels found. Try searching for a different city.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {homeHotels.map(h => (
                <article
                  key={h.id}
                  className='border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-lg transition-shadow duration-200 cursor-pointer group'
                  onClick={() => { 
                    sessionStorage.setItem('selectedRoom', JSON.stringify(h));
                    actions.navigate('roomDetails', { id: h.id }); 
                  }}
                >
                  <div className='relative h-44 overflow-hidden'>
                    {showMap ? (
                      <iframe
                        title={`${h.name} Location`}
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        style={{ border: 0 }}
                        src={`https://maps.google.com/maps?q=${
                          h.latitude && h.longitude 
                            ? `${h.latitude},${h.longitude}` 
                            : encodeURIComponent((h.address || '') + ' ' + (h.city || h.location || ''))
                        }&z=15&output=embed`}
                        allowFullScreen
                        onClick={(e) => e.stopPropagation()}
                      ></iframe>
                    ) : (
                      <>
                        <img 
                          src={h.image} 
                          alt={h.name} 
                          className='absolute inset-0 w-full h-full object-cover transform transition-transform duration-300 group-hover:scale-105'
                          loading="lazy"
                          onError={(e) => { 
                            e.currentTarget.src = '/placeholder-hotel.jpg'; 
                          }}
                        />
                       
                        {h.city && (
                          <div className='absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm text-[#ee2e24] text-xs px-2 py-1 rounded font-semibold'>
                            {h.city}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  <div className='p-4'>
                    <div className='flex items-start justify-between gap-3'>
                      <div className='flex-1 min-w-0'>
                        <h3 className='font-semibold text-lg mb-1 truncate'>{h.name}</h3>
                        <p className='text-xs text-gray-500 mb-2 truncate'>Excellent Hospitality • Top Rated</p>
                        <div className='flex flex-wrap gap-2 mb-2'>
                          <span className='text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded'>Free Wifi</span>
                          <span className='text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded'>AC</span>
                          <span className='text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded'>Parking</span>
                        </div>
                        <div className='text-xs text-green-700 flex items-center gap-1'>
                          <span className='w-2 h-2 rounded-full bg-green-600 inline-block'></span>
                          Free Cancellation
                        </div>
                      </div>
                      <div className='text-right flex-shrink-0'>
                        <div className='text-xs text-gray-500'>Rating</div>
                        <div className='text-base font-semibold'>{(h.rating > 0 ? (Number(h.rating) || 0).toFixed(1) + ' / 5' : 'New')}</div>
                      </div>
                    </div>

                    <div className='mt-4 flex items-end justify-between'>
                      <div>
                        <div className='text-gray-400 text-xs line-through'>₹{Math.round(h.originalPrice)}</div>
                        <div className='text-2xl font-bold text-[#ee2e24]'>₹{Math.round(h.price)}</div>
                        <div className='text-xs text-gray-600'>per night</div>
                      </div>
                      <div className='flex flex-col items-end gap-2'>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            sessionStorage.setItem('selectedRoom', JSON.stringify(h));
                            actions.navigate('roomDetails', { id: h.id }); 
                          }} 
                          className='bg-[#ee2e24] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#d5281f] transition-colors'
                          type="button"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>


 {/* Top Offers Section */}
      <div className="bg-gray-50 py-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Exclusive Offers</h2>
              <p className="text-gray-500 text-sm mt-1">Save more on your next stay with these coupons</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {offers.map(({ id, title, description, icon: Icon, bubbleBg, cardFrom, borderColor }) => (
              <div
                key={id}
                className={`relative group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 overflow-hidden`}
              >
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${cardFrom} to-transparent opacity-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`h-10 w-10 rounded-full ${bubbleBg} flex items-center justify-center`}>
                      <Icon className="text-[#ee2e24] text-lg" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(title);
                        // Optional: Add toast or feedback here
                      }}
                      className="text-gray-400 hover:text-[#ee2e24] transition-colors p-1"
                      title="Copy Code"
                    >
                      <FaCopy />
                    </button>
                  </div>
                  
                  <div className="mb-3">
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
                  </div>

                  <div className="pt-3 border-t border-dashed border-gray-200 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Coupon Code</span>
                    <span className="text-xs font-bold text-[#ee2e24] bg-red-50 px-2 py-1 rounded border border-red-100 dashed-border">
                      {title}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
     
      {/* Promotional Banner */}
      <div className="py-8 bg-white">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden bg-gradient-to-r from-[#6366f1] to-[#a855f7] rounded-2xl shadow-xl">
            {/* Decorative circles */}
            <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left max-w-2xl">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full mb-4">
                  <FaStar className="text-yellow-300 text-xs" />
                  <span className="text-white text-xs font-bold uppercase tracking-wide">Limited Time Offer</span>
                </div>
                <h3 className="text-2xl md:text-4xl font-extrabold text-white mb-2 tracking-tight">
                  {featuredCoupon.title}
                </h3>
                <div className="flex flex-col md:flex-row items-center gap-3 mt-4">
                  <p className="text-white/90 text-lg">
                    Use code <span className="font-mono font-bold text-white bg-white/20 px-2 py-1 rounded mx-1">{featuredCoupon.code}</span>
                    for {featuredCoupon.description}
                  </p>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors border border-white/20"
                  >
                    {copied ? <FaCheck className="text-green-300" /> : <FaCopy />}
                    <span className="text-sm font-medium">{copied ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
              </div>
              
              <button
                className="bg-white text-[#6366f1] hover:bg-gray-50 px-8 py-3.5 rounded-full font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all whitespace-nowrap"
                onClick={() => actions.navigate('hotels')}
                type="button"
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
