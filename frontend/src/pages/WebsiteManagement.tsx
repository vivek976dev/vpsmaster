import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  PlusCircle, 
  Lock, 
  Unlock, 
  FolderTree, 
  Database, 
  Power, 
  Trash2, 
  Settings, 
  ScrollText, 
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Search,
  Code
} from 'lucide-react';
import { api } from '../services/api';
import { Website } from '../types';
import { Modal } from '../components/common/Modal';

interface WebsiteManagementProps {
  onOpenFilePath?: (path: string) => void;
}

export const WebsiteManagement: React.FC<WebsiteManagementProps> = ({ onOpenFilePath }) => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newAliases, setNewAliases] = useState('');
  const [newPhpVersion, setNewPhpVersion] = useState('8.3');
  const [createDb, setCreateDb] = useState(false);
  const [dbName, setDbName] = useState('');
  const [forceHttps, setForceHttps] = useState(false);

  // Edit / Logs Modal
  const [activeSiteLogs, setActiveSiteLogs] = useState<Website | null>(null);
  const [logType, setLogType] = useState<'access' | 'error'>('access');
  const [logs, setLogs] = useState<string[]>([]);

  const loadWebsites = async () => {
    try {
      setLoading(true);
      const data = await api.getWebsites();
      setWebsites(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWebsites();
  }, []);

  const handleCreateWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createWebsite({
        domain: newDomain,
        aliases: newAliases,
        php_version: newPhpVersion,
        force_https: forceHttps,
        create_database: createDb,
        database_name: createDb ? dbName : undefined,
      });
      setShowAddModal(false);
      setNewDomain('');
      setNewAliases('');
      setDbName('');
      loadWebsites();
    } catch (e: any) {
      alert(`Failed to create website: ${e.message}`);
    }
  };

  const handleToggleSuspend = async (site: Website) => {
    try {
      await api.suspendWebsite(site.id, site.is_active);
      loadWebsites();
    } catch (e: any) {
      alert(`Suspension error: ${e.message}`);
    }
  };

  const handleDelete = async (site: Website) => {
    if (confirm(`Are you sure you want to delete ${site.domain}? This will remove the web server vhost.`)) {
      try {
        await api.deleteWebsite(site.id, false);
        loadWebsites();
      } catch (e: any) {
        alert(`Delete failed: ${e.message}`);
      }
    }
  };

  const handleOpenLogs = async (site: Website, type: 'access' | 'error' = 'access') => {
    setActiveSiteLogs(site);
    setLogType(type);
    setLogs(['Loading logs...']);
    try {
      const res = await api.getWebsiteLogs(site.id, type);
      setLogs(res.logs || []);
    } catch (e: any) {
      setLogs([`Failed to load logs: ${e.message}`]);
    }
  };

  const filtered = websites.filter(w => 
    w.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title & Add Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-white">Website & Domain Hosting</h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage multi-tenant websites, Nginx virtual hosts, PHP-FPM pools, and SSL certificates.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter domains..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-sky-500 font-mono w-48 sm:w-64"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-sky-500/25 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Website</span>
          </button>
        </div>
      </div>

      {/* Websites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(site => (
          <div 
            key={site.id} 
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition group"
          >
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 text-sky-400 rounded-xl border border-sky-500/30">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-100 flex items-center space-x-1.5">
                      <span>{site.domain}</span>
                      <a 
                        href={`http://${site.domain}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-slate-500 hover:text-sky-400 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </h3>
                    <div className="text-[11px] text-slate-500 font-mono truncate max-w-[200px]">
                      {site.aliases || 'No aliases'}
                    </div>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  site.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {site.is_active ? 'ACTIVE' : 'SUSPENDED'}
                </span>
              </div>

              {/* Badges Info */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center space-x-1.5">
                    <Code className="w-3.5 h-3.5 text-indigo-400" />
                    <span>PHP Version:</span>
                  </span>
                  <span className="font-mono font-bold text-slate-200">PHP {site.php_version}</span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                    <span>SSL Certificate:</span>
                  </span>
                  <span className={`font-mono font-bold ${site.ssl_enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {site.ssl_enabled ? 'Installed (Let\'s Encrypt)' : 'Disabled'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center space-x-1.5">
                    <FolderTree className="w-3.5 h-3.5 text-amber-400" />
                    <span>Document Root:</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 truncate max-w-[140px]">
                    {site.document_root}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => onOpenFilePath(site.document_root)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
              >
                <FolderTree className="w-3.5 h-3.5 text-amber-400" />
                <span>Files</span>
              </button>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleOpenLogs(site, 'access')}
                  className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition"
                  title="View Access Logs"
                >
                  <ScrollText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleToggleSuspend(site)}
                  className={`p-1.5 rounded-lg transition ${
                    site.is_active 
                      ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800' 
                      : 'text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                  title={site.is_active ? 'Suspend Website' : 'Unsuspend Website'}
                >
                  <Power className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(site)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                  title="Delete Website"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Website Wizard Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Create New Website">
        <form onSubmit={handleCreateWebsite} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Domain Name</label>
            <input
              type="text"
              placeholder="e.g. myapp.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:border-sky-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Domain Aliases (Optional)</label>
            <input
              type="text"
              placeholder="e.g. www.myapp.com, api.myapp.com"
              value={newAliases}
              onChange={(e) => setNewAliases(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:border-sky-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">PHP Version</label>
              <select
                value={newPhpVersion}
                onChange={(e) => setNewPhpVersion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:border-sky-500 outline-none"
              >
                <option value="8.4">PHP 8.4 (Latest)</option>
                <option value="8.3">PHP 8.3 (Recommended)</option>
                <option value="8.2">PHP 8.2</option>
                <option value="8.1">PHP 8.1</option>
                <option value="8.0">PHP 8.0</option>
                <option value="7.4">PHP 7.4 (Legacy)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Web Server</label>
              <input
                type="text"
                value="Nginx (High Performance)"
                disabled
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-400 font-mono outline-none"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center space-x-2.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={createDb}
                onChange={(e) => setCreateDb(e.target.checked)}
                className="rounded border-slate-800 bg-slate-950 text-sky-500 focus:ring-0"
              />
              <span>Create MySQL database for this website</span>
            </label>

            {createDb && (
              <div className="pl-6">
                <input
                  type="text"
                  placeholder="Database name (e.g. app_db)"
                  value={dbName}
                  onChange={(e) => setDbName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 font-mono focus:border-sky-500 outline-none"
                />
              </div>
            )}

            <label className="flex items-center space-x-2.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={forceHttps}
                onChange={(e) => setForceHttps(e.target.checked)}
                className="rounded border-slate-800 bg-slate-950 text-sky-500 focus:ring-0"
              />
              <span>Force HTTPS redirect (301 Permanent)</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-sky-500/25"
            >
              Provision Website
            </button>
          </div>
        </form>
      </Modal>

      {/* Website Logs Modal */}
      <Modal
        isOpen={!!activeSiteLogs}
        onClose={() => setActiveSiteLogs(null)}
        title={`Logs: ${activeSiteLogs?.domain}`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-3">
          <div className="flex space-x-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => activeSiteLogs && handleOpenLogs(activeSiteLogs, 'access')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono ${
                logType === 'access' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              Access Log
            </button>
            <button
              onClick={() => activeSiteLogs && handleOpenLogs(activeSiteLogs, 'error')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono ${
                logType === 'error' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              Error Log
            </button>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-slate-300 max-h-96 overflow-y-auto space-y-1">
            {logs.map((line, idx) => (
              <div key={idx} className="leading-relaxed whitespace-pre-wrap">{line}</div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WebsiteManagement;
