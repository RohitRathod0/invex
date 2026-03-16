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

    useEffect(() => {
        fetch(`/api/v1/portfolio/${USER_ID}`)
            .then(res => res.json())
            .then(data => setHoldings(data))
            .catch(console.error);
    }, []);

    const handleAdd = async (data: any) => {
        try {
            const res = await fetch('/api/v1/portfolio/holding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const newHolding = await res.json();
            setHoldings(prev => [...prev, newHolding]);
            setIsAddModalOpen(false);
        } catch (error) {
            console.error('Failed to add holding', error);
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

    return (
        <div className="p-8 max-w-[1400px] mx-auto w-full space-y-8 pb-24 text-gray-200">
            <PortfolioHeader onAddClick={() => setIsAddModalOpen(true)} />

            {/* Top row: Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PnLCard title="Portfolio Value" value="₹1,24,500" isMain={true} />
                <PnLCard title="Total P&L" value="+₹14,200" subValue="+12.9%" positive={true} />
                <PnLCard title="Today's Change" value="-₹840" subValue="-0.67%" positive={false} />
            </div>

            {/* Middle row: Charts & Table side by side or stacked */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <AllocationChart holdings={holdings} />
                </div>
                <div className="lg:col-span-2">
                    <HoldingsTable
                        holdings={holdings}
                        onEdit={(id) => console.log('Edit', id)}
                        onDelete={handleDelete}
                    />
                </div>
            </div>

            {/* Bottom row: Performance */}
            <PerformanceChart userId={USER_ID} />

            <AddHoldingModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAdd}
            />
        </div>
    );
}
