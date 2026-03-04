'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Brain, Newspaper, TrendingUp, ShieldCheck, BookOpen,
    Send, RefreshCw, Mic, ChevronRight, User, Bot,
    AlertTriangle, Zap, BarChart2, Clock, X
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode = 'agent-debrief' | 'news-radar' | 'what-if' | 'calm-mode' | 'memory' | 'default';

interface WhatIfData {
    explanation: string;
    pnl: string;
    cagr: string;
    vs_benchmark: string;
    chartData: { date: string; value: number }[];
    suggestions: string[];
    verdict: 'GOOD_DECISION' | 'BAD_DECISION' | 'NEUTRAL';
}

interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
    mode: Mode;
    type: 'text' | 'chart' | 'card';
    chartData?: WhatIfData;
    panicTriggered?: boolean;
    timestamp: Date;
}

interface UserMemory {
    name: string;
    riskProfile: string;
    goals: string;
    pastQuestions: string[];
    lastAnalysis: string;
    lastUpdated: string;
}

// ─── Mode config ──────────────────────────────────────────────────────────────
const MODES: { id: Mode; label: string; icon: React.FC<{ size?: number; color?: string }>; color: string; desc: string; starters: string[] }[] = [
    {
        id: 'agent-debrief', label: 'Agent Debrief', icon: Brain, color: '#C8F135',
        desc: 'Ask why the AI made specific recommendations',
        starters: ["Why did you recommend BUY on Nifty?", "Explain the risk assessment", "Which agent flagged the high risk?"],
    },
    {
        id: 'news-radar', label: 'News Radar', icon: Newspaper, color: '#3B82F6',
        desc: 'Get personalized market news impact analysis',
        starters: ["How does RBI rate hold affect me?", "Any impact from US Fed decision?", "What should I do about current geopolitics?"],
    },
    {
        id: 'what-if', label: 'What-If Simulator', icon: TrendingUp, color: '#A855F7',
        desc: 'Simulate historical investment scenarios with charts',
        starters: ["What if I invested ₹1L in Nifty 50 in Jan 2024?", "What if I put ₹50K in Gold last year?", "Compare SIP vs lump sum in HDFC Bank"],
    },
    {
        id: 'calm-mode', label: 'Calm Mode', icon: ShieldCheck, color: '#10B981',
        desc: 'Market panic? Talk to your AI before you act',
        starters: ["Nifty is falling, should I sell?", "I'm scared about the market crash", "Should I exit my positions?"],
    },
    {
        id: 'memory', label: 'My AI', icon: BookOpen, color: '#F59E0B',
        desc: 'Your AI remembers your history and profile',
        starters: ["What do you know about me?", "How are my past decisions performing?", "Update my risk profile"],
    },
];

// ─── Memory helpers ───────────────────────────────────────────────────────────
const MEM_KEY = 'invex_user_memory';
const HIST_KEY = 'invex_chat_history';

function loadMemory(): UserMemory {
    try {
        const raw = localStorage.getItem(MEM_KEY);
        if (raw) return JSON.parse(raw);
    } catch { }
    return { name: 'Rohit Rathod', riskProfile: 'Moderate', goals: 'Wealth Creation', pastQuestions: [], lastAnalysis: '', lastUpdated: new Date().toISOString() };
}

function saveMemory(m: UserMemory) {
    localStorage.setItem(MEM_KEY, JSON.stringify({ ...m, lastUpdated: new Date().toISOString() }));
}

function loadHistory(): Message[] {
    try {
        const raw = localStorage.getItem(HIST_KEY);
        if (!raw) return [];
        const msgs = JSON.parse(raw) as Message[];
        return msgs.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
    } catch { return []; }
}

function saveHistory(msgs: Message[]) {
    // Keep last 50
    localStorage.setItem(HIST_KEY, JSON.stringify(msgs.slice(-50)));
}

// ─── What-If Chart Component ──────────────────────────────────────────────────
function WhatIfCard({ data }: { data: WhatIfData }) {
    const verdictColor = data.verdict === 'GOOD_DECISION' ? '#C8F135' : data.verdict === 'BAD_DECISION' ? '#EF4444' : '#F59E0B';
    const verdictLabel = data.verdict === 'GOOD_DECISION' ? '✅ Great Call' : data.verdict === 'BAD_DECISION' ? '❌ Costly Miss' : '➡️ Break-Even';

    return (
        <div style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '20px', overflow: 'hidden', marginTop: '8px' }}>
            <div style={{ padding: '18px 22px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', color: '#A855F7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <TrendingUp size={13} /> What-If Analysis
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: verdictColor, background: `${verdictColor}15`, border: `1px solid ${verdictColor}30`, borderRadius: '8px', padding: '3px 10px' }}>
                        {verdictLabel}
                    </span>
                </div>
                <p style={{ fontSize: '13px', color: '#D1D5DB', lineHeight: 1.6, marginBottom: '14px' }}>{data.explanation}</p>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
                    {[
                        { label: 'P&L', val: data.pnl },
                        { label: 'CAGR', val: data.cagr },
                    ].map(s => (
                        <div key={s.label}>
                            <p style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</p>
                            <p style={{ fontSize: '20px', fontWeight: 800, color: s.val.startsWith('+') ? '#C8F135' : '#EF4444' }}>{s.val}</p>
                        </div>
                    ))}
                    <div>
                        <p style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>vs Market</p>
                        <p style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: 500, paddingTop: '4px', maxWidth: '180px', lineHeight: 1.3 }}>{data.vs_benchmark}</p>
                    </div>
                </div>
            </div>
            {/* Chart */}
            <div style={{ height: '160px', padding: '0 12px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.chartData}>
                        <defs>
                            <linearGradient id="wif" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#4B5563' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#4B5563' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${Math.round(v / 1000)}K`} />
                        <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                            formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Value']} />
                        <Area type="monotone" dataKey="value" stroke="#A855F7" strokeWidth={2} fill="url(#wif)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            {/* Suggestions */}
            {data.suggestions?.length > 0 && (
                <div style={{ padding: '12px 22px 18px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {data.suggestions.map((s, i) => (
                        <span key={i} style={{ fontSize: '11px', color: '#A855F7', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '999px', padding: '4px 10px', cursor: 'pointer' }}>{s}</span>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, mode }: { msg: Message; mode: Mode }) {
    const cfg = MODES.find(m => m.id === msg.mode) || MODES[0];
    const isUser = msg.role === 'user';

    return (
        <div style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', gap: '12px', marginBottom: '20px', alignItems: 'flex-start' }}>
            {/* Avatar */}
            <div style={{
                width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                background: isUser ? 'rgba(255,255,255,0.08)' : `${cfg.color}18`,
                border: `1px solid ${isUser ? 'rgba(255,255,255,0.1)' : cfg.color + '30'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                {isUser ? <User size={16} color="#9CA3AF" /> : <cfg.icon size={16} color={cfg.color} />}
            </div>

            <div style={{ flex: 1, maxWidth: '80%' }}>
                {/* Panic badge */}
                {msg.panicTriggered && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#10B981', marginBottom: '6px' }}>
                        <ShieldCheck size={12} /> Calm Mode activated
                    </div>
                )}

                {/* Bubble */}
                <div style={{
                    background: isUser ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isUser ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                    padding: '14px 18px',
                }}>
                    <p style={{ fontSize: '14px', color: '#E5E7EB', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>

                    {/* Inline chart for what-if */}
                    {msg.type === 'chart' && msg.chartData && <WhatIfCard data={msg.chartData} />}
                </div>

                <p style={{ fontSize: '10px', color: '#374151', marginTop: '4px', textAlign: isUser ? 'right' : 'left' }}>
                    {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ChatPage() {
    const [mode, setMode] = useState<Mode>('default');
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [memory, setMemory] = useState<UserMemory | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showMemoryEdit, setShowMemoryEdit] = useState(false);
    const [analysisCtx, setAnalysisCtx] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const mem = loadMemory();
        setMemory(mem);
        const hist = loadHistory();
        if (hist.length) {
            setMessages(hist);
            // Restore last mode
            const lastAI = [...hist].reverse().find(m => m.role === 'ai');
            if (lastAI) setMode(lastAI.mode);
        } else {
            // Welcome message
            const welcome: Message = {
                id: 'welcome',
                role: 'ai',
                content: `👋 Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${mem.name.split(' ')[0]}!\n\nI'm your Invex AI co-pilot. I have 5 modes to help you invest smarter:\n\n🧠 Agent Debrief — Understand WHY I made any recommendation\n📰 News Radar — How today's news affects YOUR portfolio\n🔮 What-If — Simulate any investment scenario with live charts\n🛡️ Calm Mode — Talk me through market anxiety before you act\n📚 My AI — I remember your history and personalize advice\n\nSelect a mode on the left, or just ask me anything.`,
                mode: 'default', type: 'text', timestamp: new Date(),
            };
            setMessages([welcome]);
        }
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const send = useCallback(async (text?: string) => {
        const msg = text || input.trim();
        if (!msg || sending) return;
        setInput('');
        setSending(true);

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msg, mode, type: 'text', timestamp: new Date() };
        const newMsgs = [...messages, userMsg];
        setMessages(newMsgs);

        // Update memory — track question
        if (memory) {
            const updated = { ...memory, pastQuestions: [...memory.pastQuestions.slice(-9), msg] };
            saveMemory(updated);
            setMemory(updated);
        }

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: msg,
                    mode,
                    context: { analysisReport: analysisCtx, userName: memory?.name, sessionId: null },
                    memoryContext: memory ? `Name: ${memory.name}, Risk: ${memory.riskProfile}, Goal: ${memory.goals}, Past questions: ${memory.pastQuestions.slice(-5).join('; ')}` : '',
                }),
            });

            const data = await res.json();
            const effectiveMode = data.mode || mode;
            if (data.panicTriggered) setMode('calm-mode');

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: data.reply || 'No response received.',
                mode: effectiveMode,
                type: data.type || 'text',
                chartData: data.chartData,
                panicTriggered: data.panicTriggered,
                timestamp: new Date(),
            };

            const updated = [...newMsgs, aiMsg];
            setMessages(updated);
            saveHistory(updated);
            if (data.suggestions) setSuggestions(data.suggestions);

        } catch {
            const errMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: "⚠️ Connection issue. Please make sure the backend is running on port 8000.",
                mode, type: 'text', timestamp: new Date(),
            };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setSending(false);
        }
    }, [input, mode, messages, memory, analysisCtx, sending]);

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    const clearHistory = () => {
        localStorage.removeItem(HIST_KEY);
        setMessages([]);
        window.location.reload();
    };

    const activeCfg = MODES.find(m => m.id === mode);

    // Market mini-tickers (static for now; would fetch live)
    const tickers = [
        { label: 'NIFTY', val: '25,179', chg: '-1.25%', up: false },
        { label: 'SENSEX', val: '82,400', chg: '-0.89%', up: false },
        { label: 'GOLD', val: '₹73,200', chg: '+0.30%', up: true },
        { label: 'BTC', val: '$94,500', chg: '+2.1%', up: true },
    ];

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', color: '#fff' }}>

            {/* ── LEFT PANEL (260px) ── */}
            <div style={{ width: '260px', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', background: '#0D0D0D', overflowY: 'auto' }}>

                {/* Mode selector */}
                <div style={{ padding: '16px 14px 8px' }}>
                    <p style={{ fontSize: '10px', color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '10px', paddingLeft: '4px' }}>Modes</p>
                    {MODES.map(m => {
                        const active = mode === m.id;
                        return (
                            <button key={m.id} onClick={() => setMode(m.id)} style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', marginBottom: '4px',
                                background: active ? `${m.color}12` : 'transparent',
                                border: active ? `1px solid ${m.color}25` : '1px solid transparent',
                                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                                borderLeft: active ? `3px solid ${m.color}` : '3px solid transparent',
                            }}>
                                <m.icon size={15} color={active ? m.color : '#4B5563'} />
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ fontSize: '13px', fontWeight: 600, color: active ? '#fff' : '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</p>
                                    <p style={{ fontSize: '11px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.desc}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '8px 14px' }} />

                {/* Memory card */}
                {memory && (
                    <div style={{ margin: '0 14px 12px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '14px', padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <BookOpen size={11} /> Memory
                            </span>
                            <button onClick={() => setShowMemoryEdit(!showMemoryEdit)} style={{ background: 'none', border: 'none', color: '#4B5563', cursor: 'pointer', fontSize: '11px' }}>Edit</button>
                        </div>
                        <p style={{ fontSize: '12px', color: '#D1D5DB', fontWeight: 600, marginBottom: '4px' }}>{memory.name}</p>
                        <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px' }}>Risk: {memory.riskProfile}</p>
                        <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '6px' }}>Goal: {memory.goals}</p>
                        {memory.pastQuestions.length > 0 && (
                            <p style={{ fontSize: '10px', color: '#374151' }}>Last: "{memory.pastQuestions[memory.pastQuestions.length - 1]?.slice(0, 40)}..."</p>
                        )}
                    </div>
                )}

                {/* Memory Edit panel */}
                {showMemoryEdit && memory && (
                    <div style={{ margin: '0 14px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <p style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>Edit Profile</p>
                            <button onClick={() => setShowMemoryEdit(false)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}><X size={14} /></button>
                        </div>
                        {[
                            { key: 'name', label: 'Name' },
                            { key: 'riskProfile', label: 'Risk' },
                            { key: 'goals', label: 'Goal' },
                        ].map(f => (
                            <div key={f.key} style={{ marginBottom: '8px' }}>
                                <label style={{ fontSize: '10px', color: '#6B7280', display: 'block', marginBottom: '3px' }}>{f.label}</label>
                                <input value={(memory as Record<string, string>)[f.key]} onChange={e => {
                                    const upd = { ...memory, [f.key]: e.target.value };
                                    setMemory(upd); saveMemory(upd);
                                }} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 10px', color: '#fff', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Clear history */}
                <div style={{ marginTop: 'auto', padding: '12px 14px' }}>
                    <button onClick={clearHistory} style={{ width: '100%', background: 'none', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '8px', color: '#374151', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <RefreshCw size={12} /> Clear history
                    </button>
                </div>
            </div>

            {/* ── CENTER PANEL ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

                {/* Mode header bar */}
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(12px)', flexShrink: 0 }}>
                    {activeCfg && (
                        <>
                            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: `${activeCfg.color}15`, border: `1px solid ${activeCfg.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <activeCfg.icon size={17} color={activeCfg.color} />
                            </div>
                            <div>
                                <p style={{ fontWeight: 700, fontSize: '15px' }}>{activeCfg.label}</p>
                                <p style={{ fontSize: '12px', color: '#6B7280' }}>{activeCfg.desc}</p>
                            </div>
                        </>
                    )}
                    {mode === 'agent-debrief' && (
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                placeholder="Paste analysis report for context..."
                                value={analysisCtx}
                                onChange={e => setAnalysisCtx(e.target.value)}
                                style={{ fontSize: '12px', color: '#9CA3AF', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 12px', outline: 'none', width: '220px' }}
                            />
                        </div>
                    )}
                    {sending && (
                        <div style={{ marginLeft: mode !== 'agent-debrief' ? 'auto' : '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: activeCfg?.color }}>
                            <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Thinking...
                        </div>
                    )}
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
                    {messages.map(msg => <MessageBubble key={msg.id} msg={msg} mode={mode} />)}
                    {sending && (
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: `${activeCfg?.color || '#C8F135'}18`, border: `1px solid ${activeCfg?.color || '#C8F135'}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Bot size={16} color={activeCfg?.color || '#C8F135'} />
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '4px 18px 18px 18px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {[0, 0.2, 0.4].map(d => (
                                    <div key={d} style={{ width: '7px', height: '7px', borderRadius: '50%', background: activeCfg?.color || '#C8F135', animation: 'bounce 1s infinite', animationDelay: `${d}s` }} />
                                ))}
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Quick starter chips */}
                {activeCfg && messages.length <= 1 && (
                    <div style={{ padding: '0 28px 12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {activeCfg.starters.map((s, i) => (
                            <button key={i} onClick={() => send(s)} style={{ fontSize: '12px', color: activeCfg.color, background: `${activeCfg.color}0d`, border: `1px solid ${activeCfg.color}25`, borderRadius: '999px', padding: '7px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s' }}>
                                {s} <ChevronRight size={11} />
                            </button>
                        ))}
                    </div>
                )}

                {/* Suggestions row */}
                {suggestions.length > 0 && messages.length > 1 && (
                    <div style={{ padding: '0 28px 10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {suggestions.map((s, i) => (
                            <button key={i} onClick={() => send(s)} style={{ fontSize: '11px', color: '#6B7280', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', padding: '5px 12px', cursor: 'pointer' }}>
                                {s}
                            </button>
                        ))}
                    </div>
                )}

                {/* Input bar */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '16px 24px', background: '#0A0A0A', flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', background: 'rgba(255,255,255,0.04)', border: `1px solid ${activeCfg ? activeCfg.color + '25' : 'rgba(255,255,255,0.1)'}`, borderRadius: '16px', padding: '12px 16px', transition: 'border-color 0.2s' }}>
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKey}
                            placeholder={
                                mode === 'what-if' ? "e.g. What if I invested ₹1L in Nifty 50 last January?" :
                                    mode === 'calm-mode' ? "Tell me what's worrying you about the market..." :
                                        mode === 'agent-debrief' ? "Ask about any part of the analysis..." :
                                            mode === 'news-radar' ? "Which news should I care about for my portfolio?" :
                                                "Ask anything about your investments..."
                            }
                            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '14px', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, maxHeight: '120px', minHeight: '22px' }}
                            rows={1}
                        />
                        <button onClick={() => send()} disabled={!input.trim() || sending} style={{
                            width: '36px', height: '36px', borderRadius: '10px', border: 'none', cursor: (!input.trim() || sending) ? 'not-allowed' : 'pointer',
                            background: (!input.trim() || sending) ? 'rgba(255,255,255,0.08)' : (activeCfg?.color || '#C8F135'),
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s',
                        }}>
                            <Send size={16} color={(!input.trim() || sending) ? '#374151' : '#000'} />
                        </button>
                    </div>
                    <p style={{ fontSize: '10px', color: '#2D3748', textAlign: 'center', marginTop: '8px' }}>
                        Press Enter to send · Shift+Enter for new line · Chats saved locally
                    </p>
                </div>
            </div>

            {/* ── RIGHT PANEL (260px) ── */}
            <div style={{ width: '260px', flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', background: '#0D0D0D', overflowY: 'auto', padding: '18px 14px' }}>

                {/* Live tickers */}
                <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontSize: '10px', color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '10px' }}>Live Markets</p>
                    {tickers.map(t => (
                        <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>{t.label}</span>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{t.val}</p>
                                <p style={{ fontSize: '11px', color: t.up ? '#C8F135' : '#EF4444' }}>{t.chg}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Panic detector */}
                <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
                    <p style={{ fontSize: '11px', color: '#10B981', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <ShieldCheck size={11} /> Calm Mode
                    </p>
                    <p style={{ fontSize: '11px', color: '#6B7280', lineHeight: 1.5, marginBottom: '10px' }}>Feeling anxious about the market? Switch to Calm Mode — I'll talk you through it.</p>
                    <button onClick={() => { setMode('calm-mode'); send("I'm feeling anxious about my investments"); }} style={{ width: '100%', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', padding: '8px', color: '#10B981', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                        Activate Calm Mode
                    </button>
                </div>

                {/* Agent status */}
                <div>
                    <p style={{ fontSize: '10px', color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '10px' }}>Agent Status</p>
                    {[
                        { name: 'Market Analyst', color: '#3B82F6', status: 'Ready' },
                        { name: 'Risk Manager', color: '#EF4444', status: 'Ready' },
                        { name: 'Macro Economist', color: '#F59E0B', status: 'Ready' },
                        { name: 'Sector Specialist', color: '#A855F7', status: 'Ready' },
                    ].map(a => (
                        <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                            <span style={{ fontSize: '12px', color: '#6B7280', flex: 1 }}>{a.name}</span>
                            <span style={{ fontSize: '10px', color: '#374151' }}>{a.status}</span>
                        </div>
                    ))}
                </div>

                {/* Context setter for analysis debrief */}
                <div style={{ marginTop: '20px', background: 'rgba(200,241,53,0.05)', border: '1px solid rgba(200,241,53,0.12)', borderRadius: '14px', padding: '14px' }}>
                    <p style={{ fontSize: '11px', color: '#C8F135', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Zap size={11} /> Run Analysis First
                    </p>
                    <p style={{ fontSize: '11px', color: '#4B5563', lineHeight: 1.5, marginBottom: '10px' }}>Get a full investment analysis, then use Agent Debrief mode to ask why.</p>
                    <a href="/analysis" style={{ display: 'block', textAlign: 'center', background: 'rgba(200,241,53,0.15)', border: '1px solid rgba(200,241,53,0.25)', borderRadius: '8px', padding: '8px', color: '#C8F135', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>
                        Go to Analysis →
                    </a>
                </div>
            </div>

            {/* Keyframes */}
            <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
      `}</style>
        </div>
    );
}
