import { Router } from 'express';
import { getProducts, createProduct } from '../controllers/product.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', verifyToken, getProducts);
router.post('/', verifyToken, createProduct);

export default router;
