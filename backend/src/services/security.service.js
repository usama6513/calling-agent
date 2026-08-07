const prisma = require('../config/db');
const nodemailer = require('nodemailer');

const BACKEND_URL = process.env.APP_URL || 'http://localhost:5000';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://dashboard-alpha-two-89.vercel.app';
const WIDGET_URL = process.env.WIDGET_URL || 'https://widget-kappa-puce.vercel.app';

const ALERT_EMAIL_USER = process.env.ALERT_EMAIL_USER || '';
const ALERT_EMAIL_PASS = process.env.ALERT_EMAIL_PASS || '';
const ALERT_EMAIL_TO = process.env.ALERT_EMAIL_TO || '';

// Minimum required env secrets — if placeholder/missing, flag it
const REQUIRED_SECRETS = [
  { key: 'DATABASE_URL', mask: /your_|placeholder/i },
  { key: 'JWT_SECRET', mask: /your_|placeholder/i },
  { key: 'GROQ_API_KEY', mask: /your_|placeholder/i },
  { key: 'GOOGLE_API_KEY', mask: /your_|placeholder/i },
];

async function checkUrl(name, url) {
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    const ok = res.ok || res.status === 404; // 404 = server is up, route missing
    return {
      name, url, ok,
      status: res.status,
      latency: Date.now() - started,
      detail: ok ? `HTTP ${res.status}` : `HTTP ${res.status}`,
    };
  } catch (e) {
    return { name, url, ok: false, status: null, latency: Date.now() - started, detail: e.name === 'AbortError' ? 'Timeout (>15s)' : e.message.slice(0, 80) };
  }
}

async function checkProtectedRoutes() {
  // Business management endpoints MUST require auth. A scan key header is not enough —
  // hitting them without a token should return 401 (or 403 for role checks).
  const routes = [
    { method: 'PUT', url: `${BACKEND_URL}/api/business/c343c2c4-395b-4c80-bace-9abe0cc7f18b`, expectNot: [200] },
    { method: 'POST', url: `${BACKEND_URL}/api/business`, expectNot: [200, 201] },
    { method: 'DELETE', url: `${BACKEND_URL}/api/business/c343c2c4-395b-4c80-bace-9abe0cc7f18b`, expectNot: [200] },
  ];
  const results = [];
  for (const r of routes) {
    const started = Date.now();
    try {
      const res = await fetch(r.url, { method: r.method, headers: { 'Content-Type': 'application/json' } });
      const ok = !r.expectNot.includes(res.status);
      results.push({
        name: `${r.method} ${r.url.replace(BACKEND_URL, '')}`,
        ok,
        status: res.status,
        latency: Date.now() - started,
        detail: ok ? `Unauthenticated correctly rejected (HTTP ${res.status})` : `UNPROTECTED — returned HTTP ${res.status}`,
      });
    } catch (e) {
      results.push({ name: `${r.method} ${r.url.replace(BACKEND_URL, '')}`, ok: false, status: null, latency: Date.now() - started, detail: 'Request failed: ' + e.message.slice(0, 80) });
    }
  }
  return results;
}

async function checkDb() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const count = await prisma.securityScan.count();
    return { name: 'Database (Neon)', ok: true, latency: Date.now() - started, detail: `Query OK, ${count} scans stored` };
  } catch (e) {
    return { name: 'Database (Neon)', ok: false, latency: Date.now() - started, detail: e.message.slice(0, 80) };
  }
}

async function checkBotAbuse() {
  // Spike detection: messages in the last hour vs the previous hour
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  try {
    const [recent, prior] = await Promise.all([
      prisma.message.count({ where: { createdAt: { gte: hourAgo } } }),
      prisma.message.count({ where: { createdAt: { gte: twoHoursAgo, lt: hourAgo } } }),
    ]);
    const spike = prior > 50 && recent > prior * 5;
    return {
      name: 'Bot/abuse spike detection',
      ok: !spike,
      detail: spike
        ? `Suspicious spike: ${recent} messages in last hour vs ${prior} previous hour`
        : `Normal volume: ${recent} messages last hour (prev: ${prior})`,
    };
  } catch (e) {
    return { name: 'Bot/abuse spike detection', ok: false, detail: e.message.slice(0, 80) };
  }
}

async function checkSecrets() {
  const results = [];
  for (const s of REQUIRED_SECRETS) {
    const val = process.env[s.key] || '';
    const isPlaceholder = !val || s.mask.test(val);
    results.push({
      name: `Env: ${s.key}`,
      ok: !isPlaceholder,
      detail: isPlaceholder ? `${s.key} is missing or placeholder` : 'Set',
    });
  }
  return results;
}

async function checkRateLimits() {
  // Verify login rate limiter actually triggers (expect 429 after many attempts)
  // Send 6 rapid login attempts; at least one should be throttled.
  let gotThrottled = false;
  let lastStatus = null;
  for (let i = 0; i < 6; i++) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `ratelimit-scan-${i}@test.com`, password: 'wrong' }),
      });
      lastStatus = res.status;
      if (res.status === 429) { gotThrottled = true; break; }
    } catch (e) {
      lastStatus = 0;
    }
  }
  return {
    name: 'Login rate limiter',
    ok: gotThrottled,
    detail: gotThrottled ? 'Rate limiter blocked rapid attempts (HTTP 429)' : `Rate limiter did not trigger (last status ${lastStatus})`,
  };
}

function classify(checks) {
  const critical = checks.filter((c) => !c.ok && /UNPROTECTED|missing or placeholder|not trigger/i.test(c.detail || ''));
  const failed = checks.filter((c) => !c.ok);
  const issues = checks.filter((c) => !c.ok).map((c) => ({ check: c.name, detail: c.detail }));
  if (critical.length > 0) return { status: 'critical', summary: `${critical.length} critical security issue(s)`, issues };
  if (failed.length > 0) return { status: 'warning', summary: `${failed.length} check(s) need attention`, issues };
  return { status: 'healthy', summary: 'All systems healthy', issues: [] };
}

async function runScan() {
  const started = Date.now();
  const checks = [
    await checkUrl('Backend API', BACKEND_URL.replace(/\/$/, '') + '/health'),
    await checkUrl('Dashboard', DASHBOARD_URL),
    await checkUrl('Widget', WIDGET_URL),
    ...(await checkProtectedRoutes()),
    await checkDb(),
    await checkBotAbuse(),
    ...(await checkSecrets()),
    await checkRateLimits(),
  ];

  const { status, summary, issues } = classify(checks);
  const duration = Date.now() - started;

  const scan = await prisma.securityScan.create({
    data: { status, summary, checks, issues, duration },
  });

  // Alert on anything but healthy — but always send if previous scan was healthy and now warning/critical
  const shouldAlert = status !== 'healthy';
  if (shouldAlert && ALERT_EMAIL_USER && ALERT_EMAIL_PASS && ALERT_EMAIL_TO) {
    await sendAlertEmail(scan, checks);
  }

  return scan;
}

function emailTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: ALERT_EMAIL_USER, pass: ALERT_EMAIL_PASS },
  });
}

function buildEmailHtml(scan, checks) {
  const rows = checks.map((c) => {
    const icon = c.ok ? '✅' : '❌';
    const color = c.ok ? '#16a34a' : '#dc2626';
    return `<tr style="border-bottom:1px solid #eee">
      <td style="padding:8px;color:${color}">${icon} <b>${c.name}</b></td>
      <td style="padding:8px;color:#555">${c.detail || ''}</td>
    </tr>`;
  }).join('');
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f6f8fa;padding:20px">
    <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #ddd">
      <div style="background:${scan.status === 'critical' ? '#dc2626' : '#d97706'};color:#fff;padding:16px 20px">
        <h2 style="margin:0">🚨 Security Alert — ${scan.status.toUpperCase()}</h2>
        <p style="margin:4px 0 0;opacity:.9">${scan.summary} · ${new Date().toISOString()}</p>
      </div>
      <div style="padding:20px">
        <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
        <p style="margin-top:20px;color:#999;font-size:12px">Automated hourly scan · Calling Agent · <a href="${DASHBOARD_URL}/security">View dashboard</a></p>
      </div>
    </div>
  </body></html>`;
}

async function sendAlertEmail(scan, checks) {
  try {
    const transporter = emailTransport();
    await transporter.sendMail({
      from: `"Security Agent" <${ALERT_EMAIL_USER}>`,
      to: ALERT_EMAIL_TO,
      subject: `[Calling Agent] ${scan.status.toUpperCase()} — ${scan.summary}`,
      html: buildEmailHtml(scan, checks),
    });
  } catch (e) {
    console.error('Email send failed:', e.message);
  }
}

async function getRecentScans(limit = 20) {
  return prisma.securityScan.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
}

module.exports = { runScan, getRecentScans };
