import React, { useState } from 'react';
import {
    Bot, MessageSquare, Database, Settings, LayoutDashboard,
    LogOut, Bell, X, Loader2
} from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/useAuthStore';
import ReactMarkdown from 'react-markdown';

const SidebarItem = ({ icon: Icon, label, to, active }: any) => (
    <Link to={to}
        className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all",
            active ? "bg-white/15 text-white shadow-sm" : "text-gray-400 hover:bg-white/10 hover:text-gray-200"
        )}>
        <Icon size={18} />
        <span className="font-medium text-sm">{label}</span>
    </Link>
);

export const AppLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();

    // News alert state
    const [newsLoading, setNewsLoading] = useState(false);
    const [newsResult, setNewsResult] = useState<string | null>(null);
    const [newsError, setNewsError] = useState<string | null>(null);
    const [showNewsPanel, setShowNewsPanel] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    const triggerNewsAnalysis = async () => {
        setNewsLoading(true);
        setNewsError(null);
        setShowNewsPanel(true);
        setNewsResult(null);
        try {
            await fetch('/api/v1/news/analyze', { method: 'POST' });
            let attempts = 0;
            const poll = async (): Promise<void> => {
                const res = await fetch('/api/v1/news/result');
                const data = await res.json();
                if (data.is_running && attempts < 60) {
                    attempts++;
                    await new Promise(r => setTimeout(r, 3000));
                    return poll();
                }
                if (data.result?.status === 'success') {
                    setNewsResult(data.result.result);
                } else if (data.result?.error) {
                    setNewsError(data.result.error);
                } else {
                    setNewsError('No result yet — try again in a moment.');
                }
            };
            await poll();
        } catch {
            setNewsError('Failed to connect to analysis service.');
        } finally {
            setNewsLoading(false);
        }
    };

    const initials = user?.initials || 'U';
    const displayName = user?.name || 'User';
    const subLabel = user?.email
        ? user.email.split('@')[0]
        : user?.phone ? user.phone : 'Free Plan';

    return (
        <div className="flex h-screen overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)' }}>

            {/* ── Sidebar ── */}
            <aside className="w-64 flex flex-col border-r border-white/10"
                style={{ backdropFilter: 'blur(12px)' }}>

                {/* Logo */}
                <div className="p-6 flex items-center space-x-3 border-b border-white/10">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Bot size={20} className="text-white" />
                    </div>
                    <h1 className="text-lg font-bold text-white tracking-tight">Invex AI</h1>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/dashboard"
                        active={location.pathname === '/dashboard'} />
                    <SidebarItem icon={MessageSquare} label="Chat" to="/"
                        active={location.pathname === '/' || location.pathname.startsWith('/chat')} />
                    <SidebarItem icon={Database} label="Knowledge Base" to="/knowledge"
                        active={location.pathname === '/knowledge'} />
                    <SidebarItem icon={Settings} label="Settings" to="/settings"
                        active={location.pathname === '/settings'} />

                    {/* ── News Alert button ── */}
                    <div className="pt-3 border-t border-white/10 mt-3">
                        <button
                            onClick={triggerNewsAnalysis}
                            disabled={newsLoading}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-amber-500/20 hover:text-amber-300 transition-all"
                        >
                            <div className="relative">
                                <Bell size={18} />
                                {newsLoading && (
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                )}
                            </div>
                            <span className="font-medium text-sm flex-1 text-left">
                                {newsLoading ? 'Analyzing news...' : 'Market News Alert'}
                            </span>
                            {newsLoading && <Loader2 size={14} className="animate-spin" />}
                        </button>
                    </div>
                </nav>

                {/* User section */}
                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-md flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}>
                            {user?.avatar
                                ? <img src={user.avatar} alt={displayName} className="w-9 h-9 rounded-xl object-cover" />
                                : initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                            <p className="text-xs text-gray-500 truncate">{subLabel}</p>
                        </div>
                        <button onClick={handleLogout} title="Sign out"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-white/10">
                            <LogOut size={15} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Main content ── */}
            <main className="flex-1 flex flex-col bg-gray-50 text-gray-900 overflow-hidden">
                <Outlet />
            </main>

            {/* ── News Analysis Side Panel ── */}
            {showNewsPanel && (
                <div className="fixed inset-0 z-50 flex justify-end" onClick={e => {
                    if (e.target === e.currentTarget) setShowNewsPanel(false);
                }}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/40" />
                    {/* Panel */}
                    <div className="relative w-full max-w-2xl h-full bg-gray-950 border-l border-white/10 shadow-2xl flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gray-900/80">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                                    <Bell size={16} className="text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="text-white font-semibold text-sm">Market News Alert</h2>
                                    <p className="text-gray-500 text-xs">
                                        {newsLoading
                                            ? 'AI agents scanning geo-political & banking news...'
                                            : 'BUY / SELL / HOLD signals from latest global events'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowNewsPanel(false)}
                                className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {newsLoading && (
                                <div className="flex flex-col items-center justify-center h-full gap-5">
                                    <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center">
                                        <Loader2 size={32} className="text-amber-400 animate-spin" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-white font-semibold">Scanning global news...</p>
                                        <p className="text-gray-500 text-sm mt-1">
                                            Monitoring wars, sanctions, central bank decisions & CEO statements
                                        </p>
                                    </div>
                                    <div className="space-y-2.5 mt-2 text-sm text-gray-500">
                                        {[
                                            '📡 Scanning yfinance & RSS feeds',
                                            '🤖 News agent summarizing events',
                                            '📊 Decision agent issuing BUY/SELL/HOLD signals'
                                        ].map((s, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"
                                                    style={{ animationDelay: `${i * 400}ms` }} />
                                                {s}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {newsError && !newsLoading && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 text-red-400 text-sm">
                                    <p className="font-medium mb-1">⚠️ Analysis failed</p>
                                    <p className="text-red-300/70">{newsError}</p>
                                    <button onClick={triggerNewsAnalysis}
                                        className="mt-3 text-blue-400 hover:text-blue-300 text-xs font-medium">
                                        Retry →
                                    </button>
                                </div>
                            )}

                            {newsResult && !newsLoading && (
                                <div className="prose prose-sm prose-invert max-w-none
                                    prose-headings:text-white prose-p:text-gray-300
                                    prose-strong:text-white prose-li:text-gray-300">
                                    <ReactMarkdown>{newsResult}</ReactMarkdown>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {newsResult && !newsLoading && (
                            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-gray-900/40">
                                <p className="text-xs text-gray-600">Invex AI News Crew · Powered by CrewAI + Groq</p>
                                <button onClick={triggerNewsAnalysis}
                                    className="text-xs text-blue-400 hover:text-blue-300 font-medium">
                                    Refresh analysis →
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
