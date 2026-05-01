'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function CTASection() {
    return (
        <section className="py-24 bg-[#0A0A0A]">
            <div className="max-w-7xl mx-auto px-6">
                <motion.div
                    className="relative bg-[#111] border border-white/10 rounded-3xl px-8 py-20 text-center overflow-hidden"
                    initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ duration: 0.8 }}
                >
                    {/* Decorative glows */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] bg-[#C8F135]/5 rounded-full blur-3xl" />
                        <div className="absolute top-0 right-1/4 w-40 h-40 bg-[#C8F135]/8 rounded-full blur-2xl" />
                    </div>

                    <div className="relative z-10 max-w-2xl mx-auto">
                        <motion.p className="text-xs tracking-widest uppercase text-gray-500 mb-6"
                            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                            Get started today
                        </motion.p>
                        <motion.h2 className="text-5xl md:text-6xl font-bold leading-tight mb-4"
                            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }} transition={{ delay: 0.1, duration: 0.6 }}>
                            Start your investment
                            <br />
                            <span className="italic text-[#C8F135]" style={{ fontFamily: 'var(--font-playfair)' }}>
                                journey today
                            </span>
                        </motion.h2>
                        <motion.p className="text-gray-400 mb-10 text-lg"
                            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                            Join thousands of smart investors using Invex AI's 4-agent crew to grow and protect their wealth.
                        </motion.p>

                        <motion.div
                            className="flex flex-col sm:flex-row items-center justify-center gap-4"
                            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }} transition={{ delay: 0.3 }}>
                            <Button variant="primary" size="lg" href="/login"
                                className="shadow-[0_0_40px_rgba(200,241,53,0.25)] animate-glow">
                                Start free analysis <ArrowRight size={16} />
                            </Button>
                            <Button variant="ghost" size="lg" href="/login">
                                Login to your account
                            </Button>
                        </motion.div>

                        <p className="text-gray-600 text-sm mt-8">No credit card required · Free for 30 days · Cancel anytime</p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
