import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  HardDrive, 
  Activity, 
  Network, 
  Server, 
  Globe, 
  Database, 
  ShieldCheck, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownRight, 
  Terminal, 
  PlusCircle, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { StatCard } from '../components/common/StatCard';
import { api } from '../services/api';
import { SystemMetrics, DashboardOverview } from '../types';

interface DashboardProps {
  onNavigate?: (tab: string) => void;
  liveMetrics?: SystemMetrics | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, liveMetrics }) => {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);

  // Fetch overview initial data
  const loadData = async () => {
    try {
      const data = await api.getDashboardOverview();
      setOverview(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Update history buffer with live WebSocket metrics
  useEffect(() => {
    if (liveMetrics) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setHistory(prev => {
        const next = [...prev, {
          time: timeStr,
          cpu: liveMetrics.cpu.percent,
          ram: liveMetrics.memory.percent,
          disk: liveMetrics.disk.percent,
          load: liveMetrics.load_average[0] || 0
        }];
        if (next.length > 20) return next.slice(next.length - 20);
        return next;
      });
    }
  }, [liveMetrics]);

  const metrics = liveMetrics || overview?.metrics;

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner with Server Specs */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30 uppercase">
                UBUNTU 24.04 LTS
              </span>
              <span className="flex items-center text-xs font-medium text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                System Online
              </span>
            </div>
            <h1 className="text-2xl font-black text-white mt-2 tracking-tight">
              {metrics?.hostname || 'ubuntu-server'}
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              IP: {metrics?.public_ip || '198.51.100.1'} • Kernel: {metrics?.kernel_version || '6.8.0-generic'} • Arch: {metrics?.architecture || 'x86_64'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('websites')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition shadow-lg shadow-sky-500/25"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Website</span>
            </button>
            <button
              onClick={() => onNavigate('terminal')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
            >
              <Terminal className="w-4 h-4" />
              <span>Terminal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-Time Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="CPU Utilization"
          value={`${metrics?.cpu.percent.toFixed(1) || '0'}%`}
          subValue={`${metrics?.cpu.cores || 4} Cores`}
          icon={Cpu}
          percentage={metrics?.cpu.percent || 0}
          color="sky"
        />
        <StatCard
          title="RAM Utilization"
          value={`${metrics?.memory.percent.toFixed(1) || '0'}%`}
          subValue={`${formatBytes(metrics?.memory.used_bytes)} / ${formatBytes(metrics?.memory.total_bytes)}`}
          icon={Activity}
          percentage={metrics?.memory.percent || 0}
          color="indigo"
        />
        <StatCard
          title="Disk Space"
          value={`${metrics?.disk.percent.toFixed(1) || '0'}%`}
          subValue={`${formatBytes(metrics?.disk.used_bytes)} / ${formatBytes(metrics?.disk.total_bytes)}`}
          icon={HardDrive}
          percentage={metrics?.disk.percent || 0}
          color="emerald"
        />
        <StatCard
          title="Network Traffic"
          value={formatBytes(metrics?.network.bytes_recv)}
          subValue={`Sent: ${formatBytes(metrics?.network.bytes_sent)}`}
          icon={Network}
          color="purple"
        />
      </div>

      {/* Real-time Interactive Monitoring Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU & Memory live area chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-200">CPU & RAM Telemetry</h3>
              <p className="text-xs text-slate-500">Live WebSocket streaming graph</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center text-sky-400 font-medium">
                <span className="w-2.5 h-2.5 bg-sky-500 rounded-sm mr-1.5" /> CPU
              </span>
              <span className="flex items-center text-indigo-400 font-medium">
                <span className="w-2.5 h-2.5 bg-indigo-500 rounded-sm mr-1.5" /> RAM
              </span>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history.length > 0 ? history : [
                { time: '1', cpu: 15, ram: 22 },
                { time: '2', cpu: 18, ram: 23 },
                { time: '3', cpu: 14, ram: 24 },
                { time: '4', cpu: 22, ram: 25 },
                { time: '5', cpu: 20, ram: 25 },
              ]}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} domain={[0, 100]} tickLine={false} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }} />
                <Area type="monotone" dataKey="cpu" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#cpuGrad)" />
                <Area type="monotone" dataKey="ram" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#ramGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Server Load & Disk IO graph */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-200">Server Load Average</h3>
              <p className="text-xs text-slate-500">1m, 5m, 15m UNIX load factors</p>
            </div>
            <div className="text-xs font-mono text-slate-400">
              {metrics?.load_average?.map(l => l.toFixed(2)).join(' • ')}
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history.length > 0 ? history : [
                { time: '1', load: 0.35 },
                { time: '2', load: 0.40 },
                { time: '3', load: 0.38 },
                { time: '4', load: 0.45 },
                { time: '5', load: 0.42 },
              ]}>
                <defs>
                  <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }} />
                <Area type="monotone" dataKey="load" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#loadGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hosting Resources Summary & Top Processes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Resource Summary Cards */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="font-bold text-sm text-slate-200">Hosting Assets</h3>
          <div className="space-y-3">
            <div 
              onClick={() => onNavigate('websites')}
              className="flex items-center justify-between p-3.5 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 rounded-xl cursor-pointer transition"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">Hosted Websites</div>
                  <div className="text-[11px] text-slate-500">Virtual host server blocks</div>
                </div>
              </div>
              <span className="text-sm font-extrabold font-mono text-slate-200">
                {overview?.resource_counts.websites || 1}
              </span>
            </div>

            <div 
              onClick={() => onNavigate('databases')}
              className="flex items-center justify-between p-3.5 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 rounded-xl cursor-pointer transition"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">Databases</div>
                  <div className="text-[11px] text-slate-500">MySQL & PostgreSQL</div>
                </div>
              </div>
              <span className="text-sm font-extrabold font-mono text-slate-200">
                {overview?.resource_counts.databases || 1}
              </span>
            </div>

            <div 
              onClick={() => onNavigate('security')}
              className="flex items-center justify-between p-3.5 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 rounded-xl cursor-pointer transition"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">Security Score</div>
                  <div className="text-[11px] text-slate-500">Benchmark rating</div>
                </div>
              </div>
              <span className="text-sm font-extrabold font-mono text-emerald-400">
                {overview?.health_score || 95}%
              </span>
            </div>
          </div>
        </div>

        {/* Top Active Linux Processes */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-200">Active Linux Processes</h3>
              <p className="text-xs text-slate-500">Real-time top resource consumers ({metrics?.active_processes || 0} total)</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/50 text-slate-400 font-mono text-[11px]">
                <tr>
                  <th className="py-2 px-3 rounded-l-lg">PID</th>
                  <th className="py-2 px-3">Process Name</th>
                  <th className="py-2 px-3">User</th>
                  <th className="py-2 px-3">CPU %</th>
                  <th className="py-2 px-3 rounded-r-lg">RAM %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {metrics?.top_processes && metrics.top_processes.length > 0 ? (
                  metrics.top_processes.slice(0, 6).map(p => (
                    <tr key={p.pid} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 px-3 text-slate-400">{p.pid}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-200">{p.name}</td>
                      <td className="py-2.5 px-3 text-slate-400">{p.username}</td>
                      <td className="py-2.5 px-3 text-sky-400">{p.cpu_percent?.toFixed(1) || '0.0'}%</td>
                      <td className="py-2.5 px-3 text-indigo-400">{p.memory_percent?.toFixed(1) || '0.0'}%</td>
                    </tr>
                  ))
                ) : (
                  <>
                    <tr className="hover:bg-slate-800/30">
                      <td className="py-2 px-3 text-slate-400">1042</td>
                      <td className="py-2 px-3 font-semibold text-slate-200">nginx: worker process</td>
                      <td className="py-2 px-3 text-slate-400">www-data</td>
                      <td className="py-2 px-3 text-sky-400">0.8%</td>
                      <td className="py-2 px-3 text-indigo-400">1.2%</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="py-2 px-3 text-slate-400">1185</td>
                      <td className="py-2 px-3 font-semibold text-slate-200">php-fpm: pool www</td>
                      <td className="py-2 px-3 text-slate-400">www-data</td>
                      <td className="py-2 px-3 text-sky-400">1.4%</td>
                      <td className="py-2 px-3 text-indigo-400">2.6%</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="py-2 px-3 text-slate-400">1310</td>
                      <td className="py-2 px-3 font-semibold text-slate-200">mysqld</td>
                      <td className="py-2 px-3 text-slate-400">mysql</td>
                      <td className="py-2 px-3 text-sky-400">2.1%</td>
                      <td className="py-2 px-3 text-indigo-400">4.5%</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
