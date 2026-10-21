import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller';

const router = Router();

// GET /api/settings - Fetch distributor configuration
router.get('/', getSettings);

// PUT /api/settings - Update distributor configuration
router.put('/', updateSettings);

export default router;
