"use client";

import { useState } from 'react';
import { X, Bell } from 'lucide-react';

interface CreateAlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: { symbol: string; condition: string; target_price: number; note?: string }) => void;
}

export const CreateAlertModal = ({ isOpen, onClose, onCreate }: CreateAlertModalProps) => {
    const [form, setForm] = useState({ symbol: '', condition: 'above', target_price: '', note: '' });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreate({
            symbol: form.symbol.toUpperCase(),
            condition: form.condition,
            target_price: Number(form.target_price),
            note: form.note || undefined,
        });
        setForm({ symbol: '', condition: 'above', target_price: '', note: '' });
    };

    return (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-[440px] bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <Bell size={18} className="text-[#C8F135]" />
                        <h2 className="text-lg font-semibold text-white">Create Alert</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-400">Stock Symbol</label>
                        <input
                            required
                            placeholder="e.g. RELIANCE, AAPL"
                            value={form.symbol}
                            onChange={e => setForm(p => ({ ...p, symbol: e.target.value }))}
                            className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C8F135]/50 transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-400">Condition</label>
                            <select
                                value={form.condition}
                                onChange={e => setForm(p => ({ ...p, condition: e.target.value }))}
                                className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C8F135]/50 transition-colors appearance-none"
                            >
                                <option value="above">Price goes above</option>
                                <option value="below">Price goes below</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-400">Target Price (₹)</label>
                            <input
                                required type="number" step="any" min="0" placeholder="0.00"
                                value={form.target_price}
                                onChange={e => setForm(p => ({ ...p, target_price: e.target.value }))}
                                className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C8F135]/50 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-400">Note (optional)</label>
                        <input
                            placeholder="e.g. Breakout level"
                            value={form.note}
                            onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                            className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C8F135]/50 transition-colors"
                        />
                    </div>

                    <div className="pt-2">
                        <button type="submit" className="w-full bg-[#C8F135] hover:bg-[#bce628] text-black font-semibold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(200,241,53,0.15)]">
                            Set Alert
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
