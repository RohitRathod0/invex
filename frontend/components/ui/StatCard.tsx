import React from 'react';
import { TrendingUp } from 'lucide-react';

interface StatCardProps {
    income?: number;
    investments?: number;
    expenses?: number;
    total?: number;
}

const BARS = [
    { label: 'Income', value: 15500, max: 20000, color: '#C8F135' },
    { label: 'Investment', value: 4250, max: 20000, color: '#3B82F6' },
    { label: 'Expenses', value: 8200, max: 20000, color: '#F97316' },
];

export function StatCard({ total = 14250 }: StatCardProps) {
    return (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 min-w-[280px] shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-500 tracking-widest uppercase">Monthly Overview</span>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-gray-400">Monthly</span>
            </div>

            <div className="flex items-end gap-2 mb-5">
                <span className="text-3xl font-bold text-white">${total.toLocaleString()}.00</span>
                <span className="text-[#C8F135] text-sm mb-1 flex items-center gap-0.5">
                    <TrendingUp size={12} /> +2.4%
                </span>
            </div>

            <div className="space-y-3">
                {BARS.map(bar => {
                    const pct = (bar.value / bar.max) * 100;
                    return (
                        <div key={bar.label}>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-400">{bar.label}</span>
                                <span className="text-white font-medium">${bar.value.toLocaleString()}</span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${pct}%`, background: bar.color }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
