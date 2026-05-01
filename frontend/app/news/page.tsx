'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    RefreshCw, Globe2, TrendingUp, TrendingDown, MinusCircle,
    Zap, Clock, AlertTriangle, CheckCircle2, Newspaper, AtSign, Send, X,
    Globe, Flag, Coins, BarChart3, User
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface NewsCache {
    date: string; result: string; timestamp: string; status: 'success' | 'failed';
}

interface ParsedItem {
    headline: string; summary: string; markets: string;
    signal: 'BUY' | 'SELL' | 'HOLD' | null;
    impact: 'positive' | 'negative' | 'neutral';
    category: 'global' | 'india' | 'commodities' | 'crypto' | 'movers';
    sourceLabel: string;
}

type TabId = 'all' | 'global' | 'india' | 'commodities' | 'crypto' | 'movers';

// ─── Category source maps ─────────────────────────────────────────────────────
const GLOBAL_SOURCES  = new Set(["S&P500","Nasdaq","Dow Jones","ECB","BOJ/Yen","China PMI","China Trade","China Markets","DXY/Dollar","EM Flows","Nvidia/AI","Apple/MSFT","Global Tech","IMF/WB","Russia-Ukraine","Middle East","US-China Trade","Fed/Powell"]);
const INDIA_SOURCES   = new Set(["RBI Policy","FII/DII Flows","India VIX","Rupee/Dollar","CPI/WPI","GDP/IIP","GST Data","Monsoon","Banking","IT/Tech","Pharma","FMCG","Auto/EV","Energy","Metals/Mining","Real Estate","Telecom","Chemicals","Defence","Aviation","Retail/Ecomm","Fintech/NBFC","Insurance","Media/OTT","Nifty50","Sensex","HDFC Bank","Infosys","Reliance"]);
const COMMODITIES_SOURCES = new Set(["Gold","Crude/OPEC","Crude Oil","Bond Yields","Monsoon"]);
const CRYPTO_SOURCES  = new Set(["Bitcoin","Ethereum","Crypto"]);
const MOVER_SOURCES   = new Set(["Powell/Fed","Fed/Powell","Dimon/JPMorgan","Buffett","Musk","Fink/BlackRock","Sitharaman","RBI Governor","India Experts"]);

// ─── Category detection ───────────────────────────────────────────────────────
function detectCategory(raw: string): { category: ParsedItem['category']; sourceLabel: string } {
    const srcMatch = raw.match(/^\[([^\]]+)\]/);
    const source = srcMatch ? srcMatch[1] : '';
    const text = raw.toLowerCase();

    if (MOVER_SOURCES.has(source) || /powell|dimon|buffett|musk|sitharaman|fink|malhotra|blackrock|jpmorgan|berkshire/.test(text))
        return { category: 'movers', sourceLabel: source };
    if (CRYPTO_SOURCES.has(source) || /bitcoin|ethereum|crypto|btc\b|eth\b|blockchain|defi/.test(text))
        return { category: 'crypto', sourceLabel: source };
    if (COMMODITIES_SOURCES.has(source) || /crude oil|opec|gold price|bond yield|monsoon|commodity/.test(text))
        return { category: 'commodities', sourceLabel: source };
    if (GLOBAL_SOURCES.has(source) || /s&p|nasdaq|dow jones|ecb|boj|china pmi|dxy|nvidia|nvidea|apple inc|microsoft|imf|world bank|wall street|emerging market/.test(text))
        return { category: 'global', sourceLabel: source };
    return { category: 'india', sourceLabel: source };
}

// ─── Cache helpers ────────────────────────────────────────────────────────────
const CACHE_KEY = 'invex_news_cache';
function todayStr() { return new Date().toLocaleDateString('en-CA'); }
function loadCache(): NewsCache | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const cache: NewsCache = JSON.parse(raw);
        return cache.date === todayStr() ? cache : null;
    } catch { return null; }
}
function saveCache(result: string, status: 'success' | 'failed') {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ date: todayStr(), result, timestamp: new Date().toISOString(), status }));
}

// ─── Parse raw markdown ───────────────────────────────────────────────────────
function parseNews(raw: string): ParsedItem[] {
    const items: ParsedItem[] = [];
    const blocks = raw.split(/\n(?=\d+\.\s)/).filter(Boolean);
    for (const block of blocks) {
        const lines = block.split('\n').filter(l => l.trim());
        if (!lines.length) continue;
        const rawLine = lines[0].replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').trim();
        const headline = rawLine.replace(/^\[[^\]]+\]\s*/, '').trim() || rawLine;
        const summary = lines.slice(1, 3).join(' ').replace(/\*\*/g, '').trim();
        const marketLine = lines.find(l => /market|stock|gold|crypto|bond|nifty|sensex/i.test(l)) || '';
        const text = block.toUpperCase();
        let signal: ParsedItem['signal'] = null;
        if (text.includes('BUY')) signal = 'BUY';
        else if (text.includes('SELL')) signal = 'SELL';
        else if (text.includes('HOLD')) signal = 'HOLD';
        const neg = /decline|drop|fall|negative|bearish|war|conflict|risk|sanction/i.test(block);
        const pos = /rise|surge|rally|positive|bullish|grow|opportunity|strong/i.test(block);
        const impact: ParsedItem['impact'] = pos && !neg ? 'positive' : neg ? 'negative' : 'neutral';
        const { category, sourceLabel } = detectCategory(rawLine);
        if (headline && headline.length > 4) {
            items.push({ headline, summary: summary || '—', markets: marketLine, signal, impact, category, sourceLabel });
        }
    }
    return items;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SIGNAL_CFG = {
    BUY:  { color: '#C8F135', bg: 'rgba(200,241,53,0.12)',  border: 'rgba(200,241,53,0.25)',  Icon: TrendingUp,   label: 'BUY'  },
    SELL: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)',   Icon: TrendingDown, label: 'SELL' },
    HOLD: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)',  Icon: MinusCircle,  label: 'HOLD' },
} as const;

const IMPACT_COLORS = { positive: '#C8F135', negative: '#EF4444', neutral: '#9CA3AF' };

const CATEGORY_CFG: Record<TabId, { label: string; Icon: React.ElementType; color: string; accent: string }> = {
    all:         { label: 'All News',       Icon: Newspaper,  color: '#9CA3AF', accent: 'rgba(156,163,175,0.15)' },
    global:      { label: 'Global',         Icon: Globe,      color: '#60A5FA', accent: 'rgba(96,165,250,0.15)'  },
    india:       { label: 'India',          Icon: Flag,       color: '#F97316', accent: 'rgba(249,115,22,0.15)'  },
    commodities: { label: 'Commodities',    Icon: Coins,      color: '#FBBF24', accent: 'rgba(251,191,36,0.15)'  },
    crypto:      { label: 'Crypto',         Icon: BarChart3,  color: '#A78BFA', accent: 'rgba(167,139,250,0.15)' },
    movers:      { label: 'Market Movers',  Icon: User,       color: '#34D399', accent: 'rgba(52,211,153,0.15)'  },
};

const CATEGORY_SOURCE_COLORS: Record<ParsedItem['category'], string> = {
    global:      '#60A5FA',
    india:       '#F97316',
    commodities: '#FBBF24',
    crypto:      '#A78BFA',
    movers:      '#34D399',
};

// ─── NewsCard ─────────────────────────────────────────────────────────────────
function NewsCard({ item, idx, onCite }: { item: ParsedItem; idx: number; onCite: (item: ParsedItem) => void }) {
    const sig = item.signal ? SIGNAL_CFG[item.signal] : null;
    const [hovered, setHovered] = useState(false);
    const catColor = CATEGORY_SOURCE_COLORS[item.category];

    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: '20px', padding: '22px 24px', position: 'relative', overflow: 'hidden',
            borderLeft: `3px solid ${IMPACT_COLORS[item.impact]}`,
        }}>
            {/* Source chip */}
            {item.sourceLabel && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: `${catColor}18`, border: `1px solid ${catColor}30`, borderRadius: '6px', padding: '2px 8px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: catColor, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{item.sourceLabel}</span>
                </div>
            )}

            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                    <span style={{ fontSize: '11px', color: '#374151', fontWeight: 700, minWidth: '20px', paddingTop: '3px' }}>
                        {String(idx + 1).padStart(2, '0')}
                    </span>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fff', lineHeight: 1.4, margin: 0 }}>
                        {item.headline}
                    </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button
                        id={`cite-news-${idx}`}
                        onClick={() => onCite(item)}
                        onMouseEnter={() => setHovered(true)}
                        onMouseLeave={() => setHovered(false)}
                        title="Ask Portfolio Analyst about this news"
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '30px', height: '30px', borderRadius: '8px',
                            background: hovered ? 'rgba(200,241,53,0.15)' : 'rgba(255,255,255,0.06)',
                            border: hovered ? '1px solid rgba(200,241,53,0.4)' : '1px solid rgba(255,255,255,0.1)',
                            cursor: 'pointer', transition: 'all 0.15s',
                            color: hovered ? '#C8F135' : '#6B7280',
                        }}
                    >
                        <AtSign size={13} />
                    </button>
                    {sig && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: sig.bg, border: `1px solid ${sig.border}`, borderRadius: '8px', padding: '5px 10px' }}>
                            <sig.Icon size={12} color={sig.color} />
                            <span style={{ fontSize: '11px', fontWeight: 800, color: sig.color, letterSpacing: '0.05em' }}>{sig.label}</span>
                        </div>
                    )}
                </div>
            </div>

            {item.summary && item.summary !== '—' && (
                <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.65, marginBottom: '10px', paddingLeft: '30px' }}>
                    {item.summary}
                </p>
            )}

            {item.markets && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '30px' }}>
                    <span style={{ fontSize: '10px', color: IMPACT_COLORS[item.impact], fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em' }}>{item.impact}</span>
                    <span style={{ color: '#374151' }}>·</span>
                    <span style={{ fontSize: '11px', color: '#4B5563' }}>{item.markets.replace(/^\*+/, '').trim()}</span>
                </div>
            )}
        </div>
    );
}

// ─── Category Tabs ────────────────────────────────────────────────────────────
function CategoryTabs({ activeTab, counts, onTabChange }: {
    activeTab: TabId;
    counts: Record<TabId, number>;
    onTabChange: (tab: TabId) => void;
}) {
    const tabs: TabId[] = ['all', 'global', 'india', 'commodities', 'crypto', 'movers'];
    return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {tabs.map(tab => {
                const cfg = CATEGORY_CFG[tab];
                const active = activeTab === tab;
                const count = counts[tab];
                return (
                    <button
                        key={tab}
                        id={`tab-${tab}`}
                        onClick={() => onTabChange(tab)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '8px 14px', borderRadius: '10px', cursor: 'pointer',
                            background: active ? cfg.accent : 'rgba(255,255,255,0.04)',
                            border: active ? `1px solid ${cfg.color}40` : '1px solid rgba(255,255,255,0.08)',
                            color: active ? cfg.color : '#6B7280',
                            fontSize: '13px', fontWeight: active ? 700 : 500,
                            transition: 'all 0.15s',
                        }}
                    >
                        <cfg.Icon size={13} />
                        {cfg.label}
                        {count > 0 && (
                            <span style={{
                                fontSize: '10px', fontWeight: 700, lineHeight: 1,
                                background: active ? `${cfg.color}25` : 'rgba(255,255,255,0.08)',
                                color: active ? cfg.color : '#4B5563',
                                padding: '2px 6px', borderRadius: '999px',
                            }}>
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// ─── Portfolio Agent Panel ────────────────────────────────────────────────────
type Message = { role: 'user' | 'assistant'; content: string };

function PortfolioAgentPanel({ injectedContext, onContextConsumed }: {
    injectedContext: ParsedItem | null;
    onContextConsumed: () => void;
}) {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<Message[]>([]);
    const [attemptsNum, setAttemptsNum] = useState(0);
    const [contextChip, setContextChip] = useState<ParsedItem | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const chatRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (injectedContext) { setContextChip(injectedContext); onContextConsumed(); inputRef.current?.focus(); }
    }, [injectedContext, onContextConsumed]);

    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [history, loading]);

    const analyze = async () => {
        if (!query.trim() && !contextChip) return;
        setLoading(true);
        let userText = query.trim();
        if (contextChip) userText = `[News: "${contextChip.headline}"]\n\n${userText || 'How does this affect my portfolio?'}`;
        setQuery(''); setContextChip(null);
        setHistory(prev => [...prev, { role: 'user', content: userText }]);
        try {
            // Build news_context from the chip (passed to backend so it skips re-fetching RSS)
            const newsContext = contextChip
                ? `Headline: ${contextChip.headline}\nSummary: ${contextChip.summary}\nMarkets affected: ${contextChip.markets || 'N/A'}\nSignal: ${contextChip.signal || 'N/A'}`
                : null;

            const res = await fetch(`/api/v1/portfolio/analyze-news`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: userText,
                    chat_history: history,
                    news_context: newsContext,
                }),
            });
            const data = await res.json();
            setHistory(prev => [...prev, { role: 'assistant', content: data.analysis }]);
            setAttemptsNum(data.attempts || 1);
        } catch {
            setHistory(prev => [...prev, { role: 'assistant', content: 'Failed to fetch response.' }]);
        } finally { setLoading(false); }
    };

    const canSend = (query.trim() || contextChip) && !loading;

    return (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', height: '520px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '30px', height: '30px', background: 'rgba(200,241,53,0.1)', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Zap size={14} color="#C8F135" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>Portfolio Analyst</h3>
                        <p style={{ fontSize: '10px', color: '#6B7280', margin: 0 }}>Click @ on any news to add context</p>
                    </div>
                </div>
                {history.length > 0 && (
                    <button onClick={() => { setHistory([]); setContextChip(null); }} style={{ background: 'none', border: 'none', color: '#4B5563', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <X size={11} /> Clear
                    </button>
                )}
            </div>

            <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                {history.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', textAlign: 'center' }}>
                        <AtSign size={20} color="rgba(200,241,53,0.3)" />
                        <p style={{ fontSize: '11px', color: '#374151', lineHeight: 1.5, maxWidth: '180px' }}>
                            Click <strong style={{ color: '#6B7280' }}>@</strong> on any news to ask about its impact on your portfolio.
                        </p>
                    </div>
                ) : history.map((msg, i) => (
                    <div key={i} style={{
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        background: msg.role === 'user' ? 'rgba(200,241,53,0.1)' : 'rgba(255,255,255,0.05)',
                        border: msg.role === 'user' ? '1px solid rgba(200,241,53,0.2)' : '1px solid rgba(255,255,255,0.08)',
                        padding: '9px 12px', borderRadius: '11px', maxWidth: '92%', fontSize: '12px', lineHeight: 1.6, color: '#D1D5DB', whiteSpace: 'pre-wrap',
                    }}>
                        {msg.role === 'assistant' && i === history.length - 1 && attemptsNum > 1 && (
                            <div style={{ marginBottom: '5px', fontSize: '10px', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <AlertTriangle size={9} /> Refined ({attemptsNum} iterations)
                            </div>
                        )}
                        {msg.content}
                    </div>
                ))}
                {loading && (
                    <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', padding: '9px 12px', borderRadius: '11px', display: 'flex', gap: '5px', alignItems: 'center' }}>
                        {[0, 1, 2].map(i => (
                            <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#C8F135', animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
                        ))}
                    </div>
                )}
            </div>

            {contextChip && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'rgba(200,241,53,0.07)', border: '1px solid rgba(200,241,53,0.2)', borderRadius: '9px', padding: '7px 10px', flexShrink: 0 }}>
                    <AtSign size={11} color="#C8F135" />
                    <span style={{ fontSize: '11px', color: '#C8F135', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contextChip.headline}</span>
                    <button onClick={() => setContextChip(null)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', padding: 0, display: 'flex' }}>
                        <X size={11} />
                    </button>
                </div>
            )}

            <div style={{ display: 'flex', gap: '7px', flexShrink: 0 }}>
                <input
                    ref={inputRef}
                    id="portfolio-analyst-input"
                    type="text" value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={contextChip ? 'Ask about this news...' : 'Ask about your portfolio...'}
                    style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9px', padding: '9px 12px', color: '#fff', fontSize: '12px', outline: 'none' }}
                    onKeyDown={e => e.key === 'Enter' && canSend && analyze()}
                />
                <button
                    id="portfolio-analyst-send"
                    onClick={analyze} disabled={!canSend}
                    style={{ background: canSend ? '#C8F135' : 'rgba(200,241,53,0.08)', color: canSend ? '#000' : '#6B7280', border: 'none', borderRadius: '9px', padding: '0 13px', cursor: canSend ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                >
                    <Send size={14} />
                </button>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NewsPage() {
    const [status, setStatus] = useState<'idle'|'triggering'|'polling'|'done'|'error'>('idle');
    const [rawResult, setRawResult] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [cachedAt, setCachedAt] = useState<string | null>(null);
    const [fromCache, setFromCache] = useState(false);
    const [pollCount, setPollCount] = useState(0);
    const [injectedContext, setInjectedContext] = useState<ParsedItem | null>(null);
    const [activeTab, setActiveTab] = useState<TabId>('all');

    useEffect(() => {
        const cache = loadCache();
        if (cache?.status === 'success') {
            setRawResult(cache.result); setCachedAt(cache.timestamp); setFromCache(true); setStatus('done');
        }
    }, []);

    useEffect(() => {
        if (status !== 'polling') return;
        const interval = setInterval(async () => {
            try {
                const r = await fetch('/api/v1/news/result');
                const d = await r.json();
                setPollCount(p => p + 1);
                if (!d.is_running && d.result?.status === 'success') {
                    clearInterval(interval);
                    const text = d.result.result || '';
                    setRawResult(text); saveCache(text, 'success');
                    setCachedAt(new Date().toISOString()); setFromCache(false); setStatus('done');
                } else if (!d.is_running && d.result?.status === 'failed') {
                    clearInterval(interval); setErrorMsg(d.result.error || 'Analysis failed'); setStatus('error');
                }
            } catch { clearInterval(interval); setErrorMsg('Failed to connect to backend'); setStatus('error'); }
        }, 5000);
        return () => clearInterval(interval);
    }, [status]);

    const triggerAnalysis = useCallback(async () => {
        setStatus('triggering'); setErrorMsg(null); setPollCount(0);
        try {
            await fetch('/api/v1/news/analyze', { method: 'POST' });
            setStatus('polling');
        } catch { setErrorMsg('Cannot reach backend. Is it running on port 8000?'); setStatus('error'); }
    }, []);

    const forceRefresh = () => {
        localStorage.removeItem(CACHE_KEY); setRawResult(null); setFromCache(false);
        setStatus('idle'); setActiveTab('all'); triggerAnalysis();
    };

    const handleCite = useCallback((item: ParsedItem) => setInjectedContext(item), []);
    const handleContextConsumed = useCallback(() => setInjectedContext(null), []);

    const parsed = rawResult ? parseNews(rawResult) : [];
    const isBusy = status === 'triggering' || status === 'polling';

    // Category counts
    const counts: Record<TabId, number> = {
        all: parsed.length,
        global: parsed.filter(i => i.category === 'global').length,
        india: parsed.filter(i => i.category === 'india').length,
        commodities: parsed.filter(i => i.category === 'commodities').length,
        crypto: parsed.filter(i => i.category === 'crypto').length,
        movers: parsed.filter(i => i.category === 'movers').length,
    };

    const filteredItems = activeTab === 'all' ? parsed : parsed.filter(i => i.category === activeTab);

    const card: React.CSSProperties = {
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px', padding: '24px',
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff' }}>

            {/* Topbar */}
            <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '34px', height: '34px', background: 'rgba(200,241,53,0.1)', border: '1px solid rgba(200,241,53,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Globe2 size={16} color="#C8F135" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '18px', fontWeight: 700 }}>Market News Intelligence</h1>
                        <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '1px' }}>5-layer coverage · Global + India + Commodities + Crypto + Market Movers</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {cachedAt && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#6B7280' }}>
                            <Clock size={11} />
                            {fromCache ? 'Cached today' : `Updated ${new Date(cachedAt).toLocaleTimeString('en-IN')}`}
                        </div>
                    )}
                    <button
                        onClick={forceRefresh} disabled={isBusy}
                        style={{ display: 'flex', alignItems: 'center', gap: '7px', background: isBusy ? 'rgba(200,241,53,0.1)' : '#C8F135', color: isBusy ? '#C8F135' : '#000', border: isBusy ? '1px solid rgba(200,241,53,0.25)' : 'none', fontWeight: 700, fontSize: '13px', borderRadius: '11px', padding: '9px 16px', cursor: isBusy ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
                    >
                        <RefreshCw size={13} style={{ animation: isBusy ? 'spin 1s linear infinite' : 'none' }} />
                        {isBusy ? 'Fetching...' : 'Refresh'}
                    </button>
                </div>
            </div>

            <div style={{ padding: '28px 40px' }}>

                {/* IDLE */}
                {status === 'idle' && !rawResult && (
                    <div style={{ ...card, textAlign: 'center', padding: '80px 40px' }}>
                        <div style={{ width: '60px', height: '60px', background: 'rgba(200,241,53,0.08)', border: '1px solid rgba(200,241,53,0.15)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <Newspaper size={26} color="rgba(200,241,53,0.5)" />
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '10px' }}>No news loaded yet</h2>
                        <p style={{ color: '#6B7280', fontSize: '13px', maxWidth: '420px', margin: '0 auto 28px', lineHeight: 1.6 }}>
                            5-layer AI intelligence: global markets, all Indian sectors, commodities, crypto, and market mover statements — all in one brief.
                        </p>
                        <button onClick={triggerAnalysis} style={{ background: '#C8F135', color: '#000', fontWeight: 700, fontSize: '14px', borderRadius: '13px', padding: '13px 28px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '9px' }}>
                            <Zap size={16} /> Load today's news
                        </button>
                    </div>
                )}

                {/* LOADING */}
                {isBusy && (
                    <div style={{ ...card, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '18px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: 'rgba(200,241,53,0.1)', border: '1px solid rgba(200,241,53,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <RefreshCw size={18} color="#C8F135" style={{ animation: 'spin 1.5s linear infinite' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 600, marginBottom: '4px' }}>
                                {status === 'triggering' ? '🚀 Starting 5-layer news intelligence...' : `🔍 Fetching global + India + crypto coverage... (${pollCount} checks)`}
                            </p>
                            <p style={{ color: '#6B7280', fontSize: '12px' }}>
                                Pulling from 50+ RSS sources across US markets, ECB, China, all Indian sectors, commodities, crypto, and market movers.
                            </p>
                            <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', marginTop: '10px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', background: '#C8F135', borderRadius: '999px', width: `${Math.min((pollCount / 20) * 100, 95)}%`, transition: 'width 0.5s ease' }} />
                            </div>
                        </div>
                    </div>
                )}

                {/* ERROR */}
                {status === 'error' && errorMsg && (
                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '16px', padding: '18px 22px', marginBottom: '24px', display: 'flex', gap: '13px', alignItems: 'flex-start' }}>
                        <AlertTriangle size={17} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <p style={{ fontWeight: 600, color: '#EF4444', marginBottom: '4px' }}>Could not fetch news</p>
                            <p style={{ color: 'rgba(239,68,68,0.7)', fontSize: '12px' }}>{errorMsg}</p>
                            <button onClick={triggerAnalysis} style={{ marginTop: '10px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                                Try again
                            </button>
                        </div>
                    </div>
                )}

                {/* RESULTS */}
                {rawResult && (
                    <>
                        {fromCache && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', background: 'rgba(200,241,53,0.06)', border: '1px solid rgba(200,241,53,0.15)', borderRadius: '11px', padding: '10px 14px', marginBottom: '20px', fontSize: '12px' }}>
                                <CheckCircle2 size={13} color="#C8F135" />
                                <span style={{ color: '#C8F135' }}>Today's news loaded from cache.</span>
                                <span style={{ color: '#6B7280' }}>Refreshes automatically next day.</span>
                                <button onClick={forceRefresh} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}>
                                    Force refresh
                                </button>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'auto 390px', gap: '28px', alignItems: 'start' }}>

                            {/* LEFT: News with tabs */}
                            <div>
                                <CategoryTabs activeTab={activeTab} counts={counts} onTabChange={setActiveTab} />

                                {filteredItems.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {filteredItems.map((item, i) => (
                                            <NewsCard key={i} item={item} idx={i} onCite={handleCite} />
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ ...card, textAlign: 'center', padding: '40px' }}>
                                        <p style={{ color: '#6B7280', fontSize: '13px' }}>
                                            No {CATEGORY_CFG[activeTab].label.toLowerCase()} news found in this batch.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* RIGHT: Portfolio Analyst only */}
                            <div style={{ position: 'sticky', top: '72px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <PortfolioAgentPanel
                                    injectedContext={injectedContext}
                                    onContextConsumed={handleContextConsumed}
                                />
                                <div style={{ fontSize: '10px', color: '#374151', lineHeight: 1.6 }}>
                                    ⚠️ AI-generated signals are for informational purposes only. Not financial advice.
                                </div>
                            </div>
                        </div>

                        {/* Raw fallback */}
                        {parsed.length === 0 && (
                            <div style={{ ...card, marginTop: '20px' }}>
                                <p style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Raw Agent Output</p>
                                <pre style={{ color: '#D1D5DB', fontSize: '12px', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: 'sans-serif' }}>{rawResult}</pre>
                            </div>
                        )}
                    </>
                )}
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes bounce { 0%, 100% { transform: translateY(0); opacity: 0.5; } 50% { transform: translateY(-4px); opacity: 1; } }
            `}</style>
        </div>
    );
}
