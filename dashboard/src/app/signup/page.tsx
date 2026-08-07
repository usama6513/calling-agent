'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://backend-seven-chi-71.vercel.app';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'manager' | 'agent'>('manager');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState(true);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkUsers = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/users/exists`);
        const data = await res.json();
        if (data.success) setIsFirstUser(!data.data.exists);
      } catch {
        // default to first-user mode if can't check
      } finally {
        setChecking(false);
      }
    };
    checkUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Signup failed');
      }
      router.push('/login?registered=1');
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center text-4xl shadow-2xl shadow-blue-500/30 mb-4">
            🤖
          </div>
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="text-slate-400 mt-2">
            {checking
              ? 'Checking setup...'
              : isFirstUser
              ? 'Set up your admin account to get started'
              : 'Admin access required to create users'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-300">
              {error}
            </div>
          )}

          {!checking && !isFirstUser && (
            <div className="mb-4 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-300">
              This system already has users. You can still create a Manager or AI Agent account below. Admin
              accounts are never created through signup.
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 bg-slate-900/60 border border-white/10 rounded-xl text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-3 bg-slate-900/60 border border-white/10 rounded-xl text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-4 py-3 bg-slate-900/60 border border-white/10 rounded-xl text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-4 py-3 bg-slate-900/60 border border-white/10 rounded-xl text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Account Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('manager')}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    role === 'manager'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                      : 'border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="text-lg mb-1">👔</div>
                  <div className="text-sm font-semibold">Manager</div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('agent')}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    role === 'agent'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                      : 'border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="text-lg mb-1">🤖</div>
                  <div className="text-sm font-semibold">AI Agent</div>
                </button>
              </div>
              <div className="mt-2 p-3 bg-slate-900/60 border border-white/10 rounded-xl text-xs text-slate-400 space-y-2">
                {role === 'manager' ? (
                  <>
                    <p><span className="text-slate-200 font-medium">Manager</span> — customers ke saath chat karta hai, apne banaye hue AI agents ko manage kar sakta hai, analytics dekh sakta hai. Pre-built agents ko change/delete nahi kar sakta.</p>
                    <p className="text-slate-500">Example: woh apni business ka naya agent bana kar usay customers ke liye deploy kar sakta hai.</p>
                  </>
                ) : (
                  <>
                    <p><span className="text-slate-200 font-medium">AI Agent</span> — sirf chat karta hai aur conversations dekhta hai. Koi agent create/change/delete nahi kar sakta.</p>
                    <p className="text-slate-500">Example: woh pre-built agents ke saath customer chats handle kar sakta hai.</p>
                  </>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 transition-all"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
