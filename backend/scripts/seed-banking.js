// Demo banking data seeder. Run: node scripts/seed-banking.js
// Clears existing bank data and creates 2 demo accounts with a realistic transaction history.
const prisma = require('../src/config/db');
const BankingService = require('../src/services/banking.service');

async function main() {
  console.log('Clearing existing bank data...');
  await prisma.bankTransaction.deleteMany({});
  await prisma.bankAccount.deleteMany({});

  console.log('Creating demo accounts...');
  const a1 = await BankingService.openAccount({
    customerName: 'Ahmed Raza',
    customerPhone: '+923001234567',
    customerEmail: 'ahmed.raza@example.com',
    accountType: 'savings',
    initialDeposit: 50000,
    currency: 'PKR',
  });
  const a2 = await BankingService.openAccount({
    customerName: 'Fatima Noor',
    customerPhone: '+923009876543',
    customerEmail: 'fatima.noor@example.com',
    accountType: 'current',
    initialDeposit: 25000,
    currency: 'PKR',
  });

  const acc1 = a1.account.accountNumber;
  const acc2 = a2.account.accountNumber;
  console.log(`Account 1 (Ahmed Raza): ${acc1}`);
  console.log(`Account 2 (Fatima Noor): ${acc2}`);

  console.log('Seeding transaction history...');
  await BankingService.deposit(acc1, 45000, 'Salary deposit');
  await BankingService.withdraw(acc1, 8000, 'ATM withdrawal');
  await BankingService.transfer(acc1, acc2, 12000, 'Rent payment');
  await BankingService.deposit(acc1, 3000, 'Cash deposit');
  await BankingService.withdraw(acc1, 1500, 'POS payment');
  await BankingService.deposit(acc2, 18000, 'Freelance payment');
  await BankingService.transfer(acc2, acc1, 2500, 'Shared dinner split');
  await BankingService.withdraw(acc2, 4000, 'Utility bill');

  const txns = await prisma.bankTransaction.findMany({ orderBy: { balanceAfter: 'asc' } });
  const daysAgo = txns.length;
  for (let i = 0; i < txns.length; i++) {
    const createdAt = new Date(Date.now() - (daysAgo - i) * 5 * 60 * 60 * 1000);
    await prisma.bankTransaction.update({ where: { id: txns[i].id }, data: { createdAt } });
  }

  console.log('Seed complete.');
  console.log(`Ahmed Raza balance: Rs ${(await BankingService.getBalance(acc1)).balance.toLocaleString()}`);
  console.log(`Fatima Noor balance: Rs ${(await BankingService.getBalance(acc2)).balance.toLocaleString()}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
