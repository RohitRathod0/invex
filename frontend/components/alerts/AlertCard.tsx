"use client";

import { Trash2, TrendingUp, TrendingDown, Zap } from 'lucide-react';

interface Alert {
    id: string;
    symbol: string;
    condition: string;
    target_price: number;
    note?: string;
    is_active: boolean;
    triggered_at?: string;
}

interface AlertCardProps {
    alert: Alert;
    onDelete: (id: string) => void;
}

export const AlertCard = ({ alert, onDelete }: AlertCardProps) => {
    const isTriggered = !alert.is_active && alert.triggered_at;
    const isAboveOrUp = alert.condition === 'above' || alert.condition === 'percent_up';
    const isPercent = alert.condition.includes('percent');

    return (
        <div className={`relative bg-[#0D0D0D] border rounded-2xl p-5 flex flex-col gap-3 transition-all ${isTriggered ? 'border-[#C8F135]/30 shadow-[0_0_20px_rgba(200,241,53,0.07)]' : 'border-white/[0.07] hover:border-white/[0.14]'}`}>
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <span className="text-xl font-bold text-white">{alert.symbol}</span>
                    {alert.note && (
                        <p className="text-xs text-gray-500 mt-0.5">{alert.note}</p>
                    )}
                </div>
                <button
                    onClick={() => onDelete(alert.id)}
                    className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {/* Condition pill */}
            <div className={`flex items-center gap-2 text-sm font-medium w-fit px-3 py-1.5 rounded-full ${isAboveOrUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {isAboveOrUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {alert.condition === 'percent_up' ? 'Jumps' : alert.condition === 'percent_down' ? 'Drops' : isAboveOrUp ? 'Above' : 'Below'} 
                {isPercent ? ` ${alert.target_price}%` : ` ₹${alert.target_price.toLocaleString('en-IN')}`}
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-1.5 mt-auto">
                {isTriggered ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-[#C8F135] bg-[#C8F135]/10 px-2.5 py-1 rounded-full">
                        <Zap size={11} fill="currentColor" /> Triggered
                    </span>
                ) : (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        Watching
                    </span>
                )}
            </div>
        </div>
    );
};
