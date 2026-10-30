import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Search, 
  Download, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Filter,
  Play,
  Pause
} from 'lucide-react';
import { api } from '../services/api';

const LOG_SOURCES = [
  { id: 'nginx_access', label: 'Nginx Access Logs (/var/log/nginx/access.log)' },
  { id: 'nginx_error', label: 'Nginx Error Logs (/var/log/nginx/error.log)' },
  { id: 'syslog', label: 'System Syslog (/var/log/syslog)' },
  { id: 'auth', label: 'Authentication Logs (/var/log/auth.log)' },
  { id: 'ufw', label: 'Firewall UFW Logs (/var/log/ufw.log)' },
  { id: 'php', label: 'PHP-FPM Error Logs' },
  { id: 'mysql', label: 'MySQL / MariaDB Error Logs' },
  { id: 'docker', label: 'Docker Daemon Service Logs' },
];

export default function LogsManagement() {
  const [source, setSource] = useState('nginx_access');
  const [linesCount, setLinesCount] = useState(100);
  const [filterQuery, setFilterQuery] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLogs();
  }, [source, linesCount]);

  useEffect(() => {
    let interval: any;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchLogs(true);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, source, linesCount, filterQuery]);

  const fetchLogs = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getLogs(source, linesCount, filterQuery);
      const rawText = res.logs || res.content || '';
      const splitLines = rawText.split('\n');
      setLogs(splitLines);
    } catch (err: any) {
      setLogs([`Failed to retrieve logs: ${err.message}`]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([logs.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${source}-${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLineClass = (line: string) => {
    const lower = line.toLowerCase();
    if (lower.includes('error') || lower.includes('fail') || lower.includes('crit') || lower.includes('fatal') || lower.includes(' 500 ') || lower.includes(' 502 ')) {
      return 'text-rose-400 font-semibold bg-rose-950/20 px-1 rounded';
    }
    if (lower.includes('warn') || lower.includes(' 404 ') || lower.includes(' 403 ')) {
      return 'text-amber-300';
    }
    if (lower.includes('notice') || lower.includes('info') || lower.includes(' 200 ')) {
      return 'text-slate-300';
    }
    return 'text-slate-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Centralized Log Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Live tailing, searching, error detection, and export for web servers, kernel events, and daemons.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              autoRefresh
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            {autoRefresh ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {autoRefresh ? 'Live Streaming' : 'Pause Live'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={() => fetchLogs()}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh Now"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Source Toolbar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-stretch md:items-center gap-4">
        <div className="flex-1">
          <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">Log Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
          >
            {LOG_SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-32">
          <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">Tail Lines</label>
          <select
            value={linesCount}
            onChange={(e) => setLinesCount(parseInt(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
          >
            <option value={50}>50 lines</option>
            <option value={100}>100 lines</option>
            <option value={250}>250 lines</option>
            <option value={500}>500 lines</option>
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">Grep Search Filter</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by keyword (e.g. 404, root, worker)..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
            />
          </div>
        </div>
      </div>

      {/* Log Console Output */}
      <div className="bg-slate-950 rounded-2xl shadow-xl border border-slate-800 p-4 font-mono text-xs h-[580px] overflow-y-auto space-y-1">
        {loading && logs.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
            Loading {source} log streams...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            Log file is empty or no lines matched query.
          </div>
        ) : (
          logs.map((line, idx) => (
            <div key={idx} className={`leading-relaxed whitespace-pre-wrap ${getLineClass(line)}`}>
              {line}
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}

