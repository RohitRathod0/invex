'use client';
import React, { useState, useRef, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, RefreshCw, Bot, Loader2, Play, FileText, Download, CheckCircle, ChevronDown, BarChart3, Shield, Globe2, Banknote, TrendingUp, Zap } from 'lucide-react';

type Ticker = { label: string; value: string; change: string; up: boolean };
type Log = { t: string; msg: string; kind: 'info' | 'think' | 'done' | 'err' };

const RISK = ['Conservative', 'Moderate', 'Aggressive'];
const GOALS = ['Wealth Creation', 'Retirement', 'Tax Saving (ELSS)', 'Short-term Growth', 'Income Generation'];
const HORIZONS = ['< 1 Year', '1–3 Years', '3–5 Years', '5–10 Years', '10+ Years'];
const ASSETS = ['Stocks (NSE/BSE)', 'Mutual Funds', 'Gold / Commodities', 'Crypto', 'Bonds / FDs', 'Real Estate'];
const AGENTS = [
    { icon: TrendingUp, label: 'Market Analyst', desc: 'NSE/BSE deep dive', c: '#C8F135' },
    { icon: Globe2, label: 'Macro Economist', desc: 'RBI & global trends', c: '#3b82f6' },
    { icon: Shield, label: 'Risk Manager', desc: 'Portfolio protection', c: '#f97316' },
    { icon: Banknote, label: 'Sector Specialist', desc: 'Fund & stock picks', c: '#8b5cf6' },
];

const DEFAULT_TICKERS: Ticker[] = [
    { label: 'NIFTY 50', value: '25,179', change: '-1.25%', up: false },
    { label: 'SENSEX', value: '82,400', change: '-0.89%', up: false },
    { label: 'GOLD', value: '₹73,200', change: '+0.30%', up: true },
    { label: 'BTC/USD', value: '$94,500', change: '+2.10%', up: true },
];

const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '20px',
};

export default function AnalysisPage() {
    const [amount, setAmount] = useState('100000');
    const [income, setIncome] = useState('1200000');
    const [age, setAge] = useState('30');
    const [risk, setRisk] = useState('Moderate');
    const [goal, setGoal] = useState('Wealth Creation');
    const [horizon, setHorizon] = useState('5–10 Years');
    const [assets, setAssets] = useState(['Stocks (NSE/BSE)', 'Mutual Funds']);
    const [tickers, setTickers] = useState<Ticker[]>(DEFAULT_TICKERS);
    const [tickLoading, setTickLoading] = useState(false);
    const [running, setRunning] = useState(false);
    const [logs, setLogs] = useState<Log[]>([]);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [profileBadge, setProfileBadge] = useState<string | null>(null); // e.g. "Moderate"
    const logsEnd = useRef<HTMLDivElement>(null);

    const fetchTickers = async () => {
        setTickLoading(true);
        try {
            const r = await fetch('/api/v1/market/tickers');
            const d = await r.json();
            if (d.tickers) setTickers(d.tickers);
        } catch { }
        finally { setTickLoading(false); }
    };

    // ── Fetch risk profile on mount and pre-fill form ───────────────────────
    useEffect(() => {
        const uid = localStorage.getItem('invex_user_id') || '0000-user';
        setUserId(uid);
        (async () => {
            try {
                const res = await fetch(`/api/v1/risk/profile/${uid}`);
                if (!res.ok) return;
                const d = await res.json();
                if (!d.exists || !d.user_context) return;
                const ctx = d.user_context;
                // Pre-fill risk
                const label: string = (ctx.risk_label || '').toLowerCase();
                if (label.includes('conserv'))      { setRisk('Conservative'); }
                else if (label.includes('aggress'))  { setRisk('Aggressive'); }
                else                                 { setRisk('Moderate'); }
                setProfileBadge((ctx.risk_label || '').replace(/_/g, ' '));
                // Pre-fill horizon
                const yrs: number = ctx.horizon_years || 0;
                if (yrs <= 1)       setHorizon('< 1 Year');
                else if (yrs <= 3)  setHorizon('1–3 Years');
                else if (yrs <= 5)  setHorizon('3–5 Years');
                else if (yrs <= 10) setHorizon('5–10 Years');
                else                setHorizon('10+ Years');
                // Pre-fill preferred sectors as assets if available
                const prefs: string[] = ctx.preferred_sectors || [];
                if (prefs.length > 0) {
                    // keep existing defaults, just a hint
                }
            } catch { /* no profile yet — fine */ }
        })();
    }, []);

    useEffect(() => { fetchTickers(); }, []);
    useEffect(() => { logsEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

    const addLog = (msg: string, kind: Log['kind'] = 'info') =>
        setLogs(p => [...p, { t: new Date().toLocaleTimeString(), msg, kind }]);

    const toggleAsset = (a: string) => setAssets(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);

    const buildPrompt = () =>
        `Investment Analysis for Indian Investor:\n- Amount: ₹${Number(amount).toLocaleString('en-IN')}\n- Age: ${age} | Income: ₹${Number(income).toLocaleString('en-IN')}\n- Risk: ${risk} | Goal: ${goal} | Horizon: ${horizon}\n- Assets: ${assets.join(', ')}\nProvide: asset allocation % for NSE/BSE, specific fund/stock picks, 3 return scenarios, action plan, tax implications under Indian law.`;

    const run = async () => {
        if (!amount || assets.length === 0) return;
        setRunning(true); setResult(null); setError(null);
        setLogs([{ t: new Date().toLocaleTimeString(), msg: '🚀 Initializing Invex AI agents...', kind: 'info' }]);

        const assetPrefs = {
            stocks:       assets.some(a => /stock|nse|bse|equity/i.test(a)),
            mutual_funds: assets.some(a => /mutual|fund/i.test(a)),
            gold:         assets.some(a => /gold|commodit/i.test(a)),
            crypto:       assets.some(a => /crypto|bitcoin/i.test(a)),
        };

        try {
            // Create session if needed
            let sid = sessionId;
            if (!sid) {
                addLog('📋 Creating session...', 'info');
                const sr = await fetch('/api/v1/sessions/', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_name: 'Invex User' }),
                });
                if (!sr.ok) throw new Error(`Session failed: ${sr.status}`);
                const sd = await sr.json();
                sid = sd.session_id; setSessionId(sid ?? null);
                addLog(`✅ Session: ${sid?.slice(0, 8)}...`, 'done');
            }

            // ── SSE streaming fetch ──────────────────────────────────────────
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 900_000); // 15 min max

            // Bypass Next.js API rewrite to prevent stream buffering in development
            const backendUrl = process.env.NODE_ENV === 'development' 
                ? 'http://localhost:8000/api/v1/agents/run/stream'
                : '/api/v1/agents/run/stream';

            const rr = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: ctrl.signal,
                body: JSON.stringify({
                    session_id: sid,
                    message: buildPrompt(),
                    user_id: userId,           // ← risk profile injected server-side
                    inputs: {
                        capital_amount:    +amount,
                        investment_amount: +amount,
                        risk_tolerance:    risk,
                        risk_percentage:   risk === 'Conservative' ? 25 : risk === 'Aggressive' ? 75 : 50,
                        investment_goal:   goal,
                        time_horizon:      horizon,
                        duration_years:    5,
                        asset_classes:     assets,
                        asset_preferences: assetPrefs,
                        age:               +age,
                        annual_income:     +income,
                    },
                }),
            });
            clearTimeout(timer);

            if (!rr.ok || !rr.body) {
                throw new Error(`Stream request failed: ${rr.status}`);
            }

            // Read the SSE stream line by line
            const reader = rr.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            const processEvent = (data: string) => {
                try {
                    const ev = JSON.parse(data);

                    if (ev.type === 'start') {
                        addLog('⚡ Agents online — starting analysis...', 'info');

                    } else if (ev.type === 'provider_start') {
                        addLog(`🔗 Using ${ev.model?.split('/')[0] || 'AI'} for analysis`, 'info');

                    } else if (ev.type === 'task_done') {
                        // Show each agent's completion + first line of summary
                        const firstLine = ev.summary?.split('\n')[0]?.slice(0, 80) || '';
                        addLog(`${ev.emoji || '✅'} ${ev.agent} completed${firstLine ? ` — ${firstLine}…` : ''}`, 'done');

                    } else if (ev.type === 'provider_switch') {
                        addLog(`🔄 Switching provider (${ev.from_model?.split('/')[0]}) — retrying...`, 'think');

                    } else if (ev.type === 'log') {
                        addLog(`ℹ️ ${ev.message}`, 'think');

                    } else if (ev.type === 'final') {
                        // Full report received — render it
                        const payload = ev.payload;
                        const rd = payload?.result;
                        const reportData = rd?.structured_data || rd?.report || rd;
                        if (reportData) {
                            addLog(`🏁 Report complete! (${payload?.model_used?.split('/')[0] || 'AI'})`, 'done');
                            setResult(typeof reportData === 'string' ? reportData : JSON.stringify(reportData));
                        }

                    } else if (ev.type === 'error') {
                        // Only show error if we have no result yet
                        setResult(prev => {
                            if (!prev) {
                                setError(ev.message || 'Analysis failed');
                                addLog(`❌ ${ev.message}`, 'err');
                            }
                            return prev;
                        });
                    }
                } catch { /* ignore malformed events */ }
            };

            // Stream loop
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? ''; // keep incomplete last line
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        processEvent(line.slice(6).trim());
                    }
                }
            }

        } catch (e: any) {
            if (e.name === 'AbortError') {
                setError('Analysis timed out after 15 minutes.');
                addLog('❌ Timed out', 'err');
            } else {
                // Only show the error if we haven't already shown a report
                setResult(prev => {
                    if (!prev) {
                        setError(e.message || 'Connection failed');
                        addLog(`❌ ${e.message || 'Connection failed'}`, 'err');
                    }
                    return prev;
                });
            }
        } finally {
            setRunning(false);
        }
    };


    const download = () => {
        if (!result) return;
        const b = new Blob([result], { type: 'text/plain' });
        const u = URL.createObjectURL(b);
        const a = document.createElement('a'); a.href = u; a.download = `invex-analysis-${Date.now()}.txt`; a.click(); URL.revokeObjectURL(u);
    };

    const selStyle: React.CSSProperties = {
        width: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px', padding: '11px 16px', color: '#fff', fontSize: '14px',
        outline: 'none', appearance: 'none', cursor: 'pointer',
    };
    const inputStyle: React.CSSProperties = { ...selStyle };
    const labelStyle: React.CSSProperties = { fontSize: '10px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px', display: 'block' };

    return (
        <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff' }}>

            {/* Topbar */}
            <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 40px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: running ? '#C8F135' : '#374151', boxShadow: running ? '0 0 8px #C8F135' : 'none', animation: running ? 'pulseGlow 1.5s infinite' : 'none' }} />
                <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Investment Analysis</h1>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6B7280' }}>
                    <Zap size={12} color="#C8F135" /> Live · CrewAI agents
                </div>
            </div>

            {/* Live tickers */}
            <div style={{ padding: '24px 40px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '28px' }}>
                    {tickers.map((t, i) => (
                        <div key={i} style={{ ...card, padding: '18px 20px' }}>
                            <p style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>{t.label}</p>
                            <p style={{ fontSize: '20px', fontWeight: 700 }}>{t.value}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '13px', fontWeight: 600, color: t.up ? '#C8F135' : '#EF4444', marginTop: '4px' }}>
                                {t.up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {t.change}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main 5-col grid: form (2/5) | activity+result (3/5) */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '20px', padding: '0 40px 40px', alignItems: 'start' }}>

                {/* LEFT: Form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ ...card, padding: '26px' }}>
                        <h2 style={{ fontWeight: 600, fontSize: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BarChart3 size={17} color="#C8F135" /> Your Investment Profile
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div><label style={labelStyle}>Amount (₹)</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} /></div>
                                <div><label style={labelStyle}>Annual Income (₹)</label><input type="number" value={income} onChange={e => setIncome(e.target.value)} style={inputStyle} /></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div><label style={labelStyle}>Age</label><input type="number" value={age} onChange={e => setAge(e.target.value)} style={inputStyle} /></div>
                                <div><label style={labelStyle}>Risk Tolerance</label>
                                    <select value={risk} onChange={e => setRisk(e.target.value)} style={selStyle}>
                                        {RISK.map(o => <option key={o}>{o}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Investment Goal</label>
                                <select value={goal} onChange={e => setGoal(e.target.value)} style={selStyle}>
                                    {GOALS.map(o => <option key={o}>{o}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Time Horizon</label>
                                <select value={horizon} onChange={e => setHorizon(e.target.value)} style={selStyle}>
                                    {HORIZONS.map(o => <option key={o}>{o}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Asset Classes</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                                    {ASSETS.map(a => (
                                        <button key={a} onClick={() => toggleAsset(a)} style={{
                                            padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', border: assets.includes(a) ? '1px solid rgba(200,241,53,0.4)' : '1px solid rgba(255,255,255,0.1)',
                                            background: assets.includes(a) ? 'rgba(200,241,53,0.12)' : 'transparent',
                                            color: assets.includes(a) ? '#C8F135' : '#6B7280',
                                            transition: 'all 0.15s ease',
                                        }}>{a}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Agent cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {AGENTS.map((a, i) => (
                            <div key={i} style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${a.c}15`, border: `1px solid ${a.c}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <a.icon size={16} color={a.c} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.label}</p>
                                    <p style={{ fontSize: '11px', color: '#6B7280' }}>{a.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Start button */}
                    <button onClick={run} disabled={running || !amount || assets.length === 0} style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        background: running ? '#1a2a00' : '#C8F135', color: running ? '#C8F135' : '#000',
                        fontWeight: 700, fontSize: '15px', padding: '15px', borderRadius: '16px',
                        border: running ? '1px solid rgba(200,241,53,0.2)' : 'none',
                        cursor: (running || !amount || assets.length === 0) ? 'not-allowed' : 'pointer',
                        boxShadow: '0 0 30px rgba(200,241,53,0.2)', transition: 'all 0.2s ease',
                        opacity: (!amount || assets.length === 0) ? 0.5 : 1,
                    }}>
                        {running ? <><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Agents working...</> : <><Play size={18} fill="black" /> Start Investment Analysis</>}
                    </button>
                </div>

                {/* RIGHT: Logs + Result */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Log panel */}
                    <div style={{ ...card, overflow: 'hidden' }}>
                        <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: running ? '#C8F135' : '#374151' }} />
                                Agent Activity
                            </h3>
                            {running && <span style={{ fontSize: '10px', color: '#C8F135', background: 'rgba(200,241,53,0.1)', padding: '3px 10px', borderRadius: '999px', fontWeight: 700 }}>RUNNING</span>}
                        </div>
                        <div style={{ padding: '16px 20px', fontFamily: 'monospace', fontSize: '12px', overflowY: 'auto', minHeight: '160px', maxHeight: '260px' }}>
                            {logs.length === 0
                                ? <p style={{ color: '#374151', textAlign: 'center', fontFamily: 'sans-serif', fontSize: '14px', padding: '24px 0' }}>Fill your profile and hit <strong style={{ color: '#6B7280' }}>Start Investment Analysis</strong></p>
                                : logs.map((l, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', lineHeight: 1.5, color: l.kind === 'think' ? 'rgba(200,241,53,0.7)' : l.kind === 'done' ? '#10B981' : l.kind === 'err' ? '#EF4444' : '#9CA3AF' }}>
                                        <span style={{ color: '#374151', flexShrink: 0 }}>[{l.t}]</span><span>{l.msg}</span>
                                    </div>
                                ))
                            }
                            <div ref={logsEnd} />
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '16px', padding: '20px', fontSize: '13px' }}>
                            <p style={{ fontWeight: 600, color: '#EF4444', marginBottom: '6px' }}>⚠️ Error</p>
                            <p style={{ color: 'rgba(239,68,68,0.7)', lineHeight: 1.6 }}>{error}</p>
                            <code style={{ display: 'block', marginTop: '10px', fontSize: '11px', color: 'rgba(239,68,68,0.5)', background: 'rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: '8px' }}>
                                Ensure: cd backend && uvicorn main:app --port 8000
                            </code>
                        </div>
                    )}

                    {/* Result */}
                    {result ? (
                        <div style={{ ...card, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3 style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                                    <CheckCircle size={15} color="#C8F135" /> Analysis Report
                                </h3>
                                <button onClick={download} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: 'rgba(200,241,53,0.1)', color: '#C8F135', border: '1px solid rgba(200,241,53,0.2)', borderRadius: '10px', padding: '6px 14px', cursor: 'pointer' }}>
                                    <Download size={12} /> Download
                                </button>
                            </div>
                            <div style={{ padding: '20px', overflowY: 'auto', maxHeight: '600px', flex: 1 }}>
                                {(() => {
                                    try {
                                        const parsed = typeof result === 'string' ? JSON.parse(result) : result;
                                        if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
                                            // Render structured JSON dashboard
                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                                    {/* Top Stats */}
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px' }}>
                                                            <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>Total Capital</div>
                                                            <div style={{ fontSize: '20px', fontWeight: 700, color: '#C8F135' }}>₹{parsed.total_capital?.toLocaleString('en-IN') || amount}</div>
                                                        </div>
                                                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px' }}>
                                                            <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>Risk Profile</div>
                                                            <div style={{ fontSize: '20px', fontWeight: 700 }}>{parsed.user_risk_profile || risk}</div>
                                                        </div>
                                                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px' }}>
                                                            <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>Diversification Score</div>
                                                            <div style={{ fontSize: '20px', fontWeight: 700, color: parsed.diversification_score > 70 ? '#10B981' : '#F59E0B' }}>
                                                                {parsed.diversification_score || 0}/100
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Macro Context */}
                                                    {parsed.macro_context && (
                                                        <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', padding: '16px', borderRadius: '12px', display: 'flex', gap: '12px' }}>
                                                            <Globe2 size={20} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
                                                            <div>
                                                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#60a5fa', marginBottom: '4px' }}>Macro Context</div>
                                                                <div style={{ fontSize: '13px', color: '#D1D5DB', lineHeight: 1.6 }}>{parsed.macro_context}</div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Recommendations */}
                                                    <div>
                                                        <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <Banknote size={16} color="#C8F135" /> Recommendations ({parsed.recommendations.length})
                                                        </h4>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                            {parsed.recommendations.map((rec: any, i: number) => (
                                                                <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
                                                                    
                                                                    {/* Card Header */}
                                                                    <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                            <div style={{ background: '#111', border: '1px solid #333', color: '#fff', fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px' }}>
                                                                                {rec.symbol}
                                                                            </div>
                                                                            <div>
                                                                                <div style={{ fontSize: '15px', fontWeight: 600 }}>{rec.company_name}</div>
                                                                                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{rec.asset_class} • {rec.sector}</div>
                                                                            </div>
                                                                        </div>
                                                                        <div style={{ textAlign: 'right' }}>
                                                                            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>Action</div>
                                                                            <div style={{ 
                                                                                fontSize: '13px', fontWeight: 700, padding: '4px 12px', borderRadius: '4px',
                                                                                background: rec.action === 'BUY' ? 'rgba(16,185,129,0.1)' : rec.action === 'SELL' ? 'rgba(239,68,68,0.1)' : 'rgba(107,114,128,0.1)',
                                                                                color: rec.action === 'BUY' ? '#10B981' : rec.action === 'SELL' ? '#EF4444' : '#9CA3AF'
                                                                            }}>
                                                                                {rec.action} ({rec.allocation_percentage}%)
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Card Body */}
                                                                    <div style={{ padding: '20px' }}>
                                                                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 240px', gap: '24px' }}>
                                                                            
                                                                            {/* Reasons */}
                                                                            <div>
                                                                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Investment Thesis</div>
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                                                    {rec.reasons?.map((r: any, rIdx: number) => (
                                                                                        <div key={rIdx} style={{ fontSize: '13px', lineHeight: 1.6, display: 'flex', gap: '8px' }}>
                                                                                            <span style={{ color: '#C8F135' }}>•</span> 
                                                                                            <div>
                                                                                                <span style={{ color: '#D1D5DB' }}>{r.text}</span>
                                                                                                {r.data_point && <span style={{ marginLeft: '6px', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: '#9CA3AF' }}>{r.data_point}</span>}
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>

                                                                            {/* Targets & Risks */}
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: '24px' }}>
                                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                                                    <div>
                                                                                        <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>Target</div>
                                                                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#10B981' }}>₹{rec.target_price}</div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>Stop Loss</div>
                                                                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#EF4444' }}>₹{rec.stop_loss}</div>
                                                                                    </div>
                                                                                </div>
                                                                                
                                                                                <div>
                                                                                    <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '8px' }}>Confidence</div>
                                                                                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                                                                        <div style={{ height: '100%', width: `${rec.confidence_score}%`, background: '#C8F135', borderRadius: '3px' }} />
                                                                                    </div>
                                                                                </div>

                                                                                {rec.risks && rec.risks.length > 0 && (
                                                                                    <div>
                                                                                        <div style={{ fontSize: '11px', color: '#EF4444', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                            <Shield size={10} /> Key Risk
                                                                                        </div>
                                                                                        <div style={{ fontSize: '12px', color: '#D1D5DB', lineHeight: 1.4 }}>
                                                                                            {rec.risks[0]}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                </div>
                                            );
                                        }
                                        // Fallback rendering if parsed JSON doesn't match expected struct
                                        return <pre style={{ color: '#D1D5DB', fontSize: '13px', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{JSON.stringify(parsed, null, 2)}</pre>;
                                    } catch (e) {
                                        // Fallback for markdown/raw string
                                        return <pre style={{ color: '#D1D5DB', fontSize: '13px', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: 'sans-serif' }}>{result}</pre>;
                                    }
                                })()}
                            </div>
                        </div>
                    ) : !error && !running && (
                        <div style={{ ...card, padding: '60px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', flex: 1 }}>
                            <div style={{ width: '60px', height: '60px', background: 'rgba(200,241,53,0.08)', border: '1px solid rgba(200,241,53,0.15)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                                <FileText size={26} color="rgba(200,241,53,0.4)" />
                            </div>
                            <p style={{ color: '#fff', fontWeight: 600, fontSize: '16px', marginBottom: '8px' }}>Your report will appear here</p>
                            <p style={{ color: '#4B5563', fontSize: '13px', maxWidth: '280px', lineHeight: 1.6 }}>4 CrewAI agents will collaborate to produce your personalized Indian investment strategy</p>
                            <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', maxWidth: '340px' }}>
                                {['Asset Allocation', 'Stock Picks', 'Risk Assessment', 'Tax Planning'].map(item => (
                                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '12px 14px' }}>
                                        <CheckCircle size={13} color="#374151" />
                                        <span style={{ color: '#4B5563', fontSize: '12px' }}>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
