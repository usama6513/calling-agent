'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    appName: 'Calling Agent',
    aiModel: 'llama-3.3-70b-versatile',
    maxTokens: 1024,
    temperature: 0.7,
    enableCallRecording: true,
    enableTranscription: true,
    enableWhatsApp: true,
    enablePhone: true,
    enableWebChat: true,
    autoEscalation: true,
    escalationThreshold: 3,
  });

  const handleSave = () => {
    alert('Settings saved! (This is a demo - in production, this would save to the backend)');
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-600 mt-1">Configure your AI calling agent</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">General Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">App Name</label>
              <input
                type="text"
                value={settings.appName}
                onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Recommended)</option>
                <option value="llama-3.1-8b-instant">Llama 3.1 8B (Faster)</option>
                <option value="openai/gpt-oss-120b">GPT-OSS 120B</option>
              </select>
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

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Channel Configuration</h2>
          <div className="space-y-3">
            {[
              { key: 'enablePhone', label: 'Phone Calls', icon: '📞' },
              { key: 'enableWhatsApp', label: 'WhatsApp', icon: '📱' },
              { key: 'enableWebChat', label: 'Web Chat', icon: '🌐' },
              { key: 'enableCallRecording', label: 'Call Recording', icon: '🎙️' },
              { key: 'enableTranscription', label: 'Auto Transcription', icon: '📝' },
            ].map((item) => (
              <label key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-gray-700">{item.label}</span>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={(settings as any)[item.key]}
                    onChange={(e) => setSettings({ ...settings, [item.key]: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`w-10 h-6 rounded-full transition-colors ${(settings as any)[item.key] ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform mt-1 ${(settings as any)[item.key] ? 'translate-x-5' : 'translate-x-1'}`}></div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Escalation Settings</h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="text-lg">🔄</span>
                <span className="text-gray-700">Auto-Escalate to Human</span>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.autoEscalation}
                  onChange={(e) => setSettings({ ...settings, autoEscalation: e.target.checked })}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition-colors ${settings.autoEscalation ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform mt-1 ${settings.autoEscalation ? 'translate-x-5' : 'translate-x-1'}`}></div>
                </div>
              </div>
            </label>
            {settings.autoEscalation && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Escalate after {settings.escalationThreshold} failed attempts
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={settings.escalationThreshold}
                  onChange={(e) => setSettings({ ...settings, escalationThreshold: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
