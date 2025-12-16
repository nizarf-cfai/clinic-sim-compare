import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  stdValue: number;
  aiValue: number;
  unit?: string;
  inverse?: boolean; // If true, lower is better (e.g. Wait Time)
  formatFn?: (val: number) => string;
}

const KPICard: React.FC<KPICardProps> = ({ title, stdValue, aiValue, unit = '', inverse = false, formatFn }) => {
  const diff = aiValue - stdValue;
  const pctChange = stdValue !== 0 ? (diff / stdValue) * 100 : 0;
  
  // Determine if the change is "Good" or "Bad"
  // Default: Higher is better (Throughput). Inverse: Lower is better (Wait time).
  const isImprovement = inverse ? diff < 0 : diff > 0;
  
  const displayValue = (v: number) => formatFn ? formatFn(v) : v.toFixed(1);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <h4 className="text-slate-500 text-sm font-medium mb-4">{title}</h4>
      
      <div className="flex justify-between items-end">
        <div>
           <p className="text-xs text-slate-400 mb-1">Standard</p>
           <div className="text-xl font-semibold text-slate-700">{displayValue(stdValue)}<span className="text-sm font-normal text-slate-400 ml-1">{unit}</span></div>
        </div>
        
        <div className="text-right">
           <p className="text-xs text-purple-400 mb-1">AI-Enabled</p>
           <div className="text-2xl font-bold text-slate-900">{displayValue(aiValue)}<span className="text-sm font-normal text-slate-400 ml-1">{unit}</span></div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
        <span className="text-xs text-slate-400">Impact</span>
        <div className={`flex items-center text-sm font-bold ${isImprovement ? 'text-emerald-600' : 'text-rose-500'}`}>
           {diff === 0 ? <Minus className="w-4 h-4 mr-1"/> : isImprovement ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
           {Math.abs(pctChange).toFixed(1)}%
        </div>
      </div>
    </div>
  );
};

export default KPICard;