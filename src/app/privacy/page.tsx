import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy Policy" };

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "CloudCRM";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://cloudcrm.app";

export default function PrivacyPage() {
  const lastUpdated = "20 May 2025";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="mb-8">
          <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-700">← Back to home</Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: {lastUpdated}</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Information We Collect</h2>
            <p>We collect information you provide directly to us, including:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Account information (name, email address, password)</li>
              <li>Billing information (company name, address, GSTIN)</li>
              <li>Service usage data and support tickets</li>
              <li>Communication preferences</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices, updates, and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Comply with legal obligations including GST requirements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Data Storage & Security</h2>
            <p>Your data is stored on Supabase-hosted PostgreSQL databases in the Asia Pacific region. We implement industry-standard security measures including encryption at rest and in transit, access controls, and audit logging.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Your Rights</h2>
            <p>Under applicable data protection laws, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="mt-2">To exercise these rights, visit your <Link href="/account" className="text-indigo-600 hover:underline">account settings</Link> or contact us.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Retention</h2>
            <p>We retain your personal data for as long as your account is active. Invoice and billing records are retained for 7 years as required by Indian tax law. You may request deletion of non-billing data at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Cookies</h2>
            <p>We use essential cookies only — session tokens for authentication. We do not use tracking or advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Contact Us</h2>
            <p>For privacy-related questions, contact us at <a href={`mailto:privacy@${appUrl.replace(/https?:\/\//, "")}`} className="text-indigo-600 hover:underline">privacy@cloudcrm.app</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
