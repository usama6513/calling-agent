'use client';

import { useEffect, useState } from 'react';

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface Business {
  id: string;
  name: string;
}

interface Conversation {
  id: string;
  channel: string;
  status: string;
  createdAt: string;
  messages: Message[];
  _count?: { messages: number };
}

export default function ConversationsPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    fetch('https://backend-seven-chi-71.vercel.app/api/business')
      .then((r) => r.json())
      .then((d) => { setBusinesses(d.data || []); if (d.data?.length) setSelectedBusiness(d.data[0].id); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedBusiness) fetchConversations();
  }, [selectedBusiness]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://backend-seven-chi-71.vercel.app/api/conversations/${selectedBusiness}`);
      const data = await res.json();
      setConversations(data.data || []);
    } catch {
      setConversations([]);
    }
    setLoading(false);
  };

  const loadDetail = async (id: string) => {
    try {
      const res = await fetch(`https://backend-seven-chi-71.vercel.app/api/conversations/detail/${id}`);
      const data = await res.json();
      setSelectedConversation(data.data);
    } catch {}
  };

  const getChannelIcon = (ch: string) => ch === 'phone' ? '📞' : ch === 'whatsapp' ? '📱' : '🌐';
  const getStatusColor = (s: string) => s === 'active' ? 'bg-green-100 text-green-700' : s === 'closed' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700';

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-800">Conversations</h1>
        <p className="text-gray-600 mt-1 text-sm">View chat history and messages</p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Business</label>
        <select
          value={selectedBusiness}
          onChange={(e) => { setSelectedBusiness(e.target.value); setSelectedConversation(null); }}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 max-h-[600px] overflow-y-auto">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Conversations</h2>
          </div>
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No conversations yet. Start chatting in Live Chat!</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadDetail(conv.id)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${selectedConversation?.id === conv.id ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800">{getChannelIcon(conv.channel)} {conv.channel}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(conv.status)}`}>{conv.status}</span>
                  </div>
                  <p className="text-xs text-gray-500">{conv._count?.messages || 0} messages &bull; {new Date(conv.createdAt).toLocaleDateString()}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 max-h-[600px] overflow-y-auto">
          {selectedConversation ? (
            <>
              <div className="p-4 border-b border-gray-100 sticky top-0 bg-white">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-800">{getChannelIcon(selectedConversation.channel)} Chat Details</h2>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(selectedConversation.status)}`}>{selectedConversation.status}</span>
                </div>
              </div>
              <div className="p-4 space-y-4">
                {selectedConversation.messages?.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>{new Date(msg.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 min-h-[400px]">
              <div className="text-center">
                <p className="text-4xl mb-3">💬</p>
                <p>Select a conversation to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
