'use client';

/**
 * components/dashboard/RiskProfileCard.tsx
 *
 * Dashboard widget showing the user's active risk profile at a glance.
 * Reads from UserContext (cache-first). If no profile yet, shows a CTA.
 */

import Link from 'next/link';
import { Shield, Clock, TrendingUp, ArrowRight, RefreshCw } from 'lucide-react';
import { useUserContext, formatRiskLabel, riskLabelColor } from '@/lib/userContext';

const card = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '20px',
} as const;

export function RiskProfileCard() {
    const { profile, loading, hasProfile } = useUserContext();

    if (loading) {
        return (
            <div style={{ ...card, padding: '28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '18px', height: '18px', border: '2px solid rgba(200,241,53,0.3)', borderTopColor: '#C8F135', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ color: '#4B5563', fontSize: '14px' }}>Loading profile…</span>
                <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!hasProfile || !profile) {
        return (
            <div style={{
                borderRadius: '20px', padding: '28px',
                background: 'linear-gradient(135deg, rgba(200,241,53,0.06) 0%, rgba(59,130,246,0.06) 100%)',
                border: '1px solid rgba(200,241,53,0.15)',
                display: 'flex', flexDirection: 'column', gap: '12px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(200,241,53,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Shield size={18} color="#C8F135" />
                    </div>
                    <div>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>No risk profile yet</p>
                        <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0' }}>AI can't personalise without it</p>
                    </div>
                </div>
                <Link href="/onboarding" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: '#C8F135', color: '#000', fontWeight: 700, fontSize: '13px',
                    borderRadius: '10px', padding: '10px 18px', textDecoration: 'none', width: 'fit-content',
                }}>
                    Build Profile <ArrowRight size={13} />
                </Link>
            </div>
        );
    }

    const color       = riskLabelColor(profile.risk_label);
    const label       = formatRiskLabel(profile.risk_label);
    const scoreWidth  = `${profile.risk_score}%`;
    const isStale     = profile.last_updated
        ? (Date.now() - new Date(profile.last_updated).getTime()) > 30 * 24 * 3600 * 1000
        : false;

    return (
        <div style={{ ...card, padding: '24px', position: 'relative', overflow: 'hidden' }}>
            {/* Ambient glow */}
            <div style={{
                position: 'absolute', top: '-30px', right: '-30px',
                width: '120px', height: '120px',
                background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
                pointerEvents: 'none',
            }} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: `${color}18`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Shield size={18} color={color} />
                    </div>
                    <div>
                        <p style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Risk Profile</p>
                        <p style={{ fontSize: '16px', fontWeight: 700, color, margin: '2px 0 0' }}>{label}</p>
                    </div>
                </div>
                {isStale && (
                    <Link href="/onboarding" title="Update profile" style={{ color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', textDecoration: 'none' }}>
                        <RefreshCw size={11} /> Refresh
                    </Link>
                )}
            </div>

            {/* Score bar */}
            <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#6B7280' }}>Risk Score</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color }}>{profile.risk_score.toFixed(0)}<span style={{ color: '#4B5563', fontWeight: 400 }}>/100</span></span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: scoreWidth, background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: '999px', transition: 'width 1s ease' }} />
                </div>
            </div>

            {/* Key facts row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                {[
                    { icon: <Clock size={12} />, label: 'Horizon', value: `${profile.horizon_years}y` },
                    { icon: <Shield size={12} />, label: 'Max Loss', value: `${profile.loss_tolerance_pct}%` },
                    { icon: <TrendingUp size={12} />, label: 'Income', value: profile.income_stability?.split('_')[0] ?? '—' },
                ].map(({ icon, label: l, value }) => (
                    <div key={l} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', color: '#6B7280', marginBottom: '3px' }}>{icon}</div>
                        <p style={{ fontSize: '10px', color: '#6B7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</p>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: '2px 0 0', textTransform: 'capitalize' }}>{value}</p>
                    </div>
                ))}
            </div>

            {/* Sector preferences */}
            {(profile.preferred_sectors?.length > 0 || profile.excluded_sectors?.length > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {profile.preferred_sectors?.slice(0, 3).map(s => (
                        <span key={s} style={{ fontSize: '10px', background: 'rgba(200,241,53,0.10)', color: '#C8F135', borderRadius: '6px', padding: '3px 8px', textTransform: 'capitalize' }}>
                            ✓ {s}
                        </span>
                    ))}
                    {profile.excluded_sectors?.slice(0, 2).map(s => (
                        <span key={s} style={{ fontSize: '10px', background: 'rgba(239,68,68,0.08)', color: '#EF4444', borderRadius: '6px', padding: '3px 8px', textTransform: 'capitalize' }}>
                            ✕ {s}
                        </span>
                    ))}
                </div>
            )}

            {/* Version + date footer */}
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#4B5563' }}>v{profile.profile_version}</span>
                <span style={{ fontSize: '11px', color: '#4B5563' }}>Updated {profile.last_updated}</span>
            </div>
        </div>
    );
}
