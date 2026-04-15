'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    RefreshCw, Globe2, TrendingUp, TrendingDown, MinusCircle,
    Zap, Clock, AlertTriangle, CheckCircle2, Newspaper, AtSign, Send, X
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface NewsCache {
    date: string;
    result: string;
    timestamp: string;
    status: 'success' | 'failed';
}

interface ParsedItem {
    headline: string;
    summary: string;
    markets: string;
    signal: 'BUY' | 'SELL' | 'HOLD' | null;
    impact: 'positive' | 'negative' | 'neutral';
}

// ─── Cache helpers ────────────────────────────────────────────────────────────
const CACHE_KEY = 'invex_news_cache';

function todayStr() { return new Date().toLocaleDateString('en-CA'); }

function loadCache(): NewsCache | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const cache: NewsCache = JSON.parse(raw);
        if (cache.date === todayStr()) return cache;
        return null;
    } catch { return null; }
}

function saveCache(result: string, status: 'success' | 'failed') {
    const cache: NewsCache = { date: todayStr(), result, timestamp: new Date().toISOString(), status };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

// ─── Parse raw markdown ───────────────────────────────────────────────────────
function parseNews(raw: string): ParsedItem[] {
    const items: ParsedItem[] = [];
    const blocks = raw.split(/\n(?=\d+\.\s)/).filter(Boolean);
    for (const block of blocks) {
        const lines = block.split('\n').filter(l => l.trim());
        if (!lines.length) continue;
        const headline = lines[0].replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').trim();
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
        if (headline && headline.length > 4) {
            items.push({ headline, summary: summary || '—', markets: marketLine, signal, impact });
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

// ─── NewsCard ─────────────────────────────────────────────────────────────────
function NewsCard({ item, idx, onCite }: { item: ParsedItem; idx: number; onCite: (item: ParsedItem) => void }) {
    const sig = item.signal ? SIGNAL_CFG[item.signal] : null;
    const [hovered, setHovered] = useState(false);

    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: '20px', padding: '24px', position: 'relative', overflow: 'hidden',
            borderLeft: `3px solid ${IMPACT_COLORS[item.impact]}`,
            transition: 'border-color 0.2s',
        }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                    <span style={{ fontSize: '12px', color: '#4B5563', fontWeight: 700, minWidth: '22px', paddingTop: '2px' }}>
                        {String(idx + 1).padStart(2, '0')}
                    </span>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fff', lineHeight: 1.4, margin: 0 }}>
                        {item.headline}
                    </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {/* @ button */}
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
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: sig.bg, border: `1px solid ${sig.border}`,
                            borderRadius: '8px', padding: '6px 12px',
                        }}>
                            <sig.Icon size={13} color={sig.color} />
                            <span style={{ fontSize: '12px', fontWeight: 800, color: sig.color, letterSpacing: '0.05em' }}>
                                {sig.label}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {item.summary && item.summary !== '—' && (
                <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.65, marginBottom: '12px', paddingLeft: '34px' }}>
                    {item.summary}
                </p>
            )}

            {item.markets && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '34px' }}>
                    <span style={{ fontSize: '11px', color: IMPACT_COLORS[item.impact], fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {item.impact}
                    </span>
                    <span style={{ color: '#374151', fontSize: '11px' }}>·</span>
                    <span style={{ fontSize: '11px', color: '#4B5563' }}>{item.markets.replace(/^\*+/, '').trim()}</span>
                </div>
            )}
        </div>
    );
}

// ─── Portfolio Agent Panel ────────────────────────────────────────────────────
type Message = { role: 'user' | 'assistant'; content: string; isContext?: boolean };

function PortfolioAgentPanel({
    userId = '0000-user',
    injectedContext,
    onContextConsumed,
}: {
    userId?: string;
    injectedContext: ParsedItem | null;
    onContextConsumed: () => void;
}) {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<Message[]>([]);
    const [attemptsNum, setAttemptsNum] = useState<number>(0);
    const [contextChip, setContextChip] = useState<ParsedItem | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const chatRef = useRef<HTMLDivElement>(null);

    // When a news item is @ cited, set the context chip and focus input
    useEffect(() => {
        if (injectedContext) {
            setContextChip(injectedContext);
            onContextConsumed();
            inputRef.current?.focus();
        }
    }, [injectedContext, onContextConsumed]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [history, loading]);

    const analyze = async () => {
        if (!query.trim() && !contextChip) return;
        setLoading(true);

        let userText = query.trim();
        if (contextChip) {
            userText = `[News Context: "${contextChip.headline}"]\n\n${userText || 'How does this news affect my portfolio?'}`;
        }

        setQuery('');
        setContextChip(null);
        setHistory(prev => [...prev, { role: 'user', content: userText }]);

        try {
            const res = await fetch(`/api/v1/portfolio/analyze-news/${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: userText, chat_history: history }),
            });
            const data = await res.json();
            setHistory(prev => [...prev, { role: 'assistant', content: data.analysis }]);
            setAttemptsNum(data.attempts || 1);
        } catch {
            setHistory(prev => [...prev, { role: 'assistant', content: 'Failed to fetch response.' }]);
        } finally {
            setLoading(false);
        }
    };

    const clearHistory = () => {
        setHistory([]);
        setContextChip(null);
        setQuery('');
    };

    const canSend = (query.trim() || contextChip) && !loading;

    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column',
            gap: '14px', height: '520px',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', background: 'rgba(200,241,53,0.1)', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Zap size={16} color="#C8F135" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Portfolio Analyst</h3>
                        <p style={{ fontSize: '11px', color: '#6B7280', margin: 0 }}>Press @ on any news to add context</p>
                    </div>
                </div>
                {history.length > 0 && (
                    <button
                        onClick={clearHistory}
                        style={{ background: 'none', border: 'none', color: '#4B5563', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        <X size={12} /> Clear
                    </button>
                )}
            </div>

            {/* Chat window */}
            <div
                ref={chatRef}
                style={{
                    flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px',
                    background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '14px',
                    border: '1px solid rgba(255,255,255,0.05)',
                }}
            >
                {history.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', textAlign: 'center' }}>
                        <div style={{ width: '40px', height: '40px', background: 'rgba(200,241,53,0.08)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <AtSign size={18} color="rgba(200,241,53,0.4)" />
                        </div>
                        <p style={{ fontSize: '12px', color: '#4B5563', lineHeight: 1.5, maxWidth: '200px' }}>
                            Click the <strong style={{ color: '#6B7280' }}>@</strong> button on any news card to add it as context, then ask your question.
                        </p>
                    </div>
                ) : (
                    history.map((msg, i) => (
                        <div key={i} style={{
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            background: msg.role === 'user' ? 'rgba(200,241,53,0.1)' : 'rgba(255,255,255,0.05)',
                            border: msg.role === 'user' ? '1px solid rgba(200,241,53,0.2)' : '1px solid rgba(255,255,255,0.08)',
                            padding: '10px 13px', borderRadius: '12px', maxWidth: '92%',
                            fontSize: '12px', lineHeight: 1.6, color: '#D1D5DB', whiteSpace: 'pre-wrap',
                        }}>
                            {msg.role === 'assistant' && i === history.length - 1 && attemptsNum > 1 && (
                                <div style={{ marginBottom: '6px', fontSize: '10px', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertTriangle size={10} />
                                    Refined ({attemptsNum} iterations)
                                </div>
                            )}
                            {msg.content}
                        </div>
                    ))
                )}
                {loading && (
                    <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '12px', color: '#9CA3AF', fontSize: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {[0, 1, 2].map(i => (
                                <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#C8F135', animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
                            ))}
                        </div>
                        Thinking...
                    </div>
                )}
            </div>

            {/* Context chip */}
            {contextChip && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(200,241,53,0.08)',
                    border: '1px solid rgba(200,241,53,0.2)', borderRadius: '10px', padding: '8px 12px',
                }}>
                    <AtSign size={12} color="#C8F135" />
                    <span style={{ fontSize: '11px', color: '#C8F135', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {contextChip.headline}
                    </span>
                    <button
                        onClick={() => setContextChip(null)}
                        style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', padding: 0, display: 'flex' }}
                    >
                        <X size={12} />
                    </button>
                </div>
            )}

            {/* Input row */}
            <div style={{ display: 'flex', gap: '8px' }}>
                <input
                    ref={inputRef}
                    type="text"
                    id="portfolio-analyst-input"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={contextChip ? 'Ask about this news & your portfolio...' : 'Ask anything about your portfolio...'}
                    style={{
                        flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px', padding: '10px 13px', color: '#fff', fontSize: '13px', outline: 'none',
                    }}
                    onKeyDown={e => e.key === 'Enter' && canSend && analyze()}
                />
                <button
                    id="portfolio-analyst-send"
                    onClick={analyze}
                    disabled={!canSend}
                    style={{
                        background: canSend ? '#C8F135' : 'rgba(200,241,53,0.1)',
                        color: canSend ? '#000' : '#6B7280',
                        border: canSend ? 'none' : '1px solid rgba(200,241,53,0.15)',
                        borderRadius: '10px', padding: '0 14px', cursor: canSend ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                    }}
                >
                    <Send size={15} />
                </button>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NewsPage() {
    const [status, setStatus] = useState<'idle' | 'triggering' | 'polling' | 'done' | 'error'>('idle');
    const [rawResult, setRawResult] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [cachedAt, setCachedAt] = useState<string | null>(null);
    const [fromCache, setFromCache] = useState(false);
    const [pollCount, setPollCount] = useState(0);
    const [injectedContext, setInjectedContext] = useState<ParsedItem | null>(null);

    useEffect(() => {
        const cache = loadCache();
        if (cache && cache.status === 'success') {
            setRawResult(cache.result);
            setCachedAt(cache.timestamp);
            setFromCache(true);
            setStatus('done');
        }
    }, []);

    useEffect(() => {
        if (status !== 'polling') return;
        const interval = setInterval(async () => {
            try {
                const r = await fetch('/api/v1/news/result');
                const d = await r.json();
                setPollCount(p => p + 1);
                if (!d.is_running && d.result && d.result.status === 'success') {
                    clearInterval(interval);
                    const text = d.result.result || '';
                    setRawResult(text);
                    saveCache(text, 'success');
                    setCachedAt(new Date().toISOString());
                    setFromCache(false);
                    setStatus('done');
                } else if (!d.is_running && d.result && d.result.status === 'failed') {
                    clearInterval(interval);
                    setErrorMsg(d.result.error || 'Analysis failed');
                    setStatus('error');
                }
            } catch {
                clearInterval(interval);
                setErrorMsg('Failed to connect to backend');
                setStatus('error');
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [status]);

    const triggerAnalysis = useCallback(async () => {
        setStatus('triggering');
        setErrorMsg(null);
        setPollCount(0);
        try {
            await fetch('/api/v1/news/analyze', { method: 'POST' });
            setStatus('polling');
        } catch {
            setErrorMsg('Cannot reach backend. Is it running on port 8000?');
            setStatus('error');
        }
    }, []);

    const forceRefresh = () => {
        localStorage.removeItem(CACHE_KEY);
        setRawResult(null);
        setFromCache(false);
        setStatus('idle');
        triggerAnalysis();
    };

    const handleCite = useCallback((item: ParsedItem) => {
        setInjectedContext(item);
    }, []);

    const handleContextConsumed = useCallback(() => {
        setInjectedContext(null);
    }, []);

    const parsed = rawResult ? parseNews(rawResult) : [];
    const isBusy = status === 'triggering' || status === 'polling';

    const card: React.CSSProperties = {
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px', padding: '24px',
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff' }}>

            {/* Topbar */}
            <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', background: 'rgba(200,241,53,0.1)', border: '1px solid rgba(200,241,53,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Globe2 size={18} color="#C8F135" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Market News Intelligence</h1>
                        <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '1px' }}>AI-powered market news with BUY/SELL/HOLD signals · Press @ on any news to ask Portfolio Analyst</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {cachedAt && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6B7280' }}>
                            <Clock size={12} />
                            {fromCache ? 'Cached today' : `Updated ${new Date(cachedAt).toLocaleTimeString('en-IN')}`}
                        </div>
                    )}
                    <button
                        onClick={forceRefresh}
                        disabled={isBusy}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: isBusy ? 'rgba(200,241,53,0.1)' : '#C8F135',
                            color: isBusy ? '#C8F135' : '#000',
                            border: isBusy ? '1px solid rgba(200,241,53,0.25)' : 'none',
                            fontWeight: 700, fontSize: '13px', borderRadius: '12px', padding: '10px 18px',
                            cursor: isBusy ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                        }}
                    >
                        <RefreshCw size={14} style={{ animation: isBusy ? 'spin 1s linear infinite' : 'none' }} />
                        {isBusy ? 'Fetching...' : 'Refresh news'}
                    </button>
                </div>
            </div>

            <div style={{ padding: '32px 40px' }}>

                {/* IDLE */}
                {status === 'idle' && !rawResult && (
                    <div style={{ ...card, textAlign: 'center', padding: '80px 40px' }}>
                        <div style={{ width: '64px', height: '64px', background: 'rgba(200,241,53,0.08)', border: '1px solid rgba(200,241,53,0.15)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                            <Newspaper size={28} color="rgba(200,241,53,0.5)" />
                        </div>
                        <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>No news loaded yet</h2>
                        <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px', lineHeight: 1.6 }}>
                            Our 2-agent crew will fetch today's top geopolitical and financial news, then analyze its impact on Indian markets and issue BUY/SELL/HOLD signals.
                        </p>
                        <button onClick={triggerAnalysis} style={{ background: '#C8F135', color: '#000', fontWeight: 700, fontSize: '15px', borderRadius: '14px', padding: '14px 32px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                            <Zap size={18} /> Load today's news
                        </button>
                    </div>
                )}

                {/* LOADING */}
                {isBusy && (
                    <div style={{ ...card, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(200,241,53,0.1)', border: '1px solid rgba(200,241,53,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <RefreshCw size={20} color="#C8F135" style={{ animation: 'spin 1.5s linear infinite' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 600, marginBottom: '4px' }}>
                                {status === 'triggering' ? '🚀 Starting news agents...' : `🔍 Analyzing market impact... (${pollCount} checks)`}
                            </p>
                            <p style={{ color: '#6B7280', fontSize: '13px' }}>
                                {status === 'triggering'
                                    ? 'Triggering News Fetcher + Market Decision Agent'
                                    : 'Agents are scraping news and computing BUY/SELL/HOLD signals. Checking every 5s...'}
                            </p>
                            <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', marginTop: '12px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', background: '#C8F135', borderRadius: '999px', width: `${Math.min((pollCount / 20) * 100, 95)}%`, transition: 'width 0.5s ease' }} />
                            </div>
                        </div>
                    </div>
                )}

                {/* ERROR */}
                {status === 'error' && errorMsg && (
                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                        <AlertTriangle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <p style={{ fontWeight: 600, color: '#EF4444', marginBottom: '4px' }}>Could not fetch news</p>
                            <p style={{ color: 'rgba(239,68,68,0.7)', fontSize: '13px' }}>{errorMsg}</p>
                            <button onClick={triggerAnalysis} style={{ marginTop: '12px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                                Try again
                            </button>
                        </div>
                    </div>
                )}

                {/* RESULTS */}
                {rawResult && (
                    <>
                        {fromCache && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(200,241,53,0.06)', border: '1px solid rgba(200,241,53,0.15)', borderRadius: '12px', padding: '12px 16px', marginBottom: '24px', fontSize: '13px' }}>
                                <CheckCircle2 size={14} color="#C8F135" />
                                <span style={{ color: '#C8F135' }}>Today's news is already loaded from cache.</span>
                                <span style={{ color: '#6B7280' }}>News refreshes automatically the next day.</span>
                                <button onClick={forceRefresh} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}>
                                    Force refresh
                                </button>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'auto 400px', gap: '28px', alignItems: 'start' }}>

                            {/* NEWS CARDS */}
                            <div>
                                <p style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '16px' }}>
                                    Today's Market Headlines — {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                                {parsed.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        {parsed.map((item, i) => (
                                            <NewsCard key={i} item={item} idx={i} onCite={handleCite} />
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ ...card }}>
                                        <p style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Raw Agent Output</p>
                                        <pre style={{ color: '#D1D5DB', fontSize: '13px', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: 'sans-serif' }}>{rawResult}</pre>
                                    </div>
                                )}
                            </div>

                            {/* RIGHT: Portfolio Analyst only */}
                            <div style={{ position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <PortfolioAgentPanel
                                    injectedContext={injectedContext}
                                    onContextConsumed={handleContextConsumed}
                                />
                                <div style={{ fontSize: '11px', color: '#374151', lineHeight: 1.6, padding: '4px 0' }}>
                                    ⚠️ AI-generated signals are for informational purposes only. Not financial advice. Always do your own research before trading.
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); opacity: 0.5; }
                    50% { transform: translateY(-4px); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
