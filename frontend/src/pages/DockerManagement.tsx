import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Play, 
  Square, 
  RotateCw, 
  Trash2, 
  FileText, 
  Layers, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  HardDrive
} from 'lucide-react';
import { api } from '../services/api';
import { DockerContainer } from '../types';
import Modal from '../components/common/Modal';

export default function DockerManagement() {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'containers' | 'images'>('containers');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Logs modal
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [currentLogs, setCurrentLogs] = useState('');
  const [selectedContainerName, setSelectedContainerName] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    loadDockerData();
  }, []);

  const showToastMsg = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadDockerData = async () => {
    setLoading(true);
    try {
      const [contRes, imgRes] = await Promise.allSettled([
        api.getDockerContainers(),
        api.getDockerImages()
      ]);

      if (contRes.status === 'fulfilled') {
        setContainers(contRes.value || []);
      }
      if (imgRes.status === 'fulfilled') {
        setImages(imgRes.value || []);
      }
    } catch (err: any) {
      showToastMsg('error', err.message || 'Failed to load Docker resources');
    } finally {
      setLoading(false);
    }
  };

  const handleContainerAction = async (id: string, action: string) => {
    try {
      showToastMsg('success', `Executing ${action} on container...`);
      await api.dockerAction(id, action);
      showToastMsg('success', `Container ${action} succeeded.`);
      loadDockerData();
    } catch (err: any) {
      showToastMsg('error', err.message || `Failed to ${action} container`);
    }
  };

  const handleViewLogs = async (container: DockerContainer) => {
    setSelectedContainerName(container.name);
    setShowLogsModal(true);
    setLoadingLogs(true);
    try {
      const res = await api.getDockerLogs(container.id);
      setCurrentLogs(res.logs || 'No recent log output.');
    } catch (err: any) {
      setCurrentLogs(`Failed to retrieve container logs: ${err.message}`);
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
            <Box className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Docker Container & Image Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Control Docker containers, inspect container logs, and review local container images.
          </p>
        </div>

        <button
          onClick={loadDockerData}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Refresh Docker Status"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-6">
        <button
          onClick={() => setActiveTab('containers')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'containers'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Box className="w-4 h-4" />
          Active Containers ({containers.length})
        </button>
        <button
          onClick={() => setActiveTab('images')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'images'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Layers className="w-4 h-4" />
          Local Images ({images.length})
        </button>
      </div>

      {/* Containers Tab */}
      {activeTab === 'containers' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4">Container</th>
                  <th className="px-6 py-4">Image</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Ports</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {loading && containers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                      Loading containers...
                    </td>
                  </tr>
                ) : containers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <Box className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      No Docker containers running or created on this host.
                    </td>
                  </tr>
                ) : (
                  containers.map((c) => {
                    const isRunning = c.state === 'running' || c.status.toLowerCase().includes('up');
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900 dark:text-white">{c.name}</div>
                          <div className="text-[11px] font-mono text-slate-400">{c.id.substring(0, 12)}</div>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-600 dark:text-slate-300">
                          {c.image}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            isRunning
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            {c.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                          {c.ports || '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isRunning ? (
                              <button
                                onClick={() => handleContainerAction(c.id, 'stop')}
                                className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                                title="Stop Container"
                              >
                                <Square className="w-4 h-4 fill-current" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleContainerAction(c.id, 'start')}
                                className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                                title="Start Container"
                              >
                                <Play className="w-4 h-4 fill-current" />
                              </button>
                            )}
                            <button
                              onClick={() => handleContainerAction(c.id, 'restart')}
                              className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                              title="Restart Container"
                            >
                              <RotateCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleViewLogs(c)}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                              title="View Logs"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleContainerAction(c.id, 'remove')}
                              className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                              title="Delete Container"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Images Tab */}
      {activeTab === 'images' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4">Repository / Image</th>
                  <th className="px-6 py-4">Tag</th>
                  <th className="px-6 py-4">Image ID</th>
                  <th className="px-6 py-4">Virtual Size</th>
                  <th className="px-6 py-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {images.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <Layers className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      No local Docker images downloaded.
                    </td>
                  </tr>
                ) : (
                  images.map((img, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                        {img.repository || img.name || 'untagged'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {img.tag || 'latest'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">
                        {img.id?.substring(0, 19) || '—'}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                          <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                          {img.size || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {img.created || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Docker Container Logs */}
      <Modal
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
        title={`Container Console Output: ${selectedContainerName}`}
      >
        <div className="space-y-4">
          <div className="bg-slate-950 text-emerald-400 font-mono text-xs p-4 rounded-xl h-96 overflow-y-auto whitespace-pre-wrap">
            {loadingLogs ? 'Retrieving container stdout/stderr...' : (currentLogs || 'No logs found.')}
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

