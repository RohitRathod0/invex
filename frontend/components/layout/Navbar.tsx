'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Diamond, Menu, X, LayoutDashboard, LogOut, User, ChevronDown } from 'lucide-react';
import { getUserProfile, isAuthenticated, logout, type UserProfile } from '@/lib/auth';

const NAV_LINKS = [
    { label: 'Advisors',       href: '/advisors' },
    { label: 'What we do',     href: '/#what-we-do' },
    { label: 'AI Intelligence', href: '/#ai-intelligence' },
    { label: 'Tools',          href: '/tools' },
];

// ── Avatar initials helper ────────────────────────────────────────────────────
function initials(name: string): string {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0]?.[0]?.toUpperCase() ?? '?';
}

// ── Profile dropdown ──────────────────────────────────────────────────────────
function ProfileDropdown({ profile }: { profile: UserProfile }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const firstName = profile.name.split(' ')[0];

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            {/* Trigger */}
            <button
                onClick={() => setOpen(v => !v)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(200,241,53,0.08)',
                    border: '1px solid rgba(200,241,53,0.2)',
                    borderRadius: '999px', padding: '6px 14px 6px 6px',
                    cursor: 'pointer', color: '#fff',
                    transition: 'background 0.15s',
                }}
                aria-label="User menu"
            >
                {/* Avatar circle */}
                <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: '#C8F135', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0,
                }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#000' }}>
                        {initials(profile.name)}
                    </span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                    {firstName}
                </span>
                <ChevronDown
                    size={13}
                    color="rgba(255,255,255,0.5)"
                    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                />
            </button>

            {/* Dropdown panel */}
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                    width: '220px', background: '#111',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px', overflow: 'hidden',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
                    zIndex: 100,
                }}>
                    {/* User info header */}
                    <div style={{
                        padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>
                            {profile.name}
                        </p>
                        <p style={{ fontSize: '11px', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {profile.email}
                        </p>
                    </div>

                    {/* Menu items */}
                    <div style={{ padding: '8px' }}>
                        <Link
                            href="/dashboard"
                            onClick={() => setOpen(false)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '10px 12px', borderRadius: '10px',
                                color: '#fff', textDecoration: 'none', fontSize: '13px',
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <LayoutDashboard size={15} color="#C8F135" />
                            Dashboard
                        </Link>

                        <Link
                            href="/settings"
                            onClick={() => setOpen(false)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '10px 12px', borderRadius: '10px',
                                color: '#fff', textDecoration: 'none', fontSize: '13px',
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <User size={15} color="#9CA3AF" />
                            Profile & Settings
                        </Link>
                    </div>

                    {/* Logout */}
                    <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <button
                            onClick={() => { setOpen(false); logout(); }}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '10px 12px', borderRadius: '10px',
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: '#EF4444', fontSize: '13px', textAlign: 'left',
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <LogOut size={15} />
                            Log out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
export function Navbar() {
    const [scrolled,   setScrolled]   = useState(false);
    const [open,       setOpen]       = useState(false);
    const [profile,    setProfile]    = useState<UserProfile | null>(null);
    const [authReady,  setAuthReady]  = useState(false); // prevents flash

    useEffect(() => {
        const h = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', h, { passive: true });
        return () => window.removeEventListener('scroll', h);
    }, []);

    // Read auth state once on mount (client-side only)
    useEffect(() => {
        if (isAuthenticated()) {
            setProfile(getUserProfile());
        }
        setAuthReady(true);
    }, []);

    const navStyle: React.CSSProperties = {
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        transition: 'all 0.3s ease',
        background: scrolled ? 'rgba(0,0,0,0.88)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
    };

    const linkStyle: React.CSSProperties = {
        color: 'rgba(255,255,255,0.6)', fontSize: '14px',
        fontWeight: 500, textDecoration: 'none', transition: 'color 0.15s',
    };

    // Right-side actions — swap based on auth state
    const rightActions = !authReady ? null : profile ? (
        // ── Authenticated ──
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <Link
                href="/dashboard"
                style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '13px', color: 'rgba(255,255,255,0.6)',
                    fontWeight: 500, textDecoration: 'none',
                    padding: '8px 14px', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    transition: 'all 0.15s',
                }}
            >
                <LayoutDashboard size={14} />
                Dashboard
            </Link>
            <ProfileDropdown profile={profile} />
        </div>
    ) : (
        // ── Guest ──
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <Link href="/login" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontWeight: 500, textDecoration: 'none', padding: '8px 16px', borderRadius: '8px' }}>
                Login
            </Link>
            <Link href="/register" style={{ background: '#C8F135', color: '#000', fontWeight: 700, fontSize: '14px', padding: '9px 20px', borderRadius: '999px', textDecoration: 'none', boxShadow: '0 0 20px rgba(200,241,53,0.25)', whiteSpace: 'nowrap' }}>
                Get started free
            </Link>
        </div>
    );

    return (
        <header style={navStyle}>
            <nav style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '0 48px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                {/* Logo */}
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flexShrink: 0 }}>
                    <div style={{ width: '28px', height: '28px', background: '#C8F135', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Diamond size={14} color="black" fill="black" />
                    </div>
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '15px' }}>
                        Invex <span style={{ color: '#C8F135' }}>AI</span>
                    </span>
                </Link>

                {/* Desktop nav links */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '36px' }}>
                    {NAV_LINKS.map(l => (
                        <Link key={l.label} href={l.href} style={linkStyle}>{l.label}</Link>
                    ))}
                </div>

                {/* Right actions */}
                {rightActions}

                {/* Mobile hamburger */}
                <button onClick={() => setOpen(!open)} style={{ display: 'none', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px' }}>
                    {open ? <X size={20} /> : <Menu size={20} />}
                </button>
            </nav>

            {/* Mobile menu */}
            {open && (
                <div style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '20px 48px 24px' }}>
                    {NAV_LINKS.map(l => (
                        <Link key={l.label} href={l.href} onClick={() => setOpen(false)}
                            style={{ display: 'block', color: 'rgba(255,255,255,0.7)', padding: '12px 0', fontSize: '15px', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {l.label}
                        </Link>
                    ))}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                        {profile ? (
                            <>
                                <Link href="/dashboard" style={{ display: 'block', textAlign: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '12px', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
                                    Dashboard
                                </Link>
                                <button onClick={() => logout()} style={{ display: 'block', width: '100%', textAlign: 'center', background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                                    Log out
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href="/login" style={{ display: 'block', textAlign: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '12px', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
                                    Login
                                </Link>
                                <Link href="/register" style={{ display: 'block', textAlign: 'center', background: '#C8F135', color: '#000', borderRadius: '12px', padding: '12px', textDecoration: 'none', fontSize: '14px', fontWeight: 700 }}>
                                    Get started free
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
