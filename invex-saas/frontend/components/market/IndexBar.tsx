"use client";

import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IndexData {
    name: string;
    symbol: string;
    value: number;
    change_pct: number;
    up: boolean;
}

export const IndexBar = () => {
    const [indices, setIndices] = useState<IndexData[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchIndices = async () => {
        try {
            const res = await fetch('/api/v1/market/indices');
            const data = await res.json();
            if (data.indices) setIndices(data.indices);
        } catch (error) {
            console.error('Failed to fetch indices', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIndices();
        // Refresh every 15 seconds
        const interval = setInterval(fetchIndices, 15000);
        return () => clearInterval(interval);
    }, []);

    if (loading && indices.length === 0) {
        return (
            <div className="bg-[#0D0D0D] border-b border-white/5 px-8 pt-[60px] pb-2 flex gap-8 overflow-x-auto h-[100px] items-end justify-center">
                <Loader2 size={16} className="text-gray-500 animate-spin" />
            </div>
        );
    }

    // Add padding top to account for the sticky app header that might exist, though we can just pad normally
    return (
        <div className="bg-[#0D0D0D] border-b border-white/5 px-8 py-2.5 flex gap-8 overflow-x-auto whitespace-nowrap scrollbar-hide">
            {indices.map((idx) => (
                <div key={idx.symbol} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase">{idx.name}</span>
                    <span className="text-sm font-bold text-white transition-all">
                        {idx.name === 'USD/INR' || idx.name === 'GOLD' ? '' : '₹'}
                        {idx.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                    <div className={cn(
                        "flex items-center text-xs font-medium px-1.5 py-0.5 rounded-md",
                        idx.up ? "text-[#C8F135] bg-[#C8F135]/10" : "text-red-400 bg-red-400/10"
                    )}>
                        {idx.up ? <ArrowUpRight size={12} className="mr-0.5" /> : <ArrowDownRight size={12} className="mr-0.5" />}
                        {Math.abs(idx.change_pct).toFixed(2)}%
                    </div>
                </div>
            ))}
        </div>
    );
};
