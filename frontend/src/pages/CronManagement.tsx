import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Plus, 
  Trash2, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  ToggleLeft, 
  ToggleRight,
  Code
} from 'lucide-react';
import { api } from '../services/api';
import { CronJob } from '../types';
import Modal from '../components/common/Modal';

export default function CronManagement() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [newJob, setNewJob] = useState({
    title: '',
    command: '',
    schedule: '0 0 * * *',
    preset: 'daily',
  });

  const PRESETS: Record<string, { label: string; cron: string }> = {
    minute: { label: 'Every minute (* * * * *)', cron: '* * * * *' },
    five_min: { label: 'Every 5 minutes (*/5 * * * *)', cron: '*/5 * * * *' },
    hourly: { label: 'Once an hour (0 * * * *)', cron: '0 * * * *' },
    daily: { label: 'Once a day at midnight (0 0 * * *)', cron: '0 0 * * *' },
    weekly: { label: 'Once a week on Sunday (0 0 * * 0)', cron: '0 0 * * 0' },
    monthly: { label: 'Once a month on 1st (0 0 1 * *)', cron: '0 0 1 * *' },
    custom: { label: 'Custom Cron Expression', cron: '' },
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const showToastMsg = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await api.getCronJobs();
      setJobs(data || []);
    } catch (err: any) {
      showToastMsg('error', err.message || 'Failed to fetch scheduled cron jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createCronJob({
        title: newJob.title,
        command: newJob.command,
        schedule: newJob.schedule,
        is_active: true,
      });
      showToastMsg('success', 'Cron job created and registered with crontab!');
      setShowCreateModal(false);
      setNewJob({ title: '', command: '', schedule: '0 0 * * *', preset: 'daily' });
      loadJobs();
    } catch (err: any) {
      showToastMsg('error', err.message || 'Failed to create cron job');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleJob = async (job: CronJob) => {
    try {
      await api.toggleCronJob(job.id);
      showToastMsg('success', `Cron job "${job.title}" ${job.is_active ? 'disabled' : 'enabled'}.`);
      loadJobs();
    } catch (err: any) {
      showToastMsg('error', err.message || 'Failed to toggle cron job');
    }
  };

  const handleRunNow = async (job: CronJob) => {
    try {
      showToastMsg('success', `Executing job "${job.title}" in background...`);
      await api.runCronJob(job.id);
      showToastMsg('success', `Execution complete for "${job.title}"!`);
      loadJobs();
    } catch (err: any) {
      showToastMsg('error', err.message || 'Failed to trigger cron job');
    }
  };

  const handleDeleteJob = async (job: CronJob) => {
    if (!window.confirm(`Are you sure you want to delete cron job "${job.title}"?`)) {
      return;
    }
    try {
      await api.deleteCronJob(job.id);
      showToastMsg('success', `Cron job deleted.`);
      loadJobs();
    } catch (err: any) {
      showToastMsg('error', err.message || 'Failed to delete cron job');
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
            <Clock className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Cron Job & Scheduled Tasks
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Automate recurring scripts, database vacuuming, queue workers, and certificate monitoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Cron Job
          </button>
          <button
            onClick={loadJobs}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Cron Jobs Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Schedule Expression</th>
                <th className="px-6 py-4">Command</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Run</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading && jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading cron jobs...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    No scheduled cron jobs configured yet.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                      {job.title}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700">
                        {job.schedule}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate" title={job.command}>
                      {job.command}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleJob(job)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          job.is_active
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {job.is_active ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                        {job.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {job.last_run ? new Date(job.last_run).toLocaleString() : 'Pending'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRunNow(job)}
                          className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                          title="Run Immediately"
                        >
                          <Play className="w-4 h-4 fill-current" />
                        </button>
                        <button
                          onClick={() => handleDeleteJob(job)}
                          className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Delete Job"
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

      {/* Modal: Create Cron Job */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Schedule New Cron Task"
      >
        <form onSubmit={handleCreateJob} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
              Job Title / Description
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Daily Laravel Artisan Schedule"
              value={newJob.title}
              onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
              Timing Schedule Preset
            </label>
            <select
              value={newJob.preset}
              onChange={(e) => {
                const p = e.target.value;
                setNewJob({
                  ...newJob,
                  preset: p,
                  schedule: PRESETS[p].cron || newJob.schedule,
                });
              }}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            >
              {Object.entries(PRESETS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
              Standard Cron Expression (m h dom mon dow)
            </label>
            <input
              type="text"
              required
              value={newJob.schedule}
              onChange={(e) => setNewJob({ ...newJob, schedule: e.target.value, preset: 'custom' })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono text-indigo-600 dark:text-indigo-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
              Command to Execute
            </label>
            <input
              type="text"
              required
              placeholder="e.g. /usr/bin/php /var/www/example.com/artisan schedule:run"
              value={newJob.command}
              onChange={(e) => setNewJob({ ...newJob, command: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white"
            />
            <p className="text-[11px] text-slate-400 mt-1">Specify full binary paths (e.g. /usr/bin/php, /usr/bin/python3).</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Save Cron Job'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

