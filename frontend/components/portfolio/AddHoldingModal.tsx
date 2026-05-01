"use client";

import { useState, useEffect, useCallback } from 'react';
import { X, Search, Loader2, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';

interface AddHoldingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (data: {
        symbol: string;
        exchange: string;
        quantity: number;
        avg_buy_price: number;
        buy_date: string;
    }) => void;
}

type FetchState = 'idle' | 'loading' | 'success' | 'error';

// Single atomic state — prevents rendering success=true with price=null/undefined
interface PriceResult {
    state: FetchState;
    price: number | null;
    currency: string;
    error: string;
}

const INITIAL: PriceResult = { state: 'idle', price: null, currency: 'INR', error: '' };

const inputClass =
    "w-full bg-[#1A1A1A] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#C8F135]/50 focus:ring-1 focus:ring-[#C8F135]/20 transition-all";

export const AddHoldingModal = ({ isOpen, onClose, onAdd }: AddHoldingModalProps) => {
    const [symbol, setSymbol]   = useState('');
    const [exchange, setExchange] = useState('NSE');
    const [quantity, setQuantity] = useState('');
    const [buyDate, setBuyDate]  = useState(new Date().toISOString().split('T')[0]);
    // Renamed from `fetch` to `priceResult` to avoid shadowing global window.fetch
    const [priceResult, setPriceResult] = useState<PriceResult>(INITIAL);

    const reset = () => {
        setSymbol('');
        setExchange('NSE');
        setQuantity('');
        setBuyDate(new Date().toISOString().split('T')[0]);
        setPriceResult(INITIAL);
    };

    // Look up the closing price on the given date via the backend
    const lookupPrice = useCallback(async (sym: string, date: string, exch: string) => {
        if (!sym || !date) return;
        setPriceResult({ state: 'loading', price: null, currency: 'INR', error: '' });
        try {
            // Use window.fetch explicitly to avoid any local variable shadowing
            const res = await window.fetch(
                `/api/v1/portfolio/price-on-date?symbol=${encodeURIComponent(sym)}&date=${date}&exchange=${exch}`
            );
            const json = await res.json();
            if (!res.ok || json.error) {
                throw new Error(json.error || json.detail || 'Price not found');
            }
            const price = typeof json.price === 'number' ? json.price : parseFloat(json.price);
            if (!isFinite(price)) throw new Error('Invalid price received from server');
            // Atomic update — state, price, and currency set together
            setPriceResult({ state: 'success', price, currency: json.currency ?? 'INR', error: '' });
        } catch (err: any) {
            setPriceResult({ state: 'error', price: null, currency: 'INR', error: err.message ?? 'Could not fetch price' });
        }
    }, []);

    // Debounce: wait 700ms after the user stops typing before hitting the API
    useEffect(() => {
        if (!symbol || !buyDate) return;
        const timer = setTimeout(() => lookupPrice(symbol, buyDate, exchange), 700);
        return () => clearTimeout(timer);
    }, [symbol, buyDate, exchange, lookupPrice]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!priceResult.price) return;
        onAdd({
            symbol: symbol.toUpperCase(),
            exchange,
            quantity: Number(quantity),
            avg_buy_price: priceResult.price,
            buy_date: new Date(buyDate).toISOString(),
        });
        reset();
    };

    if (!isOpen) return null;

    const currSym   = priceResult.currency === 'USD' ? '$' : '₹';
    const canSubmit = priceResult.state === 'success' && priceResult.price !== null && Number(quantity) > 0;

    return (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-[480px] bg-[#0E0E0E] border border-white/[0.08] rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.6)] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Add Holding</h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Enter symbol, quantity &amp; purchase date — price auto-fetched
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Row 1: Symbol + Exchange */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 space-y-1.5">
                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                                Stock Symbol
                            </label>
                            <input
                                required
                                placeholder="e.g. RELIANCE, AAPL, TCS"
                                value={symbol}
                                onChange={e => setSymbol(e.target.value.toUpperCase())}
                                className={inputClass}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                                Exchange
                            </label>
                            <div className="relative">
                                <select
                                    value={exchange}
                                    onChange={e => setExchange(e.target.value)}
                                    className={`${inputClass} appearance-none pr-8`}
                                >
                                    <option value="NSE">NSE</option>
                                    <option value="BSE">BSE</option>
                                    <option value="US">US</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Quantity + Date */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                                Quantity
                            </label>
                            <input
                                required type="number" step="any" min="0.01"
                                placeholder="0"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                                Purchase Date
                            </label>
                            <input
                                required type="date"
                                max={new Date().toISOString().split('T')[0]}
                                value={buyDate}
                                onChange={e => setBuyDate(e.target.value)}
                                className={`${inputClass} [color-scheme:dark]`}
                            />
                        </div>
                    </div>

                    {/* Row 3: Auto-fetched price status */}
                    <div className={`rounded-xl border px-4 py-3.5 transition-all duration-300 ${
                        priceResult.state === 'success'
                            ? 'border-[#C8F135]/30 bg-[#C8F135]/5'
                            : priceResult.state === 'error'
                            ? 'border-red-400/30 bg-red-400/5'
                            : 'border-white/[0.06] bg-white/[0.02]'
                    }`}>
                        {priceResult.state === 'idle' && (
                            <p className="text-xs text-gray-500 flex items-center gap-2">
                                <Search size={13} />
                                Enter a symbol &amp; date to auto-fetch the purchase price
                            </p>
                        )}
                        {priceResult.state === 'loading' && (
                            <p className="text-xs text-gray-400 flex items-center gap-2">
                                <Loader2 size={13} className="animate-spin text-[#C8F135]" />
                                Fetching price from Yahoo Finance…
                            </p>
                        )}
                        {priceResult.state === 'success' && priceResult.price !== null && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={15} className="text-[#C8F135]" />
                                    <span className="text-xs text-gray-400">
                                        Price on {new Date(buyDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                                <span className="text-lg font-bold text-[#C8F135]">
                                    {currSym}{priceResult.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        )}
                        {priceResult.state === 'error' && (
                            <div className="flex items-center gap-2">
                                <AlertCircle size={13} className="text-red-400 shrink-0" />
                                <p className="text-xs text-red-400">{priceResult.error}</p>
                            </div>
                        )}
                    </div>

                    {/* Row 4: Total invested preview (only shown when ready) */}
                    {canSubmit && priceResult.price !== null && Number(quantity) > 0 && (
                        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                            <span className="text-xs text-gray-500">Total Invested</span>
                            <span className="text-sm font-semibold text-white">
                                {currSym}{(priceResult.price * Number(quantity)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    )}

                    {/* Row 5: Submit */}
                    <div className="pt-1">
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className={`w-full font-semibold py-3.5 rounded-xl transition-all duration-200 ${
                                canSubmit
                                    ? 'bg-[#C8F135] hover:bg-[#d4f54a] text-black shadow-[0_0_24px_rgba(200,241,53,0.2)] cursor-pointer'
                                    : 'bg-white/10 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            {priceResult.state === 'loading' ? 'Fetching price…' : 'Save Holding'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
