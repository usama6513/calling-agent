const { Client } = require('pg');
const c = new Client({ connectionString: process.env.PGURL, ssl: { rejectUnauthorized: false } });
const sqls = [
  `CREATE TABLE IF NOT EXISTS "BankAccount" (
    "id" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "accountType" TEXT NOT NULL DEFAULT 'savings',
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "BankAccount_accountNumber_key" ON "BankAccount"("accountNumber")`,
  `CREATE TABLE IF NOT EXISTS "BankTransaction" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
  )`,
  'CREATE INDEX IF NOT EXISTS "BankTransaction_accountId_idx" ON "BankTransaction"("accountId")',
  'CREATE INDEX IF NOT EXISTS "BankTransaction_createdAt_idx" ON "BankTransaction"("createdAt")',
  `ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE`
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
