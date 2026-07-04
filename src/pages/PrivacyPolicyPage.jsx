export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">
        Privacy Policy
      </h1>

      <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 space-y-8">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">1. Overview</h2>
          <p className="text-gray-700 text-sm sm:text-base">
            This Privacy Policy describes how BookndStay collects, uses, shares, and protects your
            information when you use our website and services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">2. Information We Collect</h2>
          <ul className="list-disc pl-5 text-gray-700 text-sm sm:text-base space-y-1">
            <li>Account information: name, email, phone number, password (stored securely)</li>
            <li>Booking information: hotel, dates, guests, room details, price, and booking status</li>
            <li>Payment information: payment status and transaction references (payment is processed via payment gateways)</li>
            <li>Device data: browser type, IP address, and basic usage logs for security and performance</li>
            <li>Support messages: information you share when contacting support</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">3. How We Use Your Information</h2>
          <ul className="list-disc pl-5 text-gray-700 text-sm sm:text-base space-y-1">
            <li>To create and manage your account</li>
            <li>To process bookings, confirmations, and booking updates</li>
            <li>To facilitate online payments and generate invoices/receipts</li>
            <li>To provide customer support and handle disputes</li>
            <li>To prevent fraud and improve security</li>
            <li>To improve platform performance and user experience</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">4. Sharing of Information</h2>
          <p className="text-gray-700 text-sm sm:text-base">
            We share your information only when necessary to provide the service:
          </p>
          <ul className="list-disc pl-5 text-gray-700 text-sm sm:text-base space-y-1">
            <li>With hotel vendors to confirm and manage your booking</li>
            <li>With payment gateways to process transactions</li>
            <li>With service providers assisting with hosting, analytics, or support (under confidentiality obligations)</li>
            <li>When required by law, regulation, or legal process</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">5. Cookies and Tracking</h2>
          <p className="text-gray-700 text-sm sm:text-base">
            We may use cookies or similar technologies to keep you signed in, remember preferences,
            and understand usage patterns to improve the platform. You can control cookies through your browser settings.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">6. Data Security</h2>
          <p className="text-gray-700 text-sm sm:text-base">
            We take reasonable security measures to protect your information. However, no method of
            transmission over the internet or electronic storage is completely secure.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">7. Data Retention</h2>
          <p className="text-gray-700 text-sm sm:text-base">
            We retain information as needed to provide services, meet legal obligations, resolve disputes,
            and enforce agreements. Booking and payment records may be retained for accounting and compliance.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">8. Your Rights</h2>
          <ul className="list-disc pl-5 text-gray-700 text-sm sm:text-base space-y-1">
            <li>You can review and update your profile information from your account</li>
            <li>You can request support for account-related data issues</li>
            <li>You can request deletion of your account subject to legal/transaction record requirements</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">9. Changes to This Policy</h2>
          <p className="text-gray-700 text-sm sm:text-base">
            We may update this Privacy Policy from time to time. Continued use of the platform after changes
            means you accept the updated policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">10. Contact</h2>
          <p className="text-gray-700 text-sm sm:text-base">
            If you have questions about this Privacy Policy, contact us at <span className="font-medium">bookndstay@gmail.com</span>.
          </p>
        </section>
      </div>
    </div>
  );
}

