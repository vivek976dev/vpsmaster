import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  percentage?: number;
  trend?: string;
  color?: 'sky' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subValue,
  icon: Icon,
  percentage,
  trend,
  color = 'sky',
}) => {
  const colorMap = {
    sky: 'from-sky-500/20 to-sky-500/5 text-sky-400 border-sky-500/30 progress-sky',
    indigo: 'from-indigo-500/20 to-indigo-500/5 text-indigo-400 border-indigo-500/30 progress-indigo',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/30 progress-emerald',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/30 progress-amber',
    rose: 'from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/30 progress-rose',
    purple: 'from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/30 progress-purple',
  };

  const barColor = {
    sky: 'bg-sky-500',
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
            {title}
          </span>
          <div className="text-2xl font-extrabold text-slate-100 mt-1 font-mono tracking-tight">
            {value}
          </div>
          {subValue && (
            <div className="text-xs text-slate-400 mt-1 font-medium">{subValue}</div>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br border ${colorMap[color]} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {percentage !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
            <span>Utilization</span>
            <span className="font-semibold text-slate-200">{percentage.toFixed(1)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor[color]} transition-all duration-500 rounded-full`}
              style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
            />
          </div>
        </div>
      )}

      {trend && (
        <div className="mt-3 text-xs text-slate-400 flex items-center space-x-1">
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
};

