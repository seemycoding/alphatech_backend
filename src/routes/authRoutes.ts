import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.get('/me', requireAuth, AuthController.getMe);
router.post('/register-request', AuthController.requestRegisterOtp);
router.post('/register-verify', AuthController.verifyRegisterOtp);
router.post('/login', AuthController.login);
router.post('/forgot-password', AuthController.requestForgotPasswordOtp);
router.post('/reset-password', AuthController.resetPasswordWithOtp);
router.post('/send-otp', AuthController.sendOtp);
router.post('/verify-login-otp', AuthController.verifyLoginOtp);

export default router;
