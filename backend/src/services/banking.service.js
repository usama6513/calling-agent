const prisma = require('../config/db');
const crypto = require('crypto');

const ACCOUNT_PREFIX = 'CA';
const MIN_BALANCE = 0;

const TX_OPTIONS = { timeout: 20000, maxWait: 15000 };

function generateAccountNumber() {
  // Format: CA-XXXX-XXXX-XXXX (12 digits)
  let digits;
  do {
    digits = '';
    for (let i = 0; i < 12; i++) digits += Math.floor(Math.random() * 10);
  } while (!digits || parseInt(digits, 10) === 0);
  return `${ACCOUNT_PREFIX}-${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
}

function formatMoney(amount, currency = 'PKR') {
  const sym = currency === 'PKR' ? 'Rs' : currency === 'USD' ? '$' : currency;
  return `${sym} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function normalizeAccountNumber(input) {
  const cleaned = String(input || '').replace(/[\s-]/g, '').toUpperCase();
  if (!/^CA\d{12}$/.test(cleaned)) return cleaned;
  return `CA-${cleaned.slice(2, 6)}-${cleaned.slice(6, 10)}-${cleaned.slice(10)}`;
}

class BankingService {
  static async openAccount({ customerName, customerPhone, customerEmail, accountType = 'savings', initialDeposit = 0, currency = 'PKR' }) {
    if (!customerName) throw new Error('Customer name is required');
    const amount = Number(initialDeposit) || 0;
    if (amount < 0) throw new Error('Initial deposit cannot be negative');

    let accountNumber;
    let retries = 0;
    do {
      accountNumber = generateAccountNumber();
      retries++;
      const existing = await prisma.bankAccount.findUnique({ where: { accountNumber } });
      if (!existing) break;
      if (retries > 5) throw new Error('Could not generate unique account number');
    } while (true);

    const account = await prisma.$transaction(async (tx) => {
      const acc = await tx.bankAccount.create({
        data: {
          accountNumber,
          customerName,
          customerPhone,
          customerEmail,
          accountType,
          balance: amount,
          currency,
        },
      });
      if (amount > 0) {
        await tx.bankTransaction.create({
          data: {
            accountId: acc.id,
            type: 'deposit',
            amount,
            balanceAfter: amount,
            description: 'Initial deposit',
            status: 'completed',
          },
        });
      }
      return acc;
    }, TX_OPTIONS);

    return { account, deposit: amount };
  }

  static async getAccount(accountNumber) {
    const account = await prisma.bankAccount.findUnique({ where: { accountNumber: normalizeAccountNumber(accountNumber) } });
    if (!account) throw new Error('Account not found');
    if (!account.isActive) throw new Error('Account is deactivated');
    return account;
  }

  static async getAccountById(id) {
    return prisma.bankAccount.findUnique({ where: { id } });
  }

  static async getBalance(accountNumber) {
    const account = await this.getAccount(accountNumber);
    return { accountNumber: account.accountNumber, balance: account.balance, currency: account.currency, customerName: account.customerName };
  }

  static async deposit(accountNumber, amount, description = 'Cash deposit') {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) throw new Error('Deposit amount must be greater than zero');
    const account = await this.getAccount(accountNumber);

    const updated = await prisma.$transaction(async (tx) => {
      const acc = await tx.bankAccount.update({
        where: { id: account.id },
        data: { balance: { increment: amountNum } },
      });
      await tx.bankTransaction.create({
        data: {
          accountId: acc.id,
          type: 'deposit',
          amount: amountNum,
          balanceAfter: acc.balance,
          description,
          status: 'completed',
        },
      });
      return acc;
    }, TX_OPTIONS);

    return { accountNumber: account.accountNumber, balance: updated.balance, currency: updated.currency, amount: amountNum };
  }

  static async withdraw(accountNumber, amount, description = 'Cash withdrawal') {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) throw new Error('Withdrawal amount must be greater than zero');
    const account = await this.getAccount(accountNumber);
    if (account.balance < amountNum) {
      throw new Error(`Insufficient balance. Available: ${formatMoney(account.balance, account.currency)}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const acc = await tx.bankAccount.update({
        where: { id: account.id },
        data: { balance: { decrement: amountNum } },
      });
      await tx.bankTransaction.create({
        data: {
          accountId: acc.id,
          type: 'withdraw',
          amount: amountNum,
          balanceAfter: acc.balance,
          description,
          status: 'completed',
        },
      });
      return acc;
    }, TX_OPTIONS);

    return { accountNumber: account.accountNumber, balance: updated.balance, currency: updated.currency, amount: amountNum };
  }

  static async transfer(fromAccountNumber, toAccountNumber, amount, note = '') {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) throw new Error('Transfer amount must be greater than zero');
    const fromNorm = normalizeAccountNumber(fromAccountNumber);
    const toNorm = normalizeAccountNumber(toAccountNumber);
    if (fromNorm === toNorm) throw new Error('Cannot transfer to the same account');

    const from = await this.getAccount(fromNorm);
    const to = await this.getAccount(toNorm);
    if (from.balance < amountNum) {
      throw new Error(`Insufficient balance. Available: ${formatMoney(from.balance, from.currency)}`);
    }

    const result = await prisma.$transaction(async (tx) => {
      const fromUpdated = await tx.bankAccount.update({
        where: { id: from.id },
        data: { balance: { decrement: amountNum } },
      });
      const toUpdated = await tx.bankAccount.update({
        where: { id: to.id },
        data: { balance: { increment: amountNum } },
      });

      const reference = crypto.randomUUID().slice(0, 8).toUpperCase();
      await tx.bankTransaction.create({
        data: {
          accountId: from.id,
          type: 'transfer_out',
          amount: amountNum,
          balanceAfter: fromUpdated.balance,
          description: note ? `Transfer to ${to.accountNumber} — ${note}` : `Transfer to ${to.accountNumber}`,
          reference,
          status: 'completed',
        },
      });
      await tx.bankTransaction.create({
        data: {
          accountId: to.id,
          type: 'transfer_in',
          amount: amountNum,
          balanceAfter: toUpdated.balance,
          description: note ? `Transfer from ${from.accountNumber} — ${note}` : `Transfer from ${from.accountNumber}`,
          reference,
          status: 'completed',
        },
      });

      return { from: fromUpdated, to: toUpdated, reference };
    }, TX_OPTIONS);

    return {
      from: { accountNumber: from.accountNumber, balance: result.from.balance, currency: result.from.currency },
      to: { accountNumber: to.accountNumber, balance: result.to.balance, currency: result.to.currency },
      amount: amountNum,
      reference: result.reference,
    };
  }

  static async getTransactions(accountNumber, limit = 10) {
    const account = await this.getAccount(accountNumber);
    const txns = await prisma.bankTransaction.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50),
    });
    return { accountNumber: account.accountNumber, customerName: account.customerName, transactions: txns };
  }

  static async listAccounts() {
    return prisma.bankAccount.findMany({ orderBy: { createdAt: 'desc' } });
  }

  static async deactivateAccount(accountNumber) {
    const account = await this.getAccount(accountNumber);
    return prisma.bankAccount.update({ where: { id: account.id }, data: { isActive: false } });
  }
}

module.exports = BankingService;
