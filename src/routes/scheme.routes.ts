import { Router } from 'express';
import { getSchemes, createScheme } from '../controllers/scheme.controller';

const router = Router();

router.get('/', getSchemes);
router.post('/', createScheme);

export default router;
