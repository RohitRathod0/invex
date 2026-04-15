'use client';
import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { StatCard } from '@/components/ui/StatCard';
import { ArrowRight, Bell } from 'lucide-react';

export function CashFlowSection() {
    return (
        <section className="py-28 bg-[#0A0A0A]">
            <div className="max-w-7xl mx-auto px-6 md:px-12">
                {/* ── Header ── */}
                <div className="mb-16 max-w-2xl">
                    <motion.p className="text-[11px] tracking-widest uppercase text-gray-500 mb-5"
                        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                        Analytics
                    </motion.p>
                    <motion.h2 className="text-5xl md:text-6xl font-bold leading-tight text-white mb-5"
                        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ duration: 0.6 }}>
                        Smarter cash flow
                        <br />
                        <span className="italic text-gray-300" style={{ fontFamily: 'var(--font-playfair)' }}>
                            insights at a glance
                        </span>
                    </motion.h2>
                    <motion.p className="text-gray-400 text-lg leading-relaxed"
                        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                        viewport={{ once: true }} transition={{ delay: 0.2 }}>
                        Keep your income and expenses in sync with real-time AI analysis and predictive intelligence.
                    </motion.p>
                </div>

                {/* ── Cards grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* LEFT: Stat card on nature bg */}
                    <motion.div
                        initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }} transition={{ duration: 0.7 }}
                        className="relative rounded-3xl overflow-hidden min-h-[420px] flex items-center justify-center">
                        {/* bg */}
                        <div className="absolute inset-0 z-0">
                            <Image
                                src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=900&q=80"
                                alt="Analytics background" fill className="object-cover opacity-15"
                            />
                            <div className="absolute inset-0 bg-gradient-to-br from-[#0d1a08] via-[#0f1a0e] to-[#111]" />
                        </div>
                        {/* StatCard centred */}
                        <div className="relative z-10 p-8 w-full">
                            <StatCard />
                        </div>
                    </motion.div>

                    {/* RIGHT: Portrait + notification */}
                    <motion.div
                        initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1 }}
                        className="relative rounded-3xl overflow-hidden min-h-[420px]">
                        {/* Portrait */}
                        <div className="absolute inset-0 z-0">
                            <Image
                                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=80"
                                alt="Smiling investor" fill className="object-cover object-top"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                        </div>

                        {/* Transaction chip — top right */}
                        <div className="absolute top-6 right-6 z-20">
                            <div className="flex items-center gap-3 bg-black/75 backdrop-blur-xl border border-white/15 rounded-2xl px-5 py-3.5 shadow-2xl">
                                <div className="w-9 h-9 bg-[#C8F135]/15 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Bell size={16} className="text-[#C8F135]" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-xl leading-none">$925.00</p>
                                    <p className="text-gray-400 text-xs mt-0.5">Sent today</p>
                                </div>
                                <button className="ml-2 bg-[#C8F135] text-black text-xs font-bold px-4 py-2 rounded-full hover:bg-[#d6f855] transition-colors whitespace-nowrap">
                                    View transaction
                                </button>
                            </div>
                        </div>

                        {/* Bottom caption */}
                        <div className="absolute bottom-0 left-0 right-0 z-20 p-8">
                            <p className="text-white font-semibold text-xl italic mb-4"
                                style={{ fontFamily: 'var(--font-playfair)' }}>
                                Guiding your money
                            </p>
                            <div className="flex items-center gap-4">
                                <span className="text-xs text-white/60 bg-white/10 backdrop-blur px-3 py-1.5 rounded-full">
                                    Top Rated
                                </span>
                                <a href="#" className="text-white/60 text-sm hover:text-white transition-colors flex items-center gap-1.5 underline underline-offset-4">
                                    Learn more <ArrowRight size={13} />
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
