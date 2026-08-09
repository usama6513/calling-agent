const prisma = require('../config/db');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// ---------------------------------------------------------------------------
// Real-time threat detection + auto-blocking.
// Every request passes through ThreatService.check(); suspicious requests are
// logged as AttackEvent, and IPs that cross a detection threshold are blocked
// for a window. Blocked IPs are rejected with 403.
// ---------------------------------------------------------------------------

const WINDOW_MS = 10 * 60 * 1000;      // count detections within this window
const THRESHOLD = 5;                   // detections needed to block
const BLOCK_MS = 15 * 60 * 1000;       // how long an IP stays blocked

const ALERT_EMAIL_USER = process.env.ALERT_EMAIL_USER || '';
const ALERT_EMAIL_PASS = process.env.ALERT_EMAIL_PASS || '';
const ALERT_EMAIL_TO = process.env.ALERT_EMAIL_TO || '';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://dashboard-alpha-two-89.vercel.app';

function now() {
  return Date.now();
}

// Attack signature sets. Severity: high = direct exploitation attempt,
// medium = payload injection, low = scanning / recon.
const SIGNATURES = [
  {
    type: 'sqli',
    severity: 'high',
    patterns: [
      /\b(or|and)\s+['\"]?\s*1\s*=\s*1\b/i,
      /\bunion\s+(all\s+)?select\b/i,
      /['\"]\s*or\s*['\"][^'\"]*['\"]\s*=\s*['\"]/i,
      /--\s*-|;[\s]*#/,
      /;\s*(drop|truncate|alter)\s+table/i,
      /\b(pg_)?sleep\s*\(/i,
      /\b1\s*=\s*1\s*--/,
    ],
  },
  {
    type: 'xss',
    severity: 'medium',
    patterns: [
      /<script[\s>]/i,
      /javascript\s*:/i,
      /on(error|load|click)\s*=/i,
      /document\.cookie/i,
      /<iframe[\s>]/i,
    ],
  },
  {
    type: 'traversal',
    severity: 'high',
    patterns: [
      /\.\.\/(\.\.\/)*/,
      /\.\.%2[fF]/,
      /%2[eE]%2[eE]/,
      /etc\/passwd/i,
    ],
  },
  {
    type: 'no_sql',
    severity: 'medium',
    patterns: [
      /\$where\b/i,
      /\$ne\b/i,
      /\$gt\b/i,
      /\$regex\b/i,
    ],
  },
  {
    type: 'cmd_injection',
    severity: 'high',
    patterns: [
      /[;|&][\s]*(ls|whoami|id|cat|wget|curl|rm|ping|nslookup)\b/i,
      /\$\([\w\s`]+\)/,
      /`\w+`/,
    ],
  },
  {
    type: 'scanning',
    severity: 'low',
    patterns: [
      /(wp-admin|wp-login|phpmyadmin|\.env|\.git\/|\.aws|\.ssh|\.bak|admin\.php|\.sql\b)/i,
    ],
  },
];

const SCANNER_UA = /sqlmap|nikto|nmap|dirbuster|gobuster|masscan|zgrab|nessus|acunetix|burpsuite|fuzz|wpscan/i;

// Bodies of these routes carry free-form customer/AI text — scanning them would
// produce false positives (e.g. a user typing "<script>" in chat).
const SKIP_BODY_PREFIXES = ['/api/chat', '/api/voice', '/api/tts', '/api/webhook'];

function collectStrings(value, out, depth) {
  if (value === null || value === undefined) return;
  if (depth > 4) return;
  if (typeof value === 'string') {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, out, depth + 1);
  } else if (typeof value === 'object') {
    for (const k of Object.keys(value)) {
      out.push(k);
      collectStrings(value[k], out, depth + 1);
    }
  }
}

function detect(req, ip) {
  const haystacks = [];
  haystacks.push(`PATH:${req.path}`);
  if (req.query) {
    for (const v of Object.values(req.query)) collectStrings(v, haystacks, 0);
  }
  const skipBody = SKIP_BODY_PREFIXES.some((p) => req.path.startsWith(p));
  if (!skipBody && req.body) {
    for (const v of Object.values(req.body)) collectStrings(v, haystacks, 0);
  }

  const ua = req.headers['user-agent'] || '';
  const joined = haystacks.join('\n');

  for (const sig of SIGNATURES) {
    for (const re of sig.patterns) {
      const m = re.exec(joined);
      if (m) {
        return {
          type: sig.type,
          severity: sig.severity,
          payload: m[0].length > 200 ? m[0].slice(0, 200) : m[0],
        };
      }
    }
  }

  if (SCANNER_UA.test(ua)) {
    return { type: 'scanning', severity: 'low', payload: ua.slice(0, 120) };
  }

  return null;
}

// Number of detections for this IP within the sliding window. Reads from the
// persisted AttackEvent table so it stays accurate across serverless instances
// (Vercel recycles function instances and distributes requests between them).
async function detectionCount(ip) {
  try {
    return await prisma.attackEvent.count({
      where: { ip, action: 'logged', createdAt: { gte: new Date(now() - WINDOW_MS) } },
    });
  } catch (e) {
    return 0;
  }
}

async function insertEvent({ ip, type, severity, method, path, payload, userAgent, action }) {
  try {
    return await prisma.attackEvent.create({
      data: {
        id: crypto.randomUUID(),
        ip,
        type,
        severity,
        method,
        path: String(path).slice(0, 200),
        payload: payload ? String(payload).slice(0, 500) : null,
        userAgent: userAgent ? String(userAgent).slice(0, 200) : null,
        action,
      },
    });
  } catch (e) {
    console.error('AttackEvent insert failed:', e.message);
    return null;
  }
}

async function isBlocked(ip) {
  try {
    const rec = await prisma.blockedIp.findUnique({ where: { ip } });
    if (!rec) return false;
    if (rec.expiresAt.getTime() <= now()) {
      await prisma.blockedIp.delete({ where: { id: rec.id } }).catch(() => {});
      return false;
    }
    return true;
  } catch (e) {
    return false; // never fail a request because of a threat check
  }
}

async function blockIp(ip, reason, severity) {
  try {
    const expiresAt = new Date(now() + BLOCK_MS);
    await prisma.blockedIp.upsert({
      where: { ip },
      update: { reason, severity, expiresAt },
      create: { id: crypto.randomUUID(), ip, reason, severity, expiresAt },
    });
    await insertEvent({
      ip, type: 'blocked_ip', severity: 'high', method: 'AUTO', path: '/', payload: reason, userAgent: null, action: 'blocked',
    });
    sendBlockAlert(ip, reason, severity, expiresAt);
    return true;
  } catch (e) {
    console.error('Block IP failed:', e.message);
    return false;
  }
}

function sendBlockAlert(ip, reason, severity, expiresAt) {
  if (!ALERT_EMAIL_USER || !ALERT_EMAIL_PASS || !ALERT_EMAIL_TO) return;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: ALERT_EMAIL_USER, pass: ALERT_EMAIL_PASS },
  });
  transporter
    .sendMail({
      from: `"Security Agent" <${ALERT_EMAIL_USER}>`,
      to: ALERT_EMAIL_TO,
      subject: `🚨 [Calling Agent] IP blocked (${severity}) — ${ip}`,
      html: `<div style="font-family:Arial,sans-serif;background:#f6f8fa;padding:20px">
        <div style="max-width:560px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #ddd">
          <div style="background:#dc2626;color:#fff;padding:16px 20px"><h2 style="margin:0">🚨 IP Auto-Blocked</h2></div>
          <div style="padding:20px;font-size:14px">
            <p><b>IP:</b> ${ip}</p>
            <p><b>Severity:</b> ${severity}</p>
            <p><b>Reason:</b> ${reason}</p>
            <p><b>Blocked until:</b> ${expiresAt.toISOString()}</p>
            <p style="margin-top:16px"><a href="${DASHBOARD_URL}/security" style="color:#1d4ed8">View live threats</a></p>
          </div>
        </div>
      </div>`,
    })
    .catch((e) => console.error('Block alert email failed:', e.message));
}

// Entry point used by the middleware. Returns true if the request should be
// rejected (IP blocked). Detections are logged; crossing the threshold blocks.
async function check(req, ip) {
  if (await isBlocked(ip)) {
    return true;
  }

  const hit = detect(req, ip);
  if (hit) {
    await insertEvent({
      ip, type: hit.type, severity: hit.severity,
      method: req.method, path: req.path, payload: hit.payload,
      userAgent: req.headers['user-agent'] || '', action: 'logged',
    });
    const count = await detectionCount(ip);
    if (count >= THRESHOLD) {
      await blockIp(ip, `${hit.type} detection (${count} in ${WINDOW_MS / 60000} min)`, hit.severity);
    }
  }

  return false;
}

// Admin helpers ----------------------------------------------------------

async function getThreats(limit = 50) {
  return prisma.attackEvent.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
}

async function getBlocked(limit = 100) {
  return prisma.blockedIp.findMany({ where: { expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' }, take: limit });
}

async function unblock(id) {
  return prisma.blockedIp.delete({ where: { id } });
}

module.exports = { check, getThreats, getBlocked, unblock, isBlocked, blockIp };
