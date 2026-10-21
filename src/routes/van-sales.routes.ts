import { Router } from 'express';
import { getVanSettlements, closeVanSettlement } from '../controllers/van-sales.controller';

const router = Router();

router.get('/', getVanSettlements);
router.post('/close', closeVanSettlement);

export default router;
