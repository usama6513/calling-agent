/**
 * Calling Agent - Website Chat Widget
 * 
 * Usage: Add this script to your website:
 * <script src="widget.js" 
 *   data-business-id="YOUR_BUSINESS_ID"
 *   data-widget-key="YOUR_WIDGET_KEY"
 *   data-theme="blue"
 *   data-position="bottom-right"
 *   data-language="auto"
 * </script>
 *
 * data-widget-key (from the dashboard: Business → widget key) authorizes the
 * widget to load chat history. Without it, history access is denied.
 */

(function() {
  'use strict';

  let configElement = document.querySelector('script[data-business-id]');

  const CONFIG = {
    businessId: configElement?.getAttribute('data-business-id') || 'c343c2c4-395b-4c80-bace-9abe0cc7f18b',
    widgetKey: configElement?.getAttribute('data-widget-key') || '',
    theme: configElement?.getAttribute('data-theme') || 'blue',
    position: configElement?.getAttribute('data-position') || 'bottom-right',
    apiUrl: configElement?.getAttribute('data-api-url') || 'https://backend-seven-chi-71.vercel.app',
    title: configElement?.getAttribute('data-title') || 'Chat with us',
    subtitle: configElement?.getAttribute('data-subtitle') || 'We typically reply in a few seconds',
    placeholder: configElement?.getAttribute('data-placeholder') || 'Type your message...',
    greeting: configElement?.getAttribute('data-greeting') || 'Hello! How can I help you today?',
  };

  let conversationId = null;
  const storageKey = 'ca-conversation-' + CONFIG.businessId;
  try {
    conversationId = localStorage.getItem(storageKey);
  } catch (e) { /* localStorage unavailable */ }
  function saveConversationId(id) {
    conversationId = id;
    try {
      if (id) localStorage.setItem(storageKey, id);
    } catch (e) { /* ignore */ }
  }
  let isOpen = false;
  let pendingAttachment = null;
  let isRecording = false;
  let mediaRecorder = null;
  let audioChunks = [];
  let mediaStream = null;

  const themeColors = {
    blue: { primary: '#2563eb', hover: '#1d4ed8', light: '#eff6ff', gradient: 'linear-gradient(135deg, #2563eb, #4f46e5)' },
    green: { primary: '#16a34a', hover: '#15803d', light: '#f0fdf4', gradient: 'linear-gradient(135deg, #16a34a, #059669)' },
    purple: { primary: '#9333ea', hover: '#7e22ce', light: '#faf5ff', gradient: 'linear-gradient(135deg, #9333ea, #7c3aed)' },
    red: { primary: '#dc2626', hover: '#b91c1c', light: '#fef2f2', gradient: 'linear-gradient(135deg, #dc2626, #e11d48)' },
  };

  const colors = themeColors[CONFIG.theme] || themeColors.blue;

  function createStyles() {
    const style = document.createElement('style');
    style.id = 'ca-widget-styles';
    if (document.getElementById('ca-widget-styles')) return;

    style.textContent = `
      .ca-widget-container {
        position: fixed;
        ${CONFIG.position.includes('right') ? 'right' : 'left'}: 20px;
        ${CONFIG.position.includes('top') ? 'top' : 'bottom'}: 20px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .ca-chat-button {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: ${colors.gradient};
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
        font-size: 26px;
      }

      .ca-chat-button:hover {
        transform: scale(1.1);
        box-shadow: 0 12px 32px rgba(0,0,0,0.3);
      }

      .ca-chat-window {
        position: absolute;
        ${CONFIG.position.includes('right') ? 'right' : 'left'}: 0;
        ${CONFIG.position.includes('top') ? 'top' : 'bottom'}: 76px;
        width: 380px;
        height: 540px;
        background: white;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        display: none;
        flex-direction: column;
        overflow: hidden;
        animation: ca-slide-in 0.3s ease;
      }

      .ca-chat-window.ca-open {
        display: flex;
      }

      @keyframes ca-slide-in {
        from { opacity: 0; transform: translateY(20px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      .ca-chat-header {
        background: ${colors.gradient};
        color: white;
        padding: 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .ca-chat-header-info h3 {
        margin: 0;
        font-size: 17px;
        font-weight: 700;
      }

      .ca-chat-header-info p {
        margin: 4px 0 0;
        font-size: 12px;
        opacity: 0.9;
      }

      .ca-close-btn {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 6px 10px;
        border-radius: 8px;
        transition: background 0.2s;
      }

      .ca-new-chat-btn {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        font-size: 13px;
        cursor: pointer;
        padding: 6px 10px;
        border-radius: 8px;
        transition: background 0.2s;
        margin-right: 8px;
        white-space: nowrap;
      }

      .ca-new-chat-btn:hover {
        background: rgba(255,255,255,0.35);
      }

      .ca-close-btn:hover {
        background: rgba(255,255,255,0.3);
      }

      .ca-header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .ca-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        background: #f8fafc;
      }

      .ca-message {
        max-width: 80%;
        padding: 12px 16px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.5;
        word-wrap: break-word;
        animation: ca-msg-in 0.2s ease;
      }

      @keyframes ca-msg-in {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .ca-message.ca-bot {
        background: white;
        color: #333;
        align-self: flex-start;
        border-bottom-left-radius: 4px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        border: 1px solid #e2e8f0;
      }

      .ca-message.ca-user {
        background: ${colors.primary};
        color: white;
        align-self: flex-end;
        border-bottom-right-radius: 4px;
      }

      .ca-message.ca-voice {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
      }

      .ca-voice-play {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: ${colors.gradient};
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        transition: transform 0.2s;
      }

      .ca-voice-play:hover {
        transform: scale(1.08);
      }

      .ca-voice-wave {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 3px;
        height: 20px;
      }

      .ca-voice-wave span {
        width: 3px;
        border-radius: 2px;
        background: ${colors.primary};
        height: 6px;
      }

      .ca-voice-label {
        font-size: 11px;
        color: #64748b;
        margin-left: 4px;
      }

      .ca-mic-btn {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        transition: transform 0.2s, background 0.2s;
        background: transparent;
        color: #64748b;
      }

      .ca-mic-btn:hover {
        background: #f1f5f9;
        transform: scale(1.05);
      }

      .ca-mic-btn.ca-recording {
        background: #ef4444;
        color: white;
        animation: ca-pulse 1s infinite;
      }

      @keyframes ca-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
        50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
      }

      .ca-message.ca-typing {
        background: white;
        color: #666;
        align-self: flex-start;
        border-bottom-left-radius: 4px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        border: 1px solid #e2e8f0;
      }

      .ca-typing-dots {
        display: flex;
        gap: 4px;
        padding: 4px 0;
      }

      .ca-typing-dots span {
        width: 8px;
        height: 8px;
        background: #94a3b8;
        border-radius: 50%;
        animation: ca-bounce 1.4s infinite;
      }

      .ca-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
      .ca-typing-dots span:nth-child(3) { animation-delay: 0.4s; }

      @keyframes ca-bounce {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-6px); }
      }

      .ca-chat-input-area {
        padding: 12px 16px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        gap: 8px;
        align-items: flex-end;
        background: white;
      }

      .ca-chat-input-area input {
        flex: 1;
        padding: 12px 16px;
        border: 2px solid #e2e8f0;
        border-radius: 24px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
      }

      .ca-chat-input-area input:focus {
        border-color: ${colors.primary};
      }

      .ca-send-btn {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: ${colors.gradient};
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s, box-shadow 0.2s;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-size: 18px;
      }

      .ca-send-btn:hover {
        transform: scale(1.05);
      }

      .ca-attach-btn {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: transparent;
        color: #64748b;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s, background 0.2s;
        font-size: 18px;
      }

      .ca-attach-btn:hover {
        background: #f1f5f9;
        transform: scale(1.05);
      }

      .ca-send-btn:disabled {
        background: #cbd5e1;
        box-shadow: none;
        cursor: not-allowed;
        transform: none;
      }

      .ca-powered-by {
        text-align: center;
        padding: 6px;
        font-size: 10px;
        color: #94a3b8;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
      }

      .ca-home-screen {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .ca-home-screen.ca-hidden {
        display: none;
      }

      .ca-home-hero {
        text-align: center;
        padding: 24px 20px 8px;
      }

      .ca-home-hero .ca-home-icon {
        font-size: 42px;
        margin-bottom: 8px;
      }

      .ca-home-hero h3 {
        margin: 0;
        font-size: 18px;
        color: #1e293b;
      }

      .ca-home-hero p {
        margin: 6px 0 0;
        font-size: 13px;
        color: #64748b;
      }

      .ca-home-actions {
        padding: 16px 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .ca-home-new-chat {
        padding: 14px;
        border: none;
        border-radius: 14px;
        background: ${colors.gradient};
        color: white;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        box-shadow: 0 6px 18px rgba(0,0,0,0.15);
      }

      .ca-home-new-chat:hover {
        transform: scale(1.02);
      }

      .ca-home-old-chat {
        padding: 14px;
        border: 2px solid #e2e8f0;
        border-radius: 14px;
        background: white;
        color: ${colors.primary};
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s, border-color 0.2s;
      }

      .ca-home-old-chat:hover {
        background: #f1f5f9;
        border-color: ${colors.primary};
      }

      .ca-history-list {
        flex: 1;
        overflow-y: auto;
        padding: 0 20px 16px;
      }

      .ca-history-title {
        font-size: 13px;
        font-weight: 700;
        color: #475569;
        padding: 10px 0 6px;
      }

      .ca-history-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        margin-bottom: 8px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        cursor: pointer;
        transition: background 0.2s, border-color 0.2s;
      }

      .ca-history-item:hover {
        background: #eef2ff;
        border-color: ${colors.primary};
      }

      .ca-history-item .ca-hi-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: ${colors.light};
        color: ${colors.primary};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        flex-shrink: 0;
      }

      .ca-history-item .ca-hi-text {
        flex: 1;
        min-width: 0;
      }

      .ca-history-item .ca-hi-text .ca-hi-preview {
        font-size: 13px;
        color: #334155;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .ca-history-item .ca-hi-text .ca-hi-meta {
        font-size: 11px;
        color: #94a3b8;
        margin-top: 2px;
      }

      .ca-history-empty {
        text-align: center;
        color: #94a3b8;
        font-size: 13px;
        padding: 24px 0;
      }

      .ca-history-loading {
        text-align: center;
        color: #94a3b8;
        font-size: 13px;
        padding: 24px 0;
      }

      .ca-home-back {
        align-self: flex-start;
        background: none;
        border: none;
        color: ${colors.primary};
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        padding: 8px 20px;
      }

      .ca-history-back {
        align-self: flex-start;
        background: none;
        border: none;
        color: ${colors.primary};
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        padding: 10px 20px;
      }

      .ca-chat-messages.ca-hidden,
      .ca-chat-input-area.ca-hidden {
        display: none;
      }
    `;
    document.head.appendChild(style);
  }

  function createWidget() {
    if (document.getElementById('ca-widget-container')) return;

    const container = document.createElement('div');
    container.className = 'ca-widget-container';
    container.id = 'ca-widget-container';

    container.innerHTML = `
      <button class="ca-chat-button" id="ca-toggle" aria-label="Open chat">💬</button>
      <div class="ca-chat-window" id="ca-window">
        <div class="ca-chat-header">
          <div class="ca-chat-header-info">
            <h3>${CONFIG.title}</h3>
            <p>${CONFIG.subtitle}</p>
          </div>
          <div class="ca-header-actions">
            <button class="ca-new-chat-btn" id="ca-new-chat" aria-label="Start new chat">🔄 New Chat</button>
            <button class="ca-close-btn" id="ca-close" aria-label="Close chat">✕</button>
          </div>
        </div>
        <div class="ca-chat-messages" id="ca-messages">
          <div class="ca-message ca-bot">${CONFIG.greeting}</div>
        </div>
        <div class="ca-home-screen" id="ca-home-screen">
          <div class="ca-home-hero">
            <div class="ca-home-icon">🤖</div>
            <h3>${CONFIG.title}</h3>
            <p>${CONFIG.subtitle}</p>
          </div>
          <div class="ca-home-actions">
            <button class="ca-home-new-chat" id="ca-home-new">🆕 New Chat</button>
            <button class="ca-home-old-chat" id="ca-home-old">📁 Previous Chats</button>
          </div>
          <div class="ca-history-list" id="ca-history-list" style="display:none"></div>
        </div>
        <div class="ca-chat-input-area">
          <button class="ca-attach-btn" id="ca-attach" aria-label="Attach file">📎</button>
          <input type="text" id="ca-input" placeholder="${CONFIG.placeholder}" autocomplete="off" />
          <button class="ca-mic-btn" id="ca-mic" aria-label="Voice message">🎤</button>
          <button class="ca-send-btn" id="ca-send" aria-label="Send message">➤</button>
          <input type="file" id="ca-file" accept="image/*,.pdf,.docx,.doc,.txt,.md,.csv,.json" style="display:none" />
        </div>
        <div class="ca-powered-by">Powered by AI Calling Agent</div>
        <audio id="ca-audio" style="display:none"></audio>
      </div>
    `;

    document.body.appendChild(container);

    document.getElementById('ca-toggle').addEventListener('click', toggleChat);
    document.getElementById('ca-close').addEventListener('click', toggleChat);
    document.getElementById('ca-new-chat').addEventListener('click', startNewChat);
    document.getElementById('ca-home-new').addEventListener('click', startNewChat);
    document.getElementById('ca-home-old').addEventListener('click', showHistory);
    document.getElementById('ca-send').addEventListener('click', sendMessage);
    document.getElementById('ca-mic').addEventListener('click', toggleVoiceInput);
    document.getElementById('ca-attach').addEventListener('click', () => {
      document.getElementById('ca-file').click();
    });
    document.getElementById('ca-file').addEventListener('change', handleFileSelect);
    document.getElementById('ca-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  function toggleChat() {
    isOpen = !isOpen;
    const chatWindow = document.getElementById('ca-window');
    const button = document.getElementById('ca-toggle');

    if (isOpen) {
      chatWindow.classList.add('ca-open');
      button.innerHTML = '✕';
      showHome();
      document.getElementById('ca-input').focus();
    } else {
      chatWindow.classList.remove('ca-open');
      button.innerHTML = '💬';
    }
  }

  function showHome() {
    document.getElementById('ca-home-screen').classList.remove('ca-hidden');
    document.getElementById('ca-messages').classList.add('ca-hidden');
    document.getElementById('ca-chat-input-area').classList.add('ca-hidden');
  }

  function showChat() {
    document.getElementById('ca-home-screen').classList.add('ca-hidden');
    document.getElementById('ca-messages').classList.remove('ca-hidden');
    document.getElementById('ca-chat-input-area').classList.remove('ca-hidden');
  }

  function startNewChat() {
    saveConversationId(null);
    try {
      localStorage.removeItem(storageKey);
    } catch (e) { /* ignore */ }
    const messages = document.getElementById('ca-messages');
    messages.innerHTML = `<div class="ca-message ca-bot">${CONFIG.greeting}</div>`;
    pendingAttachment = null;
    document.getElementById('ca-input').value = '';
    showChat();
    document.getElementById('ca-input').focus();
  }

  async function showHistory() {
    const home = document.getElementById('ca-home-screen');
    const actions = home.querySelector('.ca-home-actions');
    const list = document.getElementById('ca-history-list');
    const hero = home.querySelector('.ca-home-hero');

    actions.style.display = 'none';
    hero.style.display = 'none';
    list.style.display = 'block';
    list.innerHTML = '<div class="ca-history-back" id="ca-history-back">← Back</div><div class="ca-history-loading">Loading your chats...</div>';

    document.getElementById('ca-history-back').addEventListener('click', () => {
      actions.style.display = 'flex';
      hero.style.display = 'block';
      list.style.display = 'none';
      list.innerHTML = '';
    });

    try {
      const headers = CONFIG.widgetKey ? { 'x-widget-key': CONFIG.widgetKey } : {};
      const res = await fetch(`${CONFIG.apiUrl}/api/conversations/${CONFIG.businessId}?limit=10`, { headers });
      const data = await res.json();
      const convos = data.data || [];
      list.innerHTML = '<div class="ca-history-back" id="ca-history-back">← Back</div>';

      document.getElementById('ca-history-back').addEventListener('click', () => {
        actions.style.display = 'flex';
        hero.style.display = 'block';
        list.style.display = 'none';
        list.innerHTML = '';
      });

      const webConvos = convos.filter((c) => c.channel === 'web');

      if (webConvos.length === 0) {
        list.insertAdjacentHTML('beforeend', '<div class="ca-history-empty">No previous chats yet. Start a new one!</div>');
        return;
      }

      webConvos.forEach((c) => {
        const userMsgs = (c.messages || []).filter((m) => m.role === 'user');
        const preview = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].content : 'Chat started';
        const date = new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const msgCount = c._count?.messages || 0;

        const item = document.createElement('div');
        item.className = 'ca-history-item';
        item.innerHTML = `
          <div class="ca-hi-icon">💬</div>
          <div class="ca-hi-text">
            <div class="ca-hi-preview">${escapeHtml(preview)}</div>
            <div class="ca-hi-meta">${date} · ${msgCount} messages</div>
          </div>
        `;
        item.addEventListener('click', () => openOldChat(c.id));
        list.appendChild(item);
      });
    } catch (error) {
      list.insertAdjacentHTML('beforeend', '<div class="ca-history-empty">Could not load chats. Please try again.</div>');
      console.error('[Calling Agent Widget] History error:', error);
    }
  }

  async function openOldChat(convoId) {
    try {
      const headers = CONFIG.widgetKey ? { 'x-widget-key': CONFIG.widgetKey } : {};
      const res = await fetch(`${CONFIG.apiUrl}/api/conversations/detail/${convoId}`, { headers });
      const data = await res.json();
      if (!data.success || !data.data) {
        alert('Could not load this chat.');
        return;
      }
      saveConversationId(convoId);
      const messages = document.getElementById('ca-messages');
      messages.innerHTML = '';
      (data.data.messages || []).forEach((m) => {
        addMessage(m.content, m.role === 'user');
      });
      pendingAttachment = null;
      document.getElementById('ca-input').value = '';
      showChat();
      document.getElementById('ca-input').focus();
    } catch (error) {
      alert('Could not load this chat. Please try again.');
      console.error('[Calling Agent Widget] Open old chat error:', error);
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function addMessage(text, isUser = false) {
    const messages = document.getElementById('ca-messages');
    const msg = document.createElement('div');
    msg.className = `ca-message ${isUser ? 'ca-user' : 'ca-bot'}`;
    msg.textContent = text;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
    return msg;
  }

  function addVoiceNote(audioUrl) {
    const messages = document.getElementById('ca-messages');
    const msg = document.createElement('div');
    msg.className = 'ca-message ca-bot ca-voice';
    msg.innerHTML = `
      <button class="ca-voice-play" title="Play">▶</button>
      <div class="ca-voice-wave">
        <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
      </div>
      <span class="ca-voice-label">Voice reply</span>
    `;
    const audio = document.getElementById('ca-audio');
    const playBtn = msg.querySelector('.ca-voice-play');
    const isPlaying = () => !audio.paused && audio.src === audioUrl;
    playBtn.addEventListener('click', () => {
      if (isPlaying()) {
        audio.pause();
        playBtn.textContent = '▶';
      } else {
        audio.src = audioUrl;
        audio.play();
        playBtn.textContent = '⏸';
        audio.onended = () => { playBtn.textContent = '▶'; };
      }
    });
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
    return msg;
  }

  async function toggleVoiceInput() {
    const micBtn = document.getElementById('ca-mic');
    if (isRecording) {
      mediaRecorder?.state === 'recording' && mediaRecorder.stop();
      isRecording = false;
      micBtn.classList.remove('ca-recording');
      micBtn.textContent = '🎤';
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      addMessage('Voice recording is not supported in this browser. Use Chrome, Edge, or Firefox.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStream = stream;
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        if (blob.size > 0) await sendVoiceMessage(blob);
      };
      mediaRecorder.start();
      isRecording = true;
      micBtn.classList.add('ca-recording');
      micBtn.textContent = '⏹';
    } catch {
      addMessage('Microphone access was denied.');
    }
  }

  async function transcribeAudio(blob) {
    const formData = new FormData();
    formData.append('audio', blob, 'voice.webm');
    const res = await fetch(`${CONFIG.apiUrl}/api/voice/transcribe`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!data.success || !data.data?.text) throw new Error('Transcription failed');
    return data.data.text;
  }

  async function synthesizeAudio(text) {
    const res = await fetch(`${CONFIG.apiUrl}/api/voice/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('Synthesis failed');
    return URL.createObjectURL(await res.blob());
  }

  async function sendVoiceMessage(blob) {
    const sendBtn = document.getElementById('ca-send');
    sendBtn.disabled = true;
    try {
      const transcript = await transcribeAudio(blob);
      if (!transcript.trim()) {
        addMessage('Sorry, I could not hear you. Please try again.');
        sendBtn.disabled = false;
        return;
      }
      addMessage('🎤 ' + transcript, true);
      showTyping();
      const response = await fetch(`${CONFIG.apiUrl}/api/chat/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: CONFIG.businessId,
          conversationId: conversationId,
          speechInput: transcript,
          channel: 'voice',
          gender: 'male',
        }),
      });
      const data = await response.json();
      removeTyping();
      if (data.success && data.data) {
        saveConversationId(data.data.conversationId);
        try {
          const audioUrl = await synthesizeAudio(data.data.message);
          addVoiceNote(audioUrl);
          document.getElementById('ca-audio').play();
        } catch {
          addMessage(data.data.message);
        }
      } else {
        addMessage('Sorry, I encountered an error. Please try again.');
      }
    } catch (error) {
      removeTyping();
      addMessage('Sorry, I could not process your voice message.');
      console.error('[Calling Agent Widget] Voice error:', error);
    }
    sendBtn.disabled = false;
  }

  function showTyping() {
    const messages = document.getElementById('ca-messages');
    const typing = document.createElement('div');
    typing.className = 'ca-message ca-typing';
    typing.id = 'ca-typing';
    typing.innerHTML = '<div class="ca-typing-dots"><span></span><span></span><span></span></div>';
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;
  }

  function removeTyping() {
    const typing = document.getElementById('ca-typing');
    if (typing) typing.remove();
  }

  async function handleFileSelect(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    try {
      let convoId = conversationId;
      if (!convoId) {
        const convoRes = await fetch(`${CONFIG.apiUrl}/api/chat/ensure-conversation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: CONFIG.businessId, channel: 'web' }),
        });
        const convoData = await convoRes.json();
        convoId = convoData.data?.conversationId;
        saveConversationId(convoId);
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', convoId);
      const res = await fetch(`${CONFIG.apiUrl}/api/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        pendingAttachment = data.data;
        addMessage('📎 Attached: ' + file.name, true);
      } else {
        addMessage('Upload failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      addMessage('Could not upload the file. Please try again.');
      console.error('[Calling Agent Widget] Upload error:', error);
    }
  }

  async function speakTextReply(text) {
    try {
      const audio = document.getElementById('ca-audio');
      if (!audio) return;
      audio.src = `${CONFIG.apiUrl}/api/voice/synthesize?text=${encodeURIComponent(text)}`;
      const tryPlay = (muted) => {
        if (muted) audio.muted = true;
        audio.play().then(function () {
          if (muted) setTimeout(function () { audio.muted = false; }, 100);
        }).catch(function () {
          if (!muted) tryPlay(true);
          else {
            audio.muted = false;
            if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(text.replace(/[*_`#]/g, ''));
              utterance.lang = /[\u0600-\u06FF]/.test(text) ? 'ur-PK' : 'en-US';
              utterance.rate = 1.1;
              window.speechSynthesis.speak(utterance);
            }
          }
        });
      };
      tryPlay(false);
    } catch (error) {
      console.warn('[Calling Agent Widget] Server TTS failed, using browser TTS:', error.message);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.replace(/[*_`#]/g, ''));
        utterance.lang = /[\u0600-\u06FF]/.test(text) ? 'ur-PK' : 'en-US';
        utterance.rate = 1.1;
        window.speechSynthesis.speak(utterance);
      }
    }
  }

  async function sendMessage() {
    const input = document.getElementById('ca-input');
    const text = input.value.trim();
    if (!text && !pendingAttachment) return;

    addMessage(text, true);
    input.value = '';

    const sendBtn = document.getElementById('ca-send');
    sendBtn.disabled = true;

    showTyping();

    try {
      const response = await fetch(`${CONFIG.apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: CONFIG.businessId,
          conversationId: conversationId,
          message: text,
          channel: 'web',
          attachmentId: pendingAttachment ? pendingAttachment.id : undefined,
        }),
      });

      const data = await response.json();

      removeTyping();
      pendingAttachment = null;

      if (data.success && data.data) {
        saveConversationId(data.data.conversationId);
        addMessage(data.data.message);
        speakTextReply(data.data.message);
      } else {
        addMessage('Sorry, I encountered an error. Please try again.');
      }
    } catch (error) {
      removeTyping();
      pendingAttachment = null;
      addMessage('Sorry, I could not connect to the server. Please check your connection and try again.');
      console.error('[Calling Agent Widget] Error:', error);
    }

    sendBtn.disabled = false;
    input.focus();
  }

  function init() {
    createStyles();
    createWidget();
    const unlock = function () {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          var ctx = new AC();
          var silent = ctx.createBufferSource();
          silent.buffer = ctx.createBuffer(1, 1, 22050);
          silent.connect(ctx.destination);
          silent.start(0);
          ctx.resume().then(function () { ctx.close(); }).catch(function () {});
        }
      } catch (e) {}
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('touchstart', unlock);
    document.addEventListener('keydown', unlock);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
