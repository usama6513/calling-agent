'use client';

import { useEffect, useState } from 'react';
import { authFetch, api } from '@/lib/api';
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

interface Attack {
  name: string;
  category: string;
  result: 'blocked' | 'penetrated' | 'inconclusive';
  detail: string;
}

interface Defense {
  name: string;
  ok: boolean;
  detail: string;
  verifiedBy: string;
}

interface Exercise {
  id: string;
  status: string;
  summary: string;
  score: number;
  attacks: Attack[];
  defenses: Defense[];
  triggeredBy: string;
  duration: number;
  createdAt: string;
}

interface ThreatEvent {
  id: string;
  ip: string;
  type: string;
  severity: string;
  method: string;
  path: string;
  payload: string | null;
  action: string;
  createdAt: string;
}

interface BlockedIp {
  id: string;
  ip: string;
  reason: string;
  severity: string;
  expiresAt: string;
  createdAt: string;
}

const severityColors: Record<string, string> = {
  high: 'bg-red-500/10 border-red-500/30 text-red-400',
  medium: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  low: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
};

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

const exStatusColors: Record<string, string> = {
  secure: 'bg-green-500/10 border-green-500/30 text-green-400',
  vulnerable: 'bg-red-500/10 border-red-500/30 text-red-400',
  inconclusive: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
};

const exStatusIcon: Record<string, string> = {
  secure: '🟢',
  vulnerable: '🔴',
  inconclusive: '🟡',
};

const attackIcon: Record<string, string> = {
  blocked: '✅',
  penetrated: '❌',
  inconclusive: '⚠️',
};

export default function SecurityPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exLoading, setExLoading] = useState(true);
  const [exRunning, setExRunning] = useState(false);
  const [exError, setExError] = useState<string | null>(null);

  const [threats, setThreats] = useState<ThreatEvent[]>([]);
  const [blocked, setBlocked] = useState<BlockedIp[]>([]);
  const [threatLoading, setThreatLoading] = useState(true);
  const [threatError, setThreatError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      loadScans();
      loadExercises();
      loadThreats();
    }
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

  async function loadExercises() {
    try {
      const data = await api.security.getExercises(20);
      if (data.success) setExercises(data.data);
    } catch {
      // session expiry handled by authFetch
    } finally {
      setExLoading(false);
    }
  }

  async function runExercise() {
    setExRunning(true);
    setExError(null);
    try {
      const data = await api.security.runExercise('both');
      if (data.success) await loadExercises();
    } catch (e: any) {
      setExError(e?.message || 'Exercise failed to run');
    } finally {
      setExRunning(false);
    }
  }

  async function loadThreats() {
    try {
      const [t, b] = await Promise.all([
        api.security.getThreats(50),
        api.security.getBlocked(100),
      ]);
      if (t.success) setThreats(t.data);
      if (b.success) setBlocked(b.data);
    } catch {
      // session expiry handled by authFetch
    } finally {
      setThreatLoading(false);
    }
  }

  async function unblockIp(id: string) {
    setThreatError(null);
    try {
      await api.security.unblock(id);
      await loadThreats();
    } catch (e: any) {
      setThreatError(e?.message || 'Failed to unblock IP');
    }
  }

  const latest = scans[0];
  const latestEx = exercises[0];
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

          {/* Live Threat Detection */}
          <div className="pt-2">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">🕵️ Live Threat Detection</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Every request is inspected for attack signatures (SQLi, XSS, path traversal, …). IPs that cross a
                  detection threshold are auto-blocked for 15 minutes.
                </p>
              </div>
              <button
                onClick={loadThreats}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-700"
              >
                ↻ Refresh
              </button>
            </div>

            {threatError && (
              <div className="mb-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
                {threatError}
              </div>
            )}

            {threatLoading ? (
              <div className="text-gray-500">Loading live threats…</div>
            ) : blocked.length > 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
                <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/20 text-sm font-bold text-red-600">
                  🚫 {blocked.length} IP{blocked.length === 1 ? '' : 's'} currently blocked
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                        <th className="px-4 py-2">IP</th>
                        <th className="px-4 py-2">Severity</th>
                        <th className="px-4 py-2">Reason</th>
                        <th className="px-4 py-2">Blocked until</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {blocked.map((b) => (
                        <tr key={b.id} className="border-b border-gray-100 last:border-0">
                          <td className="px-4 py-2 font-mono text-gray-800">{b.ip}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${severityColors[b.severity] || severityColors.low}`}>
                              {b.severity}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-gray-600 max-w-md truncate" title={b.reason}>{b.reason}</td>
                          <td className="px-4 py-2 text-gray-600">{new Date(b.expiresAt).toLocaleString()}</td>
                          <td className="px-4 py-2 text-right">
                            <button
                              onClick={() => unblockIp(b.id)}
                              className="text-red-600 hover:text-red-800 text-xs font-medium"
                            >
                              Unblock
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500 mb-4">
                ✅ No IPs currently blocked. The system is monitoring for attacks in real time.
              </div>
            )}

            <h3 className="text-sm font-bold text-gray-700 mb-2">Recent threat events</h3>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {threats.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  No threat events recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                        <th className="px-4 py-2">Time</th>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">Severity</th>
                        <th className="px-4 py-2">Source IP</th>
                        <th className="px-4 py-2">Request</th>
                        <th className="px-4 py-2">Payload</th>
                        <th className="px-4 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {threats.map((t) => (
                        <tr key={t.id} className="border-b border-gray-100 last:border-0 align-top">
                          <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(t.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 font-mono text-xs text-gray-800">{t.type}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${severityColors[t.severity] || severityColors.low}`}>
                              {t.severity}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-mono text-xs text-gray-700">{t.ip}</td>
                          <td className="px-4 py-2 font-mono text-xs text-gray-700">{t.method} {t.path}</td>
                          <td className="px-4 py-2 font-mono text-xs text-red-600 max-w-xs truncate" title={t.payload || ''}>
                            {t.payload || '—'}
                          </td>
                          <td className="px-4 py-2 text-xs">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${t.action === 'blocked' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-gray-500/10 border-gray-500/30 text-gray-500'}`}>
                              {t.action}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Red Team / Blue Team */}
          <div className="pt-2">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">🔴/🔵 Red Team &amp; Blue Team</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Automated offensive drills (red) against live endpoints + defensive verifications (blue). Runs on a
                  schedule and can be triggered manually.
                </p>
              </div>
              <button
                onClick={runExercise}
                disabled={exRunning}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exRunning ? 'Running attack drills…' : '▶ Run Exercise'}
              </button>
            </div>

            {exError && (
              <div className="mb-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
                {exError}
              </div>
            )}

            {exLoading ? (
              <div className="text-gray-500">Loading exercise history…</div>
            ) : latestEx ? (
              <div className={`rounded-2xl border p-6 ${exStatusColors[latestEx.status] || 'bg-slate-500/10 border-slate-500/30 text-slate-400'}`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="text-lg font-bold flex items-center gap-2">
                      <span>{exStatusIcon[latestEx.status]}</span>
                      {latestEx.status.toUpperCase()} — {latestEx.summary}
                    </div>
                    <div className="text-sm mt-1">
                      Last exercise: {new Date(latestEx.createdAt).toLocaleString()} · took {latestEx.duration}ms ·{' '}
                      {latestEx.attacks.length} attacks · {latestEx.defenses.length} defenses · via {latestEx.triggeredBy}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">{latestEx.score}%</div>
                    <div className="text-xs text-gray-500">defense score</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                      🔴 Red Team — attack results
                    </div>
                    <div className="space-y-1.5">
                      {latestEx.attacks.map((a) => (
                        <div key={a.name} className="text-sm flex items-start gap-2">
                          <span>{attackIcon[a.result]}</span>
                          <span className={a.result === 'blocked' ? 'text-gray-700' : a.result === 'penetrated' ? 'text-red-600' : 'text-amber-600'}>
                            <b>{a.name}</b> ({a.category}) — {a.detail}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                      🔵 Blue Team — defense verification
                    </div>
                    <div className="space-y-1.5">
                      {latestEx.defenses.map((d) => (
                        <div key={d.name} className="text-sm flex items-start gap-2">
                          <span>{d.ok ? '✅' : '❌'}</span>
                          <span className={d.ok ? 'text-gray-700' : 'text-red-600'}>
                            <b>{d.name}</b> — {d.detail}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                No exercises yet. Trigger one manually above or wait for the scheduled run.
              </div>
            )}

            {exercises.length > 1 && (
              <div className="mt-4">
                <h3 className="text-sm font-bold text-gray-700 mb-2">Exercise History</h3>
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  {exercises.slice(1).map((ex) => (
                    <div key={ex.id} className="border-b border-gray-100 last:border-0">
                      <button
                        onClick={() => setExpanded(expanded === ex.id ? null : ex.id)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                      >
                        <span className="flex items-center gap-2 text-sm">
                          <span>{exStatusIcon[ex.status]}</span>
                          <span className="font-medium text-gray-800">{ex.status}</span>
                          <span className="text-gray-500">— {ex.summary}</span>
                        </span>
                        <span className="text-xs text-gray-400">
                          {ex.score}% · {new Date(ex.createdAt).toLocaleString()}
                        </span>
                      </button>
                      {expanded === ex.id && (
                        <div className="px-4 pb-4 space-y-1.5">
                          {ex.attacks.map((a) => (
                            <div key={a.name} className="text-sm flex items-start gap-2">
                              <span>{attackIcon[a.result]}</span>
                              <span className="text-gray-600">
                                <b>{a.name}</b> — {a.detail}
                              </span>
                            </div>
                          ))}
                          {ex.defenses.map((d) => (
                            <div key={d.name} className="text-sm flex items-start gap-2">
                              <span>{d.ok ? '✅' : '❌'}</span>
                              <span className="text-gray-600">
                                <b>{d.name}</b> — {d.detail}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
