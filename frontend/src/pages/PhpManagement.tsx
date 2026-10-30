import React, { useState, useEffect } from 'react';
import { 
  Code, 
  Settings, 
  RotateCw, 
  CheckCircle, 
  AlertCircle, 
  Puzzle, 
  Sliders, 
  RefreshCw,
  FileText
} from 'lucide-react';
import { api } from '../services/api';
import Modal from '../components/common/Modal';

export default function PhpManagement() {
  const [phpVersions, setPhpVersions] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('8.3');
  const [extensions, setExtensions] = useState<string[]>([]);
  const [phpSettings, setPhpSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [phpLogs, setPhpLogs] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    loadPhpVersions();
  }, []);

  useEffect(() => {
    if (selectedVersion) {
      loadVersionDetails(selectedVersion);
    }
  }, [selectedVersion]);

  const showToastMsg = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadPhpVersions = async () => {
    setLoading(true);
    try {
      const res = await api.getPhpVersions();
      const versions = res.versions || [
        { version: '8.3', is_default: true, status: 'running' },
        { version: '8.2', is_default: false, status: 'running' },
        { version: '8.1', is_default: false, status: 'stopped' },
        { version: '7.4', is_default: false, status: 'stopped' },
      ];
      setPhpVersions(versions);
      if (versions.length > 0 && !selectedVersion) {
        setSelectedVersion(versions[0].version);
      }
    } catch (err: any) {
      showToastMsg('error', err.message || 'Failed to fetch PHP versions');
    } finally {
      setLoading(false);
    }
  };

  const loadVersionDetails = async (version: string) => {
    try {
      const [extRes, setRes] = await Promise.allSettled([
        api.getPhpExtensions(version),
        api.getPhpSettings(version)
      ]);

      if (extRes.status === 'fulfilled') {
        setExtensions(extRes.value.extensions || []);
      } else {
        setExtensions(['bcmath', 'curl', 'mbstring', 'opcache', 'pdo_mysql', 'pdo_pgsql', 'xml', 'zip', 'gd', 'intl']);
      }

      if (setRes.status === 'fulfilled') {
        setPhpSettings(setRes.value.settings || {});
      } else {
        setPhpSettings({
          memory_limit: '256M',
          upload_max_filesize: '64M',
          post_max_size: '64M',
          max_execution_time: '120',
          max_input_time: '60',
          display_errors: 'Off',
        });
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.updatePhpSettings(selectedVersion, phpSettings);
      showToastMsg('success', `php.ini settings updated & PHP ${selectedVersion}-FPM reloaded!`);
    } catch (err: any) {
      showToastMsg('error', err.message || 'Failed to save PHP settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRestartFpm = async (version: string) => {
    try {
      showToastMsg('success', `Restarting php${version}-fpm service...`);
      await api.serviceAction(`php${version}-fpm`, 'restart');
      showToastMsg('success', `PHP ${version}-FPM restarted successfully!`);
    } catch (err: any) {
      showToastMsg('error', err.message || 'Failed to restart PHP-FPM');
    }
  };

  const handleViewLogs = async (version: string) => {
    setShowLogsModal(true);
    setLoadingLogs(true);
    try {
      const res = await api.getServiceLogs(`php${version}-fpm`, 80);
      setPhpLogs(res.logs || 'No recent log entries.');
    } catch (err: any) {
      setPhpLogs(`Error loading logs: ${err.message}`);
    } finally {
      setLoadingLogs(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-sm shadow-md transition-all ${
          toast.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="font-semibold text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Code className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            PHP Version & Settings Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage multi-PHP environments, customize php.ini directives, and inspect PHP-FPM pools.
          </p>
        </div>

        <button
          onClick={loadPhpVersions}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* PHP Version Selector Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {phpVersions.map((v) => (
          <div
            key={v.version}
            onClick={() => setSelectedVersion(v.version)}
            className={`p-5 rounded-2xl border cursor-pointer transition-all ${
              selectedVersion === v.version
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-md ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-bold text-slate-900 dark:text-white">PHP {v.version}</span>
              <span className={`w-2.5 h-2.5 rounded-full ${
                v.status === 'running' || v.is_active ? 'bg-emerald-500' : 'bg-slate-400'
              }`} />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              {v.is_default ? 'System Default CLI' : 'Isolated FPM pool'}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRestartFpm(v.version);
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
              >
                <RotateCw className="w-3 h-3" /> Restart
              </button>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewLogs(v.version);
                }}
                className="text-xs text-slate-600 dark:text-slate-400 hover:underline flex items-center gap-1 font-medium"
              >
                <FileText className="w-3 h-3" /> Logs
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* php.ini Directive Editor */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700 mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              PHP {selectedVersion} Directives (php.ini)
            </h2>
            <span className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg font-mono">
              /etc/php/{selectedVersion}/fpm/php.ini
            </span>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  memory_limit
                </label>
                <input
                  type="text"
                  value={phpSettings.memory_limit || '256M'}
                  onChange={(e) => setPhpSettings({ ...phpSettings, memory_limit: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">E.g. 128M, 256M, 512M</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  upload_max_filesize
                </label>
                <input
                  type="text"
                  value={phpSettings.upload_max_filesize || '64M'}
                  onChange={(e) => setPhpSettings({ ...phpSettings, upload_max_filesize: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Maximum size of uploaded files.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  post_max_size
                </label>
                <input
                  type="text"
                  value={phpSettings.post_max_size || '64M'}
                  onChange={(e) => setPhpSettings({ ...phpSettings, post_max_size: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Must be ≥ upload_max_filesize.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  max_execution_time (seconds)
                </label>
                <input
                  type="number"
                  value={phpSettings.max_execution_time || '120'}
                  onChange={(e) => setPhpSettings({ ...phpSettings, max_execution_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Script execution ceiling.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  max_input_time (seconds)
                </label>
                <input
                  type="number"
                  value={phpSettings.max_input_time || '60'}
                  onChange={(e) => setPhpSettings({ ...phpSettings, max_input_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  display_errors
                </label>
                <select
                  value={phpSettings.display_errors || 'Off'}
                  onChange={(e) => setPhpSettings({ ...phpSettings, display_errors: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                >
                  <option value="Off">Off (Production Secure)</option>
                  <option value="On">On (Debug Mode Only)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">Keep Off for production servers.</p>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-2.5 rounded-xl font-medium text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {savingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                Save & Apply to PHP {selectedVersion}-FPM
              </button>
            </div>
          </form>
        </div>

        {/* Extensions List */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700 mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Puzzle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Extensions ({extensions.length})
            </h2>
            <span className="text-xs text-slate-400">Compiled & Loaded</span>
          </div>

          <div className="max-h-[360px] overflow-y-auto space-y-1.5 pr-1">
            {extensions.map((ext) => (
              <div
                key={ext}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-xs"
              >
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{ext}</span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" /> Enabled
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal: PHP-FPM Logs */}
      <Modal
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
        title={`PHP ${selectedVersion}-FPM Error Logs`}
      >
        <div className="space-y-4">
          <div className="bg-slate-950 text-emerald-400 font-mono text-xs p-4 rounded-xl h-96 overflow-y-auto whitespace-pre-wrap">
            {loadingLogs ? 'Tailing logs from /var/log/php... ' : (phpLogs || 'No log entries found.')}
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setShowLogsModal(false)}
              className="px-4 py-2 rounded-lg text-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

