import { Router } from 'express';
import { handleGlobalSearch } from '../controllers/search.controller';

const router = Router();

router.get('/', handleGlobalSearch);

export default router;
