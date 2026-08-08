const { Client } = require('pg');
const crypto = require('crypto');
const c = new Client({ connectionString: process.env.PGURL, ssl: { rejectUnauthorized: false } });

function genKey() {
  return 'wk-' + crypto.randomBytes(12).toString('hex');
}

(async () => {
  await c.connect();
  try {
    await c.query('ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "widgetKey" TEXT');
    console.log('OK: widgetKey column added');
  } catch (e) {
    console.log('SKIP:', e.message.slice(0, 90));
  }
  // Backfill any businesses that do not have a key yet
  const r = await c.query('SELECT id, "widgetKey" FROM "Business" WHERE "widgetKey" IS NULL OR "widgetKey" = \'\'');
  for (const row of r.rows) {
    await c.query('UPDATE "Business" SET "widgetKey" = $1 WHERE id = $2', [genKey(), row.id]);
    console.log('backfilled:', row.id);
  }
  console.log('backfilled count:', r.rowCount);
  await c.end();
  console.log('DONE');
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
