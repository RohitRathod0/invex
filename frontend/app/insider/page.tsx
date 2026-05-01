'use client';
import React, { useEffect, useState, useCallback } from 'react';
import {
    Eye, TrendingUp, TrendingDown, Minus, RefreshCw,
    Search, ChevronRight, ArrowUpRight, ArrowDownRight,
    Users, DollarSign, BarChart2, Activity, AlertTriangle,
    CheckCircle2, XCircle, Info, Zap, Clock, Filter,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────
type Signal = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
type Quality = 'HIGH' | 'MEDIUM' | 'LOW';

interface WatchlistItem {
    symbol: string;
    signal: Signal;
    confidence: number;
    reason: string;
    net_flow_cr: number;
    total_trades: number;
    promoter_buying: number;
    promoter_selling: number;
    aggressive_buying: boolean;
    promoter_accumulation: boolean;
    buyers: string[];
}

interface Trade {
    id: string;
    date: string;
    person_name: string;
    person_category: string;
    designation: string;
    trade_type: string;
    quantity: number;
    price: number;
    value: number;
    value_cr: number;
    mode: string;
    post_trade_holding_pct: number;
}

interface SymbolAnalysis {
    symbol: string;
    overall_signal: Signal;
    confidence: number;
    reason: string;
    days_back: number;
    total_trades: number;
    recent_trades: Trade[];
    patterns: {
        aggressive_buying: boolean;
        promoter_accumulation: boolean;
        coordinated_selling: boolean;
        buyers: string[];
        sellers: string[];
        promoter_buying: number;
        promoter_selling: number;
        director_buying: number;
        director_selling: number;
    };
}

interface BacktestResult {
    symbol: string;
    years_back: number;
    total_insider_buys: number;
    win_rate_7d: number;
    win_rate_30d: number;
    win_rate_90d: number;
    avg_return_7d: number;
    avg_return_30d: number;
    avg_return_90d: number;
    signal_quality: Quality;
    trades: Array<{
        trade_id: string;
        date: string;
        person: string;
        category: string;
        quantity: number;
        price_at_trade: number;
        returns: { '7d': number; '30d': number; '90d': number };
    }>;
}

// ─── Style tokens ────────────────────────────────────────────────────────────
const SIGNAL_CONFIG: Record<Signal, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
    BULLISH: { color: '#C8F135', bg: 'rgba(200,241,53,0.12)', icon: <TrendingUp size={13} />, label: 'Net Buying' },
    BEARISH: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  icon: <TrendingDown size={13} />, label: 'Net Selling' },
    NEUTRAL: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: <Minus size={13} />, label: 'Neutral' },
};

const QUALITY_CONFIG: Record<Quality, { color: string; label: string }> = {
    HIGH:   { color: '#C8F135', label: 'High Match' },
    MEDIUM: { color: '#F59E0B', label: 'Medium Match' },
    LOW:    { color: '#EF4444', label: 'Low Match' },
};

const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '20px',
};

const DEFAULT_SYMBOLS = [
    'RELIANCE','TCS','INFY','HDFC','WIPRO',
    'ICICIBANK','HCLTECH','BHARTIARTL','LT','ASIANPAINT',
];

function fmt_cr(val: number) {
    if (Math.abs(val) >= 100) return `₹${val.toFixed(0)} Cr`;
    if (Math.abs(val) >= 10)  return `₹${val.toFixed(1)} Cr`;
    return `₹${val.toFixed(2)} Cr`;
}

function fmt_qty(n: number) {
    if (n >= 1e5) return `${(n / 1e5).toFixed(2)}L`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return n.toString();
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SignalBadge({ signal }: { signal: Signal }) {
    const cfg = SIGNAL_CONFIG[signal];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em',
            padding: '3px 10px', borderRadius: '999px',
            color: cfg.color, background: cfg.bg,
        }}>
            {cfg.icon} {cfg.label.toUpperCase()}
        </span>
    );
}

function ConfidenceBar({ value }: { value: number }) {
    const color = value >= 75 ? '#C8F135' : value >= 60 ? '#F59E0B' : '#EF4444';
    return (
        <div style={{ position: 'relative', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${value}%`, background: color, borderRadius: '999px', transition: 'width 0.8s ease' }} />
        </div>
    );
}

function WatchlistCard({ item, onSelect, isSelected }: { item: WatchlistItem; onSelect: () => void; isSelected: boolean }) {
    const cfg = SIGNAL_CONFIG[item.signal];
    const netPositive = item.net_flow_cr > 0;

    return (
        <div
            onClick={onSelect}
            style={{
                ...card,
                padding: '18px 20px',
                cursor: 'pointer',
                borderColor: isSelected ? cfg.color + '44' : 'rgba(255,255,255,0.08)',
                boxShadow: isSelected ? `0 0 20px ${cfg.color}18` : 'none',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {isSelected && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                    background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)`,
                }} />
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                    <p style={{ fontWeight: 700, fontSize: '15px', color: '#fff', marginBottom: '2px' }}>{item.symbol}</p>
                    <SignalBadge signal={item.signal} />
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px' }}>Net Flow</p>
                    <p style={{
                        fontSize: '14px', fontWeight: 700,
                        color: netPositive ? '#C8F135' : '#EF4444',
                        display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end',
                    }}>
                        {netPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                        {fmt_cr(Math.abs(item.net_flow_cr))}
                    </p>
                </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#6B7280' }}>Pattern Strength</span>
                    <span style={{ fontSize: '11px', color: cfg.color, fontWeight: 600 }}>{item.confidence}%</span>
                </div>
                <ConfidenceBar value={item.confidence} />
            </div>

            <p style={{ fontSize: '11px', color: '#9CA3AF', lineHeight: 1.5 }}>{item.reason}</p>

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                {item.aggressive_buying && (
                    <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '6px', background: 'rgba(200,241,53,0.1)', color: '#C8F135', fontWeight: 600 }}>
                        🔥 Cluster Buy
                    </span>
                )}
                {item.promoter_accumulation && (
                    <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '6px', background: 'rgba(168,85,247,0.12)', color: '#A855F7', fontWeight: 600 }}>
                        📈 Accumulation
                    </span>
                )}
                <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', color: '#6B7280' }}>
                    {item.total_trades} trades
                </span>
            </div>
        </div>
    );
}

function TradeRow({ trade, index }: { trade: Trade; index: number }) {
    const isBuy = trade.trade_type === 'BUY';
    const tradeDate = new Date(trade.date);
    const dateStr = tradeDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1.8fr 1.2fr 0.8fr 0.9fr 0.9fr 1fr 0.9fr',
            padding: '14px 20px',
            borderBottom: index > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            alignItems: 'center',
            fontSize: '13px',
            transition: 'background 0.15s',
        }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
            <div>
                <p style={{ fontWeight: 600, color: '#fff', marginBottom: '1px' }}>{trade.person_category}</p>
                <p style={{ fontSize: '11px', color: '#6B7280' }}>{trade.designation}</p>
            </div>
            <span style={{ fontSize: '11px', color: '#9CA3AF', padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', width: 'fit-content' }}>
                {(trade as any).insider_role || trade.person_name}
            </span>
            <span style={{
                fontWeight: 700, fontSize: '12px', padding: '3px 10px', borderRadius: '999px', width: 'fit-content',
                color: isBuy ? '#C8F135' : '#EF4444',
                background: isBuy ? 'rgba(200,241,53,0.1)' : 'rgba(239,68,68,0.1)',
            }}>
                {trade.trade_type}
            </span>
            <span style={{ color: '#D1D5DB' }}>{fmt_qty(trade.quantity)}</span>
            <span style={{ color: '#D1D5DB' }}>₹{trade.price.toFixed(0)}</span>
            <span style={{ fontWeight: 600, color: isBuy ? '#C8F135' : '#EF4444' }}>
                {fmt_cr(trade.value_cr)}
            </span>
            <span style={{ color: '#6B7280', fontSize: '12px' }}>{dateStr}</span>
        </div>
    );
}

function BacktestPanel({ data }: { data: BacktestResult }) {
    const qualityCfg = QUALITY_CONFIG[data.signal_quality];
    const metrics = [
        { label: '7-Day Win Rate', wr: data.win_rate_7d, ret: data.avg_return_7d },
        { label: '30-Day Win Rate', wr: data.win_rate_30d, ret: data.avg_return_30d },
        { label: '90-Day Win Rate', wr: data.win_rate_90d, ret: data.avg_return_90d },
    ];

    return (
        <div>
            {/* Signal quality header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>
                        Based on {data.total_insider_buys} observed patterns over {data.years_back}yr
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: qualityCfg.color }}>
                            {qualityCfg.label}
                        </span>
                        <span style={{ fontSize: '12px', color: '#6B7280' }}>Pattern Match</span>
                    </div>
                </div>
                <div style={{ fontSize: '11px', color: '#6B7280', textAlign: 'right' }}>
                    <p>Showing last {Math.min(data.total_insider_buys, 20)} patterns</p>
                </div>
            </div>

            {/* Win rate cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {metrics.map((m) => {
                    const winColor = m.wr >= 60 ? '#C8F135' : m.wr >= 50 ? '#F59E0B' : '#EF4444';
                    const retPositive = m.ret >= 0;
                    return (
                        <div key={m.label} style={{ ...card, padding: '16px', textAlign: 'center' }}>
                            <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{m.label}</p>
                            <p style={{ fontSize: '28px', fontWeight: 800, color: winColor, marginBottom: '6px', lineHeight: 1 }}>
                                {m.wr.toFixed(1)}%
                            </p>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: retPositive ? '#C8F135' : '#EF4444' }}>
                                Avg: {retPositive ? '+' : ''}{m.ret.toFixed(2)}%
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Individual trade results */}
            <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Historical Trend Outcomes
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto' }}>
                {data.trades.map((t, i) => {
                    const r30 = t.returns['30d'];
                    const isWin = r30 > 0;
                    return (
                        <div key={t.trade_id} style={{
                            display: 'grid', gridTemplateColumns: '1fr 0.7fr 0.7fr 0.7fr 0.7fr',
                            background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
                            padding: '10px 14px', gap: '8px', alignItems: 'center', fontSize: '12px',
                        }}>
                            <div>
                                <p style={{ color: '#fff', fontWeight: 500 }}>{t.person}</p>
                                <p style={{ color: '#6B7280', fontSize: '11px' }}>{t.date} · {t.category}</p>
                            </div>
                            <span style={{ color: '#9CA3AF' }}>₹{t.price_at_trade.toFixed(0)}</span>
                            {(['7d', '30d', '90d'] as const).map(h => {
                                const rv = t.returns[h];
                                const pos = rv > 0;
                                return (
                                    <span key={h} style={{ fontWeight: 600, color: pos ? '#C8F135' : '#EF4444' }}>
                                        {pos ? '+' : ''}{rv.toFixed(1)}%
                                    </span>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function InsiderTradingPage() {
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [watchlistLoading, setWatchlistLoading] = useState(true);
    const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<SymbolAnalysis | null>(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [backtest, setBacktest] = useState<BacktestResult | null>(null);
    const [backtestLoading, setBacktestLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'trades' | 'backtest'>('trades');
    const [searchQuery, setSearchQuery] = useState('');
    const [daysBack, setDaysBack] = useState(90);
    const [customSymbol, setCustomSymbol] = useState('');

    const fetchWatchlist = useCallback(async () => {
        setWatchlistLoading(true);
        try {
            const symbols = DEFAULT_SYMBOLS.join(',');
            const res = await fetch(`/api/v1/insider/watchlist?symbols=${symbols}`);
            const data = await res.json();
            setWatchlist(data.results || []);
        } catch (err) {
            console.error('Watchlist error:', err);
        } finally {
            setWatchlistLoading(false);
        }
    }, []);

    const fetchSymbolAnalysis = useCallback(async (sym: string) => {
        setAnalysisLoading(true);
        setAnalysis(null);
        setBacktest(null);
        setActiveTab('trades');
        try {
            const res = await fetch(`/api/v1/insider/trades/${sym}?days_back=${daysBack}`);
            const data = await res.json();
            setAnalysis(data);
        } catch (err) {
            console.error('Analysis error:', err);
        } finally {
            setAnalysisLoading(false);
        }
    }, [daysBack]);

    const fetchBacktest = useCallback(async (sym: string) => {
        setBacktestLoading(true);
        setBacktest(null);
        try {
            const res = await fetch(`/api/v1/insider/backtest/${sym}?years_back=2`);
            const data = await res.json();
            setBacktest(data);
        } catch (err) {
            console.error('Backtest error:', err);
        } finally {
            setBacktestLoading(false);
        }
    }, []);

    useEffect(() => { fetchWatchlist(); }, [fetchWatchlist]);

    const handleSelectSymbol = (sym: string) => {
        setSelectedSymbol(sym);
        fetchSymbolAnalysis(sym);
    };

    const handleTabChange = (tab: 'trades' | 'backtest') => {
        setActiveTab(tab);
        if (tab === 'backtest' && selectedSymbol && !backtest && !backtestLoading) {
            fetchBacktest(selectedSymbol);
        }
    };

    const handleCustomSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const sym = customSymbol.trim().toUpperCase();
        if (!sym) return;
        handleSelectSymbol(sym);
        setCustomSymbol('');
    };

    const filteredWatchlist = watchlist.filter(w =>
        w.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const signalSummary = {
        bullish: watchlist.filter(w => w.signal === 'BULLISH').length,
        bearish: watchlist.filter(w => w.signal === 'BEARISH').length,
        neutral: watchlist.filter(w => w.signal === 'NEUTRAL').length,
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff' }}>

            {/* ── Top bar ── */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 20,
                background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        width: '38px', height: '38px', borderRadius: '12px',
                        background: 'rgba(200,241,53,0.15)', border: '1px solid rgba(200,241,53,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Eye size={18} color="#C8F135" />
                    </div>
                    <div>
                        <p style={{ fontWeight: 700, fontSize: '18px', color: '#fff', lineHeight: 1.2 }}>Insider Activity Analyzer</p>
                        <p style={{ fontSize: '12px', color: '#6B7280' }}>Analyze public SEBI PIT disclosures to detect institutional and promoter trading patterns</p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                        fontSize: '11px', padding: '4px 10px', borderRadius: '999px',
                        background: 'rgba(200,241,53,0.1)', color: '#C8F135', fontWeight: 600,
                    }}>
                        SEBI PIT Regulation Data
                    </span>
                    <button
                        onClick={fetchWatchlist}
                        style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#9CA3AF', padding: '8px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                    >
                        <RefreshCw size={14} style={{ animation: watchlistLoading ? 'spin 1s linear infinite' : 'none' }} />
                        Refresh
                    </button>
                </div>
            </div>

            <div style={{ padding: '28px 40px', display: 'flex', gap: '24px' }}>

                {/* ── Left panel: Watchlist ── */}
                <div style={{ width: '340px', flexShrink: 0 }}>

                    {/* Summary pills */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        {[
                            { label: 'Net Buying', count: signalSummary.bullish, color: '#C8F135' },
                            { label: 'Net Selling', count: signalSummary.bearish, color: '#EF4444' },
                            { label: 'Neutral', count: signalSummary.neutral, color: '#F59E0B' },
                        ].map(s => (
                            <div key={s.label} style={{
                                flex: 1, ...card, padding: '10px 12px', textAlign: 'center',
                            }}>
                                <p style={{ fontSize: '20px', fontWeight: 800, color: s.color }}>{s.count}</p>
                                <p style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase' }}>{s.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Search + custom input */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Filter watchlist…"
                                style={{
                                    width: '100%', background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                                    color: '#fff', fontSize: '13px', padding: '9px 10px 9px 32px',
                                    outline: 'none',
                                }}
                            />
                        </div>
                    </div>

                    {/* Custom symbol search */}
                    <form onSubmit={handleCustomSearch} style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
                        <input
                            type="text"
                            value={customSymbol}
                            onChange={e => setCustomSymbol(e.target.value.toUpperCase())}
                            placeholder="Enter any symbol (e.g. TATAPOWER)"
                            style={{
                                flex: 1, background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                                color: '#fff', fontSize: '12px', padding: '9px 12px', outline: 'none',
                            }}
                        />
                        <button type="submit" style={{
                            background: '#C8F135', color: '#000', border: 'none', borderRadius: '10px',
                            padding: '9px 14px', fontWeight: 700, cursor: 'pointer', fontSize: '12px',
                        }}>
                            Scan
                        </button>
                    </form>

                    {/* Watchlist cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: 'calc(100vh - 320px)', overflowY: 'auto', paddingRight: '4px' }}>
                        {watchlistLoading
                            ? Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} style={{ ...card, height: '130px', animation: 'pulse 1.5s ease-in-out infinite', background: 'rgba(255,255,255,0.04)' }} />
                            ))
                            : filteredWatchlist.map(item => (
                                <WatchlistCard
                                    key={item.symbol}
                                    item={item}
                                    onSelect={() => handleSelectSymbol(item.symbol)}
                                    isSelected={selectedSymbol === item.symbol}
                                />
                            ))
                        }
                    </div>
                </div>

                {/* ── Right panel: Symbol detail ── */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {!selectedSymbol ? (
                        /* Empty state */
                        <div style={{
                            ...card, height: '500px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: '16px', color: '#4B5563',
                        }}>
                            <div style={{
                                width: '72px', height: '72px', borderRadius: '20px',
                                background: 'rgba(200,241,53,0.06)', border: '1px solid rgba(200,241,53,0.12)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Eye size={32} color="rgba(200,241,53,0.4)" />
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: '18px', fontWeight: 600, color: '#6B7280', marginBottom: '8px' }}>Select a stock to analyze</p>
                                <p style={{ fontSize: '14px', color: '#4B5563' }}>
                                    Click any card on the left or search for a symbol to view<br />
                                    insider trading patterns and backtested accuracy.
                                </p>
                            </div>
                        </div>
                    ) : analysisLoading ? (
                        <div style={{ ...card, height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{
                                width: '40px', height: '40px', border: '3px solid rgba(200,241,53,0.2)',
                                borderTopColor: '#C8F135', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                            }} />
                        </div>
                    ) : analysis ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                            {/* ── Legal Notice Banner ── */}
                            <div style={{
                                display: 'flex', alignItems: 'flex-start', gap: '12px',
                                padding: '16px 20px', borderRadius: '12px',
                                background: 'rgba(245, 158, 11, 0.08)',
                                border: '1px solid rgba(245, 158, 11, 0.2)',
                                color: '#F59E0B'
                            }}>
                                <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                                <div>
                                    <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>Important Legal Notice</h4>
                                    <p style={{ fontSize: '12px', lineHeight: 1.5, color: '#D97706' }}>
                                        This platform analyzes publicly available insider trading disclosures filed with SEBI. It does not indicate illegal insider trading activity. All insights are statistical and for educational purposes only. However, within this demo/analysis environment, all identities are strictly anonymised to prevent defamation or unwarranted allegations.
                                    </p>
                                </div>
                            </div>

                            {/* ── Signal header card ── */}
                            <div style={{
                                ...card, padding: '24px 28px',
                                borderColor: SIGNAL_CONFIG[analysis.overall_signal].color + '33',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff' }}>{analysis.symbol}</h2>
                                            <SignalBadge signal={analysis.overall_signal} />
                                        </div>
                                        <p style={{ fontSize: '14px', color: '#9CA3AF', maxWidth: '520px', lineHeight: 1.6 }}>{analysis.reason}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>Pattern Strength</p>
                                        <p style={{ fontSize: '36px', fontWeight: 800, color: SIGNAL_CONFIG[analysis.overall_signal].color, lineHeight: 1 }}>
                                            {analysis.confidence}%
                                        </p>
                                        <p style={{ fontSize: '11px', color: '#6B7280' }}>{analysis.total_trades} trades · {analysis.days_back}d window</p>
                                    </div>
                                </div>

                                {/* Pattern flags */}
                                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
                                    {analysis.patterns.aggressive_buying && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px', borderRadius: '10px', background: 'rgba(200,241,53,0.1)', border: '1px solid rgba(200,241,53,0.2)', color: '#C8F135' }}>
                                            <Zap size={12} /> Aggressive Cluster Buying
                                        </div>
                                    )}
                                    {analysis.patterns.promoter_accumulation && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px', borderRadius: '10px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', color: '#A855F7' }}>
                                            <TrendingUp size={12} /> Promoter Accumulation
                                        </div>
                                    )}
                                    {analysis.patterns.coordinated_selling && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
                                            <AlertTriangle size={12} /> Coordinated Selling Detected
                                        </div>
                                    )}
                                    {!analysis.patterns.aggressive_buying && !analysis.patterns.promoter_accumulation && !analysis.patterns.coordinated_selling && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                                            <Info size={12} /> No strong pattern detected
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── Flow metrics ── */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
                                {[
                                    {
                                        label: 'Promoter Buy',
                                        value: fmt_cr(analysis.patterns.promoter_buying / 1e7),
                                        color: '#C8F135', icon: <ArrowUpRight size={14} />,
                                    },
                                    {
                                        label: 'Promoter Sell',
                                        value: fmt_cr(analysis.patterns.promoter_selling / 1e7),
                                        color: '#EF4444', icon: <ArrowDownRight size={14} />,
                                    },
                                    {
                                        label: 'Director Buy',
                                        value: fmt_cr(analysis.patterns.director_buying / 1e7),
                                        color: '#60A5FA', icon: <Users size={14} />,
                                    },
                                    {
                                        label: 'Active Buyers',
                                        value: analysis.patterns.buyers.length.toString(),
                                        color: '#A855F7', icon: <Activity size={14} />,
                                    },
                                ].map(m => (
                                    <div key={m.label} style={{ ...card, padding: '16px 18px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                                            <span style={{ color: m.color }}>{m.icon}</span>
                                            <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</span>
                                        </div>
                                        <p style={{ fontSize: '20px', fontWeight: 800, color: m.color }}>{m.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* ── Tabs ── */}
                            <div style={{ ...card, overflow: 'hidden' }}>
                                {/* Tab bar */}
                                <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                    {(['trades', 'backtest'] as const).map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => handleTabChange(tab)}
                                            style={{
                                                padding: '14px 24px', background: 'none', border: 'none',
                                                fontSize: '13px', fontWeight: activeTab === tab ? 700 : 400,
                                                color: activeTab === tab ? '#C8F135' : '#6B7280',
                                                borderBottom: activeTab === tab ? '2px solid #C8F135' : '2px solid transparent',
                                                cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize',
                                                display: 'flex', alignItems: 'center', gap: '7px',
                                            }}
                                        >
                                            {tab === 'trades' ? <><Activity size={13} /> Trade Ledger</> : <><BarChart2 size={13} /> Signal Backtest</>}
                                        </button>
                                    ))}

                                    {/* Days picker */}
                                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px' }}>
                                        <Clock size={13} color="#6B7280" />
                                        <select
                                            value={daysBack}
                                            onChange={e => {
                                                setDaysBack(Number(e.target.value));
                                                if (selectedSymbol) fetchSymbolAnalysis(selectedSymbol);
                                            }}
                                            style={{
                                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                                color: '#9CA3AF', borderRadius: '8px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer',
                                            }}
                                        >
                                            {[30, 60, 90, 180, 365].map(d => (
                                                <option key={d} value={d}>{d} days</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Tab content */}
                                <div style={{ padding: '0' }}>
                                    {activeTab === 'trades' && (
                                        <>
                                            {/* Table header */}
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1.8fr 1.2fr 0.8fr 0.9fr 0.9fr 1fr 0.9fr',
                                                padding: '12px 20px',
                                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                                background: 'rgba(255,255,255,0.02)',
                                            }}>
                                                {['Role Category', 'Role ID', 'Type', 'Qty', 'Price', 'Value', 'Date'].map(h => (
                                                    <span key={h} style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{h}</span>
                                                ))}
                                            </div>
                                            {analysis.recent_trades.length === 0 ? (
                                                <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>No trades found in this window</div>
                                            ) : (
                                                analysis.recent_trades.map((t, i) => <TradeRow key={t.id} trade={t} index={i} />)
                                            )}
                                        </>
                                    )}

                                    {activeTab === 'backtest' && (
                                        <div style={{ padding: '24px' }}>
                                            {backtestLoading ? (
                                                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                                                    <div style={{ width: '32px', height: '32px', border: '3px solid rgba(200,241,53,0.2)', borderTopColor: '#C8F135', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                                </div>
                                            ) : backtest ? (
                                                <BacktestPanel data={backtest} />
                                            ) : (
                                                <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                                                    <BarChart2 size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                                                    <p>Loading backtest results…</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
                ::-webkit-scrollbar { width: 4px; height: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
            `}</style>
        </div>
    );
}
