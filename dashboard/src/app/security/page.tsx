'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

interface Scan {
  id: string;
  status: string;
  summary: string;
  checks: Check[];
  issues: { check: string; detail: string }[];
  duration: number;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  healthy: 'bg-green-500/10 border-green-500/30 text-green-400',
  warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  critical: 'bg-red-500/10 border-red-500/30 text-red-400',
};

const statusIcon: Record<string, string> = {
  healthy: '🟢',
  warning: '🟡',
  critical: '🔴',
};

export default function SecurityPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) loadScans();
  }, [isAdmin]);

  async function loadScans() {
    try {
      const data = await authFetch('/api/security/scans?limit=24');
      if (data.success) setScans(data.data);
    } catch {
      // session expiry handled by authFetch
    } finally {
      setLoading(false);
    }
  }

  const latest = scans[0];
  const passRate = latest
    ? Math.round((latest.checks.filter((c) => c.ok).length / latest.checks.length) * 100)
    : 0;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🛡️ Security Monitor</h1>
        <p className="text-sm text-gray-500 mt-1">
          Hourly automated scan of the whole system — uptime, route protection, rate limits, database, bot abuse.
        </p>
      </div>

      {!isAdmin ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-amber-400">
          Security reports are visible to admins only.
        </div>
      ) : loading ? (
        <div className="text-gray-500">Loading scan history…</div>
      ) : scans.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          No scans yet. The hourly security agent will produce its first report soon — or trigger one manually from the
          repo's Actions tab.
        </div>
      ) : (
        <>
          {/* Latest summary */}
          <div className={`rounded-2xl border p-6 ${statusColors[latest.status] || 'bg-slate-500/10 border-slate-500/30 text-slate-400'}`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-lg font-bold flex items-center gap-2">
                  <span>{statusIcon[latest.status]}</span>
                  {latest.status.toUpperCase()} — {latest.summary}
                </div>
                <div className="text-sm mt-1">
                  Last scan: {new Date(latest.createdAt).toLocaleString()} · took {latest.duration}ms · {latest.checks.length} checks
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{passRate}%</div>
                <div className="text-xs text-gray-500">pass rate</div>
              </div>
            </div>

            {latest.issues.length > 0 && (
              <div className="mt-4 space-y-2">
                {latest.issues.map((iss, i) => (
                  <div key={i} className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm">
                    <b>{iss.check}:</b> {iss.detail}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
              {latest.checks.map((c) => (
                <div key={c.name} className="flex items-start gap-2 text-sm">
                  <span>{c.ok ? '✅' : '❌'}</span>
                  <span className={c.ok ? 'text-gray-700' : 'text-red-600'}>
                    <b>{c.name}</b> — {c.detail}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Scan History</h2>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {scans.map((scan) => (
                <div key={scan.id} className="border-b border-gray-100 last:border-0">
                  <button
                    onClick={() => setExpanded(expanded === scan.id ? null : scan.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <span>{statusIcon[scan.status]}</span>
                      <span className="font-medium text-gray-800">{scan.status}</span>
                      <span className="text-gray-500">— {scan.summary}</span>
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(scan.createdAt).toLocaleString()}
                    </span>
                  </button>
                  {expanded === scan.id && (
                    <div className="px-4 pb-4 space-y-1.5">
                      {scan.checks.map((c) => (
                        <div key={c.name} className="text-sm flex items-start gap-2">
                          <span>{c.ok ? '✅' : '❌'}</span>
                          <span className={c.ok ? 'text-gray-600' : 'text-red-600'}>
                            <b>{c.name}</b> — {c.detail}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
