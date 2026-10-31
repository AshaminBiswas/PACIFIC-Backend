import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { branchLedgerController } from './branchLedger.controller';

const router = Router();

// Require authenticated session for branch ledger operations
router.use(requireAuth);

// Branch management endpoints
router.get('/branches', branchLedgerController.getBranches);
router.post('/branches', branchLedgerController.createBranch);
router.get('/branches/:id', branchLedgerController.getBranchById);
router.put('/branches/:id', branchLedgerController.updateBranch);
router.patch('/branches/:id', branchLedgerController.updateBranch);

// Transaction & Ledger endpoints
router.get('/transactions', branchLedgerController.getTransactions);
router.post('/transactions', branchLedgerController.createTransaction);
router.get('/transactions/:id', branchLedgerController.getTransactionById);
router.put('/transactions/:id', branchLedgerController.updateTransaction);
router.patch('/transactions/:id', branchLedgerController.updateTransaction);
router.delete('/transactions/:id', branchLedgerController.deleteTransaction);

// Summary & PDF report endpoints
router.get('/summary', branchLedgerController.getSummary);
router.get('/pdf', branchLedgerController.getPdf);

export default router;
