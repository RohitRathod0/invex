import { useEffect, useState } from 'react';
import {
    Activity, FileText, MessageSquare, Plus, TrendingUp,
    ArrowUpRight, ArrowDownRight, BarChart3, Bot, Clock,
    RefreshCw
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/api/apiClient';

// ——— Types ———
interface Ticker { key: string; label: string; value: string; change: string; up: boolean; }

// ——— Hardcoded portfolio allocation (sample) ———
const ALLOCATION = [
    { label: 'Stocks', pct: 45, color: '#3b82f6', amount: '₹45,000' },
    { label: 'Mutual Funds', pct: 30, color: '#8b5cf6', amount: '₹30,000' },
    { label: 'Gold', pct: 15, color: '#f59e0b', amount: '₹15,000' },
    { label: 'Crypto', pct: 10, color: '#10b981', amount: '₹10,000' },
];

const RECENT_ACTIVITY = [
    { title: 'Portfolio Analysis', desc: '₹1,00,000 · 5 yr · Moderate', time: 'Today' },
    { title: 'Market Research', desc: 'NSE top performers fetched', time: '2 days ago' },
    { title: 'News Alert', desc: 'Fed rate decision — impact analyzed', time: '3 days ago' },
];

// ——— SVG Donut Chart ———
const DonutChart = () => {
    const size = 160; const r = 58; const cx = 80; const cy = 80;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    const segments = ALLOCATION.map(item => {
        const dash = (item.pct / 100) * circ;
        const seg = { ...item, dash, offset, gap: circ - dash };
        offset += dash; return seg;
    });
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={20} />
            {segments.map((seg, i) => (
                <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={18}
                    strokeDasharray={`${seg.dash} ${seg.gap}`} strokeDashoffset={-seg.offset}
                    strokeLinecap="round" className="transition-all duration-700" />
            ))}
        </svg>
    );
};

// ——— Ticker Card ———
const TickerCard = ({ t }: { t: Ticker }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{t.label}</p>
        <p className="text-lg font-bold text-gray-900">{t.value}</p>
        <div className={`flex items-center gap-1 text-xs font-semibold ${t.up ? 'text-emerald-600' : 'text-red-500'}`}>
            {t.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {t.change}
        </div>
    </div>
);

// ——— Default fallback tickers ———
const DEFAULT_TICKERS: Ticker[] = [
    { key: 'nifty50', label: 'Nifty 50', value: '—', change: '—', up: true },
    { key: 'sensex', label: 'Sensex', value: '—', change: '—', up: true },
    { key: 'gold', label: 'Gold', value: '—', change: '—', up: true },
    { key: 'btc', label: 'BTC/USD', value: '—', change: '—', up: true },
];

export const DashboardPage = () => {
    const navigate = useNavigate();
    const { createSession } = useAppStore();
    const { user } = useAuthStore();

    const [tickers, setTickers] = useState<Ticker[]>(DEFAULT_TICKERS);
    const [tickersLoading, setTickersLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<string>('');

    const firstName = user?.firstName || user?.name?.split(' ')[0] || 'Investor';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    const fetchTickers = async () => {
        setTickersLoading(true);
        try {
            const res = await apiClient.get('/market/tickers');
            setTickers(res.data.tickers);
            setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
        } catch {
            // keep defaults
        } finally {
            setTickersLoading(false);
        }
    };

    useEffect(() => {
        fetchTickers();
        // Auto-refresh every 2 minutes
        const interval = setInterval(fetchTickers, 120_000);
        return () => clearInterval(interval);
    }, []);

    const handleNewChat = async () => {
        await createSession(user?.name);
        navigate('/');
    };

    return (
        <div className="p-6 lg:p-8 space-y-6 h-full overflow-y-auto" style={{ background: '#f8fafc' }}>
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                        {greeting},{' '}
                        <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">{firstName}!</span>
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">Your investment overview for today.</p>
                </div>
                <button onClick={handleNewChat}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-blue-200 transition-all font-semibold text-sm">
                    <Plus size={18} />New Analysis
                </button>
            </div>

            {/* Market Tickers — live from backend */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Live Markets</h2>
                    <div className="flex items-center gap-2">
                        {lastUpdated && <span className="text-xs text-gray-400">Updated {lastUpdated}</span>}
                        <button onClick={fetchTickers} disabled={tickersLoading}
                            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50 disabled:opacity-50">
                            <RefreshCw size={14} className={tickersLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {tickers.map((t, i) => (
                        tickersLoading && t.value === '—'
                            ? <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 h-24 animate-pulse">
                                <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
                                <div className="h-6 bg-gray-200 rounded w-24 mb-2" />
                                <div className="h-3 bg-gray-200 rounded w-12" />
                            </div>
                            : <TickerCard key={i} t={t} />
                    ))}
                </div>
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Portfolio donut */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-800">Portfolio Allocation</h3>
                        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">Sample</span>
                    </div>
                    <div className="flex justify-center mb-5">
                        <div className="relative">
                            <DonutChart />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <p className="text-xs text-gray-400">Total</p>
                                <p className="text-lg font-bold text-gray-800">₹1L</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2.5 mt-auto">
                        {ALLOCATION.map((item, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                                    <span className="text-sm text-gray-600">{item.label}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-gray-400">{item.amount}</span>
                                    <span className="text-sm font-semibold text-gray-800">{item.pct}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right column */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { icon: MessageSquare, label: 'Sessions', value: '12', bg: 'bg-blue-50', tc: 'text-blue-600' },
                            { icon: Activity, label: 'Agent Runs', value: '45', bg: 'bg-purple-50', tc: 'text-purple-600' },
                            { icon: FileText, label: 'Documents', value: '8', bg: 'bg-emerald-50', tc: 'text-emerald-600' },
                        ].map((s, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                                    <s.icon size={20} className={s.tc} />
                                </div>
                                <p className="text-xs text-gray-400 font-medium">{s.label}</p>
                                <p className="text-2xl font-bold text-gray-800 mt-0.5">{s.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* AI CTA */}
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
                        <div className="absolute bottom-0 left-20 w-32 h-32 bg-white/5 rounded-full translate-y-10" />
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-2">
                                <Bot size={20} className="text-blue-200" />
                                <span className="text-blue-200 text-sm font-medium">AI Investment Agent</span>
                            </div>
                            <h3 className="text-xl font-bold mb-1">Ready to build your portfolio?</h3>
                            <p className="text-blue-200 text-sm mb-5">Get AI-powered analysis with real NSE data + geo-political signals.</p>
                            <button onClick={handleNewChat}
                                className="flex items-center gap-2 bg-white text-blue-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors shadow-md">
                                <BarChart3 size={16} />Start Analysis<ArrowUpRight size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                <Clock size={16} className="text-gray-400" /> Recent Activity
                            </h3>
                            <button onClick={() => navigate('/')} className="text-xs text-blue-600 hover:text-blue-800 font-medium">View all →</button>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {RECENT_ACTIVITY.map((a, i) => (
                                <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                                    <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <TrendingUp size={16} className="text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800">{a.title}</p>
                                        <p className="text-xs text-gray-400 truncate">{a.desc}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <span className="text-xs text-gray-400">{a.time}</span>
                                        <div className="mt-1 flex justify-end">
                                            <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">Done</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
