export default function RefundPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">
        Refund & Cancellation Policy
      </h1>

      <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 space-y-8">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">1. Cancellation by User</h2>
          <p className="text-gray-700 text-sm sm:text-base">
            Users can cancel their booking through the website/app before the scheduled
            booking start time, subject to the refund rules mentioned below.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">2. Refund Eligibility</h2>
          <p className="text-gray-700 text-sm sm:text-base">
            Refund eligibility depends on:
          </p>
          <ul className="list-disc pl-5 text-gray-700 text-sm sm:text-base space-y-1">
            <li>Booking type (Night / Hour)</li>
            <li>Time remaining before check-in/start time</li>
            <li>Payment method used</li>
          </ul>
          <p className="text-gray-700 text-sm sm:text-base">
            Refunds are applicable only for successful online payments made through secure
            payment gateways such as Razorpay.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">3. Refund Rules</h2>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">A. Nightly Bookings</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm sm:text-base border border-gray-200 rounded-lg">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-3 border-b">Time Before Check-in</th>
                    <th className="text-left p-3 border-b">Refund Percentage</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr>
                    <td className="p-3 border-b">More than 24 hours</td>
                    <td className="p-3 border-b">100% Refund</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-b">Between 12 to 24 hours</td>
                    <td className="p-3 border-b">50% Refund</td>
                  </tr>
                  <tr>
                    <td className="p-3">Less than 12 hours</td>
                    <td className="p-3">No Refund</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">B. Hourly Bookings</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm sm:text-base border border-gray-200 rounded-lg">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-3 border-b">Time Before Booking Start</th>
                    <th className="text-left p-3 border-b">Refund Percentage</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr>
                    <td className="p-3 border-b">More than 2 hours</td>
                    <td className="p-3 border-b">100% Refund</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-b">Between 30 minutes to 2 hours</td>
                    <td className="p-3 border-b">50% Refund</td>
                  </tr>
                  <tr>
                    <td className="p-3">Less than 30 minutes</td>
                    <td className="p-3">No Refund</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">4. Refund Processing</h2>
          <p className="text-gray-700 text-sm sm:text-base">
            Refunds are processed automatically through the original payment gateway used during
            booking. The refunded amount is credited back to the same payment source used for payment,
            including:
          </p>
          <ul className="list-disc pl-5 text-gray-700 text-sm sm:text-base space-y-1">
            <li>UPI account</li>
            <li>Debit/Credit Card</li>
            <li>Net Banking account</li>
            <li>Wallet</li>
          </ul>
          <p className="text-gray-700 text-sm sm:text-base">
            Example: If payment was made using UPI, the refund will be sent to the same UPI account.
            If payment was made using a card, the refund will be credited to the same card.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">5. Refund Processing Time</h2>
          <p className="text-gray-700 text-sm sm:text-base">
            Refund timelines depend on banks and payment providers. Typical timelines:
          </p>
          <ul className="list-disc pl-5 text-gray-700 text-sm sm:text-base space-y-1">
            <li>UPI: Few minutes to 2 working days</li>
            <li>Debit/Credit Cards: 5-7 working days</li>
            <li>Net Banking: 3-7 working days</li>
            <li>Wallets: Usually instant or within 24 hours</li>
          </ul>
          <p className="text-gray-700 text-sm sm:text-base">
            Delays caused by banks/payment providers are outside our control.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">6. Non-Refundable Cases</h2>
          <p className="text-gray-700 text-sm sm:text-base">
            No refund will be provided in the following situations:
          </p>
          <ul className="list-disc pl-5 text-gray-700 text-sm sm:text-base space-y-1">
            <li>Cancellation made after the allowed refund window</li>
            <li>No-show by the user</li>
            <li>Invalid or fraudulent bookings</li>
            <li>Violations of property or platform policies</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">7. Failed or Pending Refunds</h2>
          <p className="text-gray-700 text-sm sm:text-base">
            In rare situations, refunds may remain pending due to:
          </p>
          <ul className="list-disc pl-5 text-gray-700 text-sm sm:text-base space-y-1">
            <li>Banking issues</li>
            <li>Payment gateway downtime</li>
            <li>Technical failures</li>
          </ul>
          <p className="text-gray-700 text-sm sm:text-base">
            If the refund is not completed automatically, it may be processed manually by the support team.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">8. Booking Status After Cancellation</h2>
          <p className="text-gray-700 text-sm sm:text-base">
            Once cancellation is successful:
          </p>
          <ul className="list-disc pl-5 text-gray-700 text-sm sm:text-base space-y-1">
            <li>Booking status will be updated to <span className="font-medium">Cancelled</span></li>
            <li>Refund status will be updated accordingly: Refunded Full, Refunded Partial, No Refund, Refund Pending, Refund Failed</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">9. Contact Support</h2>
          <p className="text-gray-700 text-sm sm:text-base">
            For refund-related queries or delays, users may contact customer support through the website
            contact page or support email.
          </p>
        </section>
      </div>
    </div>
  );
}

