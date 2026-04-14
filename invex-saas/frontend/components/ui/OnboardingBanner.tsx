"use client";

/**
 * components/ui/OnboardingBanner.tsx
 *
 * Smart banner that uses the new /risk/profile endpoint.
 * Shows "Complete your risk profile" if profile doesn't exist or is stale (> 30 days).
 * Shows "Profile Active" chip when profile is fresh.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, X, ShieldCheck, RefreshCw } from 'lucide-react';
import { formatRiskLabel, riskLabelColor } from '@/lib/userContext';

export const OnboardingBanner = () => {
    const [state, setState] = useState<'loading' | 'missing' | 'stale' | 'fresh' | 'hidden'>('loading');
    const [profile, setProfile] = useState<{ risk_label: string; risk_score: number; profile_version: number; days_since_update?: number } | null>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const userId = localStorage.getItem('invex_user_id') || '0000-user';

        (async () => {
            try {
                const [refreshRes, profileRes] = await Promise.all([
                    fetch(`/api/v1/risk/profile/${userId}/needs_refresh`),
                    fetch(`/api/v1/risk/profile/${userId}`),
                ]);

                const refreshData = await refreshRes.json();
                const profileData = await profileRes.json();

                if (!profileData.exists) {
                    setState('missing');
                    return;
                }

                const ctx = profileData.user_context;
                setProfile({
                    risk_label:       ctx.risk_label,
                    risk_score:       ctx.risk_score,
                    profile_version:  ctx.profile_version,
                    days_since_update: refreshData.days_since_update,
                });

                setState(refreshData.needs_refresh ? 'stale' : 'fresh');
            } catch {
                setState('hidden');
            }
        })();
    }, []);

    if (state === 'loading' || state === 'hidden' || dismissed) return null;

    // ── Fresh profile — show compact green status chip ──────────────────────
    if (state === 'fresh' && profile) {
        const color = riskLabelColor(profile.risk_label);
        return (
            <div style={{ margin: '16px 32px 0' }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: `${color}12`,
                    border: `1px solid ${color}30`,
                    borderRadius: '999px', padding: '6px 14px',
                }}>
                    <ShieldCheck size={13} color={color} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color }}>
                        {formatRiskLabel(profile.risk_label)} · Score {profile.risk_score?.toFixed(0)}/100
                    </span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginLeft: '4px' }}>
                        v{profile.profile_version} · {profile.days_since_update}d ago
                    </span>
                    <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: '0 2px', display: 'flex' }}>
                        <X size={11} />
                    </button>
                </div>
            </div>
        );
    }

    // ── Stale profile — prompt retake ────────────────────────────────────────
    if (state === 'stale' && profile) {
        return (
            <div style={{ margin: '16px 32px 0' }}>
                <div style={{
                    padding: '14px 18px',
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.25)',
                    borderRadius: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: 'rgba(245,158,11,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                            <RefreshCw size={16} color="#F59E0B" />
                        </div>
                        <div>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0 }}>
                                Your risk profile is {profile.days_since_update} days old
                            </p>
                            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>
                                Markets change. A quick 4–6 question retake keeps your AI personalised.
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <Link href="/onboarding" style={{
                            fontSize: '12px', fontWeight: 700, background: '#F59E0B', color: '#000',
                            borderRadius: '10px', padding: '8px 16px', textDecoration: 'none',
                        }}>
                            Retake →
                        </Link>
                        <button onClick={() => setDismissed(true)} style={{
                            background: 'none', border: 'none', cursor: 'pointer', color: '#4B5563',
                            padding: '6px', display: 'flex',
                        }}>
                            <X size={14} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Missing profile — full prompt ────────────────────────────────────────
    return (
        <div style={{ margin: '16px 32px 0' }}>
            <div style={{
                padding: '14px 18px',
                background: 'linear-gradient(135deg, rgba(200,241,53,0.08) 0%, rgba(59,130,246,0.08) 100%)',
                border: '1px solid rgba(200,241,53,0.2)',
                borderRadius: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '38px', height: '38px', borderRadius: '11px',
                        background: 'rgba(200,241,53,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <Sparkles size={17} color="#C8F135" />
                    </div>
                    <div>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0 }}>
                            Build your investor risk profile
                        </p>
                        <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>
                            8–12 voice questions · AI personalises every recommendation to you
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <Link href="/onboarding" style={{
                        fontSize: '12px', fontWeight: 700, background: '#C8F135', color: '#000',
                        borderRadius: '10px', padding: '8px 16px', textDecoration: 'none',
                        boxShadow: '0 0 16px rgba(200,241,53,0.2)',
                    }}>
                        Start Now →
                    </Link>
                    <button onClick={() => setDismissed(true)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: '#4B5563',
                        padding: '6px', display: 'flex',
                    }}>
                        <X size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};
