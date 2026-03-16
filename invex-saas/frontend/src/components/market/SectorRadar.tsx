"use client"

import React, { useState, useEffect } from 'react';
import { Activity, ArrowUpRight, ArrowDownRight, Minus, AlertCircle } from 'lucide-react';

interface SectorData {
  symbol: string;
  name: string;
  current_price: number;
  change_pct: number;
  rsi: number;
  macd: number;
  signal: string;
  momentum_score: number;
}

export function SectorRadar() {
  const [data, setData] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSectors = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:8000/api/v1/market/sector-rotation`);
        if (!res.ok) {
          throw new Error("Failed to fetch sector rotation data");
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSectors();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex items-center justify-center min-h-[300px] animate-pulse">
        <div className="flex flex-col items-center text-gray-400">
          <Activity className="w-8 h-8 mb-2 opacity-50" />
          <p>Scanning NIFTY Sectorial Momentum (RSI/MACD)...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start gap-4">
        <div className="p-3 bg-red-50 rounded-lg shrink-0">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Sector Radar Unavailable</h3>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const getSignalBadge = (signal: string) => {
    switch (signal) {
      case 'OVERWEIGHT':
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full font-semibold border border-emerald-200">OVERWEIGHT</span>;
      case 'UNDERWEIGHT':
        return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-semibold border border-red-200">UNDERWEIGHT</span>;
      case 'TAKE_PROFITS':
        return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-semibold border border-yellow-200">OVERBOUGHT</span>;
      case 'ACCUMULATE':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-semibold border border-blue-200">OVERSOLD</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-semibold border border-gray-200">NEUTRAL</span>;
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'OVERWEIGHT':
      case 'ACCUMULATE':
        return <ArrowUpRight className="w-4 h-4 text-emerald-500" />;
      case 'UNDERWEIGHT':
      case 'TAKE_PROFITS':
        return <ArrowDownRight className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-500" />
          Sector Rotation Radar
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Quantitative momentum analysis across NIFTY thematic indices.
        </p>
      </div>

      <div className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sector</th>
                <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">RSI (14)</th>
                <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">MACD</th>
                <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Momentum Score</th>
                <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">AI Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((sector, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-semibold text-gray-900">{sector.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{sector.symbol}</div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className={`font-medium ${sector.rsi > 70 ? 'text-red-500' : sector.rsi < 30 ? 'text-emerald-500' : 'text-gray-700'}`}>
                      {sector.rsi.toFixed(1)}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className={`font-medium ${sector.macd > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {sector.macd > 0 ? '+' : ''}{sector.macd.toFixed(2)}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2">
                      <div className="text-sm font-semibold text-gray-900">
                        {sector.momentum_score.toFixed(0)}/100
                      </div>
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${sector.momentum_score > 60 ? 'bg-emerald-500' : sector.momentum_score < 40 ? 'bg-red-500' : 'bg-yellow-500'}`}
                          style={{ width: `${Math.max(0, Math.min(100, sector.momentum_score))}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {getSignalIcon(sector.signal)}
                      {getSignalBadge(sector.signal)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
