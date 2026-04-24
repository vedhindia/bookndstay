import { Link } from 'react-router-dom';
import { FaFacebook, FaInstagram, FaTwitter, FaYoutube, FaGlobe, FaApple, FaGooglePlay, FaCreditCard, FaShieldAlt, FaArrowUp } from 'react-icons/fa';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className='mt-auto'>
      {/* App download section */}
      <div className='bg-gray-100 border-t border-gray-200'>
        <div className='container mx-auto px-4 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6'>
          <div>
            <h4 className='text-xl font-bold text-gray-800'>Download the OYO app</h4>
            <p className='text-sm text-gray-600'>Book stays faster with exclusive member deals and instant discounts</p>
          </div>
          <div className='flex gap-3'>
            <a
              className='bg-black text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-gray-800 flex items-center'
              href='https://apps.apple.com/'
              target='_blank'
              rel='noopener noreferrer'
              aria-label='Download on the App Store'
            >
              <FaApple className='mr-2 text-lg' />
              <div className='flex flex-col items-start'>
                <span className='text-xs'>Download on</span>
                <span>App Store</span>
              </div>
            </a>
            <a
              className='bg-black text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-gray-800 flex items-center'
              href='https://play.google.com/store'
              target='_blank'
              rel='noopener noreferrer'
              aria-label='Get it on Google Play'
            >
              <FaGooglePlay className='mr-2 text-lg' />
              <div className='flex flex-col items-start'>
                <span className='text-xs'>Get it on</span>
                <span>Google Play</span>
              </div>
            </a>
          </div>
        </div>
      </div>
      
      {/* Trust badges */}
      <div className='bg-white border-t border-gray-200'>
        <div className='container mx-auto px-4 py-6'>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <div className='flex flex-col items-center text-center'>
              <FaShieldAlt className='text-[#ee2e24] text-3xl mb-2' />
              <h5 className='font-semibold text-gray-800'>Trusted Stays</h5>
              <p className='text-xs text-gray-600'>All properties are verified and audited</p>
            </div>
            <div className='flex flex-col items-center text-center'>
              <FaCreditCard className='text-[#ee2e24] text-3xl mb-2' />
              <h5 className='font-semibold text-gray-800'>Secure Payments</h5>
              <p className='text-xs text-gray-600'>Multiple secure payment options</p>
            </div>
            <div className='flex flex-col items-center text-center'>
              <FaGlobe className='text-[#ee2e24] text-3xl mb-2' />
              <h5 className='font-semibold text-gray-800'>Global Presence</h5>
              <p className='text-xs text-gray-600'>Hotels across 800+ cities</p>
            </div>
            <div className='flex flex-col items-center text-center'>
              <FaYoutube className='text-[#ee2e24] text-3xl mb-2' />
              <h5 className='font-semibold text-gray-800'>24/7 Support</h5>
              <p className='text-xs text-gray-600'>Round-the-clock customer service</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main footer links */}
      <div className='bg-gray-900 text-gray-300'>
        <div className='container mx-auto px-4 py-10 hidden md:grid grid-cols-5 gap-8 text-sm'>
          <div className='col-span-2 md:col-span-1'>
            <div className='flex items-center gap-3 mb-3'>
              <img src='/oyo-logo.svg' alt='OYO' className='h-7 w-auto' />
              <span className='text-white font-semibold'>OYO Hotels</span>
            </div>
            <p className='text-xs text-gray-400 mb-4'>Great prices. Great locations. Great experiences.</p>
           
          </div>
          <div>
            <h5 className='text-white font-semibold mb-3'>OYO Rooms</h5>
            <ul className='space-y-2'>
              <li>
                <Link to='/hotels' className='hover:text-white transition-colors'>Hotels in Delhi</Link>
              </li>
              <li>
                <Link to='/hotels' className='hover:text-white transition-colors'>Hotels in Mumbai</Link>
              </li>
              <li>
                <Link to='/hotels' className='hover:text-white transition-colors'>Hotels in Bengaluru</Link>
              </li>
              <li>
                <Link to='/hotels' className='hover:text-white transition-colors'>Hotels in Goa</Link>
              </li>
              <li>
                <Link to='/hotels' className='hover:text-white transition-colors'>Hotels in Hyderabad</Link>
              </li>
              <li>
                <Link to='/hotels' className='hover:text-white transition-colors'>Hotels in Chennai</Link>
              </li>
            </ul>
          </div>
          <div>
            <h5 className='text-white font-semibold mb-3'>Discover</h5>
            <ul className='space-y-2'>
              <li><a href='#' className='hover:text-white transition-colors'>Collections</a></li>
              <li><a href='#' className='hover:text-white transition-colors'>OYO for Business</a></li>
              <li><a href='#' className='hover:text-white transition-colors'>Travel Guides</a></li>
              <li><a href='#' className='hover:text-white transition-colors'>Gift Cards</a></li>
              <li><a href='#' className='hover:text-white transition-colors'>OYO Wizard Membership</a></li>
              <li><a href='#' className='hover:text-white transition-colors'>Nearby Getaways</a></li>
            </ul>
          </div>
          <div>
            <h5 className='text-white font-semibold mb-3'>Support</h5>
            <ul className='space-y-2'>
              <li><Link to='/help' className='hover:text-white transition-colors'>Help Center</Link></li>
              <li><Link to='/bookings' className='hover:text-white transition-colors'>Manage Bookings</Link></li>
              <li><Link to='/help' className='hover:text-white transition-colors'>Cancellation Policy</Link></li>
              <li><Link to='/contact' className='hover:text-white transition-colors'>Contact Us</Link></li>
              <li><Link to='/help' className='hover:text-white transition-colors'>FAQs</Link></li>
              <li><Link to='/help' className='hover:text-white transition-colors'>Safety Guidelines</Link></li>
            </ul>
          </div>
          <div>
            <h5 className='text-white font-semibold mb-3'>Company</h5>
            <ul className='space-y-2'>
              <li><a href='#' className='hover:text-white transition-colors'>Careers</a></li>
              <li><a href='#' className='hover:text-white transition-colors'>Press</a></li>
              <li><a href='#' className='hover:text-white transition-colors'>Investor Relations</a></li>
              <li><Link to='/list-your-property' className='hover:text-white transition-colors'>Partner With Us</Link></li>
              <li><a href='#' className='hover:text-white transition-colors'>Terms & Privacy</a></li>
            </ul>
          </div>
        </div>
        <div className='container mx-auto px-4 py-8 md:hidden text-sm'>
          <div className='flex items-center gap-3 mb-4'>
            <img src='/oyo-logo.svg' alt='OYO' className='h-6 w-auto' />
            <span className='text-white font-semibold'>OYO Hotels</span>
          </div>
          <p className='text-xs text-gray-400 mb-4'>Great prices. Great locations. Great experiences.</p>
          <div className='grid grid-cols-1 gap-3'>
            <details className='bg-gray-800/60 rounded-md p-3'>
              <summary className='cursor-pointer text-white font-semibold'>OYO Rooms</summary>
              <ul className='mt-2 space-y-2 text-gray-300'>
                <li><Link to='/hotels' className='hover:text-white transition-colors'>Hotels in Delhi</Link></li>
                <li><Link to='/hotels' className='hover:text-white transition-colors'>Hotels in Mumbai</Link></li>
                <li><Link to='/hotels' className='hover:text-white transition-colors'>Hotels in Bengaluru</Link></li>
                <li><Link to='/hotels' className='hover:text-white transition-colors'>Hotels in Goa</Link></li>
                <li><Link to='/hotels' className='hover:text-white transition-colors'>Hotels in Hyderabad</Link></li>
                <li><Link to='/hotels' className='hover:text-white transition-colors'>Hotels in Chennai</Link></li>
              </ul>
            </details>
            <details className='bg-gray-800/60 rounded-md p-3'>
              <summary className='cursor-pointer text-white font-semibold'>Discover</summary>
              <ul className='mt-2 space-y-2 text-gray-300'>
                <li><a href='#' className='hover:text-white transition-colors'>Collections</a></li>
                <li><a href='#' className='hover:text-white transition-colors'>OYO for Business</a></li>
                <li><a href='#' className='hover:text-white transition-colors'>Travel Guides</a></li>
                <li><a href='#' className='hover:text-white transition-colors'>Gift Cards</a></li>
                <li><a href='#' className='hover:text-white transition-colors'>OYO Wizard Membership</a></li>
                <li><a href='#' className='hover:text-white transition-colors'>Nearby Getaways</a></li>
              </ul>
            </details>
            <details className='bg-gray-800/60 rounded-md p-3'>
              <summary className='cursor-pointer text-white font-semibold'>Support</summary>
              <ul className='mt-2 space-y-2 text-gray-300'>
                <li><Link to='/help' className='hover:text-white transition-colors'>Help Center</Link></li>
                <li><Link to='/bookings' className='hover:text-white transition-colors'>Manage Bookings</Link></li>
                <li><Link to='/help' className='hover:text-white transition-colors'>Cancellation Policy</Link></li>
                <li><Link to='/contact' className='hover:text-white transition-colors'>Contact Us</Link></li>
                <li><Link to='/help' className='hover:text-white transition-colors'>FAQs</Link></li>
                <li><Link to='/help' className='hover:text-white transition-colors'>Safety Guidelines</Link></li>
              </ul>
            </details>
            <details className='bg-gray-800/60 rounded-md p-3'>
              <summary className='cursor-pointer text-white font-semibold'>Company</summary>
              <ul className='mt-2 space-y-2 text-gray-300'>
                <li><a href='#' className='hover:text-white transition-colors'>Careers</a></li>
                <li><a href='#' className='hover:text-white transition-colors'>Press</a></li>
                <li><a href='#' className='hover:text-white transition-colors'>Investor Relations</a></li>
                <li><Link to='/list-your-property' className='hover:text-white transition-colors'>Partner With Us</Link></li>
                <li><a href='#' className='hover:text-white transition-colors'>Terms & Privacy</a></li>
              </ul>
            </details>
          </div>
        </div>
        
        {/* Social media and copyright */}
        <div className='border-t border-gray-700 mt-8 pt-6 pb-4'>
          <div className='container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4'>
            <div className='text-xs text-gray-400'>
              © {year} OYO Hotels. All rights reserved.
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
