import { Router } from 'express';
import { login, getProfile } from '../controllers/auth.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

router.post('/login', login);
router.get('/profile', verifyToken, getProfile);

export default router;
