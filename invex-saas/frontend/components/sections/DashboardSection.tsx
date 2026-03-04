'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, BarChart2, Zap, Globe2, CheckCircle } from 'lucide-react';

const FEATURES = [
    {
        icon: BarChart2,
        title: 'Portfolio Risk Analysis',
        desc: 'AI evaluates your holdings against market volatility and suggests rebalancing strategies.',
    },
    {
        icon: Zap,
        title: 'Real-Time Alerts',
        desc: 'Instant notifications when markets move, geo-political events occur, or opportunities arise.',
    },
    {
        icon: ShieldCheck,
        title: 'Due Diligence Reports',
        desc: 'Comprehensive AI-generated reports on any stock, fund, or asset before you invest.',
    },
    {
        icon: Globe2,
        title: 'Global Market Coverage',
        desc: 'Monitor NSE, NYSE, crypto, commodities and forex from a single intelligent dashboard.',
    },
];

const CHECKLIST = [
    'Portfolio overview with AI-powered risk score',
    'Predictive cash flow for next 90 days',
    'Smart alerts for market-moving events',
    'Personalized buy/sell recommendations',
];

export function DashboardSection() {
    return (
        <section className="py-24 bg-[#0A0A0A]">
            <div className="max-w-7xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-16">
                    <motion.p className="text-xs tracking-widest uppercase text-gray-500 mb-4"
                        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                        Dashboard
                    </motion.p>
                    <motion.h2 className="text-5xl font-bold leading-tight mb-4"
                        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ duration: 0.6 }}>
                        Due diligence,
                        <br />
                        <span className="italic text-gray-300" style={{ fontFamily: 'var(--font-playfair)' }}>
                            done by AI
                        </span>
                    </motion.h2>
                    <motion.p className="text-gray-400 max-w-md mx-auto"
                        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                        Full portfolio oversight with intelligent risk analysis and market monitoring built right in.
                    </motion.p>
                </div>

                {/* 4 feature cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
                    {FEATURES.map((feat, i) => (
                        <motion.div key={i}
                            className="group bg-[#111] border border-white/8 rounded-2xl p-6 hover:border-[#C8F135]/30 hover:bg-[#111]/80 transition-all duration-300 cursor-pointer"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            whileHover={{ y: -4 }}
                        >
                            <div className="w-10 h-10 bg-[#C8F135]/10 border border-[#C8F135]/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#C8F135]/20 transition-colors">
                                <feat.icon size={18} className="text-[#C8F135]" />
                            </div>
                            <h3 className="text-white font-semibold text-base mb-2">{feat.title}</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">{feat.desc}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Dashboard mockup */}
                <motion.div
                    className="relative bg-[#111] border border-white/8 rounded-3xl overflow-hidden min-h-[320px]"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    {/* Top bar */}
                    <div className="flex items-center gap-2 px-6 py-4 border-b border-white/8 bg-[#0d0d0d]">
                        <div className="flex gap-1.5">
                            {['bg-red-500', 'bg-yellow-500', 'bg-green-500'].map(c => (
                                <div key={c} className={`w-3 h-3 rounded-full ${c} opacity-80`} />
                            ))}
                        </div>
                        <div className="flex-1 mx-4 bg-white/5 rounded-lg h-6 flex items-center px-3">
                            <span className="text-gray-600 text-xs">app.invexai.com/dashboard</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/8">
                        {/* Left: checklist */}
                        <div className="p-8">
                            <h4 className="text-white font-semibold mb-6 text-base">What's included</h4>
                            <ul className="space-y-4">
                                {CHECKLIST.map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
                                        <CheckCircle size={16} className="text-[#C8F135] flex-shrink-0 mt-0.5" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Center: mini chart mockup */}
                        <div className="p-8 col-span-2">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-white font-semibold text-sm">Portfolio Performance</span>
                                <span className="text-[#C8F135] text-xs bg-[#C8F135]/10 px-2 py-1 rounded-full">+12.4% YTD</span>
                            </div>
                            {/* Fake sparkline */}
                            <svg viewBox="0 0 500 120" className="w-full h-28" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#C8F135" stopOpacity="0.3" />
                                        <stop offset="100%" stopColor="#C8F135" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <path d="M0,90 C50,80 80,50 130,55 C180,60 200,30 250,25 C300,20 330,40 380,30 C420,22 460,15 500,10"
                                    fill="none" stroke="#C8F135" strokeWidth="2.5" />
                                <path d="M0,90 C50,80 80,50 130,55 C180,60 200,30 250,25 C300,20 330,40 380,30 C420,22 460,15 500,10 L500,120 L0,120 Z"
                                    fill="url(#lineGrad)" />
                            </svg>

                            <div className="grid grid-cols-3 gap-4 mt-6">
                                {[
                                    { label: 'Total Balance', value: '$14,250' },
                                    { label: 'This Month', value: '+$1,850' },
                                    { label: 'Risk Score', value: 'Low' },
                                ].map(stat => (
                                    <div key={stat.label} className="bg-white/5 rounded-xl p-3">
                                        <p className="text-gray-500 text-xs mb-1">{stat.label}</p>
                                        <p className="text-white font-bold text-sm">{stat.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
