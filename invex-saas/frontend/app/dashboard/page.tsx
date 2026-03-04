'use client';
import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, MessageSquare, Activity, FileText, TrendingUp, RefreshCw, CheckCircle, AlertCircle, MinusCircle, ArrowRight } from 'lucide-react';

// ─── Types ─────────────────────────────────
type Ticker = { label: string; value: string; change: string; up: boolean };

const DEFAULT_TICKERS: Ticker[] = [
    { label: 'NIFTY 50', value: '25,179', change: '-1.25%', up: false },
    { label: 'SENSEX', value: '82,400', change: '-0.89%', up: false },
    { label: 'GOLD', value: '₹73,200/10g', change: '+0.30%', up: true },
    { label: 'BTC/USD', value: '$94,500', change: '+2.10%', up: true },
];

const PORTFOLIO_DATA = [
    { name: 'Stocks', value: 45, color: '#C8F135' },
    { name: 'Mutual Funds', value: 25, color: '#3B82F6' },
    { name: 'Gold', value: 15, color: '#F59E0B' },
    { name: 'Crypto', value: 10, color: '#A855F7' },
    { name: 'Bonds', value: 5, color: '#10B981' },
];

const ANALYSES = [
    { asset: 'NIFTY 50 ETF', score: '8.4/10', risk: 'Low', rec: 'BUY', date: 'Today' },
    { asset: 'HDFC Bank', score: '7.1/10', risk: 'Medium', rec: 'HOLD', date: 'Yesterday' },
    { asset: 'Gold ETF', score: '6.8/10', risk: 'Low', rec: 'BUY', date: '2 days ago' },
    { asset: 'Reliance Ind.', score: '5.9/10', risk: 'Medium', rec: 'HOLD', date: '3 days ago' },
    { asset: 'CRYPTO BTC', score: '4.2/10', risk: 'High', rec: 'SELL', date: '4 days ago' },
];

const REC_ICON: Record<string, React.ReactNode> = {
    BUY: <CheckCircle size={13} color="#C8F135" />,
    HOLD: <MinusCircle size={13} color="#F59E0B" />,
    SELL: <AlertCircle size={13} color="#EF4444" />,
};
const REC_COLOR: Record<string, string> = { BUY: '#C8F135', HOLD: '#F59E0B', SELL: '#EF4444' };
const STAT_CARDS = [
    { icon: MessageSquare, color: '#3B82F6', label: 'Sessions', value: '12' },
    { icon: Activity, color: '#A855F7', label: 'Agent Runs', value: '45' },
    { icon: FileText, color: '#10B981', label: 'Documents', value: '8' },
];

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
    const [loading, setLoading] = useState(false);

    const fetchTickers = async () => {
        setLoading(true);
        try {
            const r = await fetch('/api/v1/market/tickers');
            const d = await r.json();
            if (d.tickers) setTickers(d.tickers);
        } catch { /* keep defaults */ }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchTickers(); }, []);

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

            {/* ── Page body — full width ── */}
            <div style={{ padding: '32px 40px' }}>

                {/* LIVE MARKETS */}
                <p style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>
                    Live Markets
                    <button onClick={fetchTickers} style={{ marginLeft: '12px', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', verticalAlign: 'middle' }}>
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
                    {STAT_CARDS.map((s, i) => (
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

                {/* PORTFOLIO + AI CTA */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>

                    {/* Portfolio Donut */}
                    <div style={{ ...card, padding: '28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ fontWeight: 600, fontSize: '16px', color: '#fff' }}>Portfolio Allocation</h3>
                            <span style={{ fontSize: '11px', color: '#6B7280', background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: '999px' }}>Sample</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                            <div style={{ width: '160px', height: '160px', flexShrink: 0 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={PORTFOLIO_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" strokeWidth={0}>
                                            {PORTFOLIO_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {PORTFOLIO_DATA.map((d, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                                            <span style={{ color: '#9CA3AF' }}>{d.name}</span>
                                        </div>
                                        <span style={{ color: '#fff', fontWeight: 600 }}>{d.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

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
                    {ANALYSES.map((row, i) => (
                        <div key={i} style={{
                            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                            padding: '16px 24px',
                            borderBottom: i < ANALYSES.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
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
                    ))}
                </div>
            </div>
        </div>
    );
}
