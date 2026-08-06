'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/api';

interface Business {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  email: string | null;
  createdAt: string;
  _count?: {
    conversations: number;
  };
}

const businessTypes = [
  { value: 'restaurant', label: '🍽️ Restaurant' },
  { value: 'real-estate', label: '🏠 Real Estate' },
  { value: 'ecommerce', label: '🛒 E-commerce' },
  { value: 'consulting', label: '💼 Consulting' },
  { value: 'agriculture', label: '🌾 Agriculture' },
  { value: 'finance', label: '💰 Financial Advisor' },
  { value: 'generic', label: '🏢 Generic Business' },
];

export default function BusinessPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Business | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'generic',
    phone: '',
    email: '',
    address: '',
    description: '',
    knowledgeBase: '',
    rules: '',
  });

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      const data = await authFetch('/api/business');
      setBusinesses(data.data || []);
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body: any = { ...formData };
      try { body.knowledgeBase = formData.knowledgeBase ? JSON.parse(formData.knowledgeBase) : {}; } catch { body.knowledgeBase = {}; }
      try { body.rules = formData.rules ? JSON.parse(formData.rules) : {}; } catch { body.rules = {}; }

      const url = editingId
        ? `/api/business/${editingId}`
        : '/api/business';
      const method = editingId ? 'PUT' : 'POST';
      const data = await authFetch(url, {
        method,
        body: JSON.stringify(body),
      });
      if (data.success) {
        alert(editingId ? 'Business updated successfully!' : 'Business created successfully!');
        setShowModal(false);
        setEditingId(null);
        setFormData({ name: '', type: 'generic', phone: '', email: '', address: '', description: '', knowledgeBase: '', rules: '' });
        fetchBusinesses();
      } else {
        alert('Error: ' + (data.error || 'Failed to save business'));
      }
    } catch (error) {
      alert('Failed to connect to server. Make sure backend is running on port 5000.');
      console.error('Failed to save business:', error);
    }
  };

  const openEdit = async (business: Business) => {
    // Fetch full business data including knowledgeBase and rules
    let kb = '';
    let rules = '';
    try {
      const data = await authFetch(`/api/business/${business.id}`);
      if (data.success && data.data) {
        kb = data.data.knowledgeBase ? JSON.stringify(data.data.knowledgeBase, null, 2) : '';
        rules = data.data.rules ? JSON.stringify(data.data.rules, null, 2) : '';
      }
    } catch (e) {}
    setEditingId(business.id);
    setFormData({
      name: business.name,
      type: business.type,
      phone: business.phone || '',
      email: business.email || '',
      address: (business as any).address || '',
      description: (business as any).description || '',
      knowledgeBase: kb,
      rules: rules,
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({ name: '', type: 'generic', phone: '', email: '', address: '', description: '', knowledgeBase: '', rules: '' });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteConfirmText !== deleteTarget.name) {
      alert('Business name does not match. Deletion cancelled.');
      return;
    }
    setDeleting(true);
    try {
      await authFetch(`/api/business/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      setDeleteConfirmText('');
      fetchBusinesses();
    } catch (error) {
      alert('Failed to delete business.');
      console.error('Failed to delete business:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-800">Businesses</h1>
          <p className="text-gray-600 mt-1 text-sm">Manage your business profiles</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm w-full sm:w-auto"
        >
          + Add Business
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : businesses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-500">No businesses yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {businesses.map((business) => (
            <div
              key={business.id}
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{business.name}</h3>
                  <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                    {businessTypes.find((t) => t.value === business.type)?.label || business.type}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                {business.phone && (
                  <p>📞 {business.phone}</p>
                )}
                {business.email && (
                  <p>✉️ {business.email}</p>
                )}
                <p>💬 {business._count?.conversations || 0} conversations</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(business)}
                  className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => { setDeleteTarget(business); setDeleteConfirmText(''); }}
                  className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{editingId ? 'Edit Business' : 'Add New Business'}</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter business name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {businessTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="info@business.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Brief description of your business"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Knowledge Base (JSON)</label>
                <textarea
                  value={formData.knowledgeBase}
                  onChange={(e) => setFormData({ ...formData, knowledgeBase: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
                  rows={4}
                  placeholder='{"about": "Business info", "services": ["service1", "service2"]}'
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Rules (JSON)</label>
                <textarea
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
                  rows={4}
                  placeholder='{"greeting": "Welcome!", "hours": "9-5"}'
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Delete Business?</h2>
            <p className="text-gray-600 mb-1">
              You are about to permanently delete <strong>{deleteTarget.name}</strong> and all its conversations.
            </p>
            <p className="text-gray-500 text-sm mb-4">
              This action cannot be undone. Type <strong>{deleteTarget.name}</strong> below to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={deleteTarget.name}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteConfirmText(''); }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirmText !== deleteTarget.name || deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
