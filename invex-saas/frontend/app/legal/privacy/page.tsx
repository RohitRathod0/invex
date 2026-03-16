import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { Diamond, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy — Invex AI',
  description: 'Privacy Policy for Invex AI — how we collect, use, and protect your personal data.',
};

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: `We collect the following categories of data:

Account Data: Email address, name, and password (hashed) when you register.

Profile & Preferences: Investment risk profile answers, portfolio preferences (asset types, risk tolerance, investment horizon, capital amount).

Usage Data: Pages visited, features used, AI report requests, timestamps, session durations. Collected automatically via server logs.

Financial Data (Self-Reported): Portfolio holdings you manually enter (stock symbols, quantities, buy prices). We do NOT connect to any brokerage accounts.

Device & Technical Data: IP address, browser type, operating system, and device identifiers.

What We Do NOT Collect: We do not access your bank accounts, demat accounts, or brokerage portfolios. We do not store payment card data (processed by third-party payment providers).`,
  },
  {
    title: '2. How We Use Your Information',
    body: `We use collected data to:

• Generate personalized AI portfolio recommendations
• Run risk assessment and onboarding workflows
• Send price alerts you configure
• Improve our AI models and platform features
• Send transactional emails (account, alerts, reports)
• Comply with applicable laws and prevent fraud
• Analyze aggregate usage patterns to improve UX

We do NOT sell your personal data to third parties.`,
  },
  {
    title: '3. Data Sharing',
    body: `We share your data only with:

AI/LLM Providers: Anonymized or pseudonymized prompts are sent to Groq (Meta LlaMA 3) for report generation. No personal identifiers like your name or email are included in model prompts.

Infrastructure Providers: AWS (cloud hosting), Supabase/PostgreSQL (database), Redis (caching). These providers are contractually bound to protect your data.

Legal Requirements: We may disclose data if required by law, court order, or to protect legal rights.

We do not share data with financial institutions, advertisers, or data brokers.`,
  },
  {
    title: '4. Data Retention',
    body: `Account Data: Retained until account deletion request.
Portfolio Holdings: Retained until you delete them or your account.
AI Reports & Session Logs: Retained for 90 days, then anonymized.
Price Alerts: Retained until you delete them.
Server Logs: Retained for 30 days for security purposes.

To request data deletion, email: privacy@invex.ai`,
  },
  {
    title: '5. Cookies & Tracking',
    body: `We use:

Essential Cookies: Session authentication (required for the platform to function).
Analytics Cookies: Anonymous usage statistics to improve the platform (you can opt out).

We do NOT use third-party advertising cookies or cross-site tracking technologies.`,
  },
  {
    title: '6. Security',
    body: `We implement industry-standard security measures:

• Passwords hashed with bcrypt (never stored in plain text)
• HTTPS/TLS encryption for all data in transit
• Database encryption at rest
• Rate limiting to prevent abuse
• Regular security audits

No system is 100% secure. In the event of a data breach, we will notify affected users within 72 hours as required by applicable law.`,
  },
  {
    title: '7. Your Rights',
    body: `Under applicable Indian data protection law and principles, you have the right to:

• Access: Request a copy of your personal data
• Correction: Update inaccurate or incomplete data
• Deletion: Request erasure of your account and data
• Portability: Receive your data in machine-readable format
• Objection: Opt out of certain data processing activities

To exercise these rights, contact: privacy@invex.ai`,
  },
  {
    title: '8. Children\'s Privacy',
    body: `Invex AI is not directed at individuals under 18 years of age. We do not knowingly collect personal data from minors. If you believe a minor has provided us with personal data, please contact us immediately and we will delete such information.`,
  },
  {
    title: '9. Changes to This Policy',
    body: `We may update this Privacy Policy periodically. We will notify you of material changes via email or a prominent notice on the Service. Your continued use of the Service after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: '10. Contact Us',
    body: `For privacy concerns, data requests, or questions:

Email: privacy@invex.ai
Subject line: "Privacy Request — [Your Issue]"

We aim to respond within 14 business days.`,
  },
];

export default function PrivacyPage() {
  return (
    <main style={{ background: '#0A0A0A', minHeight: '100vh', paddingBottom: '120px' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '20px 0' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 48px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{ width: '26px', height: '26px', background: '#C8F135', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Diamond size={13} color="black" fill="black" />
            </div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>Invex <span style={{ color: '#C8F135' }}>AI</span></span>
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '14px' }}>/</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Privacy Policy</span>
        </div>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '64px 48px 0' }}>
        {/* Title */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(200,241,53,0.08)', border: '1px solid rgba(200,241,53,0.2)', borderRadius: '999px', padding: '6px 14px', marginBottom: '20px' }}>
            <Shield size={13} color="#C8F135" />
            <span style={{ color: '#C8F135', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Legal</span>
          </div>
          <h1 style={{ fontSize: '42px', fontWeight: 700, color: '#fff', margin: '0 0 12px', lineHeight: 1.1 }}>
            Privacy Policy
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px', margin: 0 }}>
            Effective date: March 1, 2026 · Last updated: March 2026
          </p>
        </div>

        {/* Summary card */}
        <div style={{ background: 'rgba(200,241,53,0.05)', border: '1px solid rgba(200,241,53,0.2)', borderRadius: '14px', padding: '20px 24px', marginBottom: '40px' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', margin: 0, lineHeight: 1.65 }}>
            <span style={{ color: '#C8F135', fontWeight: 700 }}>Summary: </span>
            We collect only the data needed to run Invex AI. We don&apos;t sell your data, don&apos;t access your brokerage accounts, and don&apos;t store payment info. Your portfolio data is yours — you can delete it anytime.
          </p>
        </div>

        {/* Quick reference */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '40px' }}>
          {[
            { label: 'Data sold?', value: '❌ Never', ok: true },
            { label: 'Brokerage access?', value: '❌ Never', ok: true },
            { label: 'Ad tracking?', value: '❌ Never', ok: true },
            { label: 'Delete your data?', value: '✅ Anytime', ok: true },
          ].map((item, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</p>
              <p style={{ color: '#C8F135', fontSize: '14px', fontWeight: 600, margin: 0 }}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Sections */}
        {SECTIONS.map((section, i) => (
          <section key={i} style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 14px' }}>{section.title}</h2>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px 24px' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-line' }}>
                {section.body}
              </p>
            </div>
          </section>
        ))}

        {/* Footer links */}
        <div style={{ display: 'flex', gap: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <Link href="/legal/terms" style={{ color: '#C8F135', fontSize: '13px', textDecoration: 'none' }}>Terms of Service →</Link>
          <Link href="/legal/disclaimers" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textDecoration: 'none' }}>Disclaimers →</Link>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textDecoration: 'none' }}>← Back to Home</Link>
        </div>
      </div>
    </main>
  );
}
