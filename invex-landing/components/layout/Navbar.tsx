'use client';
import React, { useState, useEffect } from 'react';
import { Diamond, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

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

    return (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black/85 backdrop-blur-xl border-b border-white/10 shadow-2xl' : 'bg-transparent'
            }`}>
            <nav className="w-full px-8 h-16 flex items-center justify-between">
                {/* Logo */}
                <a href="/" className="flex items-center gap-2 group shrink-0">
                    <div className="w-7 h-7 bg-[#C8F135] rounded-[6px] flex items-center justify-center group-hover:bg-[#d6f855] transition-colors">
                        <Diamond size={14} className="text-black" fill="black" />
                    </div>
                    <span className="font-bold text-white text-base tracking-tight">
                        Invex <span className="text-[#C8F135]">AI</span>
                    </span>
                </a>

                {/* Desktop links */}
                <div className="hidden md:flex items-center gap-8">
                    {NAV_LINKS.map(l => (
                        <a key={l.label} href={l.href}
                            className="text-sm text-gray-400 hover:text-white transition-colors font-medium">
                            {l.label}
                        </a>
                    ))}
                </div>

                {/* Right actions — Login goes to the actual invex-saas app */}
                <div className="hidden md:flex items-center gap-3 shrink-0">
                    <Button variant="ghost" size="sm" href="http://localhost:5173/login">Login</Button>
                    <Button variant="primary" size="sm" href="http://localhost:5173/login">Get started free</Button>
                </div>

                {/* Mobile */}
                <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors">
                    {open ? <X size={20} /> : <Menu size={20} />}
                </button>
            </nav>

            {open && (
                <div className="md:hidden bg-black/95 backdrop-blur-xl border-t border-white/10 px-8 py-6 space-y-4">
                    {NAV_LINKS.map(l => (
                        <a key={l.label} href={l.href} onClick={() => setOpen(false)}
                            className="block text-gray-300 hover:text-white text-sm py-2 border-b border-white/5">
                            {l.label}
                        </a>
                    ))}
                    <div className="flex flex-col gap-3 pt-2">
                        <Button variant="ghost" href="http://localhost:5173/login">Login</Button>
                        <Button variant="primary" href="http://localhost:5173/login">Get started free</Button>
                    </div>
                </div>
            )}
        </header>
    );
}
