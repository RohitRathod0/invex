"use client"

import React, { useState } from 'react';
import { ShieldAlert, TrendingDown, TrendingUp, Users, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import apiClient from '@/api/apiClient';

interface InsiderTrade {
  id: string;
  date: string;
  person_name: string;
  person_category: string;
  trade_type: string;
  quantity: number;
  price: number;
  value: number;
}

interface InsiderAnalysis {
  overall_signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  reason: string;
  patterns: {
    aggressive_buying: boolean;
    promoter_accumulation: boolean;
    buyers: string[];
    promoter_buying: number;
    promoter_selling: number;
  };
  recent_trades: InsiderTrade[];
}

export function InsiderAlerts() {
  const [symbol, setSymbol] = useState('RELIANCE');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InsiderAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const res = await apiClient.get(`/market/insider-trades/${symbol}?days_back=90`);
      setResult(res.data);
    } catch (err: any) {
      setError(err.message || 'Error fetching insider trades');
    } finally {
      setLoading(false);
    }
  };

  const getSignalColor = (signal: string) => {
    if (signal === 'BULLISH') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (signal === 'BEARISH') return 'text-red-600 bg-red-50 border-red-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const formatCurrency = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-500" /> Insider Trading Radar
          </h2>
          <p className="text-sm text-gray-500 mt-1">Track promoter & director accumulation from exchange disclosures.</p>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input 
            type="text" 
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="Stock Symbol (e.g. RELIANCE)" 
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
          />
          <button 
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
            Scan Disclosures
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 mb-6">
            <AlertTriangle className="w-5 h-5" /> {error}
          </div>
        )}

        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 border rounded-xl flex flex-col justify-center items-center ${getSignalColor(result.overall_signal)}`}>
                <span className="text-xs font-bold uppercase tracking-wide mb-1 opacity-80">Pattern Signal</span>
                <span className="text-2xl font-extrabold">{result.overall_signal}</span>
                <span className="text-xs mt-1 font-medium opacity-80">Confidence: {result.confidence}%</span>
              </div>
              
              <div className="p-4 border border-gray-200 bg-gray-50 rounded-xl flex flex-col justify-center">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-2 text-center">90-Day Promoter Activity</span>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-emerald-600 font-medium">Buying</span>
                  <span className="font-bold text-gray-800">{formatCurrency(result.patterns.promoter_buying)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-red-500 font-medium">Selling</span>
                  <span className="font-bold text-gray-800">{formatCurrency(result.patterns.promoter_selling)}</span>
                </div>
              </div>

              <div className="p-4 border border-gray-200 bg-gray-50 rounded-xl flex flex-col justify-center">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-2 flex items-center justify-center gap-1">
                  <Users className="w-3 h-3" /> Key Insights
                </span>
                <p className="text-sm text-gray-700 text-center leading-relaxed">
                  {result.reason}
                </p>
                {result.patterns.aggressive_buying && (
                  <p className="text-xs text-blue-600 bg-blue-50 py-1 px-2 rounded mt-2 text-center font-medium">
                    Cluster buying detected
                  </p>
                )}
              </div>
            </div>

            {/* Recent Trades Table */}
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3 ml-1">Recent Insider Transactions</h3>
              <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-gray-600 print:hidden">Date</th>
                      <th className="px-4 py-3 font-semibold text-gray-600">Insider</th>
                      <th className="px-4 py-3 font-semibold text-gray-600">Role</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 text-right">Action</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {result.recent_trades.map((trade) => (
                      <tr key={trade.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(trade.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{trade.person_name}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {trade.person_category}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                            trade.trade_type === 'BUY' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                          }`}>
                            {trade.trade_type === 'BUY' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {trade.trade_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-800">
                          {formatCurrency(trade.value)}
                        </td>
                      </tr>
                    ))}
                    {result.recent_trades.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500 border-t border-gray-100">
                          No recent insider trades found for {symbol}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
