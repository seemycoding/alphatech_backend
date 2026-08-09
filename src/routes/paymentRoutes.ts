import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { optionalAuth } from '../middlewares/auth';

const router = Router();

router.post('/razorpay/create-order', optionalAuth, PaymentController.createRazorpayOrder);
router.post('/razorpay/verify', optionalAuth, PaymentController.verifyRazorpayPayment);
router.post('/razorpay/webhook', PaymentController.handleRazorpayWebhook);

export default router;
