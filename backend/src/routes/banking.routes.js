const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const BankingService = require('../services/banking.service');

function cleanError(e) {
  return e.message || 'Banking operation failed';
}

// --- Admin dashboard endpoints ---
router.get('/accounts', protect, restrictTo('admin', 'manager'), asyncHandler(async (req, res) => {
  const accounts = await BankingService.listAccounts();
  res.json({ success: true, data: accounts });
}));

router.post('/accounts', protect, restrictTo('admin', 'manager'), asyncHandler(async (req, res) => {
  const { customerName, customerPhone, customerEmail, accountType, initialDeposit, currency } = req.body;
  try {
    const result = await BankingService.openAccount({ customerName, customerPhone, customerEmail, accountType, initialDeposit, currency });
    res.status(201).json({ success: true, data: result });
  } catch (e) {
    res.status(400).json({ success: false, error: cleanError(e) });
  }
}));

router.get('/accounts/:accountNumber', protect, restrictTo('admin', 'manager'), asyncHandler(async (req, res) => {
  try {
    const account = await BankingService.getAccount(req.params.accountNumber);
    res.json({ success: true, data: account });
  } catch (e) {
    res.status(404).json({ success: false, error: cleanError(e) });
  }
}));

router.get('/accounts/:accountNumber/transactions', protect, restrictTo('admin', 'manager'), asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  try {
    const result = await BankingService.getTransactions(req.params.accountNumber, limit);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(404).json({ success: false, error: cleanError(e) });
  }
}));

router.post('/accounts/:accountNumber/deposit', protect, restrictTo('admin', 'manager'), asyncHandler(async (req, res) => {
  const { amount, description } = req.body;
  try {
    const result = await BankingService.deposit(req.params.accountNumber, amount, description || 'Cash deposit');
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(400).json({ success: false, error: cleanError(e) });
  }
}));

router.post('/accounts/:accountNumber/withdraw', protect, restrictTo('admin', 'manager'), asyncHandler(async (req, res) => {
  const { amount, description } = req.body;
  try {
    const result = await BankingService.withdraw(req.params.accountNumber, amount, description || 'Cash withdrawal');
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(400).json({ success: false, error: cleanError(e) });
  }
}));

router.post('/transfer', protect, restrictTo('admin', 'manager'), asyncHandler(async (req, res) => {
  const { from, to, amount, note } = req.body;
  try {
    const result = await BankingService.transfer(from, to, amount, note || '');
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(400).json({ success: false, error: cleanError(e) });
  }
}));

module.exports = router;
