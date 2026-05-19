import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="mb-8">
          <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-700">← Back to home</Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: 20 May 2025</p>

        <div className="space-y-8 text-gray-700">
          {[
            { title: "1. Acceptance of Terms", content: "By accessing and using CloudCRM, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, do not use our service." },
            { title: "2. Description of Service", content: "CloudCRM provides cloud service billing and CRM management software. We reserve the right to modify, suspend, or discontinue the service at any time with reasonable notice." },
            { title: "3. Account Responsibilities", content: "You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must notify us immediately of any unauthorized use." },
            { title: "4. Payment Terms", content: "Services are billed in advance. All fees are non-refundable except as required by law. We reserve the right to suspend services for overdue payments. GST will be applied as per applicable Indian tax laws." },
            { title: "5. Acceptable Use", content: "You agree not to use the service for illegal activities, to transmit harmful content, to attempt unauthorized access, or to interfere with the service's operation." },
            { title: "6. Data & Privacy", content: "Your use of the service is also governed by our Privacy Policy. We take data security seriously and implement appropriate technical and organizational measures." },
            { title: "7. Limitation of Liability", content: "To the maximum extent permitted by law, CloudCRM shall not be liable for indirect, incidental, special, or consequential damages arising from your use of the service." },
            { title: "8. Governing Law", content: "These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in Mumbai, Maharashtra." },
            { title: "9. Changes to Terms", content: "We may update these terms from time to time. We will notify you of significant changes via email or a notice in the service. Continued use after changes constitutes acceptance." },
            { title: "10. Contact", content: "For questions about these terms, contact us at legal@cloudcrm.app" },
          ].map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">{section.title}</h2>
              <p>{section.content}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
