import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Clock, 
  Network, 
  Download, 
  RotateCcw, 
  Power, 
  Edit3, 
  Check, 
  AlertCircle,
  Cpu,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { Modal } from '../components/common/Modal';

export const ServerManagement: React.FC = () => {
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [timezoneInfo, setTimezoneInfo] = useState<any>(null);
  const [interfaces, setInterfaces] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showHostnameModal, setShowHostnameModal] = useState(false);
  const [newHostname, setNewHostname] = useState('');
  const [showTimezoneModal, setShowTimezoneModal] = useState(false);
  const [selectedTz, setSelectedTz] = useState('');
  const [showRebootModal, setShowRebootModal] = useState(false);
  const [showShutdownModal, setShowShutdownModal] = useState(false);
  const [updatingPackages, setUpdatingPackages] = useState(false);
  const [updateLog, setUpdateLog] = useState('');

  const loadAll = async () => {
    try {
      setLoading(true);
      const [info, tz, ifaces, up] = await Promise.all([
        api.getServerInfo(),
        api.getTimezone(),
        api.getInterfaces(),
        api.getUpdates()
      ]);
      setServerInfo(info);
      setTimezoneInfo(tz);
      setSelectedTz(tz.current_timezone);
      setInterfaces(ifaces);
      setUpdates(up);
      setNewHostname(info.hostname);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleUpdateHostname = async () => {
    try {
      await api.setHostname(newHostname);
      setShowHostnameModal(false);
      loadAll();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUpdateTimezone = async () => {
    try {
      await api.setTimezone(selectedTz);
      setShowTimezoneModal(false);
      loadAll();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRunUpdates = async () => {
    try {
      setUpdatingPackages(true);
      const res = await api.runUpdates();
      setUpdateLog(res.stdout || 'System upgraded successfully.');
      loadAll();
    } catch (e: any) {
      setUpdateLog(e.message);
    } finally {
      setUpdatingPackages(false);
    }
  };

  const handleReboot = async () => {
    try {
      await api.rebootServer();
      setShowRebootModal(false);
      alert('Server reboot command issued.');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleShutdown = async () => {
    try {
      await api.shutdownServer();
      setShowShutdownModal(false);
      alert('Server shutdown command issued.');
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-white">Server Management</h2>
          <p className="text-xs text-slate-400 mt-1">
            System host parameters, kernel telemetry, timezone, and power operations.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowRebootModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reboot</span>
          </button>
          <button
            onClick={() => setShowShutdownModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition"
          >
            <Power className="w-3.5 h-3.5" />
            <span>Shutdown</span>
          </button>
        </div>
      </div>

      {/* Hardware & OS Specifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase font-semibold">Hostname</span>
            <button
              onClick={() => setShowHostnameModal(true)}
              className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-lg font-bold text-slate-100 mt-1 truncate font-mono">
            {serverInfo?.hostname || 'ubuntu'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Primary system hostname</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase font-semibold">Timezone</span>
            <button
              onClick={() => setShowTimezoneModal(true)}
              className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-lg font-bold text-slate-100 mt-1 font-mono">
            {timezoneInfo?.current_timezone || 'UTC'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Local system clock</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <span className="text-xs font-mono text-slate-400 uppercase font-semibold">Operating System</span>
          <div className="text-lg font-bold text-slate-100 mt-1 truncate">
            {serverInfo?.os_name || 'Ubuntu Linux'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">{serverInfo?.os_version || '24.04 LTS'}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <span className="text-xs font-mono text-slate-400 uppercase font-semibold">Kernel & Arch</span>
          <div className="text-lg font-bold text-slate-100 mt-1 truncate font-mono">
            {serverInfo?.kernel_version || '6.8.0'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">{serverInfo?.architecture || 'x86_64'}</div>
        </div>
      </div>

      {/* Network Interfaces */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2">
          <Network className="w-5 h-5 text-sky-400" />
          <h3 className="font-bold text-sm text-slate-100">Network Interfaces & IP Configuration</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-800/60 text-slate-400">
              <tr>
                <th className="py-2.5 px-3 rounded-l-lg">Interface</th>
                <th className="py-2.5 px-3">IPv4 Address</th>
                <th className="py-2.5 px-3">IPv6 Address</th>
                <th className="py-2.5 px-3">MAC Address</th>
                <th className="py-2.5 px-3">Speed</th>
                <th className="py-2.5 px-3 rounded-r-lg">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {interfaces.map((iface, i) => (
                <tr key={i} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 px-3 font-bold text-sky-400">{iface.interface}</td>
                  <td className="py-3 px-3 text-slate-200">{iface.ipv4 || '—'}</td>
                  <td className="py-3 px-3 text-slate-400 truncate max-w-xs">{iface.ipv6 || '—'}</td>
                  <td className="py-3 px-3 text-slate-400">{iface.mac || '—'}</td>
                  <td className="py-3 px-3 text-slate-300">{iface.speed_mbps} Mbps</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      iface.is_up ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {iface.is_up ? 'UP' : 'DOWN'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Package Manager & System Updates */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Download className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-sm text-slate-100">Package Manager (APT Updates)</h3>
              <p className="text-xs text-slate-400">
                {updates?.update_count || 0} upgradable packages ({updates?.security_updates || 0} security patches)
              </p>
            </div>
          </div>
          <button
            onClick={handleRunUpdates}
            disabled={updatingPackages}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/25 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>{updatingPackages ? 'Installing Updates...' : 'Install Upgrades'}</span>
          </button>
        </div>

        {updateLog && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
            {updateLog}
          </div>
        )}

        <div className="divide-y divide-slate-800/60 max-h-60 overflow-y-auto">
          {updates?.packages?.map((p: any, idx: number) => (
            <div key={idx} className="py-2.5 flex items-center justify-between font-mono text-xs">
              <span className="font-semibold text-slate-200">{p.package}</span>
              <span className="text-slate-400">{p.version}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hostname Modal */}
      <Modal isOpen={showHostnameModal} onClose={() => setShowHostnameModal(false)} title="Change Server Hostname">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">New Hostname</label>
            <input
              type="text"
              value={newHostname}
              onChange={(e) => setNewHostname(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:border-sky-500 outline-none"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              onClick={() => setShowHostnameModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateHostname}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-sky-500/25"
            >
              Save Hostname
            </button>
          </div>
        </div>
      </Modal>

      {/* Timezone Modal */}
      <Modal isOpen={showTimezoneModal} onClose={() => setShowTimezoneModal(false)} title="Set System Timezone">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Select Timezone</label>
            <select
              value={selectedTz}
              onChange={(e) => setSelectedTz(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:border-sky-500 outline-none"
            >
              {timezoneInfo?.available_timezones?.map((tz: string) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              onClick={() => setShowTimezoneModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateTimezone}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-sky-500/25"
            >
              Save Timezone
            </button>
          </div>
        </div>
      </Modal>

      {/* Reboot Confirm Modal */}
      <Modal isOpen={showRebootModal} onClose={() => setShowRebootModal(false)} title="Confirm Server Reboot">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-amber-400">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to reboot this server? All active connections will be temporarily dropped.
            </p>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              onClick={() => setShowRebootModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleReboot}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition"
            >
              Confirm Reboot
            </button>
          </div>
        </div>
      </Modal>

      {/* Shutdown Confirm Modal */}
      <Modal isOpen={showShutdownModal} onClose={() => setShowShutdownModal(false)} title="Confirm Server Shutdown">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-rose-400">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to shut down this server? The server will be powered off and will require manual power-on from your VPS host console.
            </p>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              onClick={() => setShowShutdownModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleShutdown}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition"
            >
              Confirm Shutdown
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ServerManagement;
