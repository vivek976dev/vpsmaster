import React, { useState, useEffect } from 'react';
import { 
  FolderTree, 
  Folder, 
  File, 
  FileCode, 
  FileText, 
  FileArchive, 
  Upload, 
  Download, 
  Trash2, 
  Edit3, 
  PlusCircle, 
  FolderPlus, 
  Archive, 
  Key, 
  ArrowLeft, 
  RefreshCw, 
  Check, 
  Search 
} from 'lucide-react';
import { api } from '../services/api';
import { FileItem } from '../types';
import { Modal } from '../components/common/Modal';

interface FileManagerProps {
  initialPath?: string;
}

export const FileManager: React.FC<FileManagerProps> = ({ initialPath = '/var/www' }) => {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createIsDir, setCreateIsDir] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [targetItem, setTargetItem] = useState<FileItem | null>(null);
  const [newName, setNewName] = useState('');

  const [showChmodModal, setShowChmodModal] = useState(false);
  const [chmodVal, setChmodVal] = useState('0755');

  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [savingFile, setSavingFile] = useState(false);

  const loadDirectory = async (path: string) => {
    try {
      setLoading(true);
      const res = await api.listFiles(path);
      setItems(res.items || []);
      setCurrentPath(res.current_path || path);
    } catch (e: any) {
      alert(`Cannot open directory: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory(currentPath);
  }, []);

  const handleNavigate = (newPath: string) => {
    loadDirectory(newPath);
  };

  const handleGoUp = () => {
    const parts = currentPath.split('/').filter(Boolean);
    if (parts.length > 1) {
      parts.pop();
      handleNavigate('/' + parts.join('/'));
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemPath = `${currentPath}/${newItemName}`.replace('//', '/');
    try {
      await api.createFile(itemPath, createIsDir);
      setShowCreateModal(false);
      setNewItemName('');
      loadDirectory(currentPath);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetItem) return;
    const parentDir = targetItem.path.substring(0, targetItem.path.lastIndexOf('/'));
    const newPath = `${parentDir}/${newName}`;
    try {
      await api.renameFile(targetItem.path, newPath);
      setShowRenameModal(false);
      loadDirectory(currentPath);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (item: FileItem) => {
    if (confirm(`Delete ${item.is_dir ? 'directory' : 'file'} "${item.name}"?`)) {
      try {
        await api.deleteFile(item.path);
        loadDirectory(currentPath);
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const handleChmod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetItem) return;
    try {
      await api.chmodFile(targetItem.path, chmodVal);
      setShowChmodModal(false);
      loadDirectory(currentPath);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleOpenFileEditor = async (item: FileItem) => {
    try {
      setEditingFile(item);
      const res = await api.readFile(item.path);
      setEditorContent(res.content || '');
      setShowEditorModal(true);
    } catch (e: any) {
      alert(`Cannot open file: ${e.message}`);
    }
  };

  const handleSaveFile = async () => {
    if (!editingFile) return;
    try {
      setSavingFile(true);
      await api.writeFile(editingFile.path, editorContent);
      alert('File saved successfully.');
      setShowEditorModal(false);
      loadDirectory(currentPath);
    } catch (e: any) {
      alert(`Failed to save: ${e.message}`);
    } finally {
      setSavingFile(false);
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const content = reader.result as string;
      const targetPath = `${currentPath}/${file.name}`.replace('//', '/');
      try {
        await api.writeFile(targetPath, content);
        loadDirectory(currentPath);
      } catch (err: any) {
        alert(`Upload error: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title & Path Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-white">Browser File Manager</h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse, edit, and manage authorized website directories with strict path jailing.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold cursor-pointer transition">
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>Upload File</span>
            <input type="file" onChange={handleUploadFile} className="hidden" />
          </label>
          <button
            onClick={() => { setCreateIsDir(false); setShowCreateModal(true); }}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>New File</span>
          </button>
          <button
            onClick={() => { setCreateIsDir(true); setShowCreateModal(true); }}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition"
          >
            <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
            <span>New Folder</span>
          </button>
        </div>
      </div>

      {/* Breadcrumb Path & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 overflow-x-auto text-xs font-mono">
          <button
            onClick={handleGoUp}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
            title="Go up one folder"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-slate-500">Path:</span>
          <div className="flex items-center space-x-1 text-slate-300 font-bold">
            {currentPath.split('/').filter(Boolean).map((part, index, arr) => {
              const fullPartPath = '/' + arr.slice(0, index + 1).join('/');
              return (
                <React.Fragment key={index}>
                  <span>/</span>
                  <button
                    onClick={() => handleNavigate(fullPartPath)}
                    className="hover:text-sky-400 hover:underline px-1 py-0.5 rounded transition"
                  >
                    {part}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search current folder..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-mono outline-none focus:border-sky-500 w-48"
            />
          </div>
          <button
            onClick={() => loadDirectory(currentPath)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            title="Reload"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* File & Directory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Permissions</th>
                <th className="py-3 px-4">Last Modified</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.map(item => (
                <tr key={item.path} className="hover:bg-slate-800/30 transition group">
                  <td className="py-3 px-4">
                    {item.is_dir ? (
                      <button
                        onClick={() => handleNavigate(item.path)}
                        className="flex items-center space-x-2.5 font-bold text-sky-400 hover:text-sky-300 transition text-left"
                      >
                        <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenFileEditor(item)}
                        className="flex items-center space-x-2.5 text-slate-200 hover:text-sky-400 transition text-left"
                      >
                        <FileCode className="w-4 h-4 text-sky-400 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-400">{item.is_dir ? '—' : formatSize(item.size_bytes)}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">
                      {item.permissions}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {new Date(item.modified).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      {!item.is_dir && (
                        <button
                          onClick={() => handleOpenFileEditor(item)}
                          className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition"
                          title="Edit File"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => { setTargetItem(item); setNewName(item.name); setShowRenameModal(true); }}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                        title="Rename"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setTargetItem(item); setChmodVal(item.permissions); setShowChmodModal(true); }}
                        className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-slate-800 rounded-lg transition"
                        title="Permissions (chmod)"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create File / Folder Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title={`Create ${createIsDir ? 'Folder' : 'File'}`}>
        <form onSubmit={handleCreateItem} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {createIsDir ? 'Folder Name' : 'File Name (e.g. index.php)'}
            </label>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:border-sky-500 outline-none"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-sky-500/25"
            >
              Create
            </button>
          </div>
        </form>
      </Modal>

      {/* Rename Modal */}
      <Modal isOpen={showRenameModal} onClose={() => setShowRenameModal(false)} title="Rename Item">
        <form onSubmit={handleRename} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">New Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:border-sky-500 outline-none"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowRenameModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-sky-500/25"
            >
              Rename
            </button>
          </div>
        </form>
      </Modal>

      {/* Chmod Permissions Modal */}
      <Modal isOpen={showChmodModal} onClose={() => setShowChmodModal(false)} title="Change Permissions">
        <form onSubmit={handleChmod} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Octal Mode (e.g. 0755, 0644)</label>
            <input
              type="text"
              value={chmodVal}
              onChange={(e) => setChmodVal(e.target.value)}
              required
              pattern="^[0-7]{3,4}$"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:border-sky-500 outline-none"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowChmodModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-sky-500/25"
            >
              Set Permissions
            </button>
          </div>
        </form>
      </Modal>

      {/* Code Editor Modal */}
      <Modal
        isOpen={showEditorModal}
        onClose={() => setShowEditorModal(false)}
        title={`Edit File: ${editingFile?.name}`}
        maxWidth="max-w-5xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Path: {editingFile?.path}</span>
            <span>Size: {formatSize(editingFile?.size_bytes || 0)}</span>
          </div>

          <textarea
            value={editorContent}
            onChange={(e) => setEditorContent(e.target.value)}
            rows={20}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 outline-none focus:border-sky-500 leading-relaxed resize-none"
            spellCheck={false}
          />

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => setShowEditorModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveFile}
              disabled={savingFile}
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-sky-500/25 flex items-center space-x-2"
            >
              {savingFile && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{savingFile ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FileManager;
