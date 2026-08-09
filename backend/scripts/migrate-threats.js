const { Client } = require('pg');
const c = new Client({ connectionString: process.env.PGURL, ssl: { rejectUnauthorized: false } });
const sqls = [
  `CREATE TABLE IF NOT EXISTS "AttackEvent" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "payload" TEXT,
    "userAgent" TEXT,
    "action" TEXT NOT NULL DEFAULT 'logged',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttackEvent_pkey" PRIMARY KEY ("id")
  )`,
  'CREATE INDEX IF NOT EXISTS "AttackEvent_ip_idx" ON "AttackEvent"("ip")',
  'CREATE INDEX IF NOT EXISTS "AttackEvent_createdAt_idx" ON "AttackEvent"("createdAt")',
  `CREATE TABLE IF NOT EXISTS "BlockedIp" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlockedIp_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BlockedIp_ip_key" UNIQUE ("ip")
  )`,
  'CREATE INDEX IF NOT EXISTS "BlockedIp_expiresAt_idx" ON "BlockedIp"("expiresAt")'
];
(async () => {
  await c.connect();
  for (const s of sqls) {
    try { await c.query(s); console.log('OK:', s.slice(0, 55)); }
    catch (e) { console.log('SKIP:', e.message.slice(0, 90)); }
  }
  await c.end();
  console.log('DONE');
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
