'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Brain, Newspaper, TrendingUp, ShieldCheck, BookOpen,
    Send, RefreshCw, Mic, ChevronRight, User, Bot,
    AlertTriangle, Zap, BarChart2, Clock, X, ArrowUp, Plus, MessageSquare, Trash2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import ModeSelector, { MODES as PremiumModes } from '@/components/chat/ModeSelector';

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

interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    createdAt: string;
    lastMessageAt: string;
}

// ─── Mode config ──────────────────────────────────────────────────────────────
const MODES: { id: Mode; label: string; icon: React.ElementType; color: string; desc: string; starters: string[] }[] = [
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
const SESSIONS_KEY = 'invex_chat_sessions';
const ACTIVE_SID_KEY = 'invex_active_session';

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

// ─── Session helpers ──────────────────────────────────────────────────────────
function parseSessions(raw: string): ChatSession[] {
    return (JSON.parse(raw) as ChatSession[]).map(s => ({
        ...s, messages: s.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) }))
    }));
}

function pruneOldSessions(sessions: ChatSession[]): ChatSession[] {
    const cutoff = Date.now() - 5 * 24 * 60 * 60 * 1000;
    return sessions.filter(s => new Date(s.lastMessageAt).getTime() >= cutoff);
}

function loadSessions(): ChatSession[] {
    try {
        const raw = localStorage.getItem(SESSIONS_KEY);
        if (!raw) return [];
        return pruneOldSessions(parseSessions(raw));
    } catch { return []; }
}

function saveSessions(sessions: ChatSession[]) {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function makeSession(welcomeName: string): ChatSession {
    const id = Date.now().toString();
    const now = new Date().toISOString();
    return {
        id, title: 'New Chat',
        messages: [{ id: 'w-' + id, role: 'ai', content: `👋 Hi ${welcomeName.split(' ')[0]}, I am your AI investment agent! What do you want to know more about?`, mode: 'default', type: 'text', timestamp: new Date() }],
        createdAt: now, lastMessageAt: now,
    };
}

function getDayLabel(dateStr: string): string {
    const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (d === 0) return 'Today';
    if (d === 1) return 'Yesterday';
    return `${d} days ago`;
}

function groupSessions(sessions: ChatSession[]): { label: string; items: ChatSession[] }[] {
    const map = new Map<string, ChatSession[]>();
    const order: string[] = [];
    [...sessions].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
        .forEach(s => {
            const g = getDayLabel(s.lastMessageAt);
            if (!map.has(g)) { map.set(g, []); order.push(g); }
            map.get(g)!.push(s);
        });
    return order.map(l => ({ label: l, items: map.get(l)! }));
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
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string>('');
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
        let loaded = loadSessions();
        if (loaded.length === 0) {
            const s = makeSession(mem.name);
            loaded = [s];
            saveSessions(loaded);
        }
        const lastId = localStorage.getItem(ACTIVE_SID_KEY) || loaded[0].id;
        const active = loaded.find(s => s.id === lastId) || loaded[0];
        setSessions(loaded);
        setActiveSessionId(active.id);
        setMessages(active.messages);
        const lastAI = [...active.messages].reverse().find(m => m.role === 'ai');
        if (lastAI) setMode(lastAI.mode);
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const switchSession = (id: string) => {
        const s = sessions.find(x => x.id === id);
        if (!s) return;
        setActiveSessionId(id);
        setMessages(s.messages);
        localStorage.setItem(ACTIVE_SID_KEY, id);
        const lastAI = [...s.messages].reverse().find(m => m.role === 'ai');
        if (lastAI) setMode(lastAI.mode); else setMode('default');
        setSuggestions([]);
    };

    const startNewChat = () => {
        if (!memory) return;
        const s = makeSession(memory.name);
        const updated = [s, ...sessions];
        setSessions(updated);
        saveSessions(updated);
        setActiveSessionId(s.id);
        setMessages(s.messages);
        localStorage.setItem(ACTIVE_SID_KEY, s.id);
        setMode('default');
        setSuggestions([]);
    };

    const deleteSession = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = sessions.filter(s => s.id !== id);
        saveSessions(updated);
        if (activeSessionId === id) {
            if (updated.length > 0) { switchSession(updated[0].id); setSessions(updated); }
            else { const s = makeSession(memory?.name || 'Investor'); const ns = [s]; saveSessions(ns); setSessions(ns); setActiveSessionId(s.id); setMessages(s.messages); }
        } else { setSessions(updated); }
    };

    const updateActiveSession = (msgs: Message[]) => {
        const firstUser = msgs.find(m => m.role === 'user');
        const title = firstUser ? firstUser.content.slice(0, 38) + (firstUser.content.length > 38 ? '...' : '') : 'New Chat';
        const now = new Date().toISOString();
        setSessions(prev => {
            const updated = prev.map(s => s.id === activeSessionId ? { ...s, messages: msgs, title, lastMessageAt: now } : s);
            saveSessions(updated);
            return updated;
        });
    };

    const send = useCallback(async (text?: string) => {
        const msg = text || input.trim();
        if (!msg || sending) return;
        setInput('');
        setSending(true);

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msg, mode, type: 'text', timestamp: new Date() };
        const newMsgs = [...messages, userMsg];
        setMessages(newMsgs);

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
                    message: msg, mode,
                    context: { analysisReport: analysisCtx, userName: memory?.name, sessionId: activeSessionId },
                    memoryContext: memory ? `Name: ${memory.name}, Risk: ${memory.riskProfile}, Goal: ${memory.goals}, Past questions: ${memory.pastQuestions.slice(-5).join('; ')}` : '',
                }),
            });
            const data = await res.json();
            const effectiveMode = data.mode || mode;
            if (data.panicTriggered) setMode('calm-mode');
            const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', content: data.reply || 'No response received.', mode: effectiveMode, type: data.type || 'text', chartData: data.chartData, panicTriggered: data.panicTriggered, timestamp: new Date() };
            const finalMsgs = [...newMsgs, aiMsg];
            setMessages(finalMsgs);
            updateActiveSession(finalMsgs);
            if (data.suggestions) setSuggestions(data.suggestions);
        } catch {
            const errMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', content: "⚠️ Connection issue. Please make sure the backend is running on port 8000.", mode, type: 'text', timestamp: new Date() };
            const finalMsgs = [...newMsgs, errMsg];
            setMessages(finalMsgs);
            updateActiveSession(finalMsgs);
        } finally {
            setSending(false);
        }
    }, [input, mode, messages, memory, analysisCtx, sending, activeSessionId]);

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    const activeCfg = MODES.find(m => m.id === mode);
    const grouped = groupSessions(sessions);

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
            <div style={{ width: '260px', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', background: '#0D0D0D' }}>

                {/* Header + New Chat */}
                <div style={{ padding: '16px 14px 10px', flexShrink: 0 }}>
                    <button onClick={startNewChat} style={{ width: '100%', background: 'rgba(200,241,53,0.08)', border: '1px solid rgba(200,241,53,0.2)', borderRadius: '10px', padding: '9px 14px', color: '#C8F135', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', transition: 'all 0.15s' }}>
                        <Plus size={14} /> New Chat
                    </button>
                </div>

                {/* Session list — scrollable */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
                    {grouped.length === 0 && (
                        <p style={{ fontSize: '11px', color: '#374151', textAlign: 'center', padding: '20px 0' }}>No conversations yet</p>
                    )}
                    {grouped.map(group => (
                        <div key={group.label} style={{ marginBottom: '12px' }}>
                            <p style={{ fontSize: '10px', color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '6px 8px 4px', fontWeight: 600 }}>{group.label}</p>
                            {group.items.map(s => (
                                <div key={s.id}
                                    onClick={() => switchSession(s.id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '10px', cursor: 'pointer', background: s.id === activeSessionId ? 'rgba(255,255,255,0.07)' : 'transparent', border: s.id === activeSessionId ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent', marginBottom: '2px', transition: 'all 0.15s', group: 'hover' }}
                                >
                                    <MessageSquare size={13} color={s.id === activeSessionId ? '#C8F135' : '#4B5563'} style={{ flexShrink: 0 }} />
                                    <span style={{ flex: 1, fontSize: '12px', color: s.id === activeSessionId ? '#E5E7EB' : '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                                    <button onClick={(e) => deleteSession(s.id, e)} style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', padding: '2px', flexShrink: 0, display: 'flex', alignItems: 'center', opacity: 0.6 }}>
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Memory card */}
                {memory && (
                    <div style={{ margin: '0 14px 12px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '14px', padding: '14px', flexShrink: 0 }}>
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
                    <div style={{ margin: '0 14px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px', flexShrink: 0 }}>
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
                                <input value={(memory as any)[f.key]} onChange={e => {
                                    const upd = { ...memory, [f.key]: e.target.value };
                                    setMemory(upd); saveMemory(upd);
                                }} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 10px', color: '#fff', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                        ))}
                    </div>
                )}
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
                    <div className="relative">
                        <div className="flex items-end gap-3 bg-[rgba(255,255,255,0.06)] border border-white/10 rounded-2xl px-4 py-3 focus-within:border-white/20 transition-all shadow-lg">
                            <div className="pb-[2px]">
                                <ModeSelector
                                    activeMode={PremiumModes.find(m => m.id === (mode === 'memory' ? 'my-ai' : mode)) || PremiumModes[0]}
                                    onModeChange={(m) => setMode((m.id === 'my-ai' ? 'memory' : m.id) as any)}
                                />
                            </div>
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKey}
                                placeholder={
                                    mode === 'what-if' ? "Run a scenario... e.g. 'What if I invested ₹1L in Gold last year?'" :
                                        mode === 'calm-mode' ? "Tell me what's worrying you about the market..." :
                                            mode === 'agent-debrief' ? "Ask about any analysis... e.g. 'Why did you rate NIFTY 50 a BUY?'" :
                                                mode === 'news-radar' ? "Ask about news... e.g. 'How does RBI rate hold affect my portfolio?'" :
                                                    mode === 'memory' ? "Ask anything... e.g. 'What have you learned about me so far?'" :
                                                        "Ask anything about your investments..."
                                }
                                className="flex-1 bg-transparent border-0 focus:ring-0 resize-none py-1.5 max-h-48 text-white placeholder-gray-500 text-[15px] outline-none"
                                rows={1}
                            />
                            <button onClick={() => send()} disabled={!input.trim() || sending}
                                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-300 flex-shrink-0 mb-[2px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    backgroundColor: (!input.trim() || sending) ? 'rgba(255,255,255,0.1)' : (activeCfg?.color || '#C8F135')
                                }}>
                                {sending ? (
                                    <RefreshCw size={18} className="animate-spin text-black" />
                                ) : (
                                    <ArrowUp size={18} className={(!input.trim() || sending) ? "text-gray-500" : "text-black"} />
                                )}
                            </button>
                        </div>
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
