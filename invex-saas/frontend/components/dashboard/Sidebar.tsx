'use client';
import React from 'react';
import { Briefcase, Crosshair, Target, Search, Diamond, TrendingUp, BarChart3, Bell, MessageSquare, Settings, LogOut, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_MAIN = [
    { icon: BarChart3, label: 'Dashboard', href: '/dashboard' },
    { icon: Briefcase, label: 'Portfolio', href: '/dashboard/portfolio' },
    { icon: TrendingUp, label: 'Analysis', href: '/analysis' },
];

const NAV_TOOLS = [
    { icon: Search, label: 'Screener', href: '/screener' },
];

const NAV_OTHER = [
    { icon: MessageSquare, label: 'Chat', href: '/chat' },
    { icon: Bell, label: 'Market News', href: '/news' },
    { icon: ShieldCheck, label: 'Security', href: '/security' },
    { icon: Settings, label: 'Settings', href: '/settings' },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside style={{
            position: 'fixed', top: 0, left: 0, bottom: 0,
            width: '220px', zIndex: 40,
            background: '#111111',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', flexDirection: 'column',
            overflowY: 'auto'
        }}>
            {/* Logo */}
            <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: '#C8F135', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        <Diamond size={16} color="black" fill="black" />
                    </div>
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '15px', letterSpacing: '-0.02em' }}>
                        Invex <span style={{ color: '#C8F135' }}>AI</span>
                    </span>
                </Link>
            </div>

            {/* Nav items */}
            <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '12px 14px 4px' }}>Core</div>
                {NAV_MAIN.map(item => {
                    const active = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                    return (
                        <Link key={item.href} href={item.href} style={{ textDecoration: 'none', display: 'block' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '10px 14px', borderRadius: '12px',
                                borderLeft: active ? '3px solid #C8F135' : '3px solid transparent',
                                background: active ? 'rgba(200,241,53,0.10)' : 'transparent',
                                color: active ? '#C8F135' : '#6B7280',
                                fontSize: '14px', fontWeight: active ? 600 : 400,
                                transition: 'all 0.15s ease',
                                cursor: 'pointer',
                            }}>
                                <item.icon size={17} />
                                {item.label}
                            </div>
                        </Link>
                    );
                })}

                <div style={{ fontSize: '11px', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '20px 14px 4px' }}>Tools</div>
                {NAV_TOOLS.map(item => {
                    const active = pathname === item.href || pathname?.startsWith(item.href);
                    return (
                        <Link key={item.href} href={item.href} style={{ textDecoration: 'none', display: 'block' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '10px 14px', borderRadius: '12px',
                                borderLeft: active ? '3px solid #C8F135' : '3px solid transparent',
                                background: active ? 'rgba(200,241,53,0.10)' : 'transparent',
                                color: active ? '#C8F135' : '#6B7280',
                                fontSize: '14px', fontWeight: active ? 600 : 400,
                                transition: 'all 0.15s ease',
                                cursor: 'pointer',
                                justifyContent: 'space-between',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <item.icon size={17} />
                                    {item.label}
                                </div>
                            </div>
                        </Link>
                    );
                })}

                <div style={{ fontSize: '11px', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '20px 14px 4px' }}>Other</div>
                {NAV_OTHER.map(item => {
                    const active = pathname === item.href || pathname?.startsWith(item.href);
                    return (
                        <Link key={item.href} href={item.href} style={{ textDecoration: 'none', display: 'block' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '10px 14px', borderRadius: '12px',
                                borderLeft: active ? '3px solid #C8F135' : '3px solid transparent',
                                background: active ? 'rgba(200,241,53,0.10)' : 'transparent',
                                color: active ? '#C8F135' : '#6B7280',
                                fontSize: '14px', fontWeight: active ? 600 : 400,
                                transition: 'all 0.15s ease',
                                cursor: 'pointer',
                            }}>
                                <item.icon size={17} />
                                {item.label}
                            </div>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom: logout */}
            <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <a href="/" style={{ textDecoration: 'none' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 14px', borderRadius: '12px', cursor: 'pointer',
                        color: '#6B7280', fontSize: '14px',
                    }}>
                        <LogOut size={16} />
                        Back to site
                    </div>
                </a>
            </div>
        </aside>
    );
}
