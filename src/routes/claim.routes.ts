import { Router } from 'express';
import { getClaims, raiseClaim, resolveQuery } from '../controllers/claim.controller';

const router = Router();

router.get('/', getClaims);
router.post('/raise', raiseClaim);
router.post('/resolve-query', resolveQuery);

export default router;
