import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Plus, 
  Trash2, 
  Key, 
  ShieldCheck, 
  Info, 
  Copy, 
  Check, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  HardDrive
} from 'lucide-react';
import { api } from '../services/api';
import Modal from '../components/common/Modal';

export default function EmailManagement() {
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDnsModal, setShowDnsModal] = useState(false);
  const [dnsRecords, setDnsRecords] = useState<any>(null);
  const [selectedDomainDns, setSelectedDomainDns] = useState('');

  // Form
  const [newMailbox, setNewMailbox] = useState({
    user_part: '',
    domain: '',
    password: '',
    quota_mb: 1024,
  });
  const [submitting, setSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
      const [mailRes, domRes] = await Promise.allSettled([
        api.getMailboxes(),
        api.getDomains()
      ]);

      if (mailRes.status === 'fulfilled') {
        setMailboxes(mailRes.value || []);
      }
      if (domRes.status === 'fulfilled') {
        const domList = domRes.value || [];
        setDomains(domList);
        if (domList.length > 0 && !newMailbox.domain) {
          setNewMailbox((prev) => ({ ...prev, domain: domList[0].domain_name }));
        }
      }
    } catch (err: any) {
      showToastMsg('error', err.message || 'Failed to load mailboxes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMailbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMailbox.user_part || !newMailbox.domain || !newMailbox.password) {
      showToastMsg('error', 'Please fill all required fields');
      return;
    }
    setSubmitting(true);
    const fullEmail = `${newMailbox.user_part.trim()}@${newMailbox.domain}`;
    try {
      await api.createMailbox({
        email: fullEmail,
        password: newMailbox.password,
        quota_mb: newMailbox.quota_mb,
      });
      showToastMsg('success', `Mailbox ${fullEmail} created successfully!`);
      setShowCreateModal(false);
      setNewMailbox({ user_part: '', domain: domains[0]?.domain_name || '', password: '', quota_mb: 1024 });
      loadData();
    } catch (err: any) {
      showToastMsg('error', err.message || 'Failed to create mailbox');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMailbox = async (email: string) => {
    if (!window.confirm(`Are you sure you want to delete mailbox ${email}? All emails and stored messages will be removed!`)) {
      return;
    }
    try {
      await api.deleteMailbox(email);
      showToastMsg('success', `Mailbox ${email} deleted.`);
      loadData();
    } catch (err: any) {
      showToastMsg('error', err.message || 'Failed to delete mailbox');
    }
  };

  const handleInspectDns = async (domain: string) => {
    setSelectedDomainDns(domain);
    setShowDnsModal(true);
    try {
      const res = await api.getEmailDns(domain);
      setDnsRecords(res);
    } catch (err: any) {
      showToastMsg('error', err.message || 'Failed to fetch DNS recommendations');
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
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
            <Mail className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Email Server & Mailbox Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Provision virtual email accounts (Postfix & Dovecot), set quotas, and configure SPF, DKIM, and DMARC deliverability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Mailbox
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

      {/* Deliverability Banner */}
      <div className="bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">Email Deliverability & Spam Reputation</h3>
            <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80 mt-0.5">
              To prevent emails from landing in spam folders, verify that SPF, DKIM keys, and DMARC policies are configured in your DNS zone.
            </p>
          </div>
        </div>
        {domains.length > 0 && (
          <button
            onClick={() => handleInspectDns(domains[0].domain_name)}
            className="text-xs font-semibold px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-colors flex-shrink-0"
          >
            Inspect DNS Requirements
          </button>
        )}
      </div>

      {/* Mailboxes Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Email Address</th>
                <th className="px-6 py-4">Domain</th>
                <th className="px-6 py-4">Quota Limit</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading && mailboxes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading mailboxes...
                  </td>
                </tr>
              ) : mailboxes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <Mail className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    No mailboxes configured. Click "New Mailbox" to create your first email account.
                  </td>
                </tr>
              ) : (
                mailboxes.map((mb, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-indigo-500" />
                        <span className="font-semibold text-slate-900 dark:text-white">{mb.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                      {mb.domain || mb.email.split('@')[1]}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                        <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                        {mb.quota_mb ? `${mb.quota_mb} MB` : 'Unlimited'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {mb.created_at ? new Date(mb.created_at).toLocaleDateString() : 'Active'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleInspectDns(mb.domain || mb.email.split('@')[1])}
                          className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                          title="View Deliverability DNS"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMailbox(mb.email)}
                          className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Delete Mailbox"
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

      {/* Modal: Create Mailbox */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Virtual Mailbox"
      >
        <form onSubmit={handleCreateMailbox} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
              Email Address
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                placeholder="info or contact"
                value={newMailbox.user_part}
                onChange={(e) => setNewMailbox({ ...newMailbox, user_part: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              />
              <span className="text-slate-400 font-bold">@</span>
              <select
                value={newMailbox.domain}
                onChange={(e) => setNewMailbox({ ...newMailbox, domain: e.target.value })}
                required
                className="w-44 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              >
                {domains.map((d) => (
                  <option key={d.id} value={d.domain_name}>
                    {d.domain_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="Strong password for IMAP/SMTP"
              value={newMailbox.password}
              onChange={(e) => setNewMailbox({ ...newMailbox, password: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
              Quota Limit: {newMailbox.quota_mb} MB
            </label>
            <input
              type="range"
              min="256"
              max="10240"
              step="256"
              value={newMailbox.quota_mb}
              onChange={(e) => setNewMailbox({ ...newMailbox, quota_mb: parseInt(e.target.value) })}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>256 MB</span>
              <span>5 GB</span>
              <span>10 GB</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Mailbox'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: DNS Deliverability Inspection */}
      <Modal
        isOpen={showDnsModal}
        onClose={() => setShowDnsModal(false)}
        title={`Required DNS Records for ${selectedDomainDns}`}
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-400">
            Add these DNS records to ensure high email deliverability with Gmail, Microsoft 365, and Yahoo Mail:
          </p>

          <div className="space-y-3 font-mono">
            {/* MX Record */}
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500 font-sans mb-1 font-semibold">
                <span>1. MX Record (Mail Exchanger)</span>
                <button
                  onClick={() => copyToClipboard(`@ 10 mail.${selectedDomainDns}`, 'mx')}
                  className="flex items-center gap-1 text-indigo-600 hover:underline"
                >
                  {copiedKey === 'mx' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  Copy
                </button>
              </div>
              <div className="text-slate-900 dark:text-slate-100">
                Host: <span className="text-indigo-600 dark:text-indigo-400">@</span> | Priority: <span className="text-amber-600">10</span> | Value: <span className="text-emerald-600">mail.{selectedDomainDns}</span>
              </div>
            </div>

            {/* SPF Record */}
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500 font-sans mb-1 font-semibold">
                <span>2. SPF Record (TXT)</span>
                <button
                  onClick={() => copyToClipboard('v=spf1 mx a ~all', 'spf')}
                  className="flex items-center gap-1 text-indigo-600 hover:underline"
                >
                  {copiedKey === 'spf' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  Copy
                </button>
              </div>
              <div className="text-slate-900 dark:text-slate-100">
                Host: <span className="text-indigo-600 dark:text-indigo-400">@</span> | Value: <span className="text-emerald-600">"v=spf1 mx a ~all"</span>
              </div>
            </div>

            {/* DMARC Record */}
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500 font-sans mb-1 font-semibold">
                <span>3. DMARC Policy (TXT)</span>
                <button
                  onClick={() => copyToClipboard(`v=DMARC1; p=quarantine; rua=mailto:postmaster@${selectedDomainDns}`, 'dmarc')}
                  className="flex items-center gap-1 text-indigo-600 hover:underline"
                >
                  {copiedKey === 'dmarc' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  Copy
                </button>
              </div>
              <div className="text-slate-900 dark:text-slate-100">
                Host: <span className="text-indigo-600 dark:text-indigo-400">_dmarc</span> | Value: <span className="text-emerald-600">"v=DMARC1; p=quarantine; rua=mailto:postmaster@{selectedDomainDns}"</span>
              </div>
            </div>

            {/* DKIM */}
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500 font-sans mb-1 font-semibold">
                <span>4. DKIM Public Key (TXT)</span>
                <button
                  onClick={() => copyToClipboard(dnsRecords?.dkim || 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...', 'dkim')}
                  className="flex items-center gap-1 text-indigo-600 hover:underline"
                >
                  {copiedKey === 'dkim' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  Copy
                </button>
              </div>
              <div className="text-slate-900 dark:text-slate-100 break-all">
                Host: <span className="text-indigo-600 dark:text-indigo-400">default._domainkey</span> | Value: <span className="text-emerald-600">{dnsRecords?.dkim || 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...'}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setShowDnsModal(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

