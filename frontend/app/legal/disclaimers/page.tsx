import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { Diamond, AlertTriangle, FileText, Scale } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Investment Disclaimers — Invex AI',
  description: 'Full investment disclaimer, risk disclosures, SEBI compliance notice, and data attribution for Invex AI.',
};

const WARNING_ITEMS = [
  { icon: '⚠️', text: 'AI-Generated for Educational Purposes Only — Not financial advice' },
  { icon: '🚫', text: 'Not a SEBI Registered Investment Advisor (RIA)' },
  { icon: '📉', text: 'Past Performance does NOT guarantee Future Results' },
  { icon: '👤', text: 'Consult a Certified Financial Planner (CFP) before investing' },
  { icon: '🔖', text: 'All recommendations are algorithmic and may contain errors' },
  { icon: '🏦', text: 'Invex AI does not hold, manage or custody any user funds' },
];

const RISK_ITEMS = [
  'Market Risk — Stock prices can decline significantly due to factors outside your control.',
  'Liquidity Risk — Some securities may be difficult to sell at quoted prices.',
  'Concentration Risk — Concentrating capital in few stocks can amplify losses.',
  'AI Model Risk — Machine learning models can produce incorrect or biased outputs.',
  'Regulatory Risk — Changes in SEBI regulations can affect investment outcomes.',
  'Currency Risk — International investments carry foreign exchange exposure.',
  'Inflation Risk — Returns may not keep pace with inflation over time.',
  'Technology Risk — System outages or data errors may affect recommendations.',
];

const DATA_SOURCES = [
  { name: 'Yahoo Finance (yfinance)', use: 'Historical stock price data, market indices' },
  { name: 'Alpha Vantage', use: 'Real-time equity data and fundamentals (backup source)' },
  { name: 'NSE India', use: 'National Stock Exchange live market data' },
  { name: 'BSE India', use: 'Bombay Stock Exchange supplementary data' },
  { name: 'Groq / Meta LlaMA 3', use: 'AI language model for report generation' },
  { name: 'CoinGecko', use: 'Cryptocurrency pricing and market data' },
];

export default function DisclaimersPage() {
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
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Disclaimers</span>
        </div>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '64px 48px 0' }}>
        {/* Title */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(200,241,53,0.08)', border: '1px solid rgba(200,241,53,0.2)', borderRadius: '999px', padding: '6px 14px', marginBottom: '20px' }}>
            <AlertTriangle size={13} color="#C8F135" />
            <span style={{ color: '#C8F135', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Important Disclosures</span>
          </div>
          <h1 style={{ fontSize: '42px', fontWeight: 700, color: '#fff', margin: '0 0 12px', lineHeight: 1.1 }}>
            Investment Disclaimers & Risk Disclosures
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px', margin: 0 }}>
            Last updated: March 2026 · Please read carefully before using Invex AI.
          </p>
        </div>

        {/* Critical Warning Box */}
        <div style={{ background: 'rgba(200,241,53,0.05)', border: '1px solid rgba(200,241,53,0.2)', borderRadius: '16px', padding: '28px', marginBottom: '48px' }}>
          <h2 style={{ color: '#C8F135', fontSize: '16px', fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} /> Critical Notices
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {WARNING_ITEMS.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', margin: 0, lineHeight: 1.55 }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sections */}
        {[
          {
            icon: <Scale size={18} color="#C8F135" />,
            title: '1. SEBI Compliance Notice',
            content: (
              <>
                <p style={ps}>Invex AI is an AI-powered financial information platform. <strong style={{ color: '#fff' }}>We are NOT registered with the Securities and Exchange Board of India (SEBI)</strong> as a Research Analyst (RA), Investment Adviser (IA), or any other regulated category under applicable Indian securities laws.</p>
                <p style={ps}>All content, recommendations, analyses, and reports generated by Invex AI are produced by artificial intelligence models for <strong style={{ color: '#fff' }}>general informational and educational purposes only</strong>. They do not constitute investment advice, research, solicitation, or an offer to buy or sell any securities.</p>
                <p style={ps}>Users are strongly advised to consult a SEBI-registered financial advisor before making any investment decisions.</p>
              </>
            ),
          },
          {
            icon: <FileText size={18} color="#C8F135" />,
            title: '2. AI-Generated Content Disclaimer',
            content: (
              <>
                <p style={ps}>All portfolio recommendations, stock analyses, market insights, and financial reports on this platform are generated by large language models (LLMs) including Meta&apos;s LlaMA 3. These AI systems:</p>
                <ul style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: '16px 0' }}>
                  <li>Can hallucinate or fabricate financial data</li>
                  <li>Do not have real-time market knowledge</li>
                  <li>Cannot account for individual financial circumstances</li>
                  <li>May reflect biases present in training data</li>
                  <li>Are not a substitute for professional financial analysis</li>
                </ul>
                <p style={ps}>Invex AI makes no warranty, express or implied, about the accuracy, completeness, or timeliness of any AI-generated content.</p>
              </>
            ),
          },
          {
            icon: <AlertTriangle size={18} color="#C8F135" />,
            title: '3. Risk Disclosures',
            content: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {RISK_ITEMS.map((risk, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ color: '#C8F135', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>0{i + 1}</span>
                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>{risk}</p>
                  </div>
                ))}
              </div>
            ),
          },
          {
            icon: <FileText size={18} color="#C8F135" />,
            title: '4. Data Sources Attribution',
            content: (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <th style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 600, textAlign: 'left', padding: '10px 16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data Provider</th>
                      <th style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 600, textAlign: 'left', padding: '10px 16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Usage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DATA_SOURCES.map((src, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ color: '#C8F135', fontSize: '13px', fontWeight: 500, padding: '12px 16px' }}>{src.name}</td>
                        <td style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', padding: '12px 16px' }}>{src.use}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ),
          },
        ].map((section, i) => (
          <section key={i} style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {section.icon} {section.title}
            </h2>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '24px' }}>
              {section.content}
            </div>
          </section>
        ))}

        {/* Footer links */}
        <div style={{ display: 'flex', gap: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <Link href="/legal/terms" style={{ color: '#C8F135', fontSize: '13px', textDecoration: 'none' }}>Terms of Service →</Link>
          <Link href="/legal/privacy" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textDecoration: 'none' }}>Privacy Policy →</Link>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textDecoration: 'none' }}>← Back to Home</Link>
        </div>
      </div>
    </main>
  );
}

const ps: React.CSSProperties = { color: 'rgba(255,255,255,0.6)', fontSize: '14px', lineHeight: 1.75, margin: '0 0 14px' };
