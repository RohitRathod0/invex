"use client"

import React, { useState } from 'react';
import { Activity, AlertTriangle, TrendingDown, TrendingUp, Settings, BarChart2, Loader2, ShieldAlert } from 'lucide-react';
import apiClient from '@/api/apiClient';

interface MonteCarloResult {
  simulations_run: number;
  time_horizon_years: number;
  current_value: number;
  projections: {
    worst_case_5th_pct: number;
    median_50th_pct: number;
    best_case_95th_pct: number;
  };
  projected_returns_pct: {
    worst_case: number;
    median: number;
    best_case: number;
  };
  sampled_paths: number[][];
}

interface Props {
  userId: string;
}

export function StressTester({ userId }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MonteCarloResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [years, setYears] = useState(1);
  const [sims, setSims] = useState(1000);

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post(`/portfolio/stress-test/monte-carlo/${userId}`, {
        years: years,
        simulations: sims
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.message || 'Error running simulation');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-purple-500" /> Monte Carlo Stress Simulator
          </h2>
          <p className="text-sm text-gray-500 mt-1">Project future portfolio values across thousands of random market paths.</p>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex flex-col sm:flex-row items-end gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Time Horizon (Years)</label>
            <input 
              type="number" 
              min="0.5" step="0.5" max="10"
              value={years}
              onChange={(e) => setYears(parseFloat(e.target.value))}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Paths Simulated</label>
            <select
              value={sims}
              onChange={(e) => setSims(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400"
            >
              <option value="500">500 Paths</option>
              <option value="1000">1,000 Paths</option>
              <option value="5000">5,000 Paths</option>
            </select>
          </div>
          <button 
            onClick={runSimulation}
            disabled={loading}
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 h-[42px]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            Run Simulation
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 mb-6">
            <AlertTriangle className="w-5 h-5" /> {error}
          </div>
        )}

        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Value Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 border border-red-100 bg-red-50 rounded-xl">
                <div className="flex items-center gap-2 text-red-600 mb-2 font-bold text-sm tracking-wide uppercase">
                  <TrendingDown className="w-4 h-4" /> Worst Case (5th Pct)
                </div>
                <div className="text-2xl font-black text-gray-900 mb-1">
                  {formatCurrency(result.projections.worst_case_5th_pct)}
                </div>
                <div className="text-sm font-semibold text-red-600">
                  {result.projected_returns_pct.worst_case.toFixed(2)}% Return
                </div>
              </div>

              <div className="p-5 border border-indigo-100 bg-indigo-50 rounded-xl">
                <div className="flex items-center gap-2 text-indigo-600 mb-2 font-bold text-sm tracking-wide uppercase">
                  <Activity className="w-4 h-4" /> Median Expected
                </div>
                <div className="text-2xl font-black text-gray-900 mb-1">
                  {formatCurrency(result.projections.median_50th_pct)}
                </div>
                <div className="text-sm font-semibold text-indigo-600">
                  +{result.projected_returns_pct.median.toFixed(2)}% Return
                </div>
              </div>

              <div className="p-5 border border-emerald-100 bg-emerald-50 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-600 mb-2 font-bold text-sm tracking-wide uppercase">
                  <TrendingUp className="w-4 h-4" /> Best Case (95th Pct)
                </div>
                <div className="text-2xl font-black text-gray-900 mb-1">
                  {formatCurrency(result.projections.best_case_95th_pct)}
                </div>
                <div className="text-sm font-semibold text-emerald-600">
                  +{result.projected_returns_pct.best_case.toFixed(2)}% Return
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mt-4">
               <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                 <Settings className="w-4 h-4 text-gray-400" /> Simulation Parameters
               </h3>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                 <div>
                   <span className="block text-gray-500 mb-1">Current Value</span>
                   <span className="font-semibold">{formatCurrency(result.current_value)}</span>
                 </div>
                 <div>
                   <span className="block text-gray-500 mb-1">Simulations</span>
                   <span className="font-semibold">{result.simulations_run.toLocaleString()}</span>
                 </div>
                 <div>
                   <span className="block text-gray-500 mb-1">Time Horizon</span>
                   <span className="font-semibold">{result.time_horizon_years} Years</span>
                 </div>
                 <div>
                   <span className="block text-gray-500 mb-1">Model</span>
                   <span className="font-semibold">Geometric Brownian Motion</span>
                 </div>
               </div>
            </div>
            
            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex items-start gap-3 text-sm">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
              <p>
                <strong>What-If Scenario Insight:</strong> In 5% of our {result.simulations_run} simulated market conditions, 
                your portfolio value could drop to <strong>{formatCurrency(result.projections.worst_case_5th_pct)}</strong> or lower within {result.time_horizon_years} years. 
                Ensure you have sufficient liquidity to withstand this potential drawdown without being forced to sell.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
