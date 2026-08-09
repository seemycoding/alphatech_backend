import { Router } from 'express';
import { WishlistController } from '../controllers/wishlistController';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);

router.get('/', WishlistController.getWishlist);
router.post('/toggle', WishlistController.toggleWishlist);
router.post('/sync', WishlistController.syncGuestWishlist);

export default router;
