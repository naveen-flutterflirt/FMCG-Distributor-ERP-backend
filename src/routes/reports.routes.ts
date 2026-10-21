import { Router } from 'express';
import { getReportsDashboard, getReportPreview, exportReportFile } from '../controllers/reports.controller';

const router = Router();

// GET /api/reports/dashboard - Fetch live 12 KPI matrix
router.get('/dashboard', getReportsDashboard);

// GET /api/reports/preview - Fetch live rows & columns for selected report
router.get('/preview', getReportPreview);

// GET /api/reports/export - Export CSV report
router.get('/export', exportReportFile);

export default router;
