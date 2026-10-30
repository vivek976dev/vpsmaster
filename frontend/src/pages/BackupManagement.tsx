import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Download, 
  HardDrive, 
  Cloud, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { api } from '../services/api';
import { BackupItem } from '../types';
import Modal from '../components/common/Modal';

export default function BackupManagement() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [websites, setWebsites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState<BackupItem | null>(null);
  const [restoreDir, setRestoreDir] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [newBackup, setNewBackup] = useState({
    backup_type: 'website' as 'full' | 'website' | 'database',
    target_domain: '',
    storage_driver: 'local',
  });

  useEffect(() => {
    loadData();
  }, []);

  const showToastMsg = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [backRes, webRes] = await Promise.allSettled([
        api.getBackups(),
        api.getWebsites()
      ]);

      if (backRes.status === 'fulfilled') {
        setBackups(backRes.value || []);
      }
      if (webRes.status === 'fulfilled') {
        const sites = webRes.value || [];
        setWebsites(sites);
        if (sites.length > 0 && !newBackup.target_domain) {
          setNewBackup(prev => ({ ...prev, target_domain: sites[0].domain }));
        }
      }
    } catch (err: any) {
      showToastMsg('error', err.message || 'Failed to load backup data');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      showToastMsg('success', 'Starting background backup snapshot creation...');
      await api.triggerBackup(newBackup);
      showToastMsg('success', 'Backup completed and archived successfully!');
      setShowTriggerModal(false);
      loadData();
    } catch (err: any) {
      showToastMsg('error', err.message || 'Failed to trigger backup');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRestoreModal) return;
    setSubmitting(true);
    try {
      showToastMsg('success', `Restoring archive to ${restoreDir || '/var/www'}...`);
      await api.restoreBackup(showRestoreModal.id, restoreDir || '/var/www');
      showToastMsg('success', 'Backup archive restored successfully!');
      setShowRestoreModal(null);
    } catch (err: any) {
      showToastMsg('error', err.message || 'Restore failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBackup = async (b: BackupItem) => {
    if (!window.confirm(`Are you sure you want to permanently delete backup "${b.name}"?`)) {
      return;
    }
    try {
      await api.deleteBackup(b.id);
      showToastMsg('success', `Backup archive deleted.`);
      loadData();
    } catch (err: any) {
      showToastMsg('error', err.message || 'Failed to delete backup');
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
            <Archive className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Backup & Disaster Recovery
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Generate and restore compressed tar.gz server, website, and database archives with SHA-256 integrity verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTriggerModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Backup
          </button>
          <button
            onClick={loadData}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Backup History Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Archive Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Target Scope</th>
                <th className="px-6 py-4">Size</th>
                <th className="px-6 py-4">SHA-256 Checksum</th>
                <th className="px-6 py-4">Storage</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading && backups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading backup history...
                  </td>
                </tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <Archive className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    No backups created yet. Click "Create Backup" to generate your first snapshot.
                  </td>
                </tr>
              ) : (
                backups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900 dark:text-white text-xs">
                      {b.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                        b.backup_type === 'full'
                          ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                          : b.backup_type === 'website'
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}>
                        {b.backup_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {b.target_domain || 'Entire Server'}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium">
                      {b.file_size_mb?.toFixed(2) || '0.00'} MB
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">
                      {b.sha256 ? `${b.sha256.substring(0, 10)}...` : 'Verified'}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 uppercase text-[11px] font-semibold">
                        {b.storage_driver === 's3' ? <Cloud className="w-3.5 h-3.5 text-blue-500" /> : <HardDrive className="w-3.5 h-3.5 text-slate-500" />}
                        {b.storage_driver || 'Local'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {b.created_at ? new Date(b.created_at).toLocaleString() : 'Recent'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setShowRestoreModal(b);
                            setRestoreDir(b.target_domain ? `/var/www/${b.target_domain}` : '/');
                          }}
                          className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                          title="Restore Archive"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(b)}
                          className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Delete Backup"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Trigger Backup */}
      <Modal
        isOpen={showTriggerModal}
        onClose={() => setShowTriggerModal(false)}
        title="Create Backup Snapshot"
      >
        <form onSubmit={handleTriggerBackup} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
              Backup Scope
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['website', 'database', 'full'] as const).map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setNewBackup({ ...newBackup, backup_type: type })}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    newBackup.backup_type === type
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <Archive className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs uppercase">{type}</span>
                </button>
              ))}
            </div>
          </div>

          {newBackup.backup_type === 'website' && (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Target Website
              </label>
              <select
                value={newBackup.target_domain}
                onChange={(e) => setNewBackup({ ...newBackup, target_domain: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              >
                {websites.map((w) => (
                  <option key={w.id} value={w.domain}>
                    {w.domain} ({w.document_root})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
              Destination Storage
            </label>
            <select
              value={newBackup.storage_driver}
              onChange={(e) => setNewBackup({ ...newBackup, storage_driver: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            >
              <option value="local">Local Filesystem (/var/backups/vpsmaster)</option>
              <option value="s3">Amazon S3 / S3-Compatible Bucket</option>
              <option value="sftp">Remote SFTP Host</option>
            </select>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              <FileCheck className="w-4 h-4 text-emerald-500" />
              Automated Integrity Check
            </div>
            <p>Every backup snapshot is hashed with SHA-256 before concluding the task.</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setShowTriggerModal(false)}
              className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Creating Backup...' : 'Start Backup'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Restore Backup */}
      {showRestoreModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowRestoreModal(null)}
          title={`Restore Backup: ${showRestoreModal.name}`}
        >
          <form onSubmit={handleRestore} className="space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-xl text-xs flex items-start gap-2 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Caution:</span> Restoring this archive will overwrite existing files in the target directory. Ensure you have taken a current backup if necessary.
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Target Restore Directory
              </label>
              <input
                type="text"
                required
                value={restoreDir}
                onChange={(e) => setRestoreDir(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowRestoreModal(null)}
                className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Restoring...' : 'Confirm Restore'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

