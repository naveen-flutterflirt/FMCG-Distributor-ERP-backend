import { Router } from 'express';
import { getOrders, createOrder, bulkBillOrders } from '../controllers/order.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', verifyToken, getOrders);
router.post('/', verifyToken, createOrder);
router.post('/bulk-bill', verifyToken, bulkBillOrders);

export default router;
