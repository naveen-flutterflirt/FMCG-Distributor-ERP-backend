import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboard.controller';

const router = Router();

// GET /api/dashboard/stats - Real-time consolidated ERP overview
router.get('/stats', getDashboardStats);

export default router;
