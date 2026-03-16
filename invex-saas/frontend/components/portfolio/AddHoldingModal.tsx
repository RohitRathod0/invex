"use client";

import { useState } from 'react';
import { X } from 'lucide-react';

interface HoldingFormData {
    symbol: string;
    exchange: string;
    quantity: number;
    avg_buy_price: number;
    buy_date: string;
}

interface AddHoldingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (data: HoldingFormData) => void;
}

export const AddHoldingModal = ({ isOpen, onClose, onAdd }: AddHoldingModalProps) => {
    const [formData, setFormData] = useState({
        symbol: '',
        exchange: 'NSE',
        quantity: '',
        avg_buy_price: '',
        buy_date: new Date().toISOString().split('T')[0]
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd({
            ...formData,
            quantity: Number(formData.quantity),
            avg_buy_price: Number(formData.avg_buy_price),
        });
        setFormData({ symbol: '', exchange: 'NSE', quantity: '', avg_buy_price: '', buy_date: new Date().toISOString().split('T')[0] });
    };

    return (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-[480px] bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-white">Add Holding</h2>
                    <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-1.5">
                            <label className="text-sm font-medium text-gray-400">Stock Symbol (e.g. RELIANCE, AAPL)</label>
                            <input
                                required
                                value={formData.symbol}
                                onChange={e => setFormData(p => ({ ...p, symbol: e.target.value.toUpperCase() }))}
                                className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C8F135]/50 transition-colors"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-400">Exchange</label>
                            <select
                                value={formData.exchange}
                                onChange={e => setFormData(p => ({ ...p, exchange: e.target.value }))}
                                className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C8F135]/50 transition-colors appearance-none"
                            >
                                <option>NSE</option>
                                <option>BSE</option>
                                <option>US</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-400">Quantity</label>
                            <input
                                required type="number" step="any" min="0" placeholder="0"
                                value={formData.quantity}
                                onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))}
                                className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C8F135]/50 transition-colors"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-400">Avg Buy Price (₹)</label>
                            <input
                                required type="number" step="any" min="0" placeholder="0.00"
                                value={formData.avg_buy_price}
                                onChange={e => setFormData(p => ({ ...p, avg_buy_price: e.target.value }))}
                                className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C8F135]/50 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-400">Buy Date</label>
                        <input
                            required type="date"
                            value={formData.buy_date}
                            onChange={e => setFormData(p => ({ ...p, buy_date: e.target.value }))}
                            className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C8F135]/50 transition-colors [color-scheme:dark]"
                        />
                    </div>

                    <div className="pt-4">
                        <button type="submit" className="w-full bg-[#C8F135] hover:bg-[#bce628] text-black font-semibold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(200,241,53,0.15)]">
                            Save Holding
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
