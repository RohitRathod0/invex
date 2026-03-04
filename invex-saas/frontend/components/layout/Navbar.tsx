'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Diamond, Menu, X } from 'lucide-react';

const NAV_LINKS = [
    { label: 'Advisors', href: '/advisors' },
    { label: 'What we do', href: '/#what-we-do' },
    { label: 'AI Intelligence', href: '/#ai-intelligence' },
    { label: 'Tools', href: '/tools' },
];

export function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const h = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', h, { passive: true });
        return () => window.removeEventListener('scroll', h);
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

                {/* Right actions — login & CTA both go to /login (same Next.js app) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <Link href="/login" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontWeight: 500, textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', transition: 'color 0.15s' }}>
                        Login
                    </Link>
                    <Link href="/login" style={{ background: '#C8F135', color: '#000', fontWeight: 700, fontSize: '14px', padding: '9px 20px', borderRadius: '999px', textDecoration: 'none', boxShadow: '0 0 20px rgba(200,241,53,0.25)', whiteSpace: 'nowrap' }}>
                        Get started free
                    </Link>
                </div>

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
                        <Link href="/login" style={{ display: 'block', textAlign: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '12px', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
                            Login
                        </Link>
                        <Link href="/login" style={{ display: 'block', textAlign: 'center', background: '#C8F135', color: '#000', borderRadius: '12px', padding: '12px', textDecoration: 'none', fontSize: '14px', fontWeight: 700 }}>
                            Get started free
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
}
