import { Router } from 'express';
import authRoutes from './authRoutes';
import productRoutes from './productRoutes';
import configuratorRoutes from './configuratorRoutes';
import orderRoutes from './orderRoutes';
import paymentRoutes from './paymentRoutes';
import wishlistRoutes from './wishlistRoutes';
import userRoutes from './userRoutes';
import adminRoutes from './adminRoutes';
import contactRoutes from './contactRoutes';
import settingRoutes from './settingRoutes';
import newsletterRoutes from './newsletterRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/configurator', configuratorRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/payment', paymentRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/users', userRoutes);
router.use('/user', userRoutes);
router.use('/admin', adminRoutes);
router.use('/contact', contactRoutes);
router.use('/settings', settingRoutes);
router.use('/newsletter', newsletterRoutes);

export default router;
