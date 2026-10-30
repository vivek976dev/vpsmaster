import React, { useState, useEffect } from 'react';
import { 
  Network, 
  PlusCircle, 
  Trash2, 
  Download, 
  Search, 
  Globe, 
  Check, 
  FileText 
} from 'lucide-react';
import { api } from '../services/api';
import { Domain, DNSRecord } from '../types';
import { Modal } from '../components/common/Modal';

export const DomainDnsManagement: React.FC = () => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [loading, setLoading] = useState(true);

  // Add Domain Modal
  const [showAddDomainModal, setShowAddDomainModal] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');

  // Add Record Modal
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [recordType, setRecordType] = useState<'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'CAA'>('A');
  const [recordHost, setRecordHost] = useState('@');
  const [recordValue, setRecordValue] = useState('');
  const [recordTtl, setRecordTtl] = useState(3600);
  const [recordPriority, setRecordPriority] = useState<number | undefined>(undefined);

  const loadDomains = async () => {
    try {
      setLoading(true);
      const data = await api.getDomains();
      setDomains(data);
      if (data.length > 0 && !selectedDomain) {
        setSelectedDomain(data[0]);
      } else if (selectedDomain) {
        const updated = data.find((d: Domain) => d.id === selectedDomain.id);
        if (updated) setSelectedDomain(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDomains();
  }, []);

  const handleCreateDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createDomain({ domain_name: newDomainName });
      setShowAddDomainModal(false);
      setNewDomainName('');
      await loadDomains();
      setSelectedDomain(created);
    } catch (e: any) {
      alert(`Error creating domain: ${e.message}`);
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDomain) return;
    try {
      await api.addDNSRecord(selectedDomain.id, {
        record_type: recordType,
        host: recordHost,
        value: recordValue,
        ttl: Number(recordTtl),
        priority: recordPriority ? Number(recordPriority) : undefined
      });
      setShowAddRecordModal(false);
      setRecordHost('@');
      setRecordValue('');
      loadDomains();
    } catch (e: any) {
      alert(`Error adding record: ${e.message}`);
    }
  };

  const handleDeleteRecord = async (recordId: number) => {
    if (confirm('Delete this DNS record?')) {
      try {
        await api.deleteDNSRecord(recordId);
        loadDomains();
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const handleExportZone = () => {
    if (!selectedDomain) return;
    window.open(`/api/v1/dns/domains/${selectedDomain.id}/export`, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-white">DNS Zone Management</h2>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative DNS records management (A, AAAA, CNAME, MX, TXT, NS, CAA) and BIND exports.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddDomainModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-sky-500/25"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Domain</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Domain Selection List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-500 px-2">Managed Domains</span>
          <div className="space-y-1">
            {domains.map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedDomain(d)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold font-mono transition ${
                  selectedDomain?.id === d.id
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <Globe className="w-4 h-4 shrink-0" />
                  <span className="truncate">{d.domain_name}</span>
                </div>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                  {d.dns_records?.length || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* DNS Zone Records Editor */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center space-x-2">
                <span>DNS Zone:</span>
                <span className="text-sky-400 font-mono">{selectedDomain?.domain_name || 'Select a domain'}</span>
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {selectedDomain?.dns_records?.length || 0} active resource records
              </p>
            </div>
            {selectedDomain && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportZone}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                  title="Export BIND Zone"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Zone</span>
                </button>
                <button
                  onClick={() => setShowAddRecordModal(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-sky-500/25"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Record</span>
                </button>
              </div>
            )}
          </div>

          {/* Records Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">Type</th>
                  <th className="py-2.5 px-3">Host / Name</th>
                  <th className="py-2.5 px-3">Target / Value</th>
                  <th className="py-2.5 px-3">TTL</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3 text-right rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {selectedDomain?.dns_records?.map((r: DNSRecord) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                        r.record_type === 'A' ? 'bg-sky-500/20 text-sky-400' :
                        r.record_type === 'CNAME' ? 'bg-indigo-500/20 text-indigo-400' :
                        r.record_type === 'MX' ? 'bg-amber-500/20 text-amber-400' :
                        r.record_type === 'TXT' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-purple-500/20 text-purple-400'
                      }`}>
                        {r.record_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-200 font-semibold">{r.host}</td>
                    <td className="py-3 px-3 text-slate-300 truncate max-w-xs">{r.value}</td>
                    <td className="py-3 px-3 text-slate-400">{r.ttl}s</td>
                    <td className="py-3 px-3 text-slate-400">{r.priority ?? '—'}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDeleteRecord(r.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Domain Modal */}
      <Modal isOpen={showAddDomainModal} onClose={() => setShowAddDomainModal(false)} title="Add Domain">
        <form onSubmit={handleCreateDomain} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Domain Name</label>
            <input
              type="text"
              placeholder="e.g. example.org"
              value={newDomainName}
              onChange={(e) => setNewDomainName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:border-sky-500 outline-none"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddDomainModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-sky-500/25"
            >
              Add Domain Zone
            </button>
          </div>
        </form>
      </Modal>

      {/* Add DNS Record Modal */}
      <Modal isOpen={showAddRecordModal} onClose={() => setShowAddRecordModal(false)} title="Add DNS Record">
        <form onSubmit={handleAddRecord} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Record Type</label>
              <select
                value={recordType}
                onChange={(e: any) => setRecordType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:border-sky-500 outline-none"
              >
                <option value="A">A (IPv4 Address)</option>
                <option value="AAAA">AAAA (IPv6 Address)</option>
                <option value="CNAME">CNAME (Alias)</option>
                <option value="MX">MX (Mail Exchange)</option>
                <option value="TXT">TXT (Text / SPF / DKIM)</option>
                <option value="NS">NS (Nameserver)</option>
                <option value="CAA">CAA (Cert Authority)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Host / Name</label>
              <input
                type="text"
                placeholder="@ or subdomain"
                value={recordHost}
                onChange={(e) => setRecordHost(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:border-sky-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target / Value</label>
            <input
              type="text"
              placeholder="e.g. 198.51.100.1 or mail.example.com"
              value={recordValue}
              onChange={(e) => setRecordValue(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:border-sky-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">TTL (Seconds)</label>
              <input
                type="number"
                value={recordTtl}
                onChange={(e) => setRecordTtl(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:border-sky-500 outline-none"
              />
            </div>
            {recordType === 'MX' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                <input
                  type="number"
                  placeholder="10"
                  value={recordPriority || ''}
                  onChange={(e) => setRecordPriority(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:border-sky-500 outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddRecordModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-sky-500/25"
            >
              Save Record
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DomainDnsManagement;
