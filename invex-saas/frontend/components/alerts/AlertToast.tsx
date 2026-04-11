'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, X, Zap, Bell } from 'lucide-react';
import { useAlerts, TriggeredAlert } from './AlertsContext';
import Link from 'next/link';

function SingleToast({ alert, onDismiss }: { alert: TriggeredAlert; onDismiss: () => void }) {
    const isAboveOrUp = alert.condition === 'above' || alert.condition === 'percent_up';
    const isPercent = alert.condition.includes('percent');

    // Auto-dismiss after 8 seconds
    useEffect(() => {
        const t = setTimeout(onDismiss, 8000);
        return () => clearTimeout(t);
    }, [onDismiss]);

    return (
        <div
            style={{
                animation: 'slideInRight 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                background: 'rgba(17,17,17,0.97)',
                border: '1px solid rgba(200,241,53,0.25)',
                borderRadius: '16px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,241,53,0.1)',
                backdropFilter: 'blur(20px)',
                minWidth: '300px',
                maxWidth: '360px',
            }}
        >
            {/* Icon */}
            <div style={{
                width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                background: isAboveOrUp ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                {isAboveOrUp
                    ? <TrendingUp size={16} color="#10b981" />
                    : <TrendingDown size={16} color="#ef4444" />
                }
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <Zap size={12} color="#C8F135" fill="#C8F135" />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#C8F135', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Alert Triggered
                    </span>
                </div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: 0 }}>
                    {alert.symbol}
                    <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                        {alert.condition === 'percent_up' ? ' jumped > ' : alert.condition === 'percent_down' ? ' dropped > ' : isAboveOrUp ? ' ↑ above ' : ' ↓ below '}
                        {isPercent ? `${alert.target_price}%` : `₹${alert.target_price.toLocaleString('en-IN')}`}
                    </span>
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '2px 0 6px' }}>
                    Now at ₹{alert.current_price.toLocaleString('en-IN')}
                </p>
                <Link href="/dashboard/alerts" style={{
                    fontSize: '12px', fontWeight: 600, color: '#C8F135',
                    textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px',
                }}>
                    View Alerts →
                </Link>
            </div>

            {/* Dismiss */}
            <button
                onClick={onDismiss}
                style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.3)', padding: '2px', flexShrink: 0,
                }}
            >
                <X size={14} />
            </button>
        </div>
    );
}

export function AlertToastContainer() {
    const { triggered, clearTriggered, notifPermission, requestPermission } = useAlerts();
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    const visibleAlerts = triggered.filter(t => !dismissed.has(t.id));

    const dismiss = (id: string) => {
        setDismissed(prev => new Set([...prev, id]));
    };

    return (
        <>
            {/* Notification permission nudge — shown once if not granted */}
            {notifPermission === 'default' && (
                <div style={{
                    position: 'fixed', bottom: '88px', right: '24px', zIndex: 200,
                    background: 'rgba(17,17,17,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '14px',
                    padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                    maxWidth: '320px',
                }}>
                    <Bell size={16} color="#C8F135" />
                    <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0 }}>Enable Notifications</p>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>Get real-time alerts when stocks hit your targets</p>
                    </div>
                    <button
                        onClick={requestPermission}
                        style={{
                            background: '#C8F135', color: '#000', border: 'none',
                            borderRadius: '8px', padding: '6px 12px',
                            fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                    >
                        Allow
                    </button>
                </div>
            )}

            {/* Toast stack */}
            {visibleAlerts.length > 0 && (
                <div style={{
                    position: 'fixed', bottom: '24px', right: '24px', zIndex: 300,
                    display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end',
                }}>
                    {visibleAlerts.slice(0, 4).map(alert => (
                        <SingleToast
                            key={alert.id}
                            alert={alert}
                            onDismiss={() => dismiss(alert.id)}
                        />
                    ))}

                    {visibleAlerts.length > 4 && (
                        <button
                            onClick={clearTriggered}
                            style={{
                                background: 'rgba(200,241,53,0.1)', border: '1px solid rgba(200,241,53,0.2)',
                                borderRadius: '10px', padding: '8px 16px',
                                color: '#C8F135', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            +{visibleAlerts.length - 4} more alerts — Clear all
                        </button>
                    )}
                </div>
            )}

            <style>{`
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateX(24px) scale(0.97); }
                    to   { opacity: 1; transform: translateX(0)   scale(1); }
                }
            `}</style>
        </>
    );
}
