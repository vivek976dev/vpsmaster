import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';

// Pages
import Dashboard from './pages/Dashboard';
import ServerManagement from './pages/ServerManagement';
import ServiceManagement from './pages/ServiceManagement';
import WebsiteManagement from './pages/WebsiteManagement';
import DomainDnsManagement from './pages/DomainDnsManagement';
import SslManagement from './pages/SslManagement';
import FileManager from './pages/FileManager';
import DatabaseManagement from './pages/DatabaseManagement';
import PhpManagement from './pages/PhpManagement';
import DockerManagement from './pages/DockerManagement';
import EmailManagement from './pages/EmailManagement';
import CronManagement from './pages/CronManagement';
import BackupManagement from './pages/BackupManagement';
import SecurityManagement from './pages/SecurityManagement';
import LogsManagement from './pages/LogsManagement';
import Terminal from './pages/Terminal';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import Login from './pages/Login';

export default function App() {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [uptimeSeconds, setUptimeSeconds] = useState(128450);
  const [loadAverage, setLoadAverage] = useState([0.35, 0.28, 0.19]);

  // WebSocket connection for live telemetry metrics
  useEffect(() => {
    if (!isAuthenticated) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWs = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/metrics`;

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.uptime_seconds) {
              setUptimeSeconds(data.uptime_seconds);
            }
            if (data.load_average) {
              setLoadAverage(data.load_average);
            }
          } catch (e) {
            console.error('WS parse error:', e);
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimeout = setTimeout(connectWs, 5000);
        };

        ws.onerror = () => {
          setWsConnected(false);
          ws?.close();
        };
      } catch (err) {
        setWsConnected(false);
        reconnectTimeout = setTimeout(connectWs, 5000);
      }
    };

    connectWs();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close();
      }
    };
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-300">Initializing VPSMaster...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'server':
        return <ServerManagement />;
      case 'services':
        return <ServiceManagement />;
      case 'websites':
        return <WebsiteManagement />;
      case 'dns':
        return <DomainDnsManagement />;
      case 'ssl':
        return <SslManagement />;
      case 'files':
        return <FileManager />;
      case 'databases':
        return <DatabaseManagement />;
      case 'php':
        return <PhpManagement />;
      case 'docker':
        return <DockerManagement />;
      case 'email':
        return <EmailManagement />;
      case 'cron':
        return <CronManagement />;
      case 'backups':
        return <BackupManagement />;
      case 'security':
        return <SecurityManagement />;
      case 'logs':
        return <LogsManagement />;
      case 'terminal':
        return <Terminal />;
      case 'users':
        return <UserManagement />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible Modern Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Navigation Bar */}
          <Navbar
            uptimeSeconds={uptimeSeconds}
            loadAverage={loadAverage}
            wsConnected={wsConnected}
            onOpenTerminal={() => setActiveTab('terminal')}
          />

          {/* Page View Body */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {renderActivePage()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

