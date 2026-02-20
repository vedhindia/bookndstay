import { FaCheckCircle } from "react-icons/fa";

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">
        About OYO
      </h1>

      {/* Hero Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-6 md:mb-0 md:pr-8">
            <h2 className="text-2xl font-semibold mb-4 text-[#ee2e24]">
              Our Mission
            </h2>
            <p className="text-gray-700 mb-4">
              OYO is committed to providing quality accommodations at affordable
              prices. We aim to revolutionize the hospitality industry by
              leveraging technology to standardize and improve the quality of
              stay across our network of hotels.
            </p>
            <p className="text-gray-700">
              Founded in 2013, OYO has grown from a single hotel to become one
              of the world’s leading hotel chains, operating in multiple
              countries across the globe.
            </p>
          </div>
          <div className="md:w-1/2">
            <img
              src="https://images.oyoroomscdn.com/uploads/hotel_image/56303/medium/597f0e48823f8885.jpg"
              alt="OYO Hotel"
              className="rounded-lg shadow-md w-full h-auto"
            />
          </div>
        </div>
      </div>

      {/* Why Choose OYO */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-6 text-[#ee2e24]">
          Why Choose OYO?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Affordable Prices",
              text: "We offer quality accommodations at budget-friendly prices, ensuring value for your money.",
            },
            {
              title: "Wide Network",
              text: "With thousands of hotels across multiple countries, find an OYO wherever you go.",
            },
            {
              title: "Quality Assurance",
              text: "All OYO hotels meet our strict quality standards for cleanliness and service.",
            },
            {
              title: "24/7 Support",
              text: "Our customer support team is available round the clock to assist you.",
            },
            {
              title: "Easy Booking",
              text: "Book your stay in just a few clicks through our user-friendly platform.",
            },
            {
              title: "Flexible Policies",
              text: "Enjoy flexible cancellation and modification policies for your bookings.",
            },
          ].map((feature, index) => (
            <div key={index} className="flex items-start">
              <FaCheckCircle className="text-[#ee2e24] text-xl mt-1 mr-3" />
              <div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-700">{feature.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Company Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { value: "10,000+", label: "Hotels Worldwide" },
          { value: "100+", label: "Cities" },
          { value: "10+", label: "Countries" },
          { value: "5M+", label: "Happy Customers" },
        ].map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow"
          >
            <h3 className="text-3xl font-bold text-[#ee2e24] mb-2">
              {stat.value}
            </h3>
            <p className="text-gray-700">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Our Story */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4 text-[#ee2e24]">
          Our Story
        </h2>
        <p className="text-gray-700 mb-4">
          OYO was founded in 2013 with a simple mission: to create quality
          living spaces. What began as a single hotel in Gurgaon, India, has now
          transformed into a global hospitality powerhouse with a presence in
          multiple countries.
        </p>
        <p className="text-gray-700 mb-4">
          Our journey has been driven by innovation and a customer-first
          approach. By leveraging technology, we've been able to standardize and
          improve the quality of accommodations, making comfortable stays
          accessible to millions of travelers worldwide.
        </p>
        <p className="text-gray-700">
          Today, OYO continues to grow and evolve, constantly striving to
          enhance the guest experience and provide exceptional value to our
          customers. We remain committed to our vision of becoming the most
          preferred and trusted hospitality brand in the world.
        </p>
      </div>
    </div>
  );
}