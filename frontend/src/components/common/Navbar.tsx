import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Moon, 
  Sun, 
  Server, 
  LogOut, 
  User, 
  ShieldCheck, 
  Activity, 
  Check, 
  Terminal as TerminalIcon 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';
import { SecurityAlert } from '../../types';

interface NavbarProps {
  uptimeSeconds?: number;
  loadAverage?: number[];
  wsConnected: boolean;
  onOpenTerminal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ uptimeSeconds = 0, loadAverage = [0.2, 0.15, 0.1], wsConnected, onOpenTerminal }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await api.getSecurityAlerts();
        setAlerts(data);
      } catch {}
    };
    fetchAlerts();
  }, []);

  const unreadCount = alerts.filter(a => !a.is_read).length;

  const markAllRead = async () => {
    for (const a of alerts.filter(a => !a.is_read)) {
      try {
        await api.markAlertRead(a.id);
      } catch {}
    }
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
  };

  const formatUptime = (totalSeconds: number) => {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/95 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-40 transition-colors">
      <div className="flex items-center space-x-4">
        {/* Real-time WebSocket connection indicator */}
        <div className="flex items-center space-x-2 text-xs bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-full">
          <span className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-slate-300 font-medium">{wsConnected ? 'Live Telemetry' : 'Polling'}</span>
        </div>

        {/* Server Load badge */}
        <div className="hidden md:flex items-center space-x-2 text-xs bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-full">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-slate-400">Load:</span>
          <span className="text-slate-200 font-mono font-medium">{loadAverage[0]?.toFixed(2)}</span>
        </div>

        {/* Uptime */}
        <div className="hidden sm:flex items-center space-x-2 text-xs bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-full">
          <Server className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-slate-400">Uptime:</span>
          <span className="text-slate-200 font-mono font-medium">{formatUptime(uptimeSeconds)}</span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Web Terminal Quick Button */}
        <button
          onClick={onOpenTerminal}
          className="p-2 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition"
          title="Open Web Terminal"
        >
          <TerminalIcon className="w-5 h-5" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-400" />}
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => { setShowAlerts(!showAlerts); setShowProfile(false); }}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg relative transition"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showAlerts && (
            <div className="absolute right-0 mt-2 w-80 md:w-96 bg-slate-900 border border-slate-800 shadow-2xl rounded-xl p-4 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  <span className="font-semibold text-sm text-slate-200">Security & Alerts</span>
                </div>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-sky-400 hover:underline flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>Mark read</span>
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60 mt-2">
                {alerts.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No recent alerts.</p>
                ) : (
                  alerts.map(a => (
                    <div key={a.id} className={`py-2.5 px-1 ${!a.is_read ? 'bg-sky-500/5' : ''}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200">{a.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${
                          a.severity === 'critical' ? 'bg-rose-500/20 text-rose-400' :
                          a.severity === 'high' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-sky-500/20 text-sky-400'
                        }`}>
                          {a.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{a.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowProfile(!showProfile); setShowAlerts(false); }}
            className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-md">
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-200 leading-none">{user?.username}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono mt-0.5">{user?.role?.replace('_', ' ')}</div>
            </div>
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-800 shadow-2xl rounded-xl p-2 z-50">
              <div className="px-3 py-2 border-b border-slate-800">
                <div className="text-xs font-bold text-slate-200">{user?.username}</div>
                <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
              </div>
              <button
                onClick={logout}
                className="w-full mt-1.5 flex items-center space-x-2 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

