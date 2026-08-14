import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { requireAuth, requireAdmin } from '../middlewares/auth';

const router = Router();

// Apply Auth and Admin checks for all /api/admin routes
router.use(requireAuth, requireAdmin);

// Dashboard
router.get('/dashboard', AdminController.getDashboardStats);

// Products CRUD
router.get('/products', AdminController.getProducts);
router.post('/products', AdminController.createProduct);
router.put('/products/:id', AdminController.updateProduct);
router.delete('/products/:id', AdminController.deleteProduct);

// Categories CRUD
router.get('/categories', AdminController.getCategories);
router.post('/categories', AdminController.createCategory);
router.put('/categories/:id', AdminController.updateCategory);
router.delete('/categories/:id', AdminController.deleteCategory);

// Users
router.get('/users', AdminController.getUsers);

// Orders & Stages
router.get('/orders', AdminController.getOrders);
router.put('/orders/:id/status', AdminController.updateOrderStatus);

// Payments
router.get('/payments', AdminController.getPayments);

// Coupons CRUD
router.get('/coupons', AdminController.getCoupons);
router.post('/coupons', AdminController.createCoupon);
router.put('/coupons/:id', AdminController.updateCoupon);
router.delete('/coupons/:id', AdminController.deleteCoupon);

// Offers & Flash Banners CRUD
router.get('/offers', AdminController.getOffers);
router.post('/offers', AdminController.createOffer);
router.put('/offers/:id', AdminController.updateOffer);
router.delete('/offers/:id', AdminController.deleteOffer);

// Site Settings
router.get('/settings', AdminController.getSettings);
router.put('/settings', AdminController.updateSettings);

export default router;
