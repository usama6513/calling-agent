const { Client } = require('pg');
const c = new Client({ connectionString: process.env.PGURL, ssl: { rejectUnauthorized: false } });
const sqls = [
  `CREATE TABLE IF NOT EXISTS "SecurityExercise" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT,
    "score" INTEGER NOT NULL,
    "attacks" JSONB NOT NULL,
    "defenses" JSONB NOT NULL,
    "triggeredBy" TEXT NOT NULL DEFAULT 'cron',
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecurityExercise_pkey" PRIMARY KEY ("id")
  )`,
  'CREATE INDEX IF NOT EXISTS "SecurityExercise_status_idx" ON "SecurityExercise"("status")',
  'CREATE INDEX IF NOT EXISTS "SecurityExercise_createdAt_idx" ON "SecurityExercise"("createdAt")'
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
