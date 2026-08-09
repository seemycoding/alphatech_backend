import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);

router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfile);
router.post('/addresses', UserController.addAddress);
router.delete('/addresses/:addressId', UserController.deleteAddress);

export default router;
