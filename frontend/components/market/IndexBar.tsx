"use client";

import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/alerts/NotificationBell';

interface IndexData {
    name: string;
    symbol: string;
    value: number;
    change_pct: number;
    up: boolean;
    error?: string;
}

// Symbols that are priced in USD (show $ not ₹)
const USD_SYMBOLS = new Set(["^GSPC", "GC=F", "CL=F", "BTC-USD", "INR=X"]);

function formatValue(idx: IndexData): string {
    if (idx.value === 0) return '—';
    const isUSD = USD_SYMBOLS.has(idx.symbol);

    if (idx.name === 'USD/INR') {
        return `₹${idx.value.toFixed(2)}`;
    }
    if (isUSD) {
        // Compact formatting for large USD values (BTC)
        if (idx.value >= 10000) return `$${idx.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
        return `$${idx.value.toFixed(2)}`;
    }
    // INR indices — no decimal for large numbers
    return `₹${idx.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export const IndexBar = () => {
    const [indices, setIndices] = useState<IndexData[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchIndices = async () => {
        try {
            const res = await fetch('/api/v1/market/indices');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (Array.isArray(data.indices) && data.indices.length > 0) {
                // Filter out zero-value errors for display cleanliness
                setIndices(data.indices.filter((i: IndexData) => i.value > 0));
            }
        } catch (error) {
            console.error('Failed to fetch indices', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIndices();
        // Refresh every 30 seconds (yfinance has its own latency, no need to spam)
        const interval = setInterval(fetchIndices, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading && indices.length === 0) {
        return (
            <div className="bg-[#0D0D0D] border-b border-white/5 px-8 py-2 flex gap-8 h-[44px] items-center justify-center">
                <Loader2 size={14} className="text-gray-600 animate-spin" />
                <span className="text-xs text-gray-600">Loading live market data...</span>
            </div>
        );
    }

    return (
        <div className="bg-[#0D0D0D] border-b border-white/5 px-6 py-2 flex items-center gap-6 overflow-x-auto whitespace-nowrap scrollbar-hide">
            {/* Indices — scrollable ticker strip */}
            <div className="flex items-center gap-7 flex-1 overflow-x-auto scrollbar-hide">
                {indices.map((idx) => (
                    <div key={idx.symbol} className="flex items-center gap-2.5 shrink-0">
                        <span className="text-[10px] font-semibold text-gray-500 tracking-wider uppercase">
                            {idx.name}
                        </span>
                        <span className="text-xs font-bold text-white tabular-nums">
                            {formatValue(idx)}
                        </span>
                        <div className={cn(
                            "flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums",
                            idx.up ? "text-[#C8F135] bg-[#C8F135]/10" : "text-red-400 bg-red-400/10"
                        )}>
                            {idx.up
                                ? <ArrowUpRight size={10} className="mr-0.5" />
                                : <ArrowDownRight size={10} className="mr-0.5" />
                            }
                            {Math.abs(idx.change_pct).toFixed(2)}%
                        </div>
                    </div>
                ))}
            </div>

            {/* Notification Bell — pinned right */}
            <div className="shrink-0 ml-auto pl-4 border-l border-white/[0.06]">
                <NotificationBell />
            </div>
        </div>
    );
};
