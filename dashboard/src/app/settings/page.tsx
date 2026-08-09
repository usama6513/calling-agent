'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Business {
  id: string;
  name: string;
  type: string;
  aiModel?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  ownerId?: string | null;
}

interface GroqModel {
  id: string;
  name: string;
}

interface TeamUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  activeSessions: number;
}

const roleLabels: Record<string, string> = {
  admin: '🛡️ Admin',
  manager: '👔 Manager',
  agent: '🤖 Agent',
};

export default function SettingsPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'ai' | 'team'>('ai');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [models, setModels] = useState<GroqModel[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [settings, setSettings] = useState({
    aiModel: '',
    maxTokens: 600,
    temperature: 0.7,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Team state
  const [team, setTeam] = useState<TeamUser[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamMessage, setTeamMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'manager' });
  const [savingUser, setSavingUser] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isAdmin) loadTeam();
  }, [isAdmin]);

  useEffect(() => {
    if (selectedBusinessId) {
      const biz = businesses.find((b) => b.id === selectedBusinessId);
      if (biz) {
        setSettings({
          aiModel: biz.aiModel || '',
          maxTokens: biz.maxTokens ?? 600,
          temperature: biz.temperature ?? 0.7,
        });
      }
    }
  }, [selectedBusinessId, businesses]);

  const loadData = async () => {
    setLoading(true);
    const [bizRes, modelRes] = await Promise.allSettled([
      authFetch('/api/business?page=1&limit=200'),
      authFetch('/api/groq/models'),
    ]);
    const bizData = bizRes.status === 'fulfilled' ? bizRes.value : null;
    const modelData = modelRes.status === 'fulfilled' ? modelRes.value : null;
    if (bizData?.data?.length) {
      setBusinesses(bizData.data);
      setSelectedBusinessId(bizData.data[0].id);
    } else {
      setBusinesses([]);
      if (bizRes.status === 'rejected') {
        setMessage({ type: 'error', text: 'Failed to load businesses. Check server connection.' });
      }
    }
    if (modelData?.data) setModels(modelData.data);
    setLoading(false);
  };

  const canManageBusiness = (b?: Business | null) =>
    !!b && (currentUser?.role === 'admin' || (b.ownerId && b.ownerId === currentUser?.id));

  const selectedBusiness = businesses.find((b) => b.id === selectedBusinessId) || null;
  const canEditSelected = canManageBusiness(selectedBusiness);

  const handleSave = async () => {
    if (!selectedBusinessId) {
      setMessage({ type: 'error', text: 'No business selected.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const data = await authFetch(`/api/business/${selectedBusinessId}`, {
        method: 'PUT',
        body: JSON.stringify({
          aiModel: settings.aiModel || null,
          maxTokens: settings.maxTokens,
          temperature: settings.temperature,
        }),
      });
      if (data.success) {
        setMessage({ type: 'success', text: 'AI settings saved! Applied to this business.' });
        setBusinesses((prev) =>
          prev.map((b) =>
            b.id === selectedBusinessId
              ? { ...b, aiModel: settings.aiModel || null, maxTokens: settings.maxTokens, temperature: settings.temperature }
              : b
          )
        );
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const loadTeam = async () => {
    setTeamLoading(true);
    try {
      const data = await authFetch('/api/auth/users');
      setTeam(data.data || []);
    } catch {
      setTeamMessage({ type: 'error', text: 'Failed to load team members.' });
    } finally {
      setTeamLoading(false);
    }
  };

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email.trim() || !newUser.password) {
      setTeamMessage({ type: 'error', text: 'Email and password are required.' });
      return;
    }
    if (newUser.password.length < 8) {
      setTeamMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    setSavingUser(true);
    setTeamMessage(null);
    try {
      await authFetch('/api/auth/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });
      setTeamMessage({ type: 'success', text: 'User created successfully!' });
      setNewUser({ name: '', email: '', password: '', role: 'manager' });
      setShowAddUser(false);
      loadTeam();
    } catch (err: any) {
      setTeamMessage({ type: 'error', text: err.message || 'Failed to create user.' });
    } finally {
      setSavingUser(false);
    }
  };

  const toggleUser = async (u: TeamUser) => {
    try {
      await authFetch(`/api/auth/users/${u.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      setTeamMessage({ type: 'success', text: u.isActive ? `${u.email} disabled.` : `${u.email} enabled.` });
      loadTeam();
    } catch (err: any) {
      setTeamMessage({ type: 'error', text: err.message || 'Failed to update user.' });
    }
  };

  const changeRole = async (u: TeamUser, role: string) => {
    try {
      await authFetch(`/api/auth/users/${u.id}`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
      setTeamMessage({ type: 'success', text: `${u.email} role changed to ${role}.` });
      loadTeam();
    } catch (err: any) {
      setTeamMessage({ type: 'error', text: err.message || 'Failed to update role.' });
    }
  };

  const deleteUser = async (u: TeamUser) => {
    if (!confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    try {
      await authFetch(`/api/auth/users/${u.id}`, { method: 'DELETE' });
      setTeamMessage({ type: 'success', text: `${u.email} deleted.` });
      loadTeam();
    } catch (err: any) {
      setTeamMessage({ type: 'error', text: err.message || 'Failed to delete user.' });
    }
  };

  const formatDate = (d?: string | null) => {
    if (!d) return 'Never';
    try {
      return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return d;
    }
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-600 mt-1">Configure your AI assistant and team access</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            activeTab === 'ai'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          ⚙️ AI Configuration
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('team')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              activeTab === 'team'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            👥 Team Management
          </button>
        )}
      </div>

      {activeTab === 'ai' && (
      <div className="max-w-2xl space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Business Selection</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Business</label>
              <select
                value={selectedBusinessId}
                onChange={(e) => setSelectedBusinessId(e.target.value)}
                disabled={loading || businesses.length === 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {loading && <option>Loading businesses...</option>}
                {!loading && businesses.length === 0 && <option>No businesses found</option>}
                {!loading &&
                  businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                AI settings below apply to the selected business only.
              </p>
              {selectedBusiness && !canEditSelected && (
                <p className="text-xs text-amber-600 mt-1">
                  🔒 This is a pre-built / shared agent. You cannot change its AI settings (admin or the owner can).
                </p>
              )}
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">AI Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">AI Model</label>
              <select
                value={settings.aiModel}
                onChange={(e) => setSettings({ ...settings, aiModel: e.target.value })}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {loading && <option>Loading models...</option>}
                {!loading && <option value="">Default (llama-3.1-8b-instant)</option>}
                {!loading &&
                  models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} — {m.name}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {models.length} models available on Groq.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperature: {settings.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Precise (0)</span>
                <span>Creative (1)</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Tokens: {settings.maxTokens}
              </label>
              <input
                type="range"
                min="256"
                max="4096"
                step="256"
                value={settings.maxTokens}
                onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !selectedBusinessId || !canEditSelected}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
        >
          {!canEditSelected ? 'Read-Only Agent' : saving ? 'Saving...' : 'Save AI Settings'}
        </button>
      </div>
      )}

      {activeTab === 'team' && isAdmin && (
        <div className="max-w-3xl space-y-6">
          {teamMessage && (
            <div
              className={`p-3 rounded-lg text-sm ${
                teamMessage.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {teamMessage.text}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Team Members</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Manage who can access this dashboard ({team.length} users)
                </p>
              </div>
              <button
                onClick={() => setShowAddUser(!showAddUser)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                {showAddUser ? 'Cancel' : '+ Add User'}
              </button>
            </div>

            {showAddUser && (
              <form onSubmit={addUser} className="mb-5 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      placeholder="Name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="manager">Manager</option>
                      <option value="agent">Agent</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="teammate@company.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Temporary Password</label>
                  <input
                    type="text"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="At least 8 characters"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {savingUser ? 'Creating...' : 'Create User'}
                </button>
              </form>
            )}

            {teamLoading ? (
              <p className="text-sm text-gray-500 py-4">Loading team members...</p>
            ) : (
              <div className="space-y-3">
                {team.map((u) => (
                  <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {u.role === 'admin' ? '🛡️' : '👤'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">
                          {u.name || u.email}
                          <span className="ml-2 text-xs text-gray-400">
                            {roleLabels[u.role] || u.role}
                          </span>
                          {!u.isActive && (
                            <span className="ml-2 text-xs text-red-500 font-medium">Disabled</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {u.email} · Joined {formatDate(u.createdAt)} · {u.activeSessions} session(s)
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {u.id !== currentUser?.id && (
                        <>
                          <select
                            value={u.role}
                            onChange={(e) => changeRole(u, e.target.value)}
                            className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="agent">Agent</option>
                          </select>
                          <button
                            onClick={() => toggleUser(u)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                              u.isActive
                                ? 'border-red-200 text-red-600 hover:bg-red-50'
                                : 'border-green-200 text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {u.isActive ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => deleteUser(u)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      {u.id === currentUser?.id && (
                        <span className="text-xs text-gray-400 px-2">(you)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
