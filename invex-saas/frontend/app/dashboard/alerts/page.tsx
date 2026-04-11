"use client";

import { useState, useEffect } from 'react';
import { Plus, Bell, Zap } from 'lucide-react';
import { AlertCard } from '@/components/alerts/AlertCard';
import { CreateAlertModal } from '@/components/alerts/CreateAlertModal';
import { useAlerts } from '@/components/alerts/AlertsContext';

const USER_ID = "0000-user";

export default function AlertsPage() {
    const [alerts, setAlerts] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Pull global triggered state from the shared context (same data the bell shows)
    const { triggered, clearTriggered } = useAlerts();

    const fetchAlerts = () => {
        fetch(`/api/v1/alerts/${USER_ID}`)
            .then(r => r.json())
            .then(setAlerts)
            .catch(console.error);
    };

    useEffect(() => {
        fetchAlerts();
        // Refresh when this page becomes visible (e.g. navigating back)
        const onFocus = () => fetchAlerts();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, []);

    // When alerts are newly triggered (from global context), sync the DB list
    useEffect(() => {
        if (triggered.length > 0) fetchAlerts();
    }, [triggered.length]);

    const handleCreate = async (data: any) => {
        try {
            await fetch('/api/v1/alerts/alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, user_id: USER_ID }),
            });
            setIsModalOpen(false);
            fetchAlerts();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        await fetch(`/api/v1/alerts/alert/${id}`, { method: 'DELETE' });
        setAlerts(prev => prev.filter(a => a.id !== id));
    };

    const activeAlerts = alerts.filter(a => a.is_active);
    const pastAlerts = alerts.filter(a => !a.is_active);


    return (
        <div className="p-8 max-w-[1200px] mx-auto w-full pb-24">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Price Alerts</h1>
                    <p className="text-sm text-gray-400 mt-1">Get notified when stocks hit your target prices.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-[#C8F135] hover:bg-[#bce628] text-black font-semibold px-5 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(200,241,53,0.2)]"
                >
                    <Plus size={18} /> Create Alert
                </button>
            </div>

            {/* Triggered banner */}
            {triggered.length > 0 && (
                <div className="mb-6 p-4 rounded-2xl bg-[#C8F135]/10 border border-[#C8F135]/30">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <Zap size={20} className="text-[#C8F135] mt-0.5 shrink-0" fill="currentColor" />
                            <div>
                                <p className="font-semibold text-[#C8F135]">{triggered.length} alert{triggered.length > 1 ? 's' : ''} triggered!</p>
                                <div className="mt-1 space-y-0.5">
                                    {triggered.map(t => {
                                        const isPercent = t.condition.includes('percent');
                                        return (
                                            <p key={t.id} className="text-sm text-gray-300">
                                                <span className="font-medium text-white">{t.symbol}</span>{' '}
                                                is now ₹{t.current_price.toLocaleString('en-IN')} — target was {isPercent ? `${t.target_price}%` : `₹${t.target_price.toLocaleString('en-IN')}`}
                                            </p>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={clearTriggered}
                            className="text-xs text-gray-500 hover:text-white transition-colors shrink-0 mt-0.5"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            {/* Active Alerts */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <Bell size={16} className="text-blue-400" />
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
                        Active ({activeAlerts.length})
                    </h2>
                </div>
                {activeAlerts.length === 0 ? (
                    <div className="bg-[#0D0D0D] border border-white/5 rounded-2xl p-10 text-center">
                        <p className="text-gray-500">No active alerts. Create one to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeAlerts.map(a => <AlertCard key={a.id} alert={a} onDelete={handleDelete} />)}
                    </div>
                )}
            </div>

            {/* Past Alerts */}
            {pastAlerts.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Zap size={16} className="text-[#C8F135]" />
                        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
                            Triggered ({pastAlerts.length})
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pastAlerts.map(a => <AlertCard key={a.id} alert={a} onDelete={handleDelete} />)}
                    </div>
                </div>
            )}

            <CreateAlertModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreate={handleCreate} />
        </div>
    );
}
