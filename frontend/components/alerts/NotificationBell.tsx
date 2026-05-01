'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Zap, TrendingUp, TrendingDown, X, CheckCheck } from 'lucide-react';
import { useAlerts } from '@/components/alerts/AlertsContext';
import Link from 'next/link';

export function NotificationBell() {
    const { unreadCount, triggered, clearTriggered } = useAlerts();
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div ref={panelRef} style={{ position: 'relative', flexShrink: 0 }}>
            {/* Bell button */}
            <button
                onClick={() => setOpen(prev => !prev)}
                aria-label="Notifications"
                style={{
                    position: 'relative',
                    width: '36px', height: '36px',
                    background: open ? 'rgba(200,241,53,0.1)' : 'rgba(255,255,255,0.05)',
                    border: open ? '1px solid rgba(200,241,53,0.3)' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    color: open ? '#C8F135' : 'rgba(255,255,255,0.6)',
                    transition: 'all 0.2s ease',
                }}
            >
                <Bell size={15} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: '-5px', right: '-5px',
                        minWidth: '18px', height: '18px',
                        background: '#C8F135', color: '#000',
                        borderRadius: '999px', fontSize: '10px', fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 4px',
                        boxShadow: '0 0 10px rgba(200,241,53,0.5)',
                        animation: 'popIn 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                    width: '340px',
                    background: 'rgba(13,13,13,0.98)', backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '18px',
                    boxShadow: '0 16px 60px rgba(0,0,0,0.7)',
                    overflow: 'hidden',
                    animation: 'fadeDown 0.2s ease',
                    zIndex: 200,
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Bell size={14} color="#C8F135" />
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Notifications</span>
                            {unreadCount > 0 && (
                                <span style={{
                                    background: 'rgba(200,241,53,0.15)', color: '#C8F135',
                                    borderRadius: '999px', fontSize: '11px', fontWeight: 700,
                                    padding: '1px 8px',
                                }}>
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {triggered.length > 0 && (
                            <button
                                onClick={clearTriggered}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    color: 'rgba(255,255,255,0.3)', fontSize: '12px',
                                }}
                            >
                                <CheckCheck size={13} /> Clear all
                            </button>
                        )}
                    </div>

                    {/* Items */}
                    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                        {triggered.length === 0 ? (
                            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                                <Bell size={28} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 10px' }} />
                                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', fontWeight: 500 }}>
                                    No new notifications
                                </p>
                                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', marginTop: '4px' }}>
                                    We'll notify you when your alerts trigger
                                </p>
                            </div>
                        ) : (
                            triggered.map(alert => {
                                const isAbove = alert.condition === 'above';
                                return (
                                    <div key={alert.id} style={{
                                        display: 'flex', alignItems: 'flex-start', gap: '12px',
                                        padding: '12px 16px',
                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                        transition: 'background 0.15s',
                                    }}>
                                        {/* Icon */}
                                        <div style={{
                                            width: '34px', height: '34px', flexShrink: 0,
                                            borderRadius: '10px',
                                            background: isAbove ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            {isAbove
                                                ? <TrendingUp size={15} color="#10b981" />
                                                : <TrendingDown size={15} color="#ef4444" />
                                            }
                                        </div>
                                        {/* Text */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                                                <Zap size={10} color="#C8F135" fill="#C8F135" />
                                                <span style={{ fontSize: '10px', fontWeight: 700, color: '#C8F135', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Triggered
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', margin: 0 }}>
                                                {alert.symbol}
                                                <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>
                                                    {' '}{isAbove ? 'crossed above' : 'dropped below'} ₹{alert.target_price.toLocaleString('en-IN')}
                                                </span>
                                            </p>
                                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>
                                                Current price: ₹{alert.current_price.toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <Link
                            href="/dashboard/alerts"
                            onClick={() => setOpen(false)}
                            style={{
                                display: 'block', textAlign: 'center',
                                fontSize: '13px', fontWeight: 600, color: '#C8F135',
                                textDecoration: 'none',
                                padding: '9px',
                                background: 'rgba(200,241,53,0.08)',
                                borderRadius: '10px',
                                transition: 'background 0.15s',
                            }}
                        >
                            Manage all alerts →
                        </Link>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes popIn {
                    from { transform: scale(0.5); opacity: 0; }
                    to   { transform: scale(1);   opacity: 1; }
                }
                @keyframes fadeDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
