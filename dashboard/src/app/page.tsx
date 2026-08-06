'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/api';

interface Stats {
  totalBusinesses: number;
  totalConversations: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ totalBusinesses: 0, totalConversations: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/business?limit=100')
      .then((d) => setStats({ totalBusinesses: d.pagination?.total || 0, totalConversations: 0 }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome to your AI Calling Agent</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-2xl shadow-md">🏢</div>
              <div>
                <p className="text-sm text-gray-500">Businesses</p>
                <p className="text-3xl font-bold text-gray-900">{loading ? '...' : stats.totalBusinesses}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-2xl shadow-md">💬</div>
              <div>
                <p className="text-sm text-gray-500">Conversations</p>
                <p className="text-3xl font-bold text-gray-900">{loading ? '...' : stats.totalConversations}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-2xl shadow-md">⚡</div>
              <div>
                <p className="text-sm text-gray-500">AI Engine</p>
                <p className="text-lg font-bold text-green-600">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <a href="/chat" className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-blue-200 transition-all">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-blue-200 mb-4 group-hover:scale-105 transition-transform">🤖</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Live Chat + Voice</h3>
            <p className="text-sm text-gray-500">Chat with AI using text or voice commands</p>
          </a>
          <a href="/business" className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-green-200 transition-all">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-green-200 mb-4 group-hover:scale-105 transition-transform">🏢</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Businesses</h3>
            <p className="text-sm text-gray-500">Add and manage your business profiles</p>
          </a>
          <a href="/conversations" className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-purple-200 transition-all">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-purple-200 mb-4 group-hover:scale-105 transition-transform">💬</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Conversations</h3>
            <p className="text-sm text-gray-500">View chat history and analytics</p>
          </a>
          <a href="/analytics" className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-yellow-200 transition-all">
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-yellow-200 mb-4 group-hover:scale-105 transition-transform">📊</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Analytics</h3>
            <p className="text-sm text-gray-500">Track performance and metrics</p>
          </a>
          <a href="/settings" className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-gray-200 transition-all">
            <div className="w-14 h-14 bg-gradient-to-br from-gray-500 to-gray-700 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-gray-200 mb-4 group-hover:scale-105 transition-transform">⚙️</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Settings</h3>
            <p className="text-sm text-gray-500">Configure AI model and channels</p>
          </a>
        </div>
      </div>
    </div>
  );
}
