'use client';

import { useEffect, useState, useRef } from 'react';

interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachment?: Attachment;
  voiceNote?: boolean;
  audioUrl?: string;
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
  const [conversationId, setConversationIdState] = useState<string | null>(null);
  const [oldChats, setOldChats] = useState<any[]>([]);
  const [showOldChats, setShowOldChats] = useState(false);
  const [loadingOldChats, setLoadingOldChats] = useState(false);

  const STORAGE_KEY = 'ca-conversations-dashboard';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const map = JSON.parse(saved);
          if (selectedBusiness && map[selectedBusiness]) {
            setConversationIdState(map[selectedBusiness]);
          }
        } catch {}
      }
    }
  }, [selectedBusiness]);

  const setConversationId = (id: string | null) => {
    setConversationIdState(id);
    if (typeof window === 'undefined') return;
    const map: Record<string, string> = {};
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) Object.assign(map, JSON.parse(saved));
    } catch {}
    if (id) map[selectedBusiness] = id;
    else delete map[selectedBusiness];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  };
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetchBusinesses();
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
    const unlock = () => {
      try {
        const AC: any = window.AudioContext || (window as any).webkitAudioContext;
        if (AC) {
          const ctx = new AC();
          const silent = ctx.createBufferSource();
          silent.buffer = ctx.createBuffer(1, 1, 22050);
          silent.connect(ctx.destination);
          silent.start(0);
          ctx.resume().then(() => { ctx.close(); }).catch(() => {});
        }
      } catch {}
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('touchstart', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchBusinesses = async () => {
    try {
      const res = await fetch('https://backend-seven-chi-71.vercel.app/api/business');
      const data = await res.json();
      setBusinesses(data.data || []);
      if (data.data?.length > 0) setSelectedBusiness(data.data[0].id);
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedBusiness) return;
    setUploading(true);
    try {
      const body = JSON.stringify({ businessId: selectedBusiness, channel: 'web' });
      const convoRes = await fetch('https://backend-seven-chi-71.vercel.app/api/chat/ensure-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const convoData = await convoRes.json();
      const convoId = convoData.data?.conversationId || conversationId;
      if (convoId) setConversationId(convoId);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', convoId);
      const res = await fetch('https://backend-seven-chi-71.vercel.app/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setPendingAttachment({ ...data.data });
        setMessages((prev) => [...prev, {
          role: 'user',
          content: `📎 Attached: ${file.name}`,
          timestamp: new Date().toISOString(),
          attachment: { ...data.data },
        }]);
      } else {
        alert('Upload failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Failed to upload file.');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async () => {
    const hasAttachment = !!pendingAttachment;
    if ((!input.trim() && !hasAttachment) || !selectedBusiness || loading) return;
    const userMessage = input.trim() || 'Please look at the file I attached and respond to it.';
    setInput('');
    const attachmentToSend = pendingAttachment;
    setPendingAttachment(null);
    setMessages((prev) => [...prev, { role: 'user', content: userMessage, timestamp: new Date().toISOString() }]);
    setLoading(true);

    try {
      const res = await fetch('https://backend-seven-chi-71.vercel.app/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusiness,
          conversationId,
          message: userMessage,
          channel: 'web',
          attachmentId: attachmentToSend?.id || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConversationId(data.data.conversationId);
        setMessages((prev) => [...prev, { role: 'assistant', content: data.data.message, timestamp: new Date().toISOString() }]);
        speakReply(data.data.message);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.', timestamp: new Date().toISOString() }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Could not connect to server.', timestamp: new Date().toISOString() }]);
    }
    setLoading(false);
  };

  const startVoiceInput = async () => {
    if (isRecording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      alert('Voice recording not supported in this browser. Use Chrome, Edge, or Firefox.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size > 0) await sendVoiceMessage(blob);
      };
      recorder.start();
      setIsRecording(true);
    } catch {
      alert('Microphone access denied.');
    }
  };

  const stopVoiceInput = () => {
    mediaRecorderRef.current?.state === 'recording' && mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const transcribeAudio = async (blob: Blob) => {
    const formData = new FormData();
    formData.append('audio', blob, 'voice.webm');
    const res = await fetch('https://backend-seven-chi-71.vercel.app/api/voice/transcribe', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!data.success || !data.data?.text) throw new Error('Transcription failed');
    return data.data.text;
  };

  const synthesizeAudio = async (text: string) => {
    const res = await fetch('https://backend-seven-chi-71.vercel.app/api/voice/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('Synthesis failed');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  };

  const sendVoiceMessage = async (blob: Blob) => {
    if (!selectedBusiness || loading) return;
    setLoading(true);
    try {
      const transcript = await transcribeAudio(blob);
      if (!transcript.trim()) {
        setLoading(false);
        return;
      }
      setMessages((prev) => [...prev, { role: 'user', content: `🎤 ${transcript}`, timestamp: new Date().toISOString() }]);

      const res = await fetch('https://backend-seven-chi-71.vercel.app/api/chat/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusiness,
          conversationId,
          speechInput: transcript,
          channel: 'voice',
          gender: 'male',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConversationId(data.data.conversationId);
        try {
          const audioUrl = await synthesizeAudio(data.data.message);
          setMessages((prev) => [...prev, { role: 'assistant', content: data.data.message, timestamp: new Date().toISOString(), voiceNote: true, audioUrl }]);
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.src = audioUrl;
              audioRef.current.onplay = () => setIsSpeaking(true);
              audioRef.current.onended = () => setIsSpeaking(false);
              audioRef.current.play().catch(() => {});
            }
          }, 300);
        } catch {
          setMessages((prev) => [...prev, { role: 'assistant', content: data.data.message, timestamp: new Date().toISOString() }]);
        }
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.', timestamp: new Date().toISOString() }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Could not process your voice. Please try again.', timestamp: new Date().toISOString() }]);
    }
    setLoading(false);
  };

  const stopSpeaking = () => { synthRef.current?.cancel(); setIsSpeaking(false); };

  const playServerAudio = async (text: string) => {
    try {
      const a = audioRef.current;
      if (!a) return;
      a.src = `https://backend-seven-chi-71.vercel.app/api/voice/synthesize?text=${encodeURIComponent(text)}`;
      a.onplay = () => setIsSpeaking(true);
      a.onended = () => setIsSpeaking(false);
      a.onerror = () => setIsSpeaking(false);
      const tryPlay = (muted = false) => {
        if (muted) a.muted = true;
        a.play().then(() => {
          if (muted) setTimeout(() => { a.muted = false; }, 100);
        }).catch(() => {
          if (!muted) tryPlay(true);
          else {
            a.muted = false;
            speakText(text);
          }
        });
      };
      tryPlay();
    } catch {
      speakText(text);
    }
  };

  const speakReply = (text: string) => {
    playServerAudio(text);
  };

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

  const clearChat = () => { setMessages([]); setConversationId(null); stopSpeaking(); };

  const startNewChat = () => {
    setShowOldChats(false);
    setMessages([]);
    setConversationId(null);
    stopSpeaking();
  };

  const loadOldChats = async () => {
    if (!selectedBusiness) return;
    setShowOldChats(true);
    setLoadingOldChats(true);
    try {
      const res = await fetch(`https://backend-seven-chi-71.vercel.app/api/conversations/${selectedBusiness}?limit=10`);
      const data = await res.json();
      setOldChats((data.data || []).filter((c: any) => c.channel === 'web'));
    } catch (error) {
      console.error('Failed to load old chats:', error);
      setOldChats([]);
    } finally {
      setLoadingOldChats(false);
    }
  };

  const openOldChat = async (convoId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`https://backend-seven-chi-71.vercel.app/api/conversations/detail/${convoId}`);
      const data = await res.json();
      if (data.success && data.data) {
        const msgs: Message[] = (data.data.messages || []).map((m: any) => ({
          role: m.role,
          content: m.content,
          timestamp: m.createdAt || new Date().toISOString(),
        }));
        setMessages(msgs);
        setConversationId(convoId);
        setShowOldChats(false);
      }
    } catch (error) {
      console.error('Failed to open old chat:', error);
      alert('Could not load this chat. Please try again.');
    }
    setLoading(false);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = { restaurant: '🍽️ Restaurant', 'real-estate': '🏠 Real Estate', ecommerce: '🛒 E-commerce', consulting: '💼 Consulting', agriculture: '🌾 Agriculture', generic: '🏢 Business' };
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
              onClick={loadOldChats}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              📁 Previous Chats
            </button>
            <button
              onClick={startNewChat}
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
          {showOldChats && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">📁 Previous Chats</h3>
                <button
                  onClick={() => setShowOldChats(false)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  ← Back to chat
                </button>
              </div>
              {loadingOldChats && (
                <div className="flex items-center gap-3 py-4 text-gray-500 text-sm">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                  Loading chats...
                </div>
              )}
              {!loadingOldChats && oldChats.length === 0 && (
                <div className="text-center text-gray-400 py-8">No previous chats yet. Start a new one!</div>
              )}
              <div className="space-y-2">
                {oldChats.map((c: any) => {
                  const userMsgs = (c.messages || []).filter((m: any) => m.role === 'user');
                  const preview = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].content : 'Chat started';
                  const date = new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  return (
                    <button
                      key={c.id}
                      onClick={() => openOldChat(c.id)}
                      className="w-full text-left flex items-center gap-4 p-4 bg-gray-50 border border-gray-100 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-colors"
                    >
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-lg flex-shrink-0">💬</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{preview}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{date} · {c._count?.messages || 0} messages</div>
                      </div>
                      <span className="text-gray-400">→</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {messages.length === 0 && !showOldChats && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-4xl shadow-xl shadow-blue-200 mb-6">
                🤖
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">How can I help you?</h2>
              <p className="text-gray-500 mb-8">Start a new chat or continue a previous one</p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={startNewChat}
                  className="px-8 py-5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-bold text-lg hover:from-blue-600 hover:to-indigo-700 shadow-xl shadow-blue-200 transition-all flex items-center gap-3"
                >
                  <span className="text-2xl">🆕</span> New Chat
                </button>
                <button
                  onClick={loadOldChats}
                  className="px-8 py-5 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl font-bold text-lg hover:border-blue-300 hover:bg-blue-50 shadow-xl shadow-gray-200 transition-all flex items-center gap-3"
                >
                  <span className="text-2xl">📁</span> Previous Chats
                </button>
                <button
                  onClick={startVoiceInput}
                  className="px-8 py-5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 shadow-xl shadow-green-200 transition-all flex items-center gap-3"
                >
                  <span className="text-2xl">🎤</span> Voice Chat
                </button>
              </div>
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
                  {msg.attachment && (
                    <div className="mb-2">
                      {msg.attachment.mimeType.startsWith('image/') ? (
                        <img
                          src={msg.attachment.url}
                          alt={msg.attachment.filename}
                          className="max-h-48 rounded-lg"
                        />
                      ) : (
                        <a
                          href={msg.attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm underline"
                        >
                          📎 {msg.attachment.filename}
                        </a>
                      )}
                    </div>
                  )}
                  {msg.voiceNote ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          if (audioRef.current && audioRef.current.src === msg.audioUrl) {
                            if (audioRef.current.paused) audioRef.current.play();
                            else audioRef.current.pause();
                          } else {
                            if (audioRef.current) { audioRef.current.src = msg.audioUrl || ''; audioRef.current.play(); }
                          }
                        }}
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-lg shadow-md hover:scale-105 transition-transform"
                        title="Play voice reply"
                      >
                        ▶
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-8 h-2 bg-blue-200 rounded-full overflow-hidden">
                            <div className="h-full w-full bg-blue-500 rounded-full animate-pulse"></div>
                          </div>
                          <span className="text-xs text-gray-500 font-medium">Voice reply</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5 px-1">
                  <p className={`text-xs ${msg.role === 'user' ? 'text-right text-gray-400 flex-1' : 'text-gray-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {msg.role === 'assistant' && !msg.voiceNote && (
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

          {pendingAttachment && (
            <div className="mb-3 flex items-center gap-3 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-xl">
              <span className="text-sm font-medium text-indigo-700">📎 {pendingAttachment.filename}</span>
              <button
                onClick={() => setPendingAttachment(null)}
                className="ml-auto text-sm text-indigo-500 hover:text-indigo-700 font-medium"
              >
                Remove
              </button>
            </div>
          )}

          {uploading && (
            <div className="mb-3 flex items-center gap-3 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-600">Uploading file...</span>
            </div>
          )}

          <div className="flex items-end gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.docx,.doc,.txt,.md,.csv,.json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || uploading}
              title="Attach file (image, PDF, DOCX, TXT)"
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 shrink-0"
            >
              📎
            </button>
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
              disabled={(!input.trim() && !pendingAttachment) || loading || uploading}
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
      <audio ref={audioRef} style={{ display: 'none' }} controls={false} onEnded={() => setIsSpeaking(false)} />
    </div>
  );
}
