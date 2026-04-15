'use client';
import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, MessageSquare, Activity, FileText, TrendingUp, RefreshCw, CheckCircle, AlertCircle, MinusCircle, ArrowRight } from 'lucide-react';
import { OnboardingBanner } from '@/components/ui/OnboardingBanner';
import { RiskProfileCard } from '@/components/dashboard/RiskProfileCard';

// ─── Types ─────────────────────────────────
type Ticker = { label: string; value: string; change: string; up: boolean };

const DEFAULT_TICKERS: Ticker[] = [
    { label: 'NIFTY 50', value: '25,179', change: '-1.25%', up: false },
    { label: 'SENSEX', value: '82,400', change: '-0.89%', up: false },
    { label: 'GOLD', value: '₹73,200/10g', change: '+0.30%', up: true },
    { label: 'BTC/USD', value: '$94,500', change: '+2.10%', up: true },
];

const REC_ICON: Record<string, React.ReactNode> = {
    BUY: <CheckCircle size={13} color="#C8F135" />,
    HOLD: <MinusCircle size={13} color="#F59E0B" />,
    SELL: <AlertCircle size={13} color="#EF4444" />,
};
const REC_COLOR: Record<string, string> = { BUY: '#C8F135', HOLD: '#F59E0B', SELL: '#EF4444' };

// Card style
const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '20px',
};

export default function DashboardPage() {
    const [tickers, setTickers] = useState<Ticker[]>(DEFAULT_TICKERS);
    const [stats, setStats] = useState({ sessions: 0, agentRuns: 0, documents: 0 });
    const [analyses, setAnalyses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Tickers
            const rTickers = await fetch('/api/v1/market/tickers');
            if (rTickers.ok) {
                const d = await rTickers.json();
                if (d.tickers) setTickers(d.tickers);
            }
            // Realistically we will fetch from summary or specific endpoints:
            // Fetch Sessions
            const rSessions = await fetch('/api/v1/sessions/');
            const dSessions = rSessions.ok ? await rSessions.json() : { total: 0 };
            
            // Fetch Documents
            const rDocs = await fetch('/api/v1/documents/');
            const dDocs = rDocs.ok ? await rDocs.json() : { total: 0 };

            // We default agent runs to 0 until an endpoint specifically tracks agent executions.
            setStats({
                sessions: dSessions.total || 0,
                agentRuns: 0,
                documents: dDocs.total || 0,
            });

            // If there's an endpoint for analyses, fetch it here
            // Currently assuming it starts empty dynamically as requested
            setAnalyses([]); 
        } catch (err) { 
            console.error(err);
        } finally { 
            setLoading(false); 
        }
    };
    useEffect(() => { fetchData(); }, []);

    const statCardsData = [
        { icon: MessageSquare, color: '#3B82F6', label: 'Sessions', value: stats.sessions },
        { icon: Activity, color: '#A855F7', label: 'Agent Runs', value: stats.agentRuns },
        { icon: FileText, color: '#10B981', label: 'Documents', value: stats.documents },
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff' }}>

            {/* ── Top bar ── */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 20,
                background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <div>
                    <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '2px' }}>Welcome back,</p>
                    <p style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>
                        Good afternoon, <span style={{ color: '#C8F135' }}>Rohit!</span>
                    </p>
                </div>
                <a href="/analysis" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: '#C8F135', color: '#000', fontWeight: 700,
                    borderRadius: '12px', padding: '10px 22px', textDecoration: 'none',
                    fontSize: '14px', boxShadow: '0 0 24px rgba(200,241,53,0.3)'
                }}>
                    + New Analysis
                </a>
            </div>

            {/* ── Onboarding Banner (shows if profile not set) ── */}
            <OnboardingBanner />

            {/* ── Page body — full width ── */}
            <div style={{ padding: '32px 40px' }}>

                {/* LIVE MARKETS */}
                <p style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>
                    Live Markets
                    <button onClick={fetchData} style={{ marginLeft: '12px', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', verticalAlign: 'middle' }}>
                        <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                    </button>
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    {tickers.map((t, i) => (
                        <div key={i} style={{ ...card, padding: '22px 20px' }}>
                            <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.label}</p>
                            <p style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{t.value}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, color: t.up ? '#C8F135' : '#EF4444' }}>
                                {t.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {t.change}
                            </div>
                        </div>
                    ))}
                </div>

                {/* STATS ROW */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
                    {statCardsData.map((s, i) => (
                        <div key={i} style={{ ...card, padding: '22px 20px', display: 'flex', alignItems: 'center', gap: '18px' }}>
                            <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: `${s.color}18`, border: `1px solid ${s.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <s.icon size={20} color={s.color} />
                            </div>
                            <div>
                                <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</p>
                                <p style={{ fontSize: '28px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{s.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* RISK PROFILE + AI CTA */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>

                    {/* Risk Profile Card — reads from UserContext, zero fetch */}
                    <RiskProfileCard />

                    {/* AI Agent CTA */}
                    <div style={{
                        borderRadius: '20px', padding: '32px',
                        background: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        position: 'relative', overflow: 'hidden'
                    }}>
                        {/* Decorative glow */}
                        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
                        <div style={{ position: 'absolute', bottom: '-30px', left: '30px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', borderRadius: '999px', padding: '4px 12px', marginBottom: '20px' }}>
                                <TrendingUp size={12} color="#fff" />
                                <span style={{ fontSize: '11px', color: '#fff', fontWeight: 600 }}>AI Investment Agent</span>
                            </div>
                            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: '12px' }}>
                                Ready to build your portfolio?
                            </h3>
                            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: '24px' }}>
                                Get AI-powered analysis with real NSE data, geo-political signals and macroeconomic insights from 4 specialized agents.
                            </p>
                        </div>
                        <a href="/analysis" style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            background: '#fff', color: '#2563EB', fontWeight: 700,
                            borderRadius: '999px', padding: '12px 24px', textDecoration: 'none',
                            fontSize: '14px', width: 'fit-content', position: 'relative', zIndex: 1
                        }}>
                            Start Analysis <ArrowRight size={15} />
                        </a>
                    </div>
                </div>

                {/* RECENT ANALYSES */}
                <div style={{ ...card, padding: '0', overflow: 'hidden' }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <h3 style={{ fontWeight: 600, fontSize: '16px', color: '#fff' }}>Recent Analyses</h3>
                    </div>
                    {/* Table header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {['Stock / Asset', 'AI Score', 'Risk Level', 'Recommendation', 'Date'].map(h => (
                            <span key={h} style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</span>
                        ))}
                    </div>
                    {analyses.length === 0 ? (
                        <div style={{ padding: '32px 24px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
                            No analysis has been run yet. Click "+ New Analysis" to start building your portfolio.
                        </div>
                    ) : (
                        analyses.map((row, i) => (
                            <div key={i} style={{
                                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                                padding: '16px 24px',
                                borderBottom: i < analyses.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                alignItems: 'center'
                            }}>
                                <span style={{ fontSize: '14px', fontWeight: 500, color: '#fff' }}>{row.asset}</span>
                                <span style={{ fontSize: '14px', color: '#9CA3AF' }}>{row.score}</span>
                                <span style={{
                                    display: 'inline-block', fontSize: '12px', fontWeight: 500,
                                    padding: '3px 10px', borderRadius: '999px', width: 'fit-content',
                                    background: row.risk === 'Low' ? 'rgba(16,185,129,0.12)' : row.risk === 'Medium' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                                    color: row.risk === 'Low' ? '#10B981' : row.risk === 'Medium' ? '#F59E0B' : '#EF4444',
                                }}>{row.risk}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: REC_COLOR[row.rec] }}>
                                    {REC_ICON[row.rec]} {row.rec}
                                </div>
                                <span style={{ fontSize: '13px', color: '#6B7280' }}>{row.date}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
