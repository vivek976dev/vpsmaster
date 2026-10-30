import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  ShieldCheck, 
  RefreshCw, 
  Upload, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { Website } from '../types';
import { Modal } from '../components/common/Modal';

export const SslManagement: React.FC = () => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [sslStatuses, setSslStatuses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Issue modal
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [targetDomain, setTargetDomain] = useState('');
  const [adminEmail, setAdminEmail] = useState('admin@vpsmaster.local');
  const [issuing, setIssuing] = useState(false);

  // Custom SSL modal
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [customCert, setCustomCert] = useState('');
  const [customKey, setCustomKey] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const sites = await api.getWebsites();
      setWebsites(sites);

      const statusMap: Record<string, any> = {};
      for (const site of sites) {
        try {
          const res = await api.getSSLStatus(site.domain);
          statusMap[site.domain] = res;
        } catch {}
      }
      setSslStatuses(statusMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleIssueSSL = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIssuing(true);
      await api.issueSSL(targetDomain, adminEmail);
      setShowIssueModal(false);
      loadData();
      alert(`SSL certificate successfully issued for ${targetDomain}!`);
    } catch (e: any) {
      alert(`Issuance failed: ${e.message}`);
    } finally {
      setIssuing(false);
    }
  };

  const handleRenewAll = async () => {
    try {
      const res = await api.renewSSL();
      alert(res.output || 'All Let\'s Encrypt certificates evaluated.');
      loadData();
    } catch (e: any) {
      alert(`Renewal failed: ${e.message}`);
    }
  };

  const handleCustomUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.uploadCustomSSL(customDomain, customCert, customKey);
      setShowCustomModal(false);
      setCustomCert('');
      setCustomKey('');
      loadData();
      alert('Custom SSL certificate uploaded.');
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-white">SSL / TLS Management</h2>
          <p className="text-xs text-slate-400 mt-1">
            Let's Encrypt automated ACME certificates, 90-day auto-renewals, and HTTPS enforcement.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRenewAll}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Renew All</span>
          </button>
          <button
            onClick={() => setShowCustomModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Custom SSL</span>
          </button>
        </div>
      </div>

      {/* SSL Certificates Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Domain</th>
                <th className="py-3 px-4">Issuer</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Days Remaining</th>
                <th className="py-3 px-4">Force HTTPS</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {websites.map(site => {
                const status = sslStatuses[site.domain];
                const daysLeft = status?.days_remaining ?? (site.ssl_enabled ? 84 : 0);
                return (
                  <tr key={site.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-100 flex items-center space-x-2.5">
                      <Lock className={`w-4 h-4 ${site.ssl_enabled ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span>{site.domain}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {site.ssl_enabled ? (status?.issuer || 'Let\'s Encrypt Authority') : 'None'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        site.ssl_enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${site.ssl_enabled ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        <span>{site.ssl_enabled ? 'ACTIVE' : 'NO SSL'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {site.ssl_enabled ? (
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3.5 h-3.5 text-sky-400" />
                          <span className={`font-bold ${daysLeft < 15 ? 'text-rose-400' : 'text-slate-200'}`}>
                            {daysLeft} days
                          </span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        site.force_https ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {site.force_https ? 'REDIRECT 301' : 'OPTIONAL'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {!site.ssl_enabled ? (
                        <button
                          onClick={() => { setTargetDomain(site.domain); setShowIssueModal(true); }}
                          className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-sky-500/20 flex items-center space-x-1 ml-auto"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Issue SSL</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => { setTargetDomain(site.domain); setShowIssueModal(true); }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition ml-auto"
                        >
                          Renew
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Let's Encrypt Certificate Modal */}
      <Modal isOpen={showIssueModal} onClose={() => setShowIssueModal(false)} title="Issue Let's Encrypt SSL Certificate">
        <form onSubmit={handleIssueSSL} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Domain</label>
            <input
              type="text"
              value={targetDomain}
              onChange={(e) => setTargetDomain(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:border-sky-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Let's Encrypt Notification Email</label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:border-sky-500 outline-none"
            />
          </div>
          <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-sky-400">DNS Verification Notice:</p>
            <p className="text-[11px] text-slate-400">
              Ensure that your domain's A record points to this server's public IP address before issuing.
            </p>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowIssueModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={issuing}
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-sky-500/25 flex items-center space-x-2"
            >
              {issuing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{issuing ? 'Requesting Certificate...' : 'Issue & Install SSL'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Upload Custom SSL Modal */}
      <Modal isOpen={showCustomModal} onClose={() => setShowCustomModal(false)} title="Upload Custom SSL Certificate">
        <form onSubmit={handleCustomUpload} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Domain</label>
            <select
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:border-sky-500 outline-none"
            >
              <option value="">Select website...</option>
              {websites.map(w => <option key={w.id} value={w.domain}>{w.domain}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Certificate (PEM / CRT)</label>
            <textarea
              placeholder="-----BEGIN CERTIFICATE-----"
              rows={4}
              value={customCert}
              onChange={(e) => setCustomCert(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:border-sky-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Private Key (KEY)</label>
            <textarea
              placeholder="-----BEGIN PRIVATE KEY-----"
              rows={4}
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:border-sky-500 outline-none"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowCustomModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-sky-500/25"
            >
              Upload Certificate
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SslManagement;
