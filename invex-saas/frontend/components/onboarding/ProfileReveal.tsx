'use client';

/**
 * components/onboarding/ProfileReveal.tsx
 *
 * Animated completion screen shown when the interview finishes.
 * Shows: risk gauge, all 6 dimension scores, full user_context card,
 * and a "Go to Dashboard" CTA.
 */

import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle, Shield, TrendingUp, Clock, Users, BarChart2, Target } from 'lucide-react';
import { formatRiskLabel, riskLabelColor } from '@/lib/userContext';

interface ProfileRevealProps {
    userContext: {
        risk_score: number;
        risk_label: string;
        horizon_years: number;
        loss_tolerance_pct: number;
        income_stability: string;
        dependents: number;
        liabilities: string[];
        excluded_sectors: string[];
        preferred_sectors: string[];
        emergency_fund_months: number;
        profile_version: number;
        dimension_scores: Record<string, number>;
    };
    onContinue: () => void;
}

const card = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '20px',
};

const DIM_ICONS: Record<string, React.ReactNode> = {
    loss_tolerance:  <Shield size={14} />,
    horizon:         <Clock size={14} />,
    income_stability: <BarChart2 size={14} />,
    dependents:      <Users size={14} />,
    sectors:         <TrendingUp size={14} />,
    return_risk:     <Target size={14} />,
};

const DIM_LABELS: Record<string, string> = {
    loss_tolerance:  'Risk Tolerance',
    horizon:         'Time Horizon',
    income_stability: 'Income',
    dependents:      'Dependents',
    sectors:         'Sectors',
    return_risk:     'Return Goals',
};

function GaugeArc({ score }: { score: number }) {
    const [animated, setAnimated] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => setAnimated(score), 300);
        return () => clearTimeout(timer);
    }, [score]);

    // Semi-circle arc
    const R     = 80;
    const cx    = 110, cy = 110;
    const startAngle = Math.PI;
    const endAngle   = 0;
    const angle  = startAngle + (animated / 100) * (endAngle - startAngle) * -1;
    const x      = cx + R * Math.cos(startAngle + ((animated / 100) * Math.PI));
    const y      = cy + R * Math.sin(startAngle + ((animated / 100) * Math.PI));

    const color = riskLabelColor(score >= 65 ? 'aggressive' : score >= 45 ? 'moderate' : score >= 25 ? 'moderate_conservative' : 'conservative');

    return (
        <svg width="220" height="130" viewBox="0 0 220 130">
            {/* Track */}
            <path
                d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
                fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" strokeLinecap="round"
            />
            {/* Active arc */}
            <path
                d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${x} ${y}`}
                fill="none"
                stroke={color}
                strokeWidth="10"
                strokeLinecap="round"
                style={{ transition: 'all 1.2s cubic-bezier(0.4,0,0.2,1)' }}
            />
            {/* Score text */}
            <text x={cx} y={cy - 8} textAnchor="middle" fill="#fff" fontSize="32" fontWeight="800">
                {Math.round(animated)}
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="11">
                out of 100
            </text>
        </svg>
    );
}

export function ProfileReveal({ userContext, onContinue }: ProfileRevealProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 100);
        return () => clearTimeout(t);
    }, []);

    const label     = formatRiskLabel(userContext.risk_label);
    const labelColor = riskLabelColor(userContext.risk_label);

    return (
        <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s ease',
        }}>
            {/* ── Header ── */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(200,241,53,0.12)', border: '1px solid rgba(200,241,53,0.25)',
                    borderRadius: '999px', padding: '6px 16px', marginBottom: '16px',
                }}>
                    <CheckCircle size={14} color="#C8F135" />
                    <span style={{ fontSize: '12px', color: '#C8F135', fontWeight: 600 }}>
                        Profile Complete
                    </span>
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: 0 }}>
                    Your Risk Profile
                </h2>
                <p style={{ color: '#6B7280', fontSize: '13px', marginTop: '6px' }}>
                    Based on your {userContext.profile_version === 1 ? 'interview' : 'retake'}
                </p>
            </div>

            {/* ── Gauge ── */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
                <GaugeArc score={userContext.risk_score} />
                <span style={{
                    fontSize: '18px', fontWeight: 700, color: labelColor,
                    marginTop: '-8px', letterSpacing: '0.02em',
                }}>
                    {label}
                </span>
            </div>

            {/* ── Dimension scores ── */}
            <div style={{ ...card, marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
                    Dimension Breakdown
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {Object.entries(userContext.dimension_scores).map(([dim, score]) => (
                        <div key={dim}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
                                    {DIM_ICONS[dim]}
                                    {DIM_LABELS[dim] ?? dim}
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: score >= 80 ? '#C8F135' : '#F59E0B' }}>
                                    {Math.round(score)}%
                                </span>
                            </div>
                            <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${score}%`,
                                    background: score >= 80 ? '#C8F135' : '#F59E0B',
                                    borderRadius: '999px',
                                    transition: 'width 1s ease',
                                }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Key facts ── */}
            <div style={{ ...card, marginBottom: '20px' }}>
                <p style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
                    Your Profile
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                        { label: 'Horizon',        value: `${userContext.horizon_years}y` },
                        { label: 'Max Loss',        value: `${userContext.loss_tolerance_pct}%` },
                        { label: 'Income Type',     value: userContext.income_stability?.replace(/_/g, ' ') },
                        { label: 'Emergency Fund',  value: `${userContext.emergency_fund_months} months` },
                        { label: 'Dependents',      value: `${userContext.dependents}` },
                        { label: 'Liabilities',     value: userContext.liabilities?.length > 0 ? userContext.liabilities.join(', ').replace(/_/g, ' ') : 'None' },
                    ].map(({ label, value }) => (
                        <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '10px 12px' }}>
                            <p style={{ fontSize: '10px', color: '#6B7280', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', textTransform: 'capitalize' }}>{value}</p>
                        </div>
                    ))}
                </div>

                {/* Sector preferences */}
                {(userContext.preferred_sectors?.length > 0 || userContext.excluded_sectors?.length > 0) && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {userContext.preferred_sectors?.length > 0 && (
                            <div>
                                <span style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Preferred: </span>
                                {userContext.preferred_sectors.map(s => (
                                    <span key={s} style={{ display: 'inline-block', fontSize: '11px', background: 'rgba(200,241,53,0.12)', color: '#C8F135', borderRadius: '6px', padding: '2px 8px', margin: '2px', textTransform: 'capitalize' }}>{s}</span>
                                ))}
                            </div>
                        )}
                        {userContext.excluded_sectors?.length > 0 && (
                            <div>
                                <span style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Excluded: </span>
                                {userContext.excluded_sectors.map(s => (
                                    <span key={s} style={{ display: 'inline-block', fontSize: '11px', background: 'rgba(239,68,68,0.10)', color: '#EF4444', borderRadius: '6px', padding: '2px 8px', margin: '2px', textTransform: 'capitalize' }}>{s}</span>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── CTA ── */}
            <button
                onClick={onContinue}
                style={{
                    width: '100%', background: '#C8F135', color: '#000',
                    fontWeight: 700, fontSize: '15px', border: 'none',
                    borderRadius: '14px', padding: '15px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: '0 0 28px rgba(200,241,53,0.25)',
                    transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#bce628')}
                onMouseLeave={e => (e.currentTarget.style.background = '#C8F135')}
            >
                Go to Dashboard <ArrowRight size={16} />
            </button>
        </div>
    );
}
