'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface BankAccount {
  id: string;
  accountNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  accountType: string;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

interface BankTransaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  reference: string;
  status: string;
  createdAt: string;
}

interface AgentInfo {
  id: string;
  name: string;
  title: string;
  department: string;
  gender: string;
}

interface InboxMsg {
  role: 'user' | 'assistant';
  content: string;
  agent?: AgentInfo | null;
  ts: string;
}

const AGENT_EMOJI: Record<string, string> = {
  account: '📒',
  transactions: '🧾',
  money: '💵',
  security: '🛡️',
  support: '🎧',
};

const QUICK_PROMPTS: { label: string; text: string }[] = [
  { label: '📒 Balance', text: 'balance check karo CA-0946-6912-4375' },
  { label: '🧾 Stats', text: 'muje stats do k mene kab kitna deposit/withdraw kia or unke types kya he. account CA-0946-6912-4375' },
  { label: '🧾 History', text: 'last transactions dikhao CA-0946-6912-4375' },
  { label: '💵 Deposit', text: '5000 deposit karo CA-0946-6912-4375' },
  { label: '🛡️ Scam', text: 'mujhe scam call aya hai, OTP share kiya' },
  { label: '🎧 Timings', text: 'bank ki timings kya hain?' },
];

type ModalState = null | 'create' | 'deposit' | 'withdraw' | 'transfer';

export default function BankingPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'accounts' | 'inbox'>('accounts');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [txns, setTxns] = useState<BankTransaction[]>([]);
  const [selected, setSelected] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState<any>({});
  const [txnLimit, setTxnLimit] = useState(10);

  // --- Inbox (banking agent chat) state ---
  const [bizId, setBizId] = useState<string | null>(null);
  const [bizName, setBizName] = useState('');
  const [msgs, setMsgs] = useState<InboxMsg[]>([]);
  const [inboxInput, setInboxInput] = useState('');
  const [inboxLoading, setInboxLoading] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [oldChats, setOldChats] = useState<any[]>([]);
  const [showOldChats, setShowOldChats] = useState(false);
  const [loadingOldChats, setLoadingOldChats] = useState(false);
  const inboxEndRef = useRef<HTMLDivElement>(null);
  const INBOX_CHANNEL = 'banking';

  async function load() {
    try {
      const data = await api.banking.listAccounts();
      if (data.success) setAccounts(data.data);
    } catch {
      setError('Could not load accounts.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    api.banking
      .getBusiness()
      .then((d) => {
        if (d.success) {
          setBizId(d.data.id);
          setBizName(d.data.name || 'Digital Bank');
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    inboxEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, showOldChats]);

  async function selectAccount(acc: BankAccount) {
    setSelected(acc);
    try {
      const data = await api.banking.getTransactions(acc.accountNumber, txnLimit);
      if (data.success) setTxns(data.data.transactions);
    } catch {
      setTxns([]);
    }
  }

  async function run(fn: () => Promise<any>, successMsg: string) {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
      setModal(null);
      setForm({});
      alert(successMsg);
    } catch (e: any) {
      setError(e.message || 'Operation failed');
    } finally {
      setBusy(false);
    }
  }

  const createAccount = () =>
    run(
      () => api.banking.createAccount(form),
      'Account created successfully.'
    );

  const doDeposit = () => {
    if (!selected) return;
    run(
      () => api.banking.deposit(selected.accountNumber, Number(form.amount), form.description),
      'Deposit completed.'
    );
  };

  const doWithdraw = () => {
    if (!selected) return;
    run(
      () => api.banking.withdraw(selected.accountNumber, Number(form.amount), form.description),
      'Withdrawal completed.'
    );
  };

  const doTransfer = () =>
    run(
      () => api.banking.transfer(form.from, form.to, Number(form.amount), form.note),
      'Transfer completed.'
    );

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const totalAccounts = accounts.length;

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const inputCls =
    'w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

  // --- Inbox logic ---
  async function ensureConv(): Promise<string | null> {
    if (convId) return convId;
    if (!bizId) return null;
    const d = await api.chat.ensureConversation(bizId, INBOX_CHANNEL);
    if (d.success && d.data?.conversationId) {
      setConvId(d.data.conversationId);
      return d.data.conversationId;
    }
    return null;
  }

  async function sendInbox(text?: string) {
    const message = (text ?? inboxInput).trim();
    if (!message || !bizId || inboxLoading) return;
    setInboxInput('');
    setMsgs((prev) => [...prev, { role: 'user', content: message, ts: new Date().toISOString() }]);
    setInboxLoading(true);
    try {
      const cid = await ensureConv();
      const data = await api.chat.send(bizId, message, cid || undefined, INBOX_CHANNEL);
      if (data.success) {
        setConvId(data.data.conversationId);
        setMsgs((prev) => [...prev, { role: 'assistant', content: data.data.message, agent: data.data.agent || null, ts: new Date().toISOString() }]);
      } else {
        setMsgs((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.', ts: new Date().toISOString() }]);
      }
    } catch {
      setMsgs((prev) => [...prev, { role: 'assistant', content: 'Could not connect to the banking team.', ts: new Date().toISOString() }]);
    }
    setInboxLoading(false);
  }

  async function loadOldChats() {
    if (!bizId) return;
    setShowOldChats(true);
    setLoadingOldChats(true);
    try {
      const data = await api.conversations.getByBusiness(bizId, 1, 20);
      setOldChats((data.data || []).filter((c: any) => c.channel === INBOX_CHANNEL));
    } catch {
      setOldChats([]);
    } finally {
      setLoadingOldChats(false);
    }
  }

  async function openOldChat(convoId: string) {
    setInboxLoading(true);
    try {
      const data = await api.conversations.getById(convoId);
      if (data.success && data.data) {
        const ms: InboxMsg[] = (data.data.messages || []).map((m: any) => ({
          role: m.role,
          content: m.content,
          agent: null,
          ts: m.createdAt || new Date().toISOString(),
        }));
        setMsgs(ms);
        setConvId(convoId);
        setShowOldChats(false);
      }
    } catch {
      alert('Could not load this chat.');
    }
    setInboxLoading(false);
  }

  function startNewInbox() {
    setMsgs([]);
    setConvId(null);
    setShowOldChats(false);
  }

  function agentEmoji(agent: AgentInfo | null | undefined): string {
    return agent ? AGENT_EMOJI[agent.id] || '🤖' : '🤖';
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏦 Digital Banking</h1>
          <p className="text-sm text-gray-500 mt-1">
            Customer accounts, balances, deposits, withdrawals and transfers. The bank's AI agent team performs these
            operations in chat — this panel is the admin view.
          </p>
        </div>
        {tab === 'accounts' && (
          <div className="flex gap-2">
            <button onClick={() => setModal('create')} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
              + New Account
            </button>
            <button onClick={() => setModal('transfer')} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700">
              ⟷ Transfer
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => setTab('accounts')}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === 'accounts' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          💼 Accounts
        </button>
        <button
          onClick={() => setTab('inbox')}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === 'inbox' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          💬 Inbox {bizName ? `— ${bizName}` : ''}
        </button>
      </div>

      {tab === 'accounts' ? (
        <>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-gray-500">Loading accounts…</div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl p-5">
                  <div className="text-sm opacity-80">Total Accounts</div>
                  <div className="text-3xl font-bold mt-1">{totalAccounts}</div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-5">
                  <div className="text-sm opacity-80">Total Deposits (PKR)</div>
                  <div className="text-3xl font-bold mt-1">Rs {totalBalance.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="text-sm text-gray-500">Demo tip</div>
                  <p className="text-xs text-gray-600 mt-2">
                    Open the banking <b>Inbox</b> tab and talk to the agent team: “stats do”, “balance check”, “5000
                    deposit karo”.
                  </p>
                </div>
              </div>

              {/* AI Agent Team — the banking agents live ONLY in this portal; every
                  chat message is routed to one of these officers. */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">🤖 AI Agent Team</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      The banking agent team is active only here — open the <b>Inbox</b> tab to talk to them.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {[
                    { emoji: '📒', name: 'Ahmed', title: 'Account Officer', dept: 'Accounts Dept', ask: '"balance check karo"' },
                    { emoji: '🧾', name: 'Sara', title: 'Statement Officer', dept: 'Records & Statements', ask: '"kitni baar deposit kia, types batao"' },
                    { emoji: '💵', name: 'Bilal', title: 'Cashier / Teller', dept: 'Counter / Cash', ask: '"5000 deposit karo"' },
                    { emoji: '🛡️', name: 'Fatima', title: 'Security Officer', dept: 'Security & Fraud Prevention', ask: '"scam call aya, OTP share kiya"' },
                    { emoji: '🎧', name: 'Ali', title: 'Customer Care', dept: 'Customer Support', ask: '"bank ki timings kya hain?"' },
                  ].map((a) => (
                    <div key={a.name} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="text-2xl">{a.emoji}</div>
                      <div className="font-bold text-gray-900 mt-1">{a.name}</div>
                      <div className="text-xs font-medium text-blue-600">{a.title}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{a.dept}</div>
                      <div className="text-[11px] text-gray-400 mt-2 bg-white rounded-lg border border-gray-200 px-2 py-1">
                        {a.ask}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Accounts + transactions */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                  <h2 className="text-lg font-bold text-gray-900 mb-3">Accounts</h2>
                  <div className="space-y-3">
                    {accounts.map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => selectAccount(acc)}
                        className={`w-full text-left bg-white rounded-2xl border p-4 hover:border-blue-400 transition-colors ${selected?.id === acc.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-gray-900">{acc.customerName}</div>
                            <div className="text-xs text-gray-500 font-mono">{acc.accountNumber}</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {acc.accountType} · {acc.customerPhone || '—'}
                              {!acc.isActive && <span className="ml-2 text-red-500 font-medium">INACTIVE</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-emerald-600">
                              Rs {acc.balance.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400">balance</div>
                          </div>
                        </div>
                        {selected?.id === acc.id && (
                          <div className="mt-3 flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); setSelected(acc); setModal('deposit'); }} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700">Deposit</button>
                            <button onClick={(e) => { e.stopPropagation(); setSelected(acc); setModal('withdraw'); }} className="px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700">Withdraw</button>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <h2 className="text-lg font-bold text-gray-900 mb-3">
                    {selected ? `Transactions — ${selected.customerName}` : 'Transactions'}
                  </h2>
                  {!selected ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-sm text-gray-500">
                      Select an account to view its transaction history.
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
                      {txns.length === 0 && (
                        <div className="p-6 text-center text-sm text-gray-500">No transactions yet.</div>
                      )}
                      {txns.map((t) => (
                        <div key={t.id} className="px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-gray-800 capitalize">
                              {t.type.replace(/_/g, ' ')}
                            </div>
                            <div className={`text-sm font-bold ${t.type === 'deposit' || t.type === 'transfer_in' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {t.type === 'deposit' || t.type === 'transfer_in' ? '+' : '-'}Rs {Math.abs(t.amount).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{t.description}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            {new Date(t.createdAt).toLocaleString()}
                            {t.reference && <span className="ml-2 font-mono">ref: {t.reference}</span>}
                            <span className="ml-2">bal: Rs {t.balanceAfter.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        /* ---------- INBOX: chat with the banking agent team ---------- */
        <div className="bg-white rounded-2xl border border-gray-200 flex flex-col h-[calc(100vh-260px)] min-h-[420px]">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-lg shadow-md">
                🏦
              </div>
              <div>
                <div className="font-bold text-gray-900">Banking Agent Team {bizName ? `— ${bizName}` : ''}</div>
                <div className="text-xs text-gray-500">
                  Sara · Bilal · Ahmed · Fatima · Ali — your message is routed to the right officer
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={loadOldChats} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200">
                📁 Previous Chats
              </button>
              <button onClick={startNewInbox} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200">
                New Chat
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50">
            {showOldChats ? (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">📁 Previous Banking Chats</h3>
                  <button onClick={() => setShowOldChats(false)} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200">
                    ← Back to chat
                  </button>
                </div>
                {loadingOldChats && <div className="text-gray-500 text-sm py-4">Loading chats...</div>}
                {!loadingOldChats && oldChats.length === 0 && (
                  <div className="text-center text-gray-400 py-8">No previous banking chats yet.</div>
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
            ) : msgs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-10">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-4xl shadow-xl shadow-blue-200 mb-5">
                  🏦
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Talk to the Banking Agent Team</h2>
                <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
                  Every message is routed to the right officer — Sara (statement/stats), Bilal (cash), Ahmed (accounts),
                  Fatima (security), Ali (support).
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg w-full">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q.label}
                      onClick={() => sendInbox(q.text)}
                      className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-base shadow-md mt-1 mr-2 shrink-0 ${m.agent ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                      {agentEmoji(m.agent)}
                    </div>
                  )}
                  <div className={`max-w-[75%] ${m.role === 'user' ? 'order-1' : ''}`}>
                    <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                      m.role === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-br-md'
                        : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    </div>
                    <div className={`text-[11px] text-gray-400 mt-1 px-1 ${m.role === 'user' ? 'text-right' : ''}`}>
                      {m.role === 'assistant' && m.agent ? `${m.agent.name} · ${m.agent.title} · ` : ''}
                      {new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {m.role === 'user' && (
                    <div className="w-9 h-9 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex items-center justify-center text-white text-sm shadow-md mt-1 ml-2 shrink-0">
                      👤
                    </div>
                  )}
                </div>
              ))
            )}

            {inboxLoading && (
              <div className="flex justify-start">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-sm shadow-md mt-1 mr-2 shrink-0">🤖</div>
                <div className="bg-white border border-gray-100 px-5 py-3 rounded-2xl rounded-bl-md shadow-sm">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={inboxEndRef} />
          </div>

          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex items-end gap-3">
              <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <textarea
                  value={inboxInput}
                  onChange={(e) => setInboxInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendInbox(); } }}
                  placeholder="Type your message for the banking team... (e.g. stats do, 5000 deposit karo)"
                  rows={1}
                  className="w-full px-4 py-3 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none resize-none"
                  disabled={inboxLoading}
                />
              </div>
              <button
                onClick={() => sendInbox()}
                disabled={!inboxInput.trim() || inboxLoading}
                className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed shadow-lg shadow-blue-200 transition-all shrink-0 text-lg"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {modal === 'create' && 'Open New Account'}
                {modal === 'deposit' && `Deposit — ${selected?.accountNumber}`}
                {modal === 'withdraw' && `Withdraw — ${selected?.accountNumber}`}
                {modal === 'transfer' && 'Transfer Between Accounts'}
              </h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            {modal === 'create' && (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Customer Name *</label>
                  <input className={inputCls} value={form.customerName || ''} onChange={(e) => set('customerName', e.target.value)} placeholder="e.g. Ahmed Raza" />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input className={inputCls} value={form.customerPhone || ''} onChange={(e) => set('customerPhone', e.target.value)} placeholder="+923001234567" />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input className={inputCls} value={form.customerEmail || ''} onChange={(e) => set('customerEmail', e.target.value)} placeholder="customer@example.com" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Account Type</label>
                    <select className={inputCls} value={form.accountType || 'savings'} onChange={(e) => set('accountType', e.target.value)}>
                      <option value="savings">Savings</option>
                      <option value="current">Current</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Initial Deposit (PKR)</label>
                    <input className={inputCls} type="number" value={form.initialDeposit || 0} onChange={(e) => set('initialDeposit', Number(e.target.value))} />
                  </div>
                </div>
                <button onClick={createAccount} disabled={busy || !form.customerName} className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50">
                  {busy ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            )}

            {modal === 'deposit' && (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Amount (PKR) *</label>
                  <input className={inputCls} type="number" value={form.amount || ''} onChange={(e) => set('amount', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Description</label>
                  <input className={inputCls} value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Cash deposit" />
                </div>
                <button onClick={doDeposit} disabled={busy || !form.amount} className="w-full px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                  {busy ? 'Processing…' : 'Deposit'}
                </button>
              </div>
            )}

            {modal === 'withdraw' && (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Amount (PKR) *</label>
                  <input className={inputCls} type="number" value={form.amount || ''} onChange={(e) => set('amount', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Description</label>
                  <input className={inputCls} value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Cash withdrawal" />
                </div>
                <button onClick={doWithdraw} disabled={busy || !form.amount} className="w-full px-4 py-2.5 bg-amber-600 text-white text-sm font-medium rounded-xl hover:bg-amber-700 disabled:opacity-50">
                  {busy ? 'Processing…' : 'Withdraw'}
                </button>
              </div>
            )}

            {modal === 'transfer' && (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>From Account *</label>
                  <select className={inputCls} value={form.from || ''} onChange={(e) => set('from', e.target.value)}>
                    <option value="">Select source account</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.accountNumber}>{a.accountNumber} — {a.customerName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>To Account *</label>
                  <select className={inputCls} value={form.to || ''} onChange={(e) => set('to', e.target.value)}>
                    <option value="">Select recipient account</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.accountNumber}>{a.accountNumber} — {a.customerName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Amount (PKR) *</label>
                  <input className={inputCls} type="number" value={form.amount || ''} onChange={(e) => set('amount', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Note</label>
                  <input className={inputCls} value={form.note || ''} onChange={(e) => set('note', e.target.value)} />
                </div>
                <button onClick={doTransfer} disabled={busy || !form.from || !form.to || !form.amount} className="w-full px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50">
                  {busy ? 'Processing…' : 'Transfer'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
