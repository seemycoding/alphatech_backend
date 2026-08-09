import { Router } from 'express';
import { OrderController } from '../controllers/orderController';
import { requireAuth, optionalAuth } from '../middlewares/auth';

const router = Router();

router.post('/calculate-summary', OrderController.calculateSummary);
router.post('/', optionalAuth, OrderController.createOrder);
router.get('/user', requireAuth, OrderController.getUserOrders);
router.get('/:orderNumber', OrderController.getOrder);
router.get('/:orderNumber/invoice', OrderController.getInvoicePdf);

export default router;
