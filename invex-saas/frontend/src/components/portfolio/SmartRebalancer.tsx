"use client"

import React, { useState, useEffect } from 'react';
import { Target, RefreshCw, AlertTriangle, ArrowRight, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
import apiClient from '@/api/apiClient';

interface RebalancePlan {
  portfolio_value: number;
  overall_drift_score: number;
  requires_rebalance: boolean;
  asset_allocation_drifts: Record<string, {
    target: number;
    current: number;
    drift: number;
    action_required: boolean;
  }>;
  recommended_actions: string[];
  tax_harvesting_opportunities: number;
}

export function SmartRebalancer({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RebalancePlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlan();
  }, [userId]);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/portfolio/rebalance/${userId}`);
      setData(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch rebalancing data');
    } finally {
      setLoading(false);
    }
  };

  const formatPct = (val: number) => (val * 100).toFixed(1) + '%';
  
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex items-center justify-center h-48 animate-pulse text-gray-400">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 text-red-500">
          <AlertCircle className="w-5 h-5" />
          <span className="font-semibold text-sm">{error || "Could not generate rebalancing plan."}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" /> AI Smart Rebalancing
          </h2>
          <p className="text-sm text-gray-500 mt-1">Keep your portfolio fully aligned with your risk profile.</p>
        </div>
        <div className="flex gap-3 items-center">
            {data.requires_rebalance ? (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold border border-amber-200 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Action Required
              </span>
            ) : (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Optimally Aligned
              </span>
            )}
        </div>
      </div>

      <div className="p-6">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Drift Overview */}
             <div className="space-y-4">
                 <h3 className="text-sm font-bold text-gray-700">Allocation Drift</h3>
                 <div className="space-y-3">
                     {Object.entries(data.asset_allocation_drifts).map(([ac, driftData]) => (
                         <div key={ac} className="border border-gray-50 bg-gray-50/50 rounded-lg p-3">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-gray-700">{ac.replace('EQUITY:', '')}</span>
                                {driftData.action_required ? 
                                    <span className="text-[10px] uppercase font-bold text-red-500">Drifted</span> : 
                                    <span className="text-[10px] uppercase font-bold text-emerald-500">On Target</span>
                                }
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <div className="text-gray-500 flex items-center gap-2 w-1/3">
                                   Target <strong className="text-gray-800">{formatPct(driftData.target)}</strong>
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-300" />
                                <div className="text-gray-500 flex items-center gap-2 w-1/3 justify-end">
                                   Actual <strong className={driftData.action_required ? "text-red-600" : "text-emerald-600"}>{formatPct(driftData.current)}</strong>
                                </div>
                            </div>
                         </div>
                     ))}
                 </div>
             </div>

             {/* Action Plan */}
             <div>
                 <h3 className="text-sm font-bold text-gray-700 mb-4">Recommended Actions</h3>
                 {data.recommended_actions.length === 0 ? (
                    <div className="h-32 border border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-sm">
                        No trades required at this time.
                    </div>
                 ) : (
                    <div className="space-y-3">
                        {data.recommended_actions.map((act, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-blue-100 bg-blue-50/50">
                                <Wallet className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                <span className="text-sm text-blue-900 font-medium">{act}</span>
                            </div>
                        ))}
                    </div>
                 )}

                 {data.tax_harvesting_opportunities > 0 && (
                     <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-start gap-3">
                         <Target className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                         <p className="text-xs text-indigo-800">
                             <strong>Smart Execution:</strong> There are <span className="font-bold">{data.tax_harvesting_opportunities}</span> tax-loss harvesting opportunities available to offset any capital gains generated during this rebalancing process.
                         </p>
                     </div>
                 )}

                 {data.recommended_actions.length > 0 && (
                     <button className="w-full mt-6 bg-gray-900 hover:bg-gray-800 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 h-[42px] text-sm shadow-md">
                         Execute Rebalancing Plan
                     </button>
                 )}
             </div>
         </div>
      </div>
    </div>
  );
}
