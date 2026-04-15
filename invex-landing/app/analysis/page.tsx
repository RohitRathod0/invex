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
        setLogs([{ t: new Date().toLocaleTimeString(), msg: '🚀 Initializing Invex AI crew...', kind: 'info' }]);
        try {
            let sid = sessionId;
            if (!sid) {
                addLog('📋 Creating session...', 'info');
                const sr = await fetch('/api/v1/sessions/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_name: 'Invex User' }) });
                if (!sr.ok) throw new Error(`Session failed: ${sr.status}`);
                const sd = await sr.json(); sid = sd.session_id; setSessionId(sid ?? null);
                addLog(`✅ Session: ${sid?.slice(0, 8)}...`, 'done');
            }
            addLog('🤖 Market Analyst scanning NSE/BSE...', 'think');
            addLog('🌍 Macro Economist analyzing RBI + global...', 'think');
            const rr = await fetch('/api/v1/agents/run', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sid, message: buildPrompt(), inputs: { investment_amount: +amount, risk_tolerance: risk, investment_goal: goal, time_horizon: horizon, asset_classes: assets, age: +age, annual_income: +income } }),
            });
            if (!rr.ok) { const t = await rr.text(); throw new Error(`Agent error (${rr.status}): ${t.slice(0, 200)}`); }
            const rd = await rr.json();
            if (rd.status === 'failed') throw new Error(rd.error || 'Agent run failed');
            addLog('⚖️ Risk Manager finalizing...', 'think');
            addLog('✅ Analysis complete!', 'done');
            setResult(rd.result || rd.output || JSON.stringify(rd, null, 2));
        } catch (e: any) {
            const m = e.message || 'Connection failed';
            setError(m); addLog(`❌ ${m}`, 'err');
        } finally { setRunning(false); }
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
                        <div style={{ ...card, overflow: 'hidden', flex: 1 }}>
                            <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3 style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                                    <CheckCircle size={15} color="#C8F135" /> Analysis Report
                                </h3>
                                <button onClick={download} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: 'rgba(200,241,53,0.1)', color: '#C8F135', border: '1px solid rgba(200,241,53,0.2)', borderRadius: '10px', padding: '6px 14px', cursor: 'pointer' }}>
                                    <Download size={12} /> Download
                                </button>
                            </div>
                            <div style={{ padding: '20px', overflowY: 'auto', maxHeight: '520px' }}>
                                <pre style={{ color: '#D1D5DB', fontSize: '13px', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: 'sans-serif' }}>{result}</pre>
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
