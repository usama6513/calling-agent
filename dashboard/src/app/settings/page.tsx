'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://backend-seven-chi-71.vercel.app';

interface Business {
  id: string;
  name: string;
  type: string;
  aiModel?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
}

interface GroqModel {
  id: string;
  name: string;
}

export default function SettingsPage() {
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

  useEffect(() => {
    loadData();
  }, []);

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
    try {
      const [bizRes, modelRes] = await Promise.all([
        fetch(`${API_BASE}/api/business`),
        fetch(`${API_BASE}/api/groq/models`),
      ]);
      const bizData = await bizRes.json();
      const modelData = await modelRes.json();
      setBusinesses(bizData.data || []);
      setModels(modelData.data || []);
      if (bizData.data?.length) {
        setSelectedBusinessId(bizData.data[0].id);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load data. Check server connection.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedBusinessId) {
      setMessage({ type: 'error', text: 'No business selected.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/business/${selectedBusinessId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiModel: settings.aiModel || null,
          maxTokens: settings.maxTokens,
          temperature: settings.temperature,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
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

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-600 mt-1">Configure AI model per business</p>
      </div>

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
          disabled={saving || !selectedBusinessId}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save AI Settings'}
        </button>
      </div>
    </div>
  );
}
