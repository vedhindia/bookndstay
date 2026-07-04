export default function TermsAndConditionsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">
        Terms & Conditions
      </h1>

      <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 space-y-8">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">1. Acceptance of Terms</h2>
          <p className="text-gray-700 text-sm sm:text-base">
            By accessing or using BookndStay, you agree to these Terms & Conditions. If you do not agree,
            please do not use the platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">2. Online Booking Only</h2>
          <p className="text-gray-700 text-sm sm:text-base">
            BookndStay supports online booking payments. Booking confirmations depend on successful payment
            and platform verification.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">3. User Responsibilities</h2>
          <ul className="list-disc pl-5 text-gray-700 text-sm sm:text-base space-y-1">
            <li>Provide accurate personal and booking information</li>
            <li>Do not misuse the platform, attempt fraud, or access restricted parts of the system</li>
            <li>Follow hotel rules and policies during stay</li>
            <li>Carry valid identity proof at check-in if required by the hotel</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">4. Pricing, Guests, and Child Age Rules</h2>
          <p className="text-gray-700 text-sm sm:text-base">
            Prices shown are based on the selected dates, room type, and guest details. If age-based pricing rules
            apply, the ages entered at booking time may be used for verification at check-in.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">5. Cancellations and Refunds</h2>
          <p className="text-gray-700 text-sm sm:text-base">
            Refunds and cancellations follow our cancellation rules as listed in the Cancellation & Refunds policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">6. Platform Role and Liability</h2>
          <p className="text-gray-700 text-sm sm:text-base">
            BookndStay acts as an online booking platform and is not responsible for disputes, accidents, theft,
            injuries, property damage, service quality, or losses arising between guests and hotel vendors.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">7. Vendor Terms</h2>
          <p className="text-gray-700 text-sm sm:text-base">
            The following terms apply to vendors listing hotels on BookndStay:
          </p>
          <ul className="list-disc pl-5 text-gray-700 text-sm sm:text-base space-y-1">
            <li>Admin will deduct 10% commission from every successful online booking.</li>
            <li>Vendor is responsible for maintaining accurate hotel information, pricing, room availability, and uploaded documents.</li>
            <li>Admin reserves the right to approve, suspend, or remove any hotel listing without prior notice if policy violations, fraud, or repeated customer complaints occur.</li>
            <li>Vendors must honor all confirmed bookings unless unavoidable circumstances arise.</li>
            <li>Vendors are responsible for obtaining all required licenses, permits, GST registration, and complying with applicable laws.</li>
            <li>Vendors agree not to upload false information, fake reviews, misleading images, or incorrect pricing.</li>
            <li>Any refund or cancellation shall follow the hotel's cancellation policy unless otherwise specified by the platform.</li>
            <li>Admin reserves the right to hold payments while investigating fraudulent activity or customer disputes.</li>
            <li>Vendors agree that all information provided is true and accurate.</li>
            <li>By submitting the vendor application, the vendor agrees to all platform policies and future updates to these Terms & Conditions.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">8. Termination</h2>
          <p className="text-gray-700 text-sm sm:text-base">
            We may suspend or terminate access to the platform if we detect misuse, fraud, policy violations, or for
            security reasons.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">9. Changes to Terms</h2>
          <p className="text-gray-700 text-sm sm:text-base">
            We may update these Terms & Conditions at any time. Continued use of the platform after changes
            means you accept the updated terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">10. Contact</h2>
          <p className="text-gray-700 text-sm sm:text-base">
            For questions about these terms, contact us at <span className="font-medium">bookndstay@gmail.com</span>.
          </p>
        </section>
      </div>
    </div>
  );
}

