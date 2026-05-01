'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, X } from 'lucide-react';

export function DisclaimerBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = sessionStorage.getItem('invex_disclaimer_dismissed');
    if (stored === 'true') setDismissed(true);
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('invex_disclaimer_dismissed', 'true');
    setDismissed(true);
  };

  if (!mounted || dismissed) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'rgba(10,10,10,0.97)',
        borderTop: '1px solid rgba(200,241,53,0.25)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        padding: '12px 24px',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'rgba(200,241,53,0.12)',
            border: '1px solid rgba(200,241,53,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={14} color="#C8F135" />
        </div>

        {/* Disclaimer text */}
        <p style={{ flex: 1, fontSize: '12px', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.5 }}>
          <span style={{ color: '#C8F135', fontWeight: 600 }}>AI-Generated for Educational Purposes Only.</span>{' '}
          Invex AI is{' '}
          <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
            NOT a SEBI Registered Investment Advisor.
          </span>{' '}
          Past performance ≠ future results. Consult a certified financial advisor before making any investment
          decisions.{' '}
          <Link
            href="/legal/disclaimers"
            style={{ color: '#C8F135', textDecoration: 'underline', textUnderlineOffset: '3px' }}
          >
            Full Disclaimer
          </Link>{' '}
          ·{' '}
          <Link
            href="/legal/terms"
            style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'underline', textUnderlineOffset: '3px' }}
          >
            Terms
          </Link>{' '}
          ·{' '}
          <Link
            href="/legal/privacy"
            style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'underline', textUnderlineOffset: '3px' }}
          >
            Privacy
          </Link>
        </p>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss disclaimer"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            flexShrink: 0,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#fff';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.25)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)';
          }}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
