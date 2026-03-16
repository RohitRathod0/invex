"use client"

import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  ArrowDownCircle, 
  Clock, 
  Info,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface TaxData {
  tax_loss_harvesting: Array<{
    symbol: string;
    unrealized_loss: number;
    tax_savings: number;
    days_held: number;
    strategy: string;
    rebuy_date: string | null;
  }>;
  sale_timing_optimization: {
    timing_recommendations: Array<{
      symbol: string;
      current_gain: number;
      days_to_ltcg: number;
      tax_if_sold_now: number;
      tax_if_wait_ltcg: number;
      savings_by_waiting: number;
      recommendation: string;
    }>;
    total_potential_savings: number;
  };
  current_fy_liability: {
    financial_year: string;
    stcg_gains: number;
    ltcg_gains: number;
    ltcg_exemption_used: number;
    stcg_tax: number;
    ltcg_tax: number;
    total_tax_liability: number;
  };
}

interface Props {
  userId: string;
}

export function TaxOptimizationPanel({ userId }: Props) {
  const [data, setData] = useState<TaxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTaxData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:8000/api/v1/portfolio/tax-optimization/${userId}`);
        const json = await res.json();
        
        if (!res.ok) {
          throw new Error(json.detail || json.error || "Failed to fetch tax data");
        }
        
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
    
    fetchTaxData();
  }, [userId]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex items-center justify-center min-h-[300px] animate-pulse">
        <div className="flex flex-col items-center text-gray-400">
          <Calculator className="w-8 h-8 mb-2 opacity-50" />
          <p>Analyzing STCG/LTCG implications with FY 2024-25 rules...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start gap-4">
        <div className="p-3 bg-red-50 rounded-lg shrink-0">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Tax Optimization Unavailable</h3>
          <p className="text-sm text-gray-500 mt-1">{error || "Ensure you have valid historical holdings to calculate taxes."}</p>
        </div>
      </div>
    );
  }

  const { tax_loss_harvesting, sale_timing_optimization, current_fy_liability } = data;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-500" />
            AI Tax Optimizer (FY24-25 India)
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Automated recommendations for Tax-Loss Harvesting and LTCG transitions.
          </p>
        </div>
        
        {sale_timing_optimization?.total_potential_savings > 0 && (
          <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg text-sm font-semibold border border-emerald-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Potential Savings: {formatCurrency(sale_timing_optimization.total_potential_savings)}
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Tax-Loss Harvesting Section */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ArrowDownCircle className="w-4 h-4 text-red-500" /> Tax-Loss Harvesting
            </h3>
            
            {tax_loss_harvesting.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-100">
                <p className="text-sm text-gray-500">No tax-loss harvesting opportunities available right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tax_loss_harvesting.map((item, i) => (
                  <div key={i} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-gray-100 rounded-lg hover:border-blue-100 hover:bg-blue-50/30 transition-colors">
                    <div className="mb-2 sm:mb-0">
                      <div className="font-bold text-gray-900">{item.symbol}</div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <TrendingDown className="w-3 h-3 text-red-400" /> {formatCurrency(item.unrealized_loss)} unrealized loss
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded inline-block font-medium mb-1">
                        Save {formatCurrency(item.tax_savings)} inside FY
                      </div>
                      <div className="text-xs text-gray-600 block">
                        Action: <strong className="text-gray-900">{item.strategy.replace(/_/g, ' ')}</strong>
                        {item.rebuy_date && ` (Rebuy after ${item.rebuy_date})`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p>Offset against STCG liabilities by booking losses. Rebuy after 30 days to avoid wash sale equivalents and maintain position.</p>
            </div>
          </div>

          {/* Sale Timing Recommendations Section */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" /> Timing Optimizations (LTCG)
            </h3>
            
            {!sale_timing_optimization?.timing_recommendations?.length ? (
              <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-100">
                <p className="text-sm text-gray-500">No holdings are currently approaching the 1-year LTCG boundary.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sale_timing_optimization.timing_recommendations.map((item, i) => (
                  <div key={i} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-yellow-100 bg-yellow-50/50 rounded-lg">
                    <div className="mb-2 sm:mb-0">
                      <div className="font-bold text-gray-900">{item.symbol}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Gain: <span className="text-emerald-600 font-medium">+{formatCurrency(item.current_gain)}</span>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="font-medium text-sm text-yellow-800 mb-1">
                        {item.recommendation}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.days_to_ltcg} days remaining to drop tax from 20% to 12.5%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Current Financial Year Stats Box */}
            <div className="mt-6 border border-gray-100 rounded-lg overflow-hidden shrink-0">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 text-xs font-semibold text-gray-500 flex justify-between">
                <span>FY {current_fy_liability.financial_year.split('-')[1] || "24-25"} Realized Summary</span>
                <span>Exemption: {formatCurrency(current_fy_liability.ltcg_exemption_used)} / ₹1.25L</span>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Pending STCG Tax</div>
                  <div className="text-lg font-semibold text-gray-900">{formatCurrency(current_fy_liability.stcg_tax)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Pending LTCG Tax</div>
                  <div className="text-lg font-semibold text-gray-900">{formatCurrency(current_fy_liability.ltcg_tax)}</div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
