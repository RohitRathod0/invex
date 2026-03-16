"use client"

import React, { useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { TrendingUp, RefreshCw, BarChart3, AlertCircle, Calendar, DollarSign, Activity, Percent } from 'lucide-react';

interface BacktestMetrics {
  total_return: number;
  cagr: number;
  sharpe_ratio: number;
  max_drawdown: number;
  win_rate: number;
  avg_trade_duration: string;
  total_trades: number;
}

interface EquityPoint {
  date: string;
  equity: number;
  drawdown: number;
}

export function BacktestSimulator() {
  const [symbol, setSymbol] = useState('RELIANCE');
  const [startDate, setStartDate] = useState('2020-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [initialCash, setInitialCash] = useState(100000);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [metrics, setMetrics] = useState<BacktestMetrics | null>(null);
  const [equityCurve, setEquityCurve] = useState<EquityPoint[]>([]);

  const runBacktest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/api/v1/portfolio/backtest/strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: symbol,
          start_date: startDate,
          end_date: endDate,
          initial_cash: initialCash,
          strategy_params: {}
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to run backtest simulation.");
      }
      
      const data = await response.json();
      setMetrics(data);
      setEquityCurve(data.equity_curve || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to run backtest simulation.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            AI Backtesting Simulator
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Test AI recommendations against historical market data
          </p>
        </div>
      </div>

      <div className="p-6">
        <form onSubmit={runBacktest} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wider">Asset Symbol</label>
            <div className="relative">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="block w-full rounded-md border-gray-300 pl-3 pr-10 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 border bg-gray-50"
                placeholder="e.g. RELIANCE"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wider">Start Date</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full rounded-md border-gray-300 pl-10 pr-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 border bg-gray-50"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wider">End Date</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block w-full rounded-md border-gray-300 pl-10 pr-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 border bg-gray-50"
                required
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 disabled:bg-blue-300"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
              {loading ? 'Simulating...' : 'Run Backtest'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md flex items-start gap-3 border border-red-100">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {metrics && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Total Return
                </div>
                <div className={`text-2xl font-bold ${metrics.total_return >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {metrics.total_return >= 0 ? '+' : ''}{metrics.total_return.toFixed(2)}%
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" /> Sharpe Ratio
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {metrics.sharpe_ratio.toFixed(2)}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Percent className="w-3 h-3" /> Win Rate
                </div>
                <div className={`text-2xl font-bold ${metrics.win_rate > 50 ? 'text-emerald-600' : 'text-yellow-600'}`}>
                  {metrics.win_rate.toFixed(1)}%
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                <div className="text-xs font-medium text-red-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 rotate-180" /> Max Drawdown
                </div>
                <div className="text-2xl font-bold text-red-700">
                  {metrics.max_drawdown.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white border text-black border-gray-100 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" /> 
                Simulated Equity Curve
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityCurve} margin={{ top: 5, right: 0, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{fill: '#9ca3af', fontSize: 12}}
                      minTickGap={30}
                    />
                    <YAxis 
                      domain={['auto', 'auto']}
                      axisLine={false}
                      tickLine={false}
                      tick={{fill: '#9ca3af', fontSize: 12}}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => [formatCurrency(val), "Equity"]}
                      labelStyle={{ color: '#6b7280', marginBottom: '4px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="equity" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorEquity)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Trade Stats Footer */}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
              <span>Total AI Trades Executed: <strong>{metrics.total_trades}</strong></span>
              <span>Avg Trade Mkt Exposure: <strong>{metrics.avg_trade_duration}</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
