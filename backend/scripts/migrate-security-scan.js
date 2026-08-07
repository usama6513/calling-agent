const { Client } = require('pg');
const c = new Client({ connectionString: process.env.PGURL, ssl: { rejectUnauthorized: false } });
const sqls = [
  `CREATE TABLE IF NOT EXISTS "SecurityScan" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT,
    "checks" JSONB NOT NULL,
    "issues" JSONB NOT NULL,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecurityScan_pkey" PRIMARY KEY ("id")
  )`,
  'CREATE INDEX IF NOT EXISTS "SecurityScan_status_idx" ON "SecurityScan"("status")',
  'CREATE INDEX IF NOT EXISTS "SecurityScan_createdAt_idx" ON "SecurityScan"("createdAt")'
];
(async () => {
  await c.connect();
  for (const s of sqls) {
    try { await c.query(s); console.log('OK:', s.slice(0, 60)); }
    catch (e) { console.log('SKIP:', e.message.slice(0, 90)); }
  }
  await c.end();
  console.log('DONE');
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
