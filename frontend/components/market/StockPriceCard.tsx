"use client";

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface StockPriceCardProps {
    symbol: string;
    className?: string;
    refreshInterval?: number; // default 30000ms
}

export const StockPriceCard = ({ symbol, className, refreshInterval = 30000 }: StockPriceCardProps) => {
    const [price, setPrice] = useState<number | null>(null);
    const [flashClass, setFlashClass] = useState('');
    const prevPriceRef = useRef<number | null>(null);

    const fetchPrice = async () => {
        try {
            const res = await fetch(`/api/v1/market/price?symbols=${symbol}`);
            const data = await res.json();
            const currentPrice = data.prices?.[0]?.price;

            if (currentPrice) {
                if (prevPriceRef.current !== null) {
                    if (currentPrice > prevPriceRef.current) {
                        setFlashClass('text-[#C8F135] bg-[#C8F135]/10');
                    } else if (currentPrice < prevPriceRef.current) {
                        setFlashClass('text-red-400 bg-red-400/10');
                    }
                    setTimeout(() => setFlashClass(''), 800);
                }
                prevPriceRef.current = currentPrice;
                setPrice(currentPrice);
            }
        } catch (error) {
            console.error('Failed to fetch stock price', error);
        }
    };

    useEffect(() => {
        fetchPrice();
        const interval = setInterval(fetchPrice, refreshInterval);
        return () => clearInterval(interval);
    }, [symbol, refreshInterval]);

    if (price === null) return <span className="animate-pulse bg-white/5 text-transparent rounded">0000.00</span>;

    return (
        <span className={cn("transition-colors duration-800 rounded px-1", flashClass, className)}>
            ₹{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </span>
    );
};
