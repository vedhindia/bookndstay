import { useState, useEffect, useRef } from 'react';
import { FaPhone, FaUser, FaBars, FaTimes, FaBuilding } from 'react-icons/fa';
import { getToken, getUser, logout as apiLogout } from '../api/auth';
import authApi from '../api/auth';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header({ navigate, state, actions }) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const mobileMenuRef = useRef(null);
  const userDropdownRefDesktop = useRef(null);
  const userDropdownRefMobile = useRef(null);

  const VENDOR_URL = 'https://bookndstay.com/vendor/';
  
  const toggleUserDropdown = () => {
    setShowUserDropdown(!showUserDropdown);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Navigation helper function
  const handleNavigation = (page) => {
    if (page === 'vendorLogin') {
      window.location.href = VENDOR_URL;
    } else {
      navigate(page);
    }
    setShowUserDropdown(false);
    setMobileMenuOpen(false);
  };

  // Sync logged-in state and user with storage
  useEffect(() => {
    const sync = () => {
      const token = getToken();
      setIsLoggedIn(!!token);
      setUser(getUser());
    };
    sync();
    window.addEventListener('auth-changed', sync);
    
    const maybeFetchProfile = async () => {
      const token = getToken();
      const cached = getUser();
      if (token && (!cached || !cached.email || !cached.phone)) {
        try { 
          await authApi.getProfile(); 
        } catch (_) {}
        setUser(getUser());
      }
    };
    maybeFetchProfile();
    
    return () => window.removeEventListener('auth-changed', sync);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      const clickedOutsideUser =
        (!userDropdownRefDesktop.current || !userDropdownRefDesktop.current.contains(event.target)) &&
        (!userDropdownRefMobile.current || !userDropdownRefMobile.current.contains(event.target));

      if (clickedOutsideUser) {
        setShowUserDropdown(false);
      }
      
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) && 
          !event.target.classList.contains('mobile-menu-button')) {
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Accessibility: ESC to close, lock scroll on mobile menu
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setShowUserDropdown(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [mobileMenuOpen]);

  return (
    <motion.header 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
      className='sticky top-0 z-40 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 text-gray-800 shadow-lg border-b border-gray-100'
    >
      {/* Top notification bar */}
      <div className='bg-gradient-to-r from-[#ee2e24] to-[#ff5252] text-white text-[10px] xs:text-[11px] sm:text-xs py-1.5 sm:py-2 text-center px-2 sm:px-4 tracking-wide shadow-sm'>
        <motion.span 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="block sm:inline"
        >
          Get additional 10% off on your first booking with code FIRST10
        </motion.span>
      </div>
      
      {/* Main header */}
      <div className='container mx-auto px-3 xs:px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-3.5 flex items-center justify-between gap-2 xs:gap-3 sm:gap-4'>
        
        {/* Left: Brand */}
        <div className='flex items-center gap-2 xs:gap-3 sm:gap-4'>
          <a 
            onClick={() => handleNavigation('home')}
            className='cursor-pointer flex-shrink-0 flex items-center group'
            aria-label='Go to Home'
          >
            <motion.div 
              whileHover={{ rotate: 10, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className='rounded-full bg-[#ee2e24]/10 p-1 xs:p-1.5 sm:p-2 shadow-sm border border-[#ee2e24]/20 mr-1.5 xs:mr-2 group-hover:bg-[#ee2e24]/20 transition-colors'
            >
              <img src="/oyo-logo.svg" alt="Logo" className='h-5 xs:h-6 sm:h-7 md:h-8 w-auto' />
            </motion.div>
          </a>
        </div>

        {/* Desktop & Tablet: Utility items */}
        <div className='hidden lg:flex items-center gap-2 xl:gap-4 text-sm flex-1 justify-center'>
          
          {/* List your property */}
          <a
            href={VENDOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className='flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 xl:px-4 py-1.5 lg:py-2 rounded-full cursor-pointer hover:shadow-md transition-all border border-[#ee2e24]/20 bg-white no-underline'
            style={{ textDecoration: 'none' }}
          >
            <div className='h-7 w-7 lg:h-8 lg:w-8 rounded-full bg-[#ffe8e7] flex items-center justify-center shadow-inner flex-shrink-0'>
              <FaBuilding className='text-[#ee2e24] text-xs lg:text-sm' />
            </div>
            <div className='leading-tight'>
              <div className='text-gray-900 text-[10px] lg:text-xs font-bold whitespace-nowrap'>List your property</div>
              <div className='text-[9px] lg:text-[10px] text-gray-500 font-medium whitespace-nowrap hidden xl:block'>Start earning in 30 mins</div>
            </div>
          </a>

          {/* Phone */}
          <motion.a
            whileHover={{ scale: 1.05, backgroundColor: '#f9fafb' }}
            whileTap={{ scale: 0.98 }}
            className='flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 xl:px-4 py-1.5 lg:py-2 rounded-full border border-gray-200/70 bg-white cursor-pointer hover:shadow-md transition-all'
            href="tel:7057062000"
            style={{ textDecoration: 'none' }}
          >
            <div className='h-7 w-7 lg:h-8 lg:w-8 rounded-full bg-gray-100 flex items-center justify-center shadow-inner flex-shrink-0'>
              <FaPhone className='text-gray-600 text-xs lg:text-sm' />
            </div>
            <div className='leading-tight'>
              <div className='text-gray-900 text-[10px] lg:text-xs font-bold whitespace-nowrap'>7057062000</div>
              <div className='text-[9px] lg:text-[10px] text-gray-500 font-medium whitespace-nowrap hidden xl:block'>Call us to Book now</div>
            </div>
          </motion.a>
        </div>

        {/* Right: User Profile or Login - Desktop & Tablet */}
        <div className='hidden lg:flex items-center gap-2 xl:gap-3 text-sm'>
          {isLoggedIn ? (
            <div className="relative" ref={userDropdownRefDesktop}>
              <motion.div 
                onClick={toggleUserDropdown}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center cursor-pointer hover:opacity-90 transition-opacity bg-white px-1.5 lg:px-2 py-1 rounded-full border border-gray-100 shadow-sm"
              >
                <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-gradient-to-br from-[#ee2e24] to-[#ff5252] flex items-center justify-center mr-1.5 lg:mr-2 shadow-md ring-2 ring-white flex-shrink-0">
                  <FaUser className="text-white text-xs lg:text-sm" />
                </div>
                <span className='text-gray-900 font-bold pr-1.5 lg:pr-2 text-xs lg:text-sm truncate max-w-[80px] lg:max-w-[120px]'>
                  Hi, {user?.full_name?.split(' ')[0] || 'User'}
                </span>
              </motion.div>

              <AnimatePresence>
                {showUserDropdown && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-3 w-52 lg:w-60 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden ring-1 ring-black/5"
                  >
                    <div className="bg-gray-50/50 py-2 px-3 lg:px-4 border-b border-gray-100">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Account</span>
                    </div>
                    <div 
                      className="py-2.5 lg:py-3 px-3 lg:px-4 border-b border-gray-50 hover:bg-red-50/50 cursor-pointer transition-colors flex items-center gap-3"
                      onClick={() => handleNavigation('bookings')}
                    >
                      <span className="text-xs lg:text-sm font-medium text-gray-700">My Bookings</span>
                    </div>
                    <div 
                      className="py-2.5 lg:py-3 px-3 lg:px-4 border-b border-gray-50 hover:bg-red-50/50 cursor-pointer transition-colors"
                      onClick={() => handleNavigation('bookingHistory')}
                    >
                      <span className="text-xs lg:text-sm font-medium text-gray-700">Booking History</span>
                    </div>
                    <div 
                      className="py-2.5 lg:py-3 px-3 lg:px-4 border-b border-gray-50 hover:bg-red-50/50 cursor-pointer transition-colors"
                      onClick={() => handleNavigation('profile')}
                    >
                      <span className="text-xs lg:text-sm font-medium text-gray-700">My Profile</span>
                    </div>
                    <div 
                      className="py-2.5 lg:py-3 px-3 lg:px-4 hover:bg-red-50 cursor-pointer text-[#ee2e24] transition-colors bg-red-50/10"
                      onClick={async () => {
                        try { await apiLogout(); } catch (_) {}
                        setIsLoggedIn(false);
                        setShowUserDropdown(false);
                        handleNavigation('home');
                      }}
                    >
                      <span className="text-xs lg:text-sm font-bold">Logout</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <motion.button 
              whileHover={{ scale: 1.05, boxShadow: "0 4px 15px rgba(238, 46, 36, 0.3)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNavigation('login')}
              className="bg-gradient-to-r from-[#ee2e24] to-[#ff5252] text-white px-4 lg:px-6 xl:px-7 py-2 lg:py-2.5 rounded-full hover:shadow-lg transition-all font-bold shadow-md ring-2 ring-red-100 hover:ring-red-200 text-xs lg:text-sm whitespace-nowrap"
            >
              Login/Signup
            </motion.button>
          )}
        </div>
        
        {/* Mobile & Small Tablet Right Side */}
        <div className='lg:hidden flex items-center gap-2 xs:gap-2.5 sm:gap-3'>
          {isLoggedIn && (
            <div className="relative" ref={userDropdownRefMobile}>
              <motion.div 
                whileTap={{ scale: 0.9 }}
                onClick={toggleUserDropdown}
                className="flex items-center cursor-pointer"
              >
                <div className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#ee2e24] to-[#ff5252] flex items-center justify-center shadow-md ring-2 ring-white">
                  <FaUser className="text-white text-xs xs:text-sm" />
                </div>
              </motion.div>
              
              <AnimatePresence>
                {showUserDropdown && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-56 xs:w-60 sm:w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden ring-1 ring-black/5"
                  >
                    <div className="bg-gray-50/50 py-2 px-3 xs:px-4 border-b border-gray-100">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Account</span>
                    </div>
                    <div 
                      className="py-2.5 xs:py-3 px-3 xs:px-4 border-b border-gray-50 hover:bg-red-50/50 active:bg-red-50 cursor-pointer transition-colors"
                      onClick={() => handleNavigation('bookings')}
                    >
                      <span className="text-sm font-medium text-gray-700">My Bookings</span>
                    </div>
                    <div 
                      className="py-2.5 xs:py-3 px-3 xs:px-4 border-b border-gray-50 hover:bg-red-50/50 active:bg-red-50 cursor-pointer transition-colors"
                      onClick={() => handleNavigation('bookingHistory')}
                    >
                      <span className="text-sm font-medium text-gray-700">Booking History</span>
                    </div>
                    <div 
                      className="py-2.5 xs:py-3 px-3 xs:px-4 border-b border-gray-50 hover:bg-red-50/50 active:bg-red-50 cursor-pointer transition-colors"
                      onClick={() => handleNavigation('profile')}
                    >
                      <span className="text-sm font-medium text-gray-700">My Profile</span>
                    </div>
                    <div 
                      className="py-2.5 xs:py-3 px-3 xs:px-4 hover:bg-red-50 active:bg-red-100 cursor-pointer text-[#ee2e24] transition-colors bg-red-50/10"
                      onClick={async () => {
                        try { await apiLogout(); } catch (_) {}
                        setIsLoggedIn(false);
                        setShowUserDropdown(false);
                        handleNavigation('home');
                      }}
                    >
                      <span className="text-sm font-bold">Logout</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          
          <motion.button 
            whileTap={{ scale: 0.9 }}
            className='mobile-menu-button text-gray-700 p-2 xs:p-2.5 sm:p-3 rounded-full bg-white shadow-md border border-gray-100 hover:bg-gray-50 active:bg-gray-100 transition-colors'
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <FaTimes className="text-base xs:text-lg" /> : <FaBars className="text-base xs:text-lg" />}
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu Backdrop & Content */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-30" 
              onClick={() => setMobileMenuOpen(false)} 
            />
            
            {/* Menu Panel */}
            <motion.div 
              ref={mobileMenuRef}
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="lg:hidden absolute left-0 right-0 top-full bg-white/95 backdrop-blur-xl border-t border-gray-200 shadow-xl z-40 rounded-b-2xl sm:rounded-b-3xl overflow-hidden"
            >
              <div className="container mx-auto px-3 xs:px-4 sm:px-6 py-3 xs:py-4 sm:py-5 max-h-[70vh] sm:max-h-[75vh] overflow-y-auto">
                <nav className="flex flex-col gap-1">
                  
                  {/* List Your Property - Mobile */}
                  <a
                    href={VENDOR_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 xs:py-3 px-3 xs:px-4 rounded-xl text-gray-800 hover:bg-red-50 active:bg-red-100 hover:text-[#ee2e24] cursor-pointer transition-all font-medium flex items-center gap-3 text-sm xs:text-base no-underline"
                    style={{ textDecoration: 'none' }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <FaBuilding className="text-gray-400 flex-shrink-0 text-base xs:text-lg" />
                    <span>List Your Property</span>
                  </a>

                  {/* Phone - Mobile */}
                  <a
                    href="tel:7057062000"
                    className="py-2.5 xs:py-3 px-3 xs:px-4 rounded-xl text-gray-800 hover:bg-red-50 active:bg-red-100 hover:text-[#ee2e24] cursor-pointer transition-all font-medium flex items-center gap-3 border-b border-gray-100 no-underline"
                    style={{ textDecoration: 'none' }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <FaPhone className="text-gray-400 flex-shrink-0 text-sm xs:text-base" />
                    <div className="flex flex-col">
                      <span className="text-sm xs:text-base">7057062000</span>
                      <span className="text-[10px] xs:text-xs text-gray-400 font-normal">Call us to Book now</span>
                    </div>
                  </a>
                  
                  {/* Login/Register buttons for non-logged-in users */}
                  {!isLoggedIn && (
                    <div className="py-3 xs:py-4 flex flex-col gap-2.5 xs:gap-3 mt-2 border-t border-gray-100">
                      <button 
                        onClick={() => handleNavigation('login')}
                        className="bg-gradient-to-r from-[#ee2e24] to-[#ff5252] text-white px-4 py-2.5 xs:py-3 sm:py-3.5 rounded-xl hover:shadow-lg active:scale-98 transition-all w-full font-bold shadow-lg shadow-red-200 text-sm xs:text-base"
                      >
                        Login
                      </button>
                      <button 
                        onClick={() => handleNavigation('register')}
                        className="border-2 border-[#ee2e24] text-[#ee2e24] px-4 py-2.5 xs:py-3 sm:py-3.5 rounded-xl hover:bg-red-50 active:bg-red-100 transition-all w-full font-bold text-sm xs:text-base"
                      >
                        Register
                      </button>
                    </div>
                  )}
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
