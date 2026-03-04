import React from 'react';
import { Diamond, Twitter, Linkedin, Github, Mail } from 'lucide-react';

const FOOTER_LINKS = {
    Product: ['Advisors', 'AI Intelligence', 'Tools', 'Dashboard', 'Pricing'],
    Company: ['About', 'Blog', 'Careers', 'Press', 'Contact'],
    Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
};

const SOCIALS = [
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Github, href: '#', label: 'GitHub' },
    { icon: Mail, href: '#', label: 'Email' },
];

export function Footer() {
    return (
        <footer className="bg-[#0A0A0A] border-t border-white/8 pt-20 pb-10">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-16">
                    {/* Brand col */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-[#C8F135] rounded-[6px] flex items-center justify-center">
                                <Diamond size={14} className="text-black" fill="black" />
                            </div>
                            <span className="font-bold text-white text-base">Invex AI</span>
                        </div>
                        <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                            Your all-in-one financial home, powered by intelligent AI that simplifies every investment decision.
                        </p>
                        <div className="flex items-center gap-3 pt-2">
                            {SOCIALS.map(({ icon: Icon, href, label }) => (
                                <a key={label} href={href} aria-label={label}
                                    className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all">
                                    <Icon size={15} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Link columns */}
                    {Object.entries(FOOTER_LINKS).map(([category, links]) => (
                        <div key={category}>
                            <h4 className="text-white font-semibold text-sm mb-4">{category}</h4>
                            <ul className="space-y-3">
                                {links.map(link => (
                                    <li key={link}>
                                        <a href="#" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">{link}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom */}
                <div className="border-t border-white/8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-gray-600 text-sm">© 2025 Invex AI. All rights reserved.</p>
                    <div className="flex items-center gap-1 text-gray-600 text-sm">
                        <span>Built with</span>
                        <span className="text-[#C8F135]">♦</span>
                        <span>powered by AI</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
