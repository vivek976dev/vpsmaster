import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Play, 
  Square, 
  RotateCw, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  ScrollText, 
  Search,
  Activity
} from 'lucide-react';
import { api } from '../services/api';
import { ManagedService } from '../types';
import { Modal } from '../components/common/Modal';

export const ServiceManagement: React.FC = () => {
  const [services, setServices] = useState<ManagedService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeLogService, setActiveLogService] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await api.getServices();
      setServices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleAction = async (service: string, action: string) => {
    try {
      setLoadingAction(`${service}-${action}`);
      await api.serviceAction(service, action);
      await loadServices();
    } catch (e: any) {
      alert(`Action failed: ${e.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleOpenLogs = async (service: string) => {
    try {
      setActiveLogService(service);
      setLogs(['Fetching journal logs...']);
      const res = await api.getServiceLogs(service, 150);
      setLogs(res.logs || []);
    } catch (e: any) {
      setLogs([`Error fetching logs: ${e.message}`]);
    }
  };

  const filteredServices = services.filter(s => 
    s.service.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatMem = (bytes?: number) => {
    if (!bytes) return '—';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-white">System Service Management</h2>
          <p className="text-xs text-slate-400 mt-1">
            Supervise systemd daemon units (Nginx, MySQL, PostgreSQL, Redis, PHP-FPM, Docker, SSH).
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-sky-500 font-mono w-48 sm:w-64"
            />
          </div>
          <button
            onClick={loadServices}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">PID</th>
                <th className="py-3 px-4">Memory</th>
                <th className="py-3 px-4">Autostart</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredServices.map((s) => {
                const isBusy = loadingAction?.startsWith(s.service);
                return (
                  <tr key={s.service} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-100 flex items-center space-x-2.5">
                      <Layers className="w-4 h-4 text-sky-400" />
                      <span>{s.service}.service</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        s.status === 'running' ? 'bg-emerald-500/20 text-emerald-400' :
                        s.status === 'stopped' ? 'bg-slate-800 text-slate-400' :
                        'bg-rose-500/20 text-rose-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'running' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        <span>{s.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{s.pid || '—'}</td>
                    <td className="py-3.5 px-4 text-slate-300">{formatMem(s.memory_bytes)}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.is_enabled ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {s.is_enabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {s.is_active ? (
                          <>
                            <button
                              onClick={() => handleAction(s.service, 'restart')}
                              disabled={isBusy}
                              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                              title="Restart"
                            >
                              <RotateCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleAction(s.service, 'stop')}
                              disabled={isBusy}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                              title="Stop"
                            >
                              <Square className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleAction(s.service, 'start')}
                            disabled={isBusy}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                            title="Start"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenLogs(s.service)}
                          className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition"
                          title="View Logs"
                        >
                          <ScrollText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Journalctl Logs Modal */}
      <Modal
        isOpen={!!activeLogService}
        onClose={() => setActiveLogService(null)}
        title={`Logs: ${activeLogService}.service`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-3">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-slate-300 max-h-96 overflow-y-auto space-y-1">
            {logs.map((line, idx) => (
              <div key={idx} className={`leading-relaxed ${line.includes('ERR') || line.includes('fail') ? 'text-rose-400 font-semibold' : ''}`}>
                {line}
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Showing recent journal lines</span>
            <button
              onClick={() => activeLogService && handleOpenLogs(activeLogService)}
              className="text-sky-400 hover:underline flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Logs</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ServiceManagement;
