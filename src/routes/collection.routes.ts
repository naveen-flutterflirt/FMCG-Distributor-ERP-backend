import { Router } from 'express';
import { getCollections, recordPayment } from '../controllers/collection.controller';

const router = Router();

router.get('/', getCollections);
router.post('/record', recordPayment);

export default router;
