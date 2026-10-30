import React, { useState, useEffect } from 'react';
import { 
  Database as DatabaseIcon, 
  Plus, 
  Trash2, 
  Download, 
  UserPlus, 
  RefreshCw, 
  Search, 
  Server,
  Layers,
  Key,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { Database } from '../types';
import Modal from '../components/common/Modal';

export default function DatabaseManagement() {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [showCreateDbModal, setShowCreateDbModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showConnModal, setShowConnModal] = useState<Database | null>(null);

  // Form states
  const [newDb, setNewDb] = useState({
    name: '',
    engine: 'mysql' as 'mysql' | 'mariadb' | 'postgresql',
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  });

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    database_name: '',
    engine: 'mysql' as 'mysql' | 'mariadb' | 'postgresql',
    host: 'localhost',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDatabases();
  }, []);

  const showToastMsg = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadDatabases = async () => {
    setLoading(true);
    try {
      const data = await api.getDatabases();
      setDatabases(data || []);
    } catch (err: any) {
      showToastMsg('error', err.message || 'Failed to fetch databases');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createDatabase(newDb);
      showToastMsg('success', `Database ${newDb.name} created successfully!`);
      setShowCreateDbModal(false);
      setNewDb({ name: '', engine: 'mysql', charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' });
      loadDatabases();
    } catch (err: any) {
      showToastMsg('error', err.message || 'Failed to create database');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createDatabaseUser(newUser);
      showToastMsg('success', `User ${newUser.username} created & granted permissions!`);
      setShowCreateUserModal(false);
      setNewUser({ username: '', password: '', database_name: '', engine: 'mysql', host: 'localhost' });
    } catch (err: any) {
      showToastMsg('error', err.message || 'Failed to create database user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDb = async (db: Database) => {
    if (!window.confirm(`Are you absolutely sure you want to drop database "${db.name}"? This action CANNOT be undone!`)) {
      return;
    }
    try {
      await api.deleteDatabase(db.id);
      showToastMsg('success', `Database ${db.name} dropped.`);
      loadDatabases();
    } catch (err: any) {
      showToastMsg('error', err.message || 'Failed to delete database');
    }
  };

  const handleBackupDb = async (db: Database) => {
    try {
      showToastMsg('success', `Starting export dump for ${db.name}...`);
      const res = await api.backupDatabase(db.id);
      showToastMsg('success', `Backup dump saved: ${res.dump_path || 'Success'}`);
    } catch (err: any) {
      showToastMsg('error', err.message || 'Failed to dump database');
    }
  };

  const filteredDatabases = databases.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.engine.toLowerCase().includes(search.toLowerCase())
  );

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

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <DatabaseIcon className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Database Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Provision, manage, and back up MySQL, MariaDB, and PostgreSQL relational databases.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCreateUserModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            New DB User
          </button>
          <button
            onClick={() => setShowCreateDbModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Database
          </button>
          <button
            onClick={loadDatabases}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search databases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Total: <span className="text-slate-900 dark:text-white font-bold">{databases.length}</span> databases
        </div>
      </div>

      {/* Databases Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Database Name</th>
                <th className="px-6 py-4">Engine</th>
                <th className="px-6 py-4">Charset & Collation</th>
                <th className="px-6 py-4">Allocated Size</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading && databases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading databases...
                  </td>
                </tr>
              ) : filteredDatabases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <DatabaseIcon className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    No databases found matching your query.
                  </td>
                </tr>
              ) : (
                filteredDatabases.map((db) => (
                  <tr key={db.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">{db.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        db.engine === 'postgresql'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}>
                        <Server className="w-3 h-3" />
                        {db.engine.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono">
                      <div>{db.charset}</div>
                      <div className="text-slate-400 text-[11px]">{db.collation}</div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{db.size_mb?.toFixed(2) || '0.00'} MB</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {db.created_at ? new Date(db.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setShowConnModal(db)}
                          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="Connection Credentials"
                        >
                          <Key className="w-4 h-4 text-amber-500" />
                        </button>
                        <button
                          onClick={() => handleBackupDb(db)}
                          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="Generate Dump Backup"
                        >
                          <Download className="w-4 h-4 text-emerald-500" />
                        </button>
                        <button
                          onClick={() => handleDeleteDb(db)}
                          className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                          title="Drop Database"
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

      {/* Modal: Create Database */}
      <Modal
        isOpen={showCreateDbModal}
        onClose={() => setShowCreateDbModal(false)}
        title="Create New Database"
      >
        <form onSubmit={handleCreateDatabase} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
              Database Engine
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['mysql', 'mariadb', 'postgresql'] as const).map((eng) => (
                <button
                  type="button"
                  key={eng}
                  onClick={() => setNewDb({ ...newDb, engine: eng })}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    newDb.engine === eng
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Server className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs uppercase">{eng}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
              Database Name
            </label>
            <input
              type="text"
              required
              pattern="^[a-zA-Z0-9_]+$"
              placeholder="e.g. app_production"
              value={newDb.name}
              onChange={(e) => setNewDb({ ...newDb, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">Alphanumeric characters and underscores only.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Character Set
              </label>
              <select
                value={newDb.charset}
                onChange={(e) => setNewDb({ ...newDb, charset: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              >
                <option value="utf8mb4">utf8mb4 (Recommended)</option>
                <option value="utf8">utf8</option>
                <option value="latin1">latin1</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Collation
              </label>
              <select
                value={newDb.collation}
                onChange={(e) => setNewDb({ ...newDb, collation: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              >
                <option value="utf8mb4_unicode_ci">utf8mb4_unicode_ci</option>
                <option value="utf8mb4_general_ci">utf8mb4_general_ci</option>
                <option value="utf8mb4_bin">utf8mb4_bin</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setShowCreateDbModal(false)}
              className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Database'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create User */}
      <Modal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        title="Create Database User & Grant Privileges"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
              Select Engine
            </label>
            <select
              value={newUser.engine}
              onChange={(e) => setNewUser({ ...newUser, engine: e.target.value as any })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            >
              <option value="mysql">MySQL / MariaDB</option>
              <option value="postgresql">PostgreSQL</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
              Grant On Target Database
            </label>
            <select
              value={newUser.database_name}
              onChange={(e) => setNewUser({ ...newUser, database_name: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            >
              <option value="">-- Select a Database --</option>
              {databases.map((db) => (
                <option key={db.id} value={db.name}>
                  {db.name} ({db.engine})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
              Username
            </label>
            <input
              type="text"
              required
              pattern="^[a-zA-Z0-9_]+$"
              placeholder="e.g. app_user"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="Strong password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
              Host / Network Access
            </label>
            <input
              type="text"
              value={newUser.host}
              onChange={(e) => setNewUser({ ...newUser, host: e.target.value })}
              placeholder="localhost or %"
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            />
            <p className="text-[11px] text-slate-400 mt-1">Use 'localhost' for local apps, or '%' for remote hosts.</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setShowCreateUserModal(false)}
              className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Grant & Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Connection Snippet */}
      {showConnModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowConnModal(null)}
          title={`Connection Info: ${showConnModal.name}`}
        >
          <div className="space-y-3 text-sm">
            <p className="text-slate-600 dark:text-slate-400 text-xs">
              Use these connection parameters in your application (.env or config.php):
            </p>
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs space-y-2 select-all">
              <div>DB_CONNECTION={showConnModal.engine}</div>
              <div>DB_HOST=127.0.0.1</div>
              <div>DB_PORT={showConnModal.engine === 'postgresql' ? '5432' : '3306'}</div>
              <div>DB_DATABASE={showConnModal.name}</div>
              <div>DB_USERNAME=[Your DB User]</div>
              <div>DB_PASSWORD=[Your DB Password]</div>
            </div>
            <div className="pt-3 flex justify-end">
              <button
                onClick={() => setShowConnModal(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

