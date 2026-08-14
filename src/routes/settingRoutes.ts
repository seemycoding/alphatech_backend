import { Router } from 'express';
import { SettingController } from '../controllers/settingController';

const router = Router();

router.get('/public', SettingController.getPublicSettings);
router.get('/flash-offer', SettingController.getFlashOffer);
router.post('/validate-coupon', SettingController.validateCoupon);

export default router;
