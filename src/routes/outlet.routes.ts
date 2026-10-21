import { Router } from 'express';
import { getOutlets, createOutlet } from '../controllers/outlet.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', verifyToken, getOutlets);
router.post('/', verifyToken, createOutlet);

export default router;
