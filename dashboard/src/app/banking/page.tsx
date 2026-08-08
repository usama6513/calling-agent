'use client';

import { useEffect, useState } from 'react';
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

type ModalState = null | 'create' | 'deposit' | 'withdraw' | 'transfer';

export default function BankingPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [txns, setTxns] = useState<BankTransaction[]>([]);
  const [selected, setSelected] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState<any>({});
  const [txnLimit, setTxnLimit] = useState(10);

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
  }, []);

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

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏦 Digital Banking</h1>
          <p className="text-sm text-gray-500 mt-1">
            Customer accounts, balances, deposits, withdrawals and transfers. The bank's AI agent performs these
            operations in chat — this panel is the admin view.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal('create')} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
            + New Account
          </button>
          <button onClick={() => setModal('transfer')} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700">
            ⟷ Transfer
          </button>
        </div>
      </div>

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
                Open the business chat widget and ask the AI: “check balance of CA-1421-8463-7130” or “transfer 5000
                from CA-1421-8463-7130 to CA-0946-6912-4375”.
              </p>
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
