'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import { useSidebar } from '@/context/SidebarContext';

// Privacy Policy — static legal page, no auth required.
// Uses Meta-style broad data sharing language for future flexibility.
export default function PrivacyPage() {
  const { isSidebarCollapsed } = useSidebar();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className={`flex-1 pb-16 md:pb-0 transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-18' : 'md:ml-60'}`}>
        <Header />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Effective Date: January 1, 2025 &middot; Last Updated: March 2026</p>

          <div className="space-y-8 text-sm text-gray-700 leading-relaxed">
            {/* Intro */}
            <p>
              AniCon (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the AniCon platform, including the website at anicon.online
              and any associated services (collectively, the &quot;Service&quot;). This Privacy Policy explains how we collect, use,
              share, and protect your information when you use our Service.
            </p>
            <p>
              By accessing or using the Service, you agree to the collection and use of information in accordance with this
              Privacy Policy. If you do not agree, please do not use the Service.
            </p>

            {/* 1. Information We Collect */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Information We Collect</h2>

              <h3 className="font-semibold text-gray-800 mb-1">Information You Provide</h3>
              <ul className="list-disc pl-5 space-y-1 mb-3">
                <li>Account information: email address, username, password</li>
                <li>Profile information: display name, avatar, bio, banner image, social links</li>
                <li>Content you create: posts, comments, images, portfolio items</li>
                <li>Payment information: processed by our payment partners (Stripe, PayWay) — we do not store full card numbers</li>
                <li>Communications: messages, support requests, and feedback you send us</li>
                <li>Verification data: ID documents submitted for host applications</li>
              </ul>

              <h3 className="font-semibold text-gray-800 mb-1">Information Collected Automatically</h3>
              <ul className="list-disc pl-5 space-y-1 mb-3">
                <li>Usage data: pages visited, features used, interactions with content</li>
                <li>Device information: browser type, operating system, screen resolution</li>
                <li>Log data: IP addresses, access times, referring URLs</li>
                <li>Location data: general location derived from IP address</li>
              </ul>

              <h3 className="font-semibold text-gray-800 mb-1">Information from Third Parties</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Authentication providers: when you sign in via third-party services</li>
                <li>Payment processors: transaction status and confirmation details</li>
                <li>Public sources: publicly available information relevant to our services</li>
              </ul>
            </section>

            {/* 2. How We Use Your Information */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">2. How We Use Your Information</h2>
              <p className="mb-2">We use the information we collect to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Provide, maintain, and improve the Service</li>
                <li>Process transactions and send related information</li>
                <li>Personalize your experience and deliver relevant content</li>
                <li>Send notifications, updates, and promotional communications</li>
                <li>Monitor and analyze trends, usage, and activities</li>
                <li>Detect, investigate, and prevent fraudulent or unauthorized activity</li>
                <li>Comply with legal obligations</li>
                <li>Develop new products, services, features, and functionality</li>
              </ul>
            </section>

            {/* 3. How We Share Your Information */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">3. How We Share Your Information</h2>
              <p className="mb-3">
                We may share information about you in the following ways and for the following purposes:
              </p>

              <h3 className="font-semibold text-gray-800 mb-1">With Service Providers</h3>
              <p className="mb-3">
                We share information with third-party vendors, consultants, and other service providers who perform services
                on our behalf, including hosting, analytics, payment processing, customer support, and marketing.
              </p>

              <h3 className="font-semibold text-gray-800 mb-1">With Business Partners</h3>
              <p className="mb-3">
                We may share information with business partners to provide, improve, and personalize our services,
                including for advertising and promotional purposes. This may include sharing usage data, interests,
                and other information to help deliver more relevant content and offers.
              </p>

              <h3 className="font-semibold text-gray-800 mb-1">For Analytics and Measurement</h3>
              <p className="mb-3">
                We may share information with analytics and measurement partners to help us understand how our Service
                is used and to measure the effectiveness of content and advertising.
              </p>

              <h3 className="font-semibold text-gray-800 mb-1">For Legal Reasons</h3>
              <p className="mb-3">
                We may disclose information if we believe it is necessary to comply with applicable laws, regulations,
                legal processes, or governmental requests; enforce our Terms of Service; or protect our rights, privacy,
                safety, or property, or that of our users or the public.
              </p>

              <h3 className="font-semibold text-gray-800 mb-1">With Your Consent</h3>
              <p className="mb-3">
                We may share information with your consent or at your direction.
              </p>

              <h3 className="font-semibold text-gray-800 mb-1">Business Transfers</h3>
              <p>
                In connection with any merger, acquisition, reorganization, sale of assets, or bankruptcy, your information
                may be transferred or shared as part of that transaction.
              </p>
            </section>

            {/* 4. Data Retention */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Data Retention</h2>
              <p>
                We retain your information for as long as your account is active or as needed to provide you with our
                services. We may also retain and use your information as necessary to comply with our legal obligations,
                resolve disputes, and enforce our agreements. If you request deletion of your account, we will delete
                or anonymize your personal information within 30 days, except where retention is required by law.
              </p>
            </section>

            {/* 5. Your Rights and Choices */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Your Rights and Choices</h2>
              <p className="mb-2">Depending on your location, you may have the right to:</p>
              <ul className="list-disc pl-5 space-y-1 mb-3">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your personal information</li>
                <li>Object to or restrict processing of your information</li>
                <li>Request a portable copy of your data</li>
                <li>Withdraw consent at any time (where applicable)</li>
              </ul>
              <p>
                To exercise any of these rights, please contact us at the email address provided below.
                We will respond to your request within 30 days.
              </p>
            </section>

            {/* 6. Cookies and Tracking */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Cookies and Tracking Technologies</h2>
              <p>
                We use cookies and similar technologies to authenticate users, remember preferences, and analyze
                how our Service is used. These include essential session cookies required for the Service to function,
                as well as analytics cookies that help us understand usage patterns. You can control cookie preferences
                through your browser settings, but disabling certain cookies may affect the functionality of the Service.
              </p>
            </section>

            {/* 7. Security */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Security</h2>
              <p>
                We implement reasonable technical and organizational measures to protect your information against
                unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over
                the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            {/* 8. Children's Privacy */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Children&apos;s Privacy</h2>
              <p>
                The Service is not directed to individuals under the age of 13. We do not knowingly collect personal
                information from children under 13. If we become aware that we have collected information from a
                child under 13, we will take steps to delete it promptly. If you believe a child under 13 has provided
                us with personal information, please contact us.
              </p>
            </section>

            {/* 9. International Data Transfers */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">9. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than the country in which
                you reside. These countries may have data protection laws that are different from the laws of your
                country. By using the Service, you consent to the transfer of your information to these countries.
              </p>
            </section>

            {/* 10. Changes to This Policy */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any material changes by
                posting the updated policy on the Service and updating the &quot;Last Updated&quot; date. Your continued use of
                the Service after any changes constitutes your acceptance of the updated Privacy Policy.
              </p>
            </section>

            {/* 11. Contact */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Contact Us</h2>
              <p>
                If you have any questions or concerns about this Privacy Policy or our data practices, please contact
                us at:
              </p>
              <p className="mt-2 font-medium">
                AniCon<br />
                Email: privacy@anicon.online
              </p>
            </section>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
