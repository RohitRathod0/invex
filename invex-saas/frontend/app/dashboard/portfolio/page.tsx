"use client";

import { useState, useEffect } from 'react';
import { PortfolioHeader } from '@/components/portfolio/PortfolioHeader';
import { PnLCard } from '@/components/portfolio/PnLCard';
import { AddHoldingModal } from '@/components/portfolio/AddHoldingModal';
import { AllocationChart } from '@/components/portfolio/AllocationChart';
import { PerformanceChart } from '@/components/portfolio/PerformanceChart';
import { HoldingsTable } from '@/components/portfolio/HoldingsTable';

const USER_ID = "0000-user";

export default function PortfolioPage() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [holdings, setHoldings] = useState<any[]>([]);
    const [prices, setPrices] = useState<Record<string, number>>({});

    useEffect(() => {
        fetch(`/api/v1/portfolio/${USER_ID}`)
            .then(res => res.json())
            .then(data => setHoldings(data))
            .catch(console.error);
    }, []);

    useEffect(() => {
        if (!holdings?.length) return;
        const symbolStrings = Array.from(new Set(holdings.map((h: any) => `${h.symbol}|${h.exchange}`))).join(',');

        const fetchPrices = async () => {
            try {
                const res = await fetch(`/api/v1/market/price?symbols=${symbolStrings}`);
                const data = await res.json();
                if (data.prices) {
                    const priceMap: Record<string, number> = {};
                    data.prices.forEach((p: any) => {
                        priceMap[p.symbol] = p.price;
                    });
                    setPrices(priceMap);
                }
            } catch (error) {
                console.error('Failed to fetch prices for portfolio', error);
            }
        };

        fetchPrices();
        const interval = setInterval(fetchPrices, 30000);
        return () => clearInterval(interval);
    }, [holdings]);

    const handleAdd = async (data: any) => {
        try {
            const res = await fetch('/api/v1/portfolio/holding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const err = await res.json().catch(() => null);
                alert(`Failed to add holding: ${err?.detail || res.statusText}`);
                return;
            }
            const newHolding = await res.json();
            setHoldings(prev => [...prev, newHolding]);
            setIsAddModalOpen(false);
        } catch (error) {
            console.error('Failed to add holding', error);
            alert('Network error: Could not reach the backend.');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await fetch(`/api/v1/portfolio/holding/${id}`, { method: 'DELETE' });
            setHoldings(prev => prev.filter(h => h.id !== id));
        } catch (error) {
            console.error('Failed to delete holding', error);
        }
    };

    // Calculate real-time portfolio stats
    let totalInvested = 0;
    let portfolioValue = 0;
    
    holdings.forEach((h: any) => {
        const currentPrice = prices[h.symbol] || h.avg_buy_price;
        portfolioValue += h.quantity * currentPrice;
        totalInvested += h.quantity * h.avg_buy_price;
    });

    const totalPnL = portfolioValue - totalInvested;
    const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
    const isPositivePnL = totalPnL >= 0;

    const formatCurrency = (val: number) => {
        const isNegative = val < 0;
        const prefix = isNegative ? '-₹' : '₹';
        return prefix + Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    };

    const formatPct = (val: number) => {
        const prefix = val >= 0 ? '+' : '';
        return prefix + val.toFixed(2) + '%';
    };

    return (
        <div className="p-8 max-w-[1400px] mx-auto w-full space-y-8 pb-24 text-gray-200">
            <PortfolioHeader onAddClick={() => setIsAddModalOpen(true)} />

            {/* Top row: Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PnLCard title="Portfolio Value" value={formatCurrency(portfolioValue)} isMain={true} />
                <PnLCard 
                    title="Total P&L" 
                    value={(isPositivePnL ? '+' : '') + formatCurrency(totalPnL)} 
                    subValue={formatPct(totalPnLPct)} 
                    positive={isPositivePnL} 
                />
                <PnLCard title="Today's Change" value="₹0.00" subValue="0.00%" positive={true} />
            </div>

            {/* Middle row: Charts & Table side by side or stacked */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <AllocationChart holdings={holdings} />
                </div>
                <div className="lg:col-span-2">
                    <HoldingsTable
                        holdings={holdings}
                        prices={prices}
                        onEdit={(id) => console.log('Edit', id)}
                        onDelete={handleDelete}
                    />
                </div>
            </div>

            {/* Bottom row: Performance */}
            <PerformanceChart userId={USER_ID} holdings={holdings} />

            <AddHoldingModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAdd}
            />
        </div>
    );
}
