'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import { useSidebar } from '@/context/SidebarContext';

// Terms of Service — static legal page, no auth required.
// Includes Meta-style liability limitation, arbitration, and broad consent clauses.
export default function TermsPage() {
  const { isSidebarCollapsed } = useSidebar();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className={`flex-1 pb-16 md:pb-0 transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-18' : 'md:ml-60'}`}>
        <Header />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-8">Effective Date: January 1, 2025 &middot; Last Updated: March 2026</p>

          <div className="space-y-8 text-sm text-gray-700 leading-relaxed">
            {/* Intro */}
            <p>
              Welcome to AniCon. These Terms of Service (&quot;Terms&quot;) govern your access to and use of the AniCon platform,
              including the website at anicon.online and any associated services (collectively, the &quot;Service&quot;), operated
              by AniCon (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
            </p>
            <p>
              By accessing or using the Service, you agree to be bound by these Terms and our Privacy Policy. If you do not
              agree to these Terms, you may not access or use the Service.
            </p>

            {/* 1. Eligibility */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Eligibility</h2>
              <p>
                You must be at least 13 years old to use the Service. By using the Service, you represent and warrant
                that you meet this age requirement. If you are under 18, you represent that your parent or legal guardian
                has reviewed and agreed to these Terms on your behalf.
              </p>
            </section>

            {/* 2. Account Registration */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Account Registration</h2>
              <p className="mb-2">When you create an account, you agree to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and promptly update your account information</li>
                <li>Maintain the security of your password and account</li>
                <li>Accept responsibility for all activities that occur under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>
              <p className="mt-2">
                You may not use another person&apos;s account without permission. We reserve the right to suspend or
                terminate accounts that contain inaccurate information or are used in violation of these Terms.
              </p>
            </section>

            {/* 3. Acceptable Use */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Acceptable Use</h2>
              <p className="mb-2">You agree not to use the Service to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Post, upload, or transmit content that is unlawful, harmful, threatening, abusive, harassing,
                  defamatory, vulgar, obscene, or otherwise objectionable</li>
                <li>Impersonate any person or entity, or falsely represent your affiliation with a person or entity</li>
                <li>Engage in spamming, phishing, or other fraudulent activity</li>
                <li>Upload viruses, malware, or any harmful code</li>
                <li>Interfere with or disrupt the Service or servers connected to the Service</li>
                <li>Attempt to gain unauthorized access to any portion of the Service</li>
                <li>Scrape, crawl, or use automated means to access the Service without our express permission</li>
                <li>Use the Service for any illegal purpose or in violation of any local, state, national, or
                  international law</li>
                <li>Harass, bully, intimidate, or threaten other users</li>
                <li>Post sexually explicit content involving minors</li>
              </ul>
              <p className="mt-2">
                We reserve the right to remove content and suspend or terminate accounts that violate these guidelines,
                at our sole discretion and without prior notice.
              </p>
            </section>

            {/* 4. User Content */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">4. User Content</h2>
              <p className="mb-2">
                You retain ownership of the content you post on the Service (&quot;User Content&quot;). However, by posting
                User Content, you grant us a non-exclusive, worldwide, royalty-free, sublicensable, and transferable
                license to use, reproduce, modify, adapt, publish, translate, distribute, display, and create derivative
                works from your User Content in connection with operating and providing the Service.
              </p>
              <p className="mb-2">
                This license continues even if you stop using the Service, to the extent your User Content has been
                shared with others who have not deleted it, or has been used in connection with our services.
              </p>
              <p>
                You represent and warrant that you own or have the necessary rights to post your User Content and
                that your User Content does not infringe or violate the rights of any third party.
              </p>
            </section>

            {/* 5. Intellectual Property */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Intellectual Property</h2>
              <p>
                The Service and its original content (excluding User Content), features, and functionality are owned
                by AniCon and are protected by international copyright, trademark, patent, trade secret, and other
                intellectual property laws. Our trademarks, logos, and service marks may not be used without our
                prior written consent.
              </p>
            </section>

            {/* 6. Events, Tickets, and Payments */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Events, Tickets, and Payments</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Event Listings:</strong> AniCon serves as a platform for event organizers to list events
                  and for users to discover and attend them. We are not the organizer of third-party events and are
                  not responsible for the quality, safety, or legality of events listed on our platform.
                </li>
                <li>
                  <strong>Ticket Purchases:</strong> All ticket purchases are processed through our payment partners
                  (Stripe, PayWay). By purchasing a ticket, you agree to the applicable payment terms. Ticket prices
                  are set by event organizers.
                </li>
                <li>
                  <strong>Refunds:</strong> Refund policies are determined by event organizers. AniCon is not obligated
                  to provide refunds for third-party events. For events organized by AniCon, refund requests will be
                  handled on a case-by-case basis.
                </li>
                <li>
                  <strong>Free Events (RSVP):</strong> RSVPing to a free event does not guarantee entry. Event capacity
                  and admission are managed by the event organizer.
                </li>
              </ul>
            </section>

            {/* 7. Privacy and Data Practices */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Privacy and Data Practices</h2>
              <p>
                By using the Service, you consent to our collection, use, and sharing of your information as described
                in our <a href="/privacy" className="text-[#FF7927] hover:underline">Privacy Policy</a>. You acknowledge
                that we may share your information with third-party partners to provide, improve, and personalize our
                services, including for advertising and analytics purposes. Our Privacy Policy is incorporated into
                these Terms by reference.
              </p>
            </section>

            {/* 8. Disclaimer of Warranties */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Disclaimer of Warranties</h2>
              <p className="uppercase font-medium text-gray-800">
                THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER
                EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
                PARTICULAR PURPOSE, NON-INFRINGEMENT, OR COURSE OF PERFORMANCE.
              </p>
              <p className="mt-2">
                We do not warrant that the Service will be uninterrupted, timely, secure, or error-free, or that
                defects will be corrected. We do not warrant or make any representations regarding the results of
                using the Service.
              </p>
            </section>

            {/* 9. Limitation of Liability */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Limitation of Liability</h2>
              <p className="uppercase font-medium text-gray-800">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL ANICON, ITS DIRECTORS, EMPLOYEES,
                PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
                OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER
                INTANGIBLE LOSSES, RESULTING FROM:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2 uppercase font-medium text-gray-800">
                <li>Your access to or use of (or inability to access or use) the Service</li>
                <li>Any conduct or content of any third party on the Service</li>
                <li>Any content obtained from the Service</li>
                <li>Unauthorized access, use, or alteration of your transmissions or content</li>
              </ul>
              <p className="mt-2">
                Our total liability to you for all claims arising out of or relating to the Service shall not exceed
                the amount you paid to us, if any, during the twelve (12) months preceding the claim.
              </p>
            </section>

            {/* 10. Indemnification */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Indemnification</h2>
              <p>
                You agree to defend, indemnify, and hold harmless AniCon and its officers, directors, employees, and
                agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable
                attorney&apos;s fees) arising out of or in any way connected with: (a) your access to or use of the Service;
                (b) your User Content; (c) your violation of these Terms; or (d) your violation of any rights of another.
              </p>
            </section>

            {/* 11. Dispute Resolution */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Dispute Resolution</h2>
              <p className="mb-2">
                Any dispute, controversy, or claim arising out of or relating to these Terms or the Service shall be
                resolved through binding arbitration, rather than in court, except that you may assert claims in small
                claims court if your claims qualify.
              </p>
              <p className="mb-2 font-medium text-gray-800">
                CLASS ACTION WAIVER: YOU AND ANICON AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR
                OR ITS INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR
                REPRESENTATIVE PROCEEDING.
              </p>
              <p>
                The arbitration shall be conducted in Phnom Penh, Kingdom of Cambodia, in accordance with applicable
                arbitration rules. The arbitrator&apos;s decision shall be final and binding.
              </p>
            </section>

            {/* 12. Termination */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">12. Termination</h2>
              <p>
                We may terminate or suspend your account and access to the Service immediately, without prior notice
                or liability, at our sole discretion, for any reason whatsoever, including without limitation if you
                breach these Terms. Upon termination, your right to use the Service will immediately cease. All
                provisions of these Terms which by their nature should survive termination shall survive, including
                ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
              </p>
            </section>

            {/* 13. Governing Law */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">13. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the Kingdom of Cambodia,
                without regard to its conflict of law provisions.
              </p>
            </section>

            {/* 14. Changes to Terms */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">14. Changes to Terms</h2>
              <p>
                We reserve the right to modify or replace these Terms at any time, at our sole discretion. If a revision
                is material, we will provide at least 30 days&apos; notice prior to any new terms taking effect. What
                constitutes a material change will be determined at our sole discretion. By continuing to access or use
                the Service after any revisions become effective, you agree to be bound by the revised Terms.
              </p>
            </section>

            {/* 15. Severability */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">15. Severability</h2>
              <p>
                If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed
                and interpreted to accomplish the objectives of such provision to the greatest extent possible under
                applicable law, and the remaining provisions will continue in full force and effect.
              </p>
            </section>

            {/* 16. Entire Agreement */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">16. Entire Agreement</h2>
              <p>
                These Terms, together with our Privacy Policy, constitute the entire agreement between you and AniCon
                regarding your use of the Service and supersede all prior agreements and understandings.
              </p>
            </section>

            {/* 17. Contact */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">17. Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us at:
              </p>
              <p className="mt-2 font-medium">
                AniCon<br />
                Email: legal@anicon.online
              </p>
            </section>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
