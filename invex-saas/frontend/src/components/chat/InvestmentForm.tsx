import React, { useState } from 'react';
import { Send, DollarSign, TrendingUp, Clock, PieChart, Check } from 'lucide-react';
import { cn } from '@/utils/cn';

interface InvestmentFormProps {
    onSubmit: (inputs: any) => void;
    isLoading: boolean;
}

export const InvestmentForm: React.FC<InvestmentFormProps> = ({ onSubmit, isLoading }) => {
    const [formData, setFormData] = useState({
        capital_amount: 100000,
        risk_percentage: 50,
        expected_returns: 15,
        duration_years: 5,
        asset_preferences: {
            stocks: true,
            mutual_funds: true,
            gold: true,
            crypto: true
        }
    });

    const handleAssetChange = (asset: keyof typeof formData.asset_preferences) => {
        setFormData(prev => ({
            ...prev,
            asset_preferences: {
                ...prev.asset_preferences,
                [asset]: !prev.asset_preferences[asset]
            }
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-300">
            <div className="bg-primary-dark p-6 text-white flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold font-sans">Initialize Invex Agent</h2>
                    <p className="text-gray-400 text-sm mt-1">Configure your investment parameters</p>
                </div>
                <div className="bg-primary-mid p-2 rounded-lg font-mono text-xs text-accent-blue">
                    v1.0.0
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
                {/* Capital & Duration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <DollarSign size={16} className="text-primary-mid" />
                            Capital to Invest (₹)
                        </label>
                        <input
                            type="number"
                            min="10000"
                            step="1000"
                            value={formData.capital_amount}
                            onChange={(e) => setFormData({ ...formData, capital_amount: Number(e.target.value) })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20 outline-none transition-all font-mono text-lg"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Clock size={16} className="text-primary-mid" />
                            Duration (Years)
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="30"
                            value={formData.duration_years}
                            onChange={(e) => setFormData({ ...formData, duration_years: Number(e.target.value) })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20 outline-none transition-all font-mono text-lg"
                        />
                    </div>
                </div>

                {/* Risk & Returns */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <TrendingUp size={16} className="text-primary-mid" />
                                Risk Tolerance: {formData.risk_percentage}%
                            </label>
                            <span className={cn(
                                "text-xs font-bold px-2 py-1 rounded",
                                formData.risk_percentage < 30 ? "bg-green-100 text-green-700" :
                                    formData.risk_percentage < 60 ? "bg-yellow-100 text-yellow-700" :
                                        "bg-red-100 text-red-700"
                            )}>
                                {formData.risk_percentage < 30 ? "Conservative" :
                                    formData.risk_percentage < 60 ? "Moderate" : "Aggressive"}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={formData.risk_percentage}
                            onChange={(e) => setFormData({ ...formData, risk_percentage: Number(e.target.value) })}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-accent-blue"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">
                            Expected Annual Returns (%)
                        </label>
                        <div className="flex items-center gap-4">
                            {[10, 12, 15, 20].map((rate) => (
                                <button
                                    key={rate}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, expected_returns: rate })}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                                        formData.expected_returns === rate
                                            ? "bg-primary-mid text-white border-primary-mid"
                                            : "bg-white text-gray-600 border-gray-200 hover:border-primary-mid"
                                    )}
                                >
                                    {rate}%
                                </button>
                            ))}
                            <input
                                type="number"
                                value={formData.expected_returns}
                                onChange={(e) => setFormData({ ...formData, expected_returns: Number(e.target.value) })}
                                className="w-20 px-3 py-2 rounded-lg border border-gray-200 text-center font-mono text-sm focus:border-accent-blue outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Asset Preferences */}
                <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <PieChart size={16} className="text-primary-mid" />
                        Asset Classes
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                        {(Object.keys(formData.asset_preferences) as Array<keyof typeof formData.asset_preferences>).map((asset) => (
                            <div
                                key={asset}
                                onClick={() => handleAssetChange(asset)}
                                className={cn(
                                    "p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between",
                                    formData.asset_preferences[asset]
                                        ? "bg-blue-50 border-accent-blue shadow-sm"
                                        : "bg-gray-50 border-gray-200 opacity-70 hover:opacity-100"
                                )}
                            >
                                <span className="font-medium capitalize text-gray-800">
                                    {asset.replace('_', ' ')}
                                </span>
                                {formData.asset_preferences[asset] && (
                                    <div className="bg-accent-blue text-white rounded-full p-1">
                                        <Check size={12} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-accent-blue text-white font-bold text-lg py-4 rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>Processing...</>
                    ) : (
                        <>
                            Start Analysis <Send size={20} />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};
