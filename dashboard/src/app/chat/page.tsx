'use client';

import { useEffect, useState, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Business {
  id: string;
  name: string;
  type: string;
}

export default function ChatPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetchBusinesses();
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchBusinesses = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/business');
      const data = await res.json();
      setBusinesses(data.data || []);
      if (data.data?.length > 0) setSelectedBusiness(data.data[0].id);
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedBusiness || loading) return;
    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage, timestamp: new Date().toISOString() }]);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: selectedBusiness, conversationId, message: userMessage, channel: 'web' }),
      });
      const data = await res.json();
      if (data.success) {
        setConversationId(data.data.conversationId);
        setMessages((prev) => [...prev, { role: 'assistant', content: data.data.message, timestamp: new Date().toISOString() }]);
        speakText(data.data.message);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.', timestamp: new Date().toISOString() }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Could not connect to server.', timestamp: new Date().toISOString() }]);
    }
    setLoading(false);
  };

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input not supported. Use Chrome browser.');
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.onresult = (event: any) => {
      setInput(event.results[0][0].transcript);
      setIsRecording(false);
    };
    recognitionRef.current.onerror = () => setIsRecording(false);
    recognitionRef.current.onend = () => setIsRecording(false);
    recognitionRef.current.start();
    setIsRecording(true);
  };

  const stopVoiceInput = () => { recognitionRef.current?.stop(); setIsRecording(false); };

  const speakText = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const cleanText = text.replace(/[*_`#]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    utterance.rate = 1.4;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => { synthRef.current?.cancel(); setIsSpeaking(false); };

  const clearChat = () => { setMessages([]); setConversationId(null); stopSpeaking(); };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = { restaurant: '🍽️ Restaurant', 'real-estate': '🏠 Real Estate', ecommerce: '🛒 E-commerce', consulting: '💼 Consulting', generic: '🏢 Business' };
    return labels[type] || type;
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-lg shadow-md">
              🤖
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Agent Chat</h1>
              <p className="text-sm text-gray-500">Type or use voice to talk to your AI assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedBusiness}
              onChange={(e) => { setSelectedBusiness(e.target.value); clearChat(); }}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name} {getTypeLabel(b.type)}</option>
              ))}
            </select>
            <button
              onClick={clearChat}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              New Chat
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-4xl shadow-xl shadow-blue-200 mb-6">
                🤖
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">How can I help you?</h2>
              <p className="text-gray-500 mb-8">Ask me anything about this business</p>
              <button
                onClick={startVoiceInput}
                className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 shadow-xl shadow-green-200 transition-all flex items-center gap-3"
              >
                <span className="text-2xl">🎤</span> Start Voice Chat
              </button>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-sm shadow-md mt-1 mr-3 shrink-0">
                  🤖
                </div>
              )}
              <div className={`max-w-[75%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                <div className={`px-5 py-3 rounded-2xl shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-br-md'
                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
                <div className="flex items-center gap-2 mt-1.5 px-1">
                  <p className={`text-xs ${msg.role === 'user' ? 'text-right text-gray-400 flex-1' : 'text-gray-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => speakText(msg.content)}
                      className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                      title="Listen"
                    >
                      🔊
                    </button>
                  )}
                </div>
              </div>
              {msg.role === 'user' && (
                <div className="w-9 h-9 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex items-center justify-center text-white text-sm shadow-md mt-1 ml-3 shrink-0">
                  👤
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-sm shadow-md mt-1 mr-3 shrink-0">
                🤖
              </div>
              <div className="bg-white border border-gray-100 px-5 py-3 rounded-2xl rounded-bl-md shadow-sm">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-4">
          {isRecording && (
            <div className="mb-3 flex items-center gap-3 px-4 py-2 bg-red-50 border border-red-200 rounded-xl">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-red-600">Listening... Speak now</span>
              <button onClick={stopVoiceInput} className="ml-auto text-sm text-red-500 hover:text-red-700 font-medium">Stop</button>
            </div>
          )}

          {isSpeaking && (
            <div className="mb-3 flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-600">AI is speaking...</span>
              <button onClick={stopSpeaking} className="ml-auto text-sm text-blue-500 hover:text-blue-700 font-medium">Mute</button>
            </div>
          )}

          <div className="flex items-end gap-3">
            <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Type your message..."
                rows={1}
                className="w-full px-5 py-3 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none resize-none"
                disabled={loading}
              />
            </div>

            <button
              onClick={isRecording ? stopVoiceInput : startVoiceInput}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg transition-all shrink-0 ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200'
                  : 'bg-gradient-to-br from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-200'
              }`}
            >
              🎤
            </button>

            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed shadow-lg shadow-blue-200 transition-all shrink-0 text-lg"
            >
              ➤
            </button>
          </div>

          <div className="mt-2 flex items-center justify-center gap-4 text-xs text-gray-400">
            <span>Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border text-gray-500">Enter</kbd> to send</span>
            <span>|</span>
            <span>Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border text-gray-500">Shift+Enter</kbd> for new line</span>
          </div>
        </div>
      </div>
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}
