import { Router } from 'express';
import { getAccountsSummary, createExpense, addBankAccount, exportTallyXml } from '../controllers/accounts.controller';

const router = Router();

// GET /api/accounts/summary - Live financial metrics & P&L
router.get('/summary', getAccountsSummary);

// POST /api/accounts/expenses - Record operational expense voucher
router.post('/expenses', createExpense);

// POST /api/accounts/banks - Add new bank account to ledger
router.post('/banks', addBankAccount);

// GET /api/accounts/export-tally - Download real Tally XML vouchers
router.get('/export-tally', exportTallyXml);

export default router;
