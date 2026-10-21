import { Router } from 'express';
import { getSalesmen, createSalesman } from '../controllers/salesman.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', verifyToken, getSalesmen);
router.post('/', verifyToken, createSalesman);

export default router;
