import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { AdminController } from '../controllers/adminController';
import { requireAdmin } from '../middlewares/auth';

const upload = multer({ dest: path.join(__dirname, '../../uploads/') });
const router = Router();

router.use(requireAdmin);

router.get('/dashboard/stats', AdminController.getDashboardStats);
router.get('/orders', AdminController.getAdminOrders);
router.patch('/orders/:orderId/status', AdminController.updateOrderStatus);
router.post('/products', AdminController.createProduct);
router.post('/ingest-excel', upload.single('file'), AdminController.uploadAndIngestExcel);

export default router;
