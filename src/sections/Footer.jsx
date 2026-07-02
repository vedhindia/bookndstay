import { Link } from 'react-router-dom';
import { FaFacebook, FaInstagram, FaTwitter, FaYoutube, FaGlobe, FaCreditCard, FaShieldAlt, FaArrowUp } from 'react-icons/fa';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className='mt-auto'>  
      {/* Trust badges */}
      <div className='bg-white border-t border-gray-200'>
        <div className='container mx-auto px-4 py-6'>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <div className='flex flex-col items-center text-center'>
              <FaShieldAlt className='text-[#ee2e24] text-3xl mb-2' />
              <h5 className='font-semibold text-gray-800'>Trusted Stays</h5>
              <p className='text-xs text-gray-600'>Verified properties for a smooth stay</p>
            </div>
            <div className='flex flex-col items-center text-center'>
              <FaCreditCard className='text-[#ee2e24] text-3xl mb-2' />
              <h5 className='font-semibold text-gray-800'>Secure Payments</h5>
              <p className='text-xs text-gray-600'>Protected checkout with secure payment</p>
            </div>
            <div className='flex flex-col items-center text-center'>
              <FaGlobe className='text-[#ee2e24] text-3xl mb-2' />
              <h5 className='font-semibold text-gray-800'>Global Presence</h5>
              <p className='text-xs text-gray-600'>Stays across popular Indian cities</p>
            </div>
            <div className='flex flex-col items-center text-center'>
              <FaYoutube className='text-[#ee2e24] text-3xl mb-2' />
              <h5 className='font-semibold text-gray-800'>24/7 Support</h5>
              <p className='text-xs text-gray-600'>Help whenever you need it</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main footer links */}
      <div className='bg-gray-900 text-gray-300'>
        <div className='container mx-auto px-4 py-10 hidden md:grid grid-cols-5 gap-8 text-sm'>
          <div className='col-span-2 md:col-span-2'>
            <div className='flex items-center gap-3 mb-3'>
              <img src='/BookndStay_Logo.png' alt='BookndStay' className='h-9 w-auto' />
        
            </div>
            <p className='text-xs text-gray-400 mb-4'>Great stays. Easy booking. Hassle-free support.</p>
            <div className='text-xs text-gray-400 space-y-1'>
              <p>Phone: +91 7057062000</p>
              <p>Email: bookndstay@gmail.com</p>
            </div>
          </div>

          <div>
            <h5 className='text-white font-semibold mb-3'>Explore</h5>
            <ul className='space-y-2'>
              <li>
                <Link to='/hotels' className='hover:text-white transition-colors'>Hotels</Link>
              </li>
              <li>
                <Link to='/searchhotel' className='hover:text-white transition-colors'>Search by city</Link>
              </li>
              <li>
                <Link to='/about' className='hover:text-white transition-colors'>About Us</Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className='text-white font-semibold mb-3'>My Account</h5>
            <ul className='space-y-2'>
              <li>
                <Link to='/bookings' className='hover:text-white transition-colors'>My Bookings</Link>
              </li>
              <li>
                <Link to='/bookingHistory' className='hover:text-white transition-colors'>Booking History</Link>
              </li>
              <li>
                <Link to='/profile' className='hover:text-white transition-colors'>Profile</Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className='text-white font-semibold mb-3'>Support</h5>
            <ul className='space-y-2'>
              <li>
                <Link to='/help' className='hover:text-white transition-colors'>Help Center</Link>
              </li>
              <li>
                <Link to='/contact' className='hover:text-white transition-colors'>Contact Us</Link>
              </li>
              <li>
                <Link to='/refund-policy' className='hover:text-white transition-colors'>Cancellation & Refunds</Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className='text-white font-semibold mb-3'>For Hosts</h5>
            <ul className='space-y-2'>
              <li>
                <Link to='/list-your-property' className='hover:text-white transition-colors'>List Your Property</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className='container mx-auto px-4 py-8 md:hidden text-sm'>
          <div className='flex items-center gap-3 mb-3'>
            <img src='/BookndStay_Logo.png' alt='BookndStay' className='h-9 w-auto' />
          </div>
          <p className='text-xs text-gray-400 mb-4'>Great stays. Easy booking. Hassle-free support.</p>

          <div className='grid grid-cols-1 gap-3'>
            <details className='bg-gray-800/60 rounded-md p-3'>
              <summary className='cursor-pointer text-white font-semibold'>Explore</summary>
              <ul className='mt-2 space-y-2 text-gray-300'>
                <li><Link to='/hotels' className='hover:text-white transition-colors'>Hotels</Link></li>
                <li><Link to='/searchhotel' className='hover:text-white transition-colors'>Search by city</Link></li>
                <li><Link to='/about' className='hover:text-white transition-colors'>About Us</Link></li>
              </ul>
            </details>

            <details className='bg-gray-800/60 rounded-md p-3'>
              <summary className='cursor-pointer text-white font-semibold'>My Account</summary>
              <ul className='mt-2 space-y-2 text-gray-300'>
                <li><Link to='/bookings' className='hover:text-white transition-colors'>My Bookings</Link></li>
                <li><Link to='/bookingHistory' className='hover:text-white transition-colors'>Booking History</Link></li>
                <li><Link to='/profile' className='hover:text-white transition-colors'>Profile</Link></li>
              </ul>
            </details>

            <details className='bg-gray-800/60 rounded-md p-3'>
              <summary className='cursor-pointer text-white font-semibold'>Support</summary>
              <ul className='mt-2 space-y-2 text-gray-300'>
                <li><Link to='/help' className='hover:text-white transition-colors'>Help Center</Link></li>
                <li><Link to='/contact' className='hover:text-white transition-colors'>Contact Us</Link></li>
                <li><Link to='/refund-policy' className='hover:text-white transition-colors'>Cancellation & Refunds</Link></li>
              </ul>
            </details>

            <details className='bg-gray-800/60 rounded-md p-3'>
              <summary className='cursor-pointer text-white font-semibold'>For Hosts</summary>
              <ul className='mt-2 space-y-2 text-gray-300'>
                <li><Link to='/list-your-property' className='hover:text-white transition-colors'>List Your Property</Link></li>
                <li><Link to='/vendorLogin' className='hover:text-white transition-colors'>Vendor Login</Link></li>
              </ul>
            </details>
          </div>
        </div>
        
        {/* Social media and copyright */}
        <div className='border-t border-gray-700 mt-8 pt-6 pb-4'>
          <div className='container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4'>
            <div className='text-xs text-gray-400'>
              © {year} BookndStay. All rights reserved.
            </div>
            <div className='flex gap-4 text-lg'>
              <a href='https://facebook.com' target='_blank' rel='noopener noreferrer' aria-label='Facebook'>
                <FaFacebook className='hover:text-[#ee2e24] cursor-pointer' />
              </a>
              <a href='https://twitter.com' target='_blank' rel='noopener noreferrer' aria-label='Twitter'>
                <FaTwitter className='hover:text-[#ee2e24] cursor-pointer' />
              </a>
              <a href='https://instagram.com' target='_blank' rel='noopener noreferrer' aria-label='Instagram'>
                <FaInstagram className='hover:text-[#ee2e24] cursor-pointer' />
              </a>
              <a href='https://youtube.com' target='_blank' rel='noopener noreferrer' aria-label='YouTube'>
                <FaYoutube className='hover:text-[#ee2e24] cursor-pointer' />
              </a>
            </div>
          </div>
        </div>
        <div className='container mx-auto px-4 pb-6 flex justify-end'>
          <button
            type='button'
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className='inline-flex items-center gap-2 bg-[#ee2e24] text-white px-4 py-2 rounded-md hover:bg-[#d62c22] text-sm'
            aria-label='Back to top'
          >
            <FaArrowUp />
            Back to top
          </button>
        </div>
      </div>
    </footer>
  );
}
