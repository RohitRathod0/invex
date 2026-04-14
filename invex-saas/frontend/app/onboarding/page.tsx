'use client';

/**
 * app/onboarding/page.tsx (v4 — Immersive Dribbble Dark UI)
 *
 * Full-bleed dark environment as per the new neon waveform reference.
 * Completely rips out the previous lavender glass card to allow for
 * edge-to-edge organic waveforms.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VoiceInterview } from '@/components/onboarding/VoiceInterview';

type CheckResult = {
  needs_refresh: boolean;
  is_retake:     boolean;
  prior_profile: Record<string, unknown> | null;
};

export default function OnboardingPage() {
  const [status,   setStatus]   = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('invex_user_id') || '0000-user';
    (async () => {
      try {
        const refreshRes  = await fetch(`/api/v1/risk/profile/${userId}/needs_refresh`);
        const refreshData = await refreshRes.json();
        if (!refreshData.needs_refresh) { window.location.href = '/dashboard'; return; }
        const profileRes  = await fetch(`/api/v1/risk/profile/${userId}`);
        const profileData = await profileRes.json();
        setStatus({ needs_refresh: true, is_retake: profileData.exists, prior_profile: profileData.user_context ?? null });
      } catch {
        setStatus({ needs_refresh: true, is_retake: false, prior_profile: null });
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  if (checking) {
    return (
      <div style={shell}>
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#00F2FE', filter: 'blur(15px)' }}
        />
      </div>
    );
  }

  if (!status?.needs_refresh) return null;

  return (
    <div style={shell}>
      <AnimatePresence>
        <motion.div
          key="onboarding-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
        >
          <VoiceInterview
            userId={typeof window !== 'undefined' ? (localStorage.getItem('invex_user_id') || '0000-user') : '0000-user'}
            isRetake={status.is_retake}
            priorProfile={status.prior_profile}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const shell: React.CSSProperties = {
  minHeight:      '100vh',
  width:          '100vw',
  background:     '#020205',
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'center',
  position:       'relative',
  overflow:       'hidden',
  color:          '#ffffff',
};
