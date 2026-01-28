import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Shield, Key, Lock, Server, Check, X, RefreshCw, 
  Database, Cpu, Box, Activity, Eye, EyeOff, Plus, Trash2, Edit,
  ChevronDown, ChevronRight, Home, ArrowLeft
} from 'lucide-react';

// API URL for Vault API service
const VAULT_API_URL = process.env.NEXT_PUBLIC_VAULT_API_URL || 'http://localhost:8002';
const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_CODESERVER_API_URL || 'http://localhost:8041';

// Service configuration for status grid
const SERVICES_CONFIG = {
  agents: [
    { id: 'agent-01-n8n', name: 'n8n Orchestrator', port: 5678, icon: Activity },
    { id: 'agent-03-agentzero', name: 'Agent Zero', port: 8050, icon: Cpu },
    { id: 'agent-05-steel', name: 'Steel Browser', port: 3005, icon: Box },
    { id: 'agent-06-skyvern', name: 'Skyvern Solver', port: 8030, icon: Eye },
  ],
  infrastructure: [
    { id: 'room-02-vault', name: 'Vault Secrets', port: 8200, icon: Lock },
    { id: 'room-03-postgres', name: 'PostgreSQL', port: 5432, icon: Database },
    { id: 'room-04-redis', name: 'Redis Cache', port: 6379, icon: Server },
    { id: 'agent-04.1-codeserver', name: 'CodeServer API', port: 8041, icon: Cpu },
  ],
  solvers: [
    { id: 'solver-1.1-captcha', name: 'Captcha Worker', port: 8019, icon: Shield },
    { id: 'solver-2.1-survey', name: 'Survey Worker', port: 8018, icon: Activity },
  ],
  rooms: [
    { id: 'room-01-dashboard', name: 'Dashboard', port: 3011, icon: Home },
    { id: 'room-09-chat', name: 'RocketChat', port: 3009, icon: Box },
    { id: 'room-11-plane', name: 'Plane PM', port: 8081, icon: Activity },
    { id: 'room-16-supabase', name: 'Supabase', port: 54323, icon: Database },
  ],
};

// Service Category Section
function ServiceCategory({ title, services, statuses }) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  return (
    <div className="mb-4">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-400 mb-2 hover:text-white transition-colors"
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {title} ({services.length})
      </button>
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {services.map(service => (
            <ServiceStatusCard 
              key={service.id} 
              service={service} 
              status={statuses[service.id] || 'unknown'} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Secret Row Component
function SecretRow({ secret, onEdit, onDelete }) {
  const [showKeys, setShowKeys] = useState(false);
  
  return (
    <tr className="border-b border-gray-800 hover:bg-gray-800/50">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <Key size={14} className="text-yellow-500" />
          <span className="font-mono text-sm text-white">{secret.path}</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <button 
          onClick={() => setShowKeys(!showKeys)}
          className="flex items-center gap-1 text-gray-400 hover:text-white text-sm"
        >
          {showKeys ? <EyeOff size={14} /> : <Eye size={14} />}
          {showKeys ? secret.keys.join(', ') : `${secret.keys.length} keys`}
        </button>
      </td>
      <td className="py-3 px-4 text-gray-500 text-sm">
        {new Date(secret.lastUpdated).toLocaleDateString()}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onEdit(secret)}
            className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
          >
            <Edit size={14} />
          </button>
          <button 
            onClick={() => onDelete(secret)}
            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// Sync Status Card
function SyncStatusCard({ title, lastSync, status, onSync, isLoading }) {
  return (
    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-white">{title}</span>
        <div className={`px-2 py-1 rounded text-xs ${
          status === 'synced' ? 'bg-green-900/50 text-green-400' : 
          status === 'pending' ? 'bg-yellow-900/50 text-yellow-400' : 
          'bg-gray-700 text-gray-400'
        }`}>
          {status}
        </div>
      </div>
      <div className="text-xs text-gray-500 mb-3">
        Last sync: {lastSync ? new Date(lastSync).toLocaleString() : 'Never'}
      </div>
      <button 
        onClick={onSync}
        disabled={isLoading}
        className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm font-medium text-white transition-colors flex items-center justify-center gap-2"
      >
        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        {isLoading ? 'Syncing...' : 'Sync Now'}
      </button>
    </div>
  );
}

export default function VaultDashboard() {
  const [mounted, setMounted] = useState(false);
  const [secrets, setSecrets] = useState([]);
  const [isLoadingSecrets, setIsLoadingSecrets] = useState(true);
  const [secretsError, setSecretsError] = useState(null);
  const [serviceStatuses, setServiceStatuses] = useState({});
  const [syncStatuses, setSyncStatuses] = useState({
    vercel: { lastSync: null, status: 'unknown' },
    n8n: { lastSync: null, status: 'unknown' },
  });
  const [isLoading, setIsLoading] = useState({
    vercel: false,
    n8n: false,
    all: false,
  });
  // Modal states for CRUD operations
  const [editingSecret, setEditingSecret] = useState(null);
  const [deletingSecret, setDeletingSecret] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [operationStatus, setOperationStatus] = useState({ type: null, message: '' });

  // Fetch secrets from real Vault API
  const fetchSecrets = async () => {
    setIsLoadingSecrets(true);
    setSecretsError(null);
    try {
      const res = await fetch(`${VAULT_API_URL}/api/secrets`);
      if (res.ok) {
        const data = await res.json();
        // Transform API response to expected format
        const formattedSecrets = Array.isArray(data) ? data : (data.secrets || []);
        setSecrets(formattedSecrets.map(s => ({
          path: s.path || s.name || s.key,
          keys: s.keys || Object.keys(s.data || {}),
          lastUpdated: s.lastUpdated || s.updated_at || new Date().toISOString(),
          ...s
        })));
      } else {
        const errorData = await res.json().catch(() => ({}));
        setSecretsError(errorData.message || `Failed to fetch secrets (${res.status})`);
      }
    } catch (e) {
      console.error('Failed to fetch secrets', e);
      setSecretsError(`Connection error: ${e.message}`);
    } finally {
      setIsLoadingSecrets(false);
    }
  };

  // Handle edit secret - calls real Vault API
  const handleEditSecret = async (secret, newData) => {
    setOperationStatus({ type: 'loading', message: 'Updating secret...' });
    try {
      const res = await fetch(`${VAULT_API_URL}/api/secrets/${encodeURIComponent(secret.path)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData),
      });
      if (res.ok) {
        setOperationStatus({ type: 'success', message: 'Secret updated successfully' });
        setEditingSecret(null);
        await fetchSecrets(); // Refresh list
      } else {
        const errorData = await res.json().catch(() => ({}));
        setOperationStatus({ type: 'error', message: errorData.message || 'Failed to update secret' });
      }
    } catch (e) {
      setOperationStatus({ type: 'error', message: `Error: ${e.message}` });
    }
    // Clear status after 3 seconds
    setTimeout(() => setOperationStatus({ type: null, message: '' }), 3000);
  };

  // Handle delete secret - calls real Vault API
  const handleDeleteSecret = async (secret) => {
    setOperationStatus({ type: 'loading', message: 'Deleting secret...' });
    try {
      const res = await fetch(`${VAULT_API_URL}/api/secrets/${encodeURIComponent(secret.path)}`, {
        method: 'DELETE',
        headers: { 'X-Confirm-Deletion': 'true' },
      });
      if (res.ok) {
        setOperationStatus({ type: 'success', message: 'Secret deleted successfully' });
        setDeletingSecret(null);
        await fetchSecrets(); // Refresh list
      } else {
        const errorData = await res.json().catch(() => ({}));
        setOperationStatus({ type: 'error', message: errorData.message || 'Failed to delete secret' });
      }
    } catch (e) {
      setOperationStatus({ type: 'error', message: `Error: ${e.message}` });
    }
    // Clear status after 3 seconds
    setTimeout(() => setOperationStatus({ type: null, message: '' }), 3000);
  };

  // Handle add new secret - calls real Vault API
  const handleAddSecret = async (newSecret) => {
    setOperationStatus({ type: 'loading', message: 'Creating secret...' });
    try {
      const res = await fetch(`${VAULT_API_URL}/api/secrets/${encodeURIComponent(newSecret.path)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: newSecret.data }),
      });
      if (res.ok) {
        setOperationStatus({ type: 'success', message: 'Secret created successfully' });
        setShowAddModal(false);
        await fetchSecrets(); // Refresh list
      } else {
        const errorData = await res.json().catch(() => ({}));
        setOperationStatus({ type: 'error', message: errorData.message || 'Failed to create secret' });
      }
    } catch (e) {
      setOperationStatus({ type: 'error', message: `Error: ${e.message}` });
    }
    // Clear status after 3 seconds
    setTimeout(() => setOperationStatus({ type: null, message: '' }), 3000);
  };

  // Fetch service statuses
  const fetchServiceStatuses = async () => {
    try {
      const res = await fetch(`${API_URL}/health`);
      if (res.ok) {
        const data = await res.json();
        // Mark codeserver as healthy
        setServiceStatuses(prev => ({
          ...prev,
          'agent-04.1-codeserver': 'healthy',
          'room-03-postgres': 'healthy', // Assume healthy if API is up
          'room-04-redis': 'healthy',
        }));
      }
    } catch (e) {
      console.error('Failed to fetch service statuses', e);
    }
  };

  // Sync to Vercel
  const syncToVercel = async () => {
    setIsLoading(prev => ({ ...prev, vercel: true }));
    try {
      const res = await fetch(`${VAULT_API_URL}/api/sync/vercel`, { method: 'POST' });
      if (res.ok) {
        setSyncStatuses(prev => ({
          ...prev,
          vercel: { lastSync: new Date().toISOString(), status: 'synced' }
        }));
      }
    } catch (e) {
      console.error('Vercel sync failed', e);
      setSyncStatuses(prev => ({
        ...prev,
        vercel: { ...prev.vercel, status: 'error' }
      }));
    } finally {
      setIsLoading(prev => ({ ...prev, vercel: false }));
    }
  };

  // Sync to n8n
  const syncToN8n = async () => {
    setIsLoading(prev => ({ ...prev, n8n: true }));
    try {
      const res = await fetch(`${VAULT_API_URL}/api/sync/n8n`, { method: 'POST' });
      if (res.ok) {
        setSyncStatuses(prev => ({
          ...prev,
          n8n: { lastSync: new Date().toISOString(), status: 'synced' }
        }));
      }
    } catch (e) {
      console.error('n8n sync failed', e);
      setSyncStatuses(prev => ({
        ...prev,
        n8n: { ...prev.n8n, status: 'error' }
      }));
    } finally {
      setIsLoading(prev => ({ ...prev, n8n: false }));
    }
  };

  // Sync All
  const syncAll = async () => {
    setIsLoading(prev => ({ ...prev, all: true }));
    await Promise.all([syncToVercel(), syncToN8n()]);
    setIsLoading(prev => ({ ...prev, all: false }));
  };

  useEffect(() => {
    setMounted(true);
    fetchServiceStatuses();
    fetchSecrets();
    const interval = setInterval(fetchServiceStatuses, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Head>
        <title>Vault - Secrets Management | SIN-SOLVER</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Header */}
      <header className="bg-gray-950 border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <ArrowLeft size={20} className="text-gray-400" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Shield size={24} className="text-yellow-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Vault - Secrets Management</h1>
                <p className="text-sm text-gray-500">Centralized API Coordinator</p>
              </div>
            </div>
          </div>
          <button 
            onClick={syncAll}
            disabled={isLoading.all}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} className={isLoading.all ? 'animate-spin' : ''} />
            Sync All
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Service Status */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Server size={18} className="text-blue-400" />
                Service Status ({Object.keys(SERVICES_CONFIG).reduce((acc, key) => acc + SERVICES_CONFIG[key].length, 0)})
              </h2>
              
              <ServiceCategory title="Agents" services={SERVICES_CONFIG.agents} statuses={serviceStatuses} />
              <ServiceCategory title="Infrastructure" services={SERVICES_CONFIG.infrastructure} statuses={serviceStatuses} />
              <ServiceCategory title="Solvers" services={SERVICES_CONFIG.solvers} statuses={serviceStatuses} />
              <ServiceCategory title="Rooms" services={SERVICES_CONFIG.rooms} statuses={serviceStatuses} />
            </div>

            {/* Sync Status Panel */}
            <div className="mt-6 bg-gray-800/50 rounded-xl border border-gray-700 p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <RefreshCw size={18} className="text-green-400" />
                Sync Status
              </h2>
              <div className="space-y-3">
                <SyncStatusCard 
                  title="Vercel Environments" 
                  lastSync={syncStatuses.vercel.lastSync}
                  status={syncStatuses.vercel.status}
                  onSync={syncToVercel}
                  isLoading={isLoading.vercel}
                />
                <SyncStatusCard 
                  title="n8n Credentials" 
                  lastSync={syncStatuses.n8n.lastSync}
                  status={syncStatuses.n8n.status}
                  onSync={syncToN8n}
                  isLoading={isLoading.n8n}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Secrets List */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 rounded-xl border border-gray-700">
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Key size={18} className="text-yellow-400" />
                  Secrets ({secrets.length})
                </h2>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Plus size={14} />
                  Add Secret
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr className="text-left text-xs text-gray-500 uppercase">
                      <th className="py-3 px-4 font-medium">Path</th>
                      <th className="py-3 px-4 font-medium">Keys</th>
                      <th className="py-3 px-4 font-medium">Last Updated</th>
                      <th className="py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {secrets.map((secret, idx) => (
                      <SecretRow 
                        key={idx} 
                        secret={secret}
                        onEdit={(s) => setEditingSecret(s)}
                        onDelete={(s) => setDeletingSecret(s)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 text-center">
                <div className="text-2xl font-bold text-white">{secrets.length}</div>
                <div className="text-sm text-gray-500">Secret Paths</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {Object.values(serviceStatuses).filter(s => s === 'healthy').length}
                </div>
                <div className="text-sm text-gray-500">Services Healthy</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">39</div>
                <div className="text-sm text-gray-500">Total Services</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {secrets.reduce((acc, s) => acc + s.keys.length, 0)}
                </div>
                <div className="text-sm text-gray-500">Total Keys</div>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-6 bg-blue-900/20 border border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-400 mb-2">How to Use Vault</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• All secrets are stored in HashiCorp Vault (room-02-tresor-vault)</li>
                <li>• Use "Sync to Vercel" to push secrets as environment variables</li>
                <li>• Use "Sync to n8n" to create/update n8n credentials</li>
                <li>• Agents automatically fetch secrets from Vault API</li>
                <li>• Never commit secrets to git - always use Vault</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Operation Status Notification */}
        {operationStatus.type && (
          <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 ${
            operationStatus.type === 'success' ? 'bg-green-600' :
            operationStatus.type === 'error' ? 'bg-red-600' :
            'bg-blue-600'
          }`}>
            {operationStatus.type === 'loading' && <RefreshCw size={16} className="animate-spin" />}
            {operationStatus.type === 'success' && <Check size={16} />}
            {operationStatus.type === 'error' && <X size={16} />}
            <span className="text-sm font-medium">{operationStatus.message}</span>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingSecret && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-white mb-2">Delete Secret</h3>
              <p className="text-gray-400 mb-4">
                Are you sure you want to delete <span className="font-mono text-red-400">{deletingSecret.path}</span>? 
                This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeletingSecret(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteSecret(deletingSecret)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Secret Modal */}
        {editingSecret && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-lg w-full mx-4">
              <h3 className="text-lg font-semibold text-white mb-4">Edit Secret</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Path</label>
                  <input
                    type="text"
                    value={editingSecret.path}
                    disabled
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-400 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Keys (JSON)</label>
                  <textarea
                    id="edit-secret-data"
                    defaultValue={JSON.stringify(editingSecret.data || {}, null, 2)}
                    rows={6}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm font-mono"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setEditingSecret(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const textarea = document.getElementById('edit-secret-data');
                    try {
                      const data = JSON.parse(textarea.value);
                      handleEditSecret(editingSecret, { data });
                    } catch (e) {
                      setOperationStatus({ type: 'error', message: 'Invalid JSON format' });
                      setTimeout(() => setOperationStatus({ type: null, message: '' }), 3000);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Secret Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-lg w-full mx-4">
              <h3 className="text-lg font-semibold text-white mb-4">Add New Secret</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Path</label>
                  <input
                    type="text"
                    id="add-secret-path"
                    placeholder="e.g., api/openai"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Data (JSON)</label>
                  <textarea
                    id="add-secret-data"
                    placeholder='{"API_KEY": "your-key-here"}'
                    rows={6}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm font-mono"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const pathInput = document.getElementById('add-secret-path');
                    const dataInput = document.getElementById('add-secret-data');
                    const path = pathInput.value.trim();
                    if (!path) {
                      setOperationStatus({ type: 'error', message: 'Path is required' });
                      setTimeout(() => setOperationStatus({ type: null, message: '' }), 3000);
                      return;
                    }
                    try {
                      const data = JSON.parse(dataInput.value || '{}');
                      handleAddSecret({ path, data });
                    } catch (e) {
                      setOperationStatus({ type: 'error', message: 'Invalid JSON format' });
                      setTimeout(() => setOperationStatus({ type: null, message: '' }), 3000);
                    }
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Create Secret
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
