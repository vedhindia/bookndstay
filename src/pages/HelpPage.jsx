import { useState } from 'react';
import { FaChevronDown, FaChevronUp, FaPhone, FaEnvelope, FaComments } from 'react-icons/fa';

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      question: "How do I cancel my booking?",
      answer:
        "You can cancel your booking by going to 'My Bookings' section in your account. Select the booking you wish to cancel and click on the 'Cancel' button. Please note that cancellation charges may apply based on the hotel's policy.",
    },
    {
      question: "What is OYO's refund policy?",
      answer:
        "Refunds are processed within 5-7 business days after cancellation is confirmed. The refund amount depends on the cancellation policy of the specific hotel and how far in advance you cancel.",
    },
    {
      question: "How can I modify my reservation?",
      answer:
        "To modify your reservation, please contact our customer support team. Modifications are subject to availability and may incur additional charges.",
    },
    {
      question: "Do I need an ID for check-in?",
      answer:
        "Yes, all guests must present a valid government-issued photo ID at check-in. For international guests, a passport is required.",
    },
    {
      question: "What time is check-in and check-out?",
      answer:
        "Standard check-in time is 12:00 PM and check-out time is 11:00 AM. Early check-in or late check-out may be available upon request, subject to availability and additional charges.",
    },
    {
      question: "Is breakfast included in my booking?",
      answer:
        "Breakfast inclusion depends on the rate plan you've selected. You can check if breakfast is included in your booking details.",
    },
    {
      question: "How do I get an invoice for my stay?",
      answer:
        "Invoices are automatically sent to your registered email after check-out. If you haven't received it, you can download it from the 'My Bookings' section or contact our support team.",
    },
  ];

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Title */}
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">
        Help & Support
      </h1>

      {/* Support Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Call Us */}
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaPhone className="text-[#ee2e24] text-2xl" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Call Us</h3>
          <p className="text-gray-600 mb-4">24/7 Customer Support</p>
          <p className="text-lg font-bold">+91 9313 9313 93</p>
        </div>

        {/* Email Us */}
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaEnvelope className="text-[#ee2e24] text-2xl" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Email Us</h3>
          <p className="text-gray-600 mb-4">We'll respond within 24 hours</p>
          <p className="text-lg font-bold">support@oyo.com</p>
        </div>

        {/* Live Chat */}
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaComments className="text-[#ee2e24] text-2xl" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Live Chat</h3>
          <p className="text-gray-600 mb-4">Chat with our support team</p>
          <button className="bg-[#ee2e24] text-white px-4 py-2 rounded hover:bg-[#d62c22]">
            Start Chat
          </button>
        </div>
      </div>

      {/* FAQs Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-6">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <div
                className="flex justify-between items-center p-4 cursor-pointer bg-gray-50 hover:bg-gray-100"
                onClick={() => toggleFaq(index)}
              >
                <h3 className="font-medium">{faq.question}</h3>
                {openFaq === index ? (
                  <FaChevronUp className="text-[#ee2e24]" />
                ) : (
                  <FaChevronDown className="text-gray-500" />
                )}
              </div>

              {openFaq === index && (
                <div className="p-4 bg-white">
                  <p className="text-gray-700">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-6">Send Us a Message</h2>

        <form>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#ee2e24]"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#ee2e24]"
                placeholder="Your email"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#ee2e24]"
              placeholder="Subject of your message"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#ee2e24] h-32"
              placeholder="How can we help you?"
            ></textarea>
          </div>

          <button
            type="submit"
            className="bg-[#ee2e24] text-white px-6 py-2 rounded hover:bg-[#d62c22]"
          >
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
}