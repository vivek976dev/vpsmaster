import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  Mail, 
  Bell, 
  Shield, 
  HardDrive, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Key,
  Sliders,
  Send
} from 'lucide-react';
import { api } from '../services/api';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'general' | 'smtp' | 'backup' | 'alerts' | 'notifications'>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Settings State
  const [settings, setSettings] = useState<Record<string, string>>({
    panel_title: 'VPSMaster Enterprise Panel',
    session_timeout_minutes: '120',
    enforce_2fa_for_admins: 'false',
    smtp_host: 'smtp.mailgun.org',
    smtp_port: '587',
    smtp_user: 'postmaster@mg.vpsmaster.com',
    smtp_pass: '••••••••••••••••',
    smtp_from: 'alerts@vpsmaster.com',
    smtp_encryption: 'tls',
    s3_bucket: 'vpsmaster-backups-us-east',
    s3_endpoint: 'https://s3.amazonaws.com',
    s3_access_key: 'AKIAIOSFODNN7EXAMPLE',
    s3_secret_key: '••••••••••••••••••••••••',
    backup_retention_days: '30',
    telegram_bot_token: '',
    telegram_chat_id: '',
    cpu_alert_threshold: '85',
    ram_alert_threshold: '90',
    disk_alert_threshold: '85',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const showToastMsg = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getSettings();
      if (data && typeof data === 'object') {
        setSettings((prev) => ({ ...prev, ...data }));
      }
    } catch (err: any) {
      console.warn('Using default settings fallback:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSettings(settings);
      showToastMsg('success', 'Panel settings updated successfully!');
    } catch (err: any) {
      showToastMsg('error', err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
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
            <SettingsIcon className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Global Panel & System Configuration
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure SMTP mail delivery, remote S3 backups, resource alert thresholds, and security parameters.
          </p>
        </div>

        <button
          onClick={loadSettings}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Refresh Settings"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-6">
        <button
          onClick={() => setActiveTab('general')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'general'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Sliders className="w-4 h-4" /> General
        </button>
        <button
          onClick={() => setActiveTab('smtp')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'smtp'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Mail className="w-4 h-4" /> SMTP Mailer
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'backup'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <HardDrive className="w-4 h-4" /> S3 Storage
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'alerts'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Bell className="w-4 h-4" /> Alert Thresholds
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'notifications'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Send className="w-4 h-4" /> Telegram Webhook
        </button>
      </div>

      <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Control Panel Display Title
              </label>
              <input
                type="text"
                value={settings.panel_title || ''}
                onChange={(e) => setSettings({ ...settings, panel_title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Session Idle Timeout (Minutes)
              </label>
              <input
                type="number"
                value={settings.session_timeout_minutes || '120'}
                onChange={(e) => setSettings({ ...settings, session_timeout_minutes: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="enforce2fa"
                checked={settings.enforce_2fa_for_admins === 'true'}
                onChange={(e) => setSettings({ ...settings, enforce_2fa_for_admins: e.target.checked ? 'true' : 'false' })}
                className="w-4 h-4 accent-indigo-600 rounded"
              />
              <label htmlFor="enforce2fa" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Mandate Two-Factor Authentication (TOTP) for Administrators
              </label>
            </div>
          </div>
        )}

        {/* SMTP Tab */}
        {activeTab === 'smtp' && (
          <div className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={settings.smtp_host || ''}
                  onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                  placeholder="smtp.example.com"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Port
                </label>
                <input
                  type="number"
                  value={settings.smtp_port || '587'}
                  onChange={(e) => setSettings({ ...settings, smtp_port: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  SMTP Username
                </label>
                <input
                  type="text"
                  value={settings.smtp_user || ''}
                  onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  SMTP Password
                </label>
                <input
                  type="password"
                  value={settings.smtp_pass || ''}
                  onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Sender Email Address ("From")
              </label>
              <input
                type="email"
                value={settings.smtp_from || ''}
                onChange={(e) => setSettings({ ...settings, smtp_from: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Backup S3 Tab */}
        {activeTab === 'backup' && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                S3 Bucket Name
              </label>
              <input
                type="text"
                value={settings.s3_bucket || ''}
                onChange={(e) => setSettings({ ...settings, s3_bucket: e.target.value })}
                placeholder="my-company-vps-backups"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                S3 Endpoint URL (Optional for Wasabi, DigitalOcean Spaces, MinIO)
              </label>
              <input
                type="text"
                value={settings.s3_endpoint || ''}
                onChange={(e) => setSettings({ ...settings, s3_endpoint: e.target.value })}
                placeholder="https://s3.us-east-1.amazonaws.com"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Access Key ID
                </label>
                <input
                  type="text"
                  value={settings.s3_access_key || ''}
                  onChange={(e) => setSettings({ ...settings, s3_access_key: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Secret Access Key
                </label>
                <input
                  type="password"
                  value={settings.s3_secret_key || ''}
                  onChange={(e) => setSettings({ ...settings, s3_secret_key: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Retention Policy (Days to keep archives before automatic pruning)
              </label>
              <input
                type="number"
                value={settings.backup_retention_days || '30'}
                onChange={(e) => setSettings({ ...settings, backup_retention_days: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Alert Thresholds Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                CPU Utilization Warning Threshold ({settings.cpu_alert_threshold || '85'}%)
              </label>
              <input
                type="range"
                min="50"
                max="99"
                value={settings.cpu_alert_threshold || '85'}
                onChange={(e) => setSettings({ ...settings, cpu_alert_threshold: e.target.value })}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Memory Utilization Warning Threshold ({settings.ram_alert_threshold || '90'}%)
              </label>
              <input
                type="range"
                min="50"
                max="99"
                value={settings.ram_alert_threshold || '90'}
                onChange={(e) => setSettings({ ...settings, ram_alert_threshold: e.target.value })}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Disk Space Low Warning Threshold ({settings.disk_alert_threshold || '85'}%)
              </label>
              <input
                type="range"
                min="50"
                max="99"
                value={settings.disk_alert_threshold || '85'}
                onChange={(e) => setSettings({ ...settings, disk_alert_threshold: e.target.value })}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>
        )}

        {/* Telegram Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Telegram Bot Token
              </label>
              <input
                type="text"
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                value={settings.telegram_bot_token || ''}
                onChange={(e) => setSettings({ ...settings, telegram_bot_token: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Telegram Target Chat ID / Channel ID
              </label>
              <input
                type="text"
                placeholder="-100123456789"
                value={settings.telegram_chat_id || ''}
                onChange={(e) => setSettings({ ...settings, telegram_chat_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl font-medium text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configuration Changes
          </button>
        </div>
      </form>
    </div>
  );
}

