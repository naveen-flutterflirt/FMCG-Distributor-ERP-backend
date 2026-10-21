import { Router } from 'express';
import { getDeliveryTrips, createDeliveryTrip } from '../controllers/delivery.controller';

const router = Router();

router.get('/trips', getDeliveryTrips);
router.post('/plan-trip', createDeliveryTrip);

export default router;
