import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — AgentPilot',
  description: 'AgentPilot Privacy Policy. How we collect, use, and protect your information.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-zinc-900 text-slate-200">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-sm text-slate-500 mb-2">
          <Link href="/" className="text-slate-400 hover:text-white">
            ← Home
          </Link>
        </p>
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-slate-400 text-sm mb-10">
          AgentPilot · Effective Date: February 23, 2026
        </p>

        <div className="prose prose-invert prose-slate max-w-none space-y-6 text-slate-300">
          <p>
            AgentPilot (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform at agentpilot.us (the &quot;Service&quot;). Please read this policy carefully. By using the Service, you agree to the practices described here.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-2">1. Information We Collect</h2>

          <h3 className="text-lg font-medium text-slate-200 mt-6 mb-2">1.1 Information You Provide</h3>
          <p>When you create an account or use the Service, we may collect:</p>
          <ul className="list-disc pl-6 space-y-1 my-2">
            <li>Name and email address (via Google OAuth sign-in)</li>
            <li>Company name and professional information you enter</li>
            <li>Target account data, contact information, and sales notes you input</li>
            <li>Content you upload to the platform (website pages, documents, product materials)</li>
            <li>Messages and queries you submit to the AI co-pilot</li>
          </ul>

          <h3 className="text-lg font-medium text-slate-200 mt-6 mb-2">1.2 Information Collected Automatically</h3>
          <p>When you access the Service, we automatically collect certain technical information:</p>
          <ul className="list-disc pl-6 space-y-1 my-2">
            <li>IP address and browser/device type</li>
            <li>Pages visited and features used within the platform</li>
            <li>Session duration and interaction logs</li>
            <li>API usage data (tokens consumed, tool calls made)</li>
          </ul>

          <h3 className="text-lg font-medium text-slate-200 mt-6 mb-2">1.3 Information from Third-Party Services</h3>
          <p>When you connect third-party integrations, we may receive data from those services, including:</p>
          <ul className="list-disc pl-6 space-y-1 my-2">
            <li><strong>Google:</strong> your email address and basic profile information used for authentication</li>
            <li><strong>Apollo.io:</strong> contact and company data returned through our contact-finding features</li>
            <li><strong>Firecrawl:</strong> scraped web content from URLs you submit</li>
            <li><strong>Cal.com:</strong> calendar booking and RSVP data</li>
          </ul>

          <h2 className="text-xl font-semibold text-white mt-8 mb-2">2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-6 space-y-1 my-2">
            <li>Provide, operate, and maintain the Service</li>
            <li>Authenticate your identity and secure your account</li>
            <li>Generate AI-powered account research, buying group recommendations, and outreach drafts</li>
            <li>Find and enrich contact information at your target accounts</li>
            <li>Store and retrieve your content library, messaging frameworks, and account intelligence</li>
            <li>Send transactional emails related to your account (e.g., billing, security alerts)</li>
            <li>Analyze usage patterns to improve the platform</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p>We do not sell your personal information or use it to serve third-party advertisements.</p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-2">3. How We Share Your Information</h2>
          <p>We do not sell, rent, or trade your personal information. We may share information only in the following circumstances:</p>

          <h3 className="text-lg font-medium text-slate-200 mt-6 mb-2">3.1 Service Providers</h3>
          <p>We share data with trusted third-party vendors who help us operate the Service. These providers are contractually obligated to protect your data and may only use it to perform services on our behalf:</p>
          <ul className="list-disc pl-6 space-y-1 my-2">
            <li><strong>Anthropic (Claude AI)</strong> — powers AI-generated research, messaging, and co-pilot features</li>
            <li><strong>Apollo.io</strong> — contact and company data search and enrichment</li>
            <li><strong>Firecrawl</strong> — web scraping for content library ingestion</li>
            <li><strong>Vercel</strong> — application hosting and infrastructure</li>
            <li><strong>Neon / PostgreSQL</strong> — database hosting</li>
            <li><strong>Resend</strong> — transactional email delivery</li>
            <li><strong>Cal.com</strong> — calendar scheduling</li>
            <li><strong>Perplexity AI</strong> — company research queries</li>
          </ul>

          <h3 className="text-lg font-medium text-slate-200 mt-6 mb-2">3.2 Legal Requirements</h3>
          <p>We may disclose your information if required to do so by law or in response to valid legal process (such as a subpoena or court order), or to protect the rights, property, or safety of AgentPilot, our users, or the public.</p>

          <h3 className="text-lg font-medium text-slate-200 mt-6 mb-2">3.3 Business Transfers</h3>
          <p>If AgentPilot is involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. We will notify you via email and/or prominent notice on the Service before your information is transferred and becomes subject to a different privacy policy.</p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-2">4. Data Retention</h2>
          <p>We retain your personal information for as long as your account is active or as needed to provide the Service. You may request deletion of your account and associated data at any time by contacting us at info@agentpilot.us. We will delete or anonymize your information within 30 days of a verified deletion request, except where we are required to retain it for legal or compliance purposes.</p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-2">5. Data Security</h2>
          <p>We implement commercially reasonable technical and organizational measures to protect your information against unauthorized access, alteration, disclosure, or destruction. These measures include:</p>
          <ul className="list-disc pl-6 space-y-1 my-2">
            <li>Encrypted data transmission (TLS/HTTPS)</li>
            <li>Authentication via Google OAuth 2.0</li>
            <li>Rate limiting and prompt injection detection on AI features</li>
            <li>Access controls limiting data access to authorized personnel</li>
          </ul>
          <p>No method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.</p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-2">6. Your Rights and Choices</h2>
          <p>Depending on your location, you may have the following rights regarding your personal information:</p>
          <ul className="list-disc pl-6 space-y-1 my-2">
            <li><strong>Access</strong> — request a copy of the personal data we hold about you</li>
            <li><strong>Correction</strong> — request that we correct inaccurate or incomplete data</li>
            <li><strong>Deletion</strong> — request that we delete your personal data</li>
            <li><strong>Portability</strong> — request your data in a structured, machine-readable format</li>
            <li><strong>Objection</strong> — object to certain processing of your personal data</li>
          </ul>
          <p>To exercise any of these rights, please contact us at info@agentpilot.us. We will respond to your request within 30 days.</p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-2">7. Cookies and Tracking</h2>
          <p>AgentPilot uses session cookies and similar technologies to maintain your authenticated session and remember your preferences. We do not use third-party advertising cookies or cross-site tracking technologies. You may configure your browser to refuse cookies, but doing so may affect your ability to use certain features of the Service.</p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-2">8. Children&apos;s Privacy</h2>
          <p>The Service is intended for business professionals and is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13 without parental consent, we will take steps to delete that information promptly.</p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-2">9. International Data Transfers</h2>
          <p>AgentPilot is operated from the United States. If you are accessing the Service from outside the United States, please be aware that your information may be transferred to, stored, and processed in the United States or other countries where our service providers operate. By using the Service, you consent to the transfer of your information to these countries, which may have different data protection rules than your country of residence.</p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-2">10. Third-Party Links</h2>
          <p>The Service may contain links to third-party websites or integrate with third-party services. This Privacy Policy does not apply to those third-party sites or services, and we are not responsible for their privacy practices. We encourage you to review the privacy policies of any third-party services you use.</p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-2">11. Changes to This Privacy Policy</h2>
          <p>We may update this Privacy Policy from time to time. When we make material changes, we will notify you by updating the effective date at the top of this page and, where appropriate, by sending you an email notification. Your continued use of the Service after the effective date of the revised policy constitutes your acceptance of the changes.</p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-2">12. Contact Us</h2>
          <p>If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:</p>
          <p className="my-2">
            <strong>AgentPilot</strong><br />
            Email: <a href="mailto:info@agentpilot.us" className="text-amber-400 hover:underline">info@agentpilot.us</a><br />
            Website: <a href="https://agentpilot.us" className="text-amber-400 hover:underline" target="_blank" rel="noopener noreferrer">https://agentpilot.us</a>
          </p>
        </div>

        <p className="text-slate-500 text-sm mt-12 pt-8 border-t border-slate-700">
          © 2026 AgentPilot. All rights reserved.
        </p>
      </div>
    </main>
  );
}
