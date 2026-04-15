'use client';
import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Star, MessageSquare } from 'lucide-react';
import Image from 'next/image';

type Advisor = { id: string; name: string; specialty: string; rating: number; photo: string; bio: string };

const SPECIALTIES = ['All', 'Growth Investing', 'Risk Management', 'Retirement Planning', 'Cryptocurrency'];

export default function AdvisorsPage() {
    const [advisors, setAdvisors] = useState<Advisor[]>([]);
    const [filter, setFilter] = useState('All');

    useEffect(() => {
        fetch('/api/advisors').then(r => r.json()).then(d => setAdvisors(d.advisors));
    }, []);

    const filtered = filter === 'All' ? advisors : advisors.filter(a => a.specialty === filter);

    return (
        <main className="min-h-screen bg-[#0A0A0A]">
            <Navbar />
            <div className="max-w-7xl mx-auto px-6 pt-28 pb-20">
                <div className="text-center mb-14">
                    <p className="text-xs tracking-widest uppercase text-gray-500 mb-3">Experts</p>
                    <h1 className="text-5xl font-bold text-white mb-4">
                        Find your <span className="italic" style={{ fontFamily: 'var(--font-playfair)' }}>AI advisor</span>
                    </h1>
                    <p className="text-gray-400 max-w-md mx-auto">Browse our curated roster of specialized AI-powered financial advisors.</p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 justify-center mb-12">
                    {SPECIALTIES.map(s => (
                        <button key={s} onClick={() => setFilter(s)}
                            className={`px-5 py-2 rounded-full text-sm font-medium border transition-all ${filter === s
                                ? 'bg-[#C8F135] text-black border-[#C8F135]'
                                : 'border-white/20 text-gray-400 hover:border-white/40 hover:text-white'}`}>
                            {s}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filtered.map((advisor, i) => (
                        <div key={advisor.id}
                            className="bg-[#111] border border-white/8 rounded-2xl overflow-hidden hover:border-[#C8F135]/20 hover:-translate-y-1 transition-all duration-300 group">
                            <div className="relative h-48">
                                <Image src={advisor.photo} alt={advisor.name} fill className="object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                <div className="absolute bottom-4 left-4">
                                    <div className="flex items-center gap-1 bg-black/60 px-2 py-1 rounded-full">
                                        <Star size={10} className="text-[#C8F135]" fill="#C8F135" />
                                        <span className="text-white text-xs font-semibold">{advisor.rating}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-5">
                                <h3 className="text-white font-semibold text-base">{advisor.name}</h3>
                                <p className="text-[#C8F135] text-xs font-medium mb-3 mt-0.5">{advisor.specialty}</p>
                                <p className="text-gray-500 text-xs leading-relaxed mb-4 line-clamp-2">{advisor.bio}</p>
                                <button className="w-full flex items-center justify-center gap-2 bg-[#C8F135]/10 hover:bg-[#C8F135] text-[#C8F135] hover:text-black border border-[#C8F135]/20 rounded-xl py-2.5 text-sm font-medium transition-all">
                                    <MessageSquare size={14} />Consult Now
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <Footer />
        </main>
    );
}
