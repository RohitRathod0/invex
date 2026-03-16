"use client"

import React, { useState, useEffect } from 'react';
import { Shield, TrendingDown, Percent, Activity, AlertTriangle } from 'lucide-react';

interface RiskReport {
  var_95: number;
  cvar_95: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: {
    max_drawdown: number;
    max_drawdown_duration: number;
  };
  correlation_analysis: {
    matrix: Record<string, Record<string, number>>;
    high_correlations: Array<{asset1: string, asset2: string, correlation: number}>;
    diversification_score: number;
  };
  stress_test: Record<string, {
    total_return: number;
    max_drawdown: number;
    volatility: number;
  }>;
}

interface Props {
  userId: string;
}

export function RiskAnalyticsPanel({ userId }: Props) {
  const [data, setData] = useState<RiskReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRisk = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:8000/api/v1/portfolio/risk-analysis/${userId}`);
        const json = await res.json();
        
        if (!res.ok) {
          throw new Error(json.detail || json.error || "Failed to fetch risk data");
        }
        
        // Handle case where we don't have enough data
        if (json.error) {
          throw new Error(json.error);
        }
        
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRisk();
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex items-center justify-center h-64 animate-pulse">
        <div className="flex flex-col items-center text-gray-400">
          <Shield className="w-8 h-8 mb-2 opacity-50" />
          <p>Compiling Institutional Risk Models...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start gap-4">
        <div className="p-3 bg-red-50 rounded-lg shrink-0">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Risk Engine Unavailable</h3>
          <p className="text-sm text-gray-500 mt-1">{error || "Ensure you have valid historical holdings to calculate correlation."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-500" />
            Institutional Risk Analytics
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Quantify tail risks, historical stress, and diversification score.
          </p>
        </div>
        <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-100">
          Diversification Score: {data.correlation_analysis?.diversification_score?.toFixed(0) || 0}/100
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-red-400" /> Value at Risk (95%)
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {(data.var_95 * 100).toFixed(2)}%
            </div>
            <div className="text-xs text-gray-400 mt-1">Expected max daily loss</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" /> Sharpe Ratio
            </div>
            <div className={`text-2xl font-bold ${data.sharpe_ratio > 1 ? 'text-emerald-600' : 'text-gray-900'}`}>
              {data.sharpe_ratio.toFixed(2)}
            </div>
            <div className="text-xs text-gray-400 mt-1">Risk-free adj. return</div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Percent className="w-3 h-3 text-indigo-400" /> Sortino Ratio
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {data.sortino_ratio.toFixed(2)}
            </div>
            <div className="text-xs text-gray-400 mt-1">Downside adj. return</div>
          </div>

          <div className="bg-red-50 rounded-lg p-4 border border-red-100">
            <div className="text-xs font-medium text-red-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Max Drawdown
            </div>
            <div className="text-2xl font-bold text-red-700">
              {data.max_drawdown.max_drawdown.toFixed(2)}%
            </div>
            <div className="text-xs text-red-400 mt-1">{data.max_drawdown.max_drawdown_duration} days to recover</div>
          </div>
        </div>

        {/* Stress Testing Section */}
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          Historical Stress Testing
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(data.stress_test || {}).map(([scenario, metrics]) => (
            <div key={scenario} className="border border-gray-100 rounded-lg p-4 bg-white shadow-sm">
              <div className="font-semibold text-sm text-gray-800 capitalize mb-3 border-b border-gray-50 pb-2">
                {scenario.replace(/_/g, ' ')}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Impact</div>
                  <div className="font-bold text-red-600 text-sm">
                    {metrics.total_return.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Drawdown</div>
                  <div className="font-bold text-gray-700 text-sm">
                    {metrics.max_drawdown.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Volatility</div>
                  <div className="font-bold text-gray-700 text-sm">
                    {metrics.volatility.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
