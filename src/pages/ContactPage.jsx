import { FaMapMarkerAlt, FaPhone, FaEnvelope, FaClock } from "react-icons/fa";

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Contact Us</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-6">Send Us a Message</h2>

            <form>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#ee2e24]"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#ee2e24]"
                    placeholder="Your email address"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#ee2e24]"
                  placeholder="Your phone number"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#ee2e24]"
                  placeholder="Subject of your message"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#ee2e24] h-32"
                  placeholder="How can we help you?"
                ></textarea>
              </div>

              <button
                type="submit"
                className="bg-[#ee2e24] text-white px-6 py-3 rounded hover:bg-[#d62c22] font-medium"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-6">Contact Information</h2>

            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-red-100 p-3 rounded-full mr-4">
                  <FaMapMarkerAlt className="text-[#ee2e24]" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Address</h3>
                  <p className="text-gray-700">
                    S. No 21 1, Hinjewadi -Wakad road behind KFC Hinjewadi Pimpri-Chinchwad, Pune, Hinjawadi, Pune, India, 411057
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-red-100 p-3 rounded-full mr-4">
                  <FaPhone className="text-[#ee2e24]" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Phone</h3>
                  <p className="text-gray-700">+91 7057062000</p>
                 
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-red-100 p-3 rounded-full mr-4">
                  <FaEnvelope className="text-[#ee2e24]" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Email</h3>
                  <p className="text-gray-700">bookndstay@gmail.com</p>
                  
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-red-100 p-3 rounded-full mr-4">
                  <FaClock className="text-[#ee2e24]" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Working Hours</h3>
                  <p className="text-gray-700">
                    Mon - Fri: 9:00 AM - 6:00 PM
                    <br />
                    Sat: 9:00 AM - 1:00 PM
                    <br />
                    Sunday: Closed
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Follow Us</h2>
            <div className="flex space-x-4">
              <a
                href="#"
                className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </a>
              <a
                href="#"
                className="bg-pink-600 text-white p-2 rounded-full hover:bg-pink-700"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </a>
              <a
                href="#"
                className="bg-blue-400 text-white p-2 rounded-full hover:bg-blue-500"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                </svg>
              </a>
              <a
                href="#"
                className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-6">Our Location</h2>
        <div className="w-full h-96 rounded-lg overflow-hidden">
          <iframe
            title="BookndStay Location"
            src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d472.70051555925517!2d73.747867!3d18.591878!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2bb84ef0aaa61%3A0x4d66d7a650fd07a2!2sCollection%20O%20Sai%20Raj%20Lodge!5e0!3m2!1sen!2sus!4v1783070673108!5m2!1sen!2sus"
            className="w-full h-full"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    </div>
  );
}
