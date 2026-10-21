import { Router } from 'express';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  completeGRN,
} from '../controllers/purchase.controller';

const router = Router();

router.get('/', getPurchaseOrders);
router.post('/create-po', createPurchaseOrder);
router.post('/complete-grn', completeGRN);

export default router;
