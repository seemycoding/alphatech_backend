import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/db';
import { AdminController } from '../controllers/adminController';
import { requireAuth, requireAdmin } from '../middlewares/auth';

const router = Router();

function resolveTargetFolder(categoryName: string, brandName?: string, ramType?: string, productName?: string): string {
  const cName = (categoryName || '').toLowerCase();
  const bName = (brandName || '').toLowerCase();
  const pName = (productName || '').toLowerCase();
  const rType = (ramType || '').toLowerCase();

  // 1. Processors / CPUs
  if (cName.includes('processor') || cName.includes('cpu')) {
    if (cName.includes('amd') || bName.includes('amd') || pName.includes('ryzen') || pName.includes('amd')) {
      return 'Processor/AMD Processors images';
    }
    if (cName.includes('intel') || bName.includes('intel') || pName.includes('core') || pName.includes('intel')) {
      return 'Processor/Intel Processors images';
    }
    return 'Processor';
  }

  // 2. Motherboards
  if (cName.includes('motherboard') || cName.includes('mobo')) {
    if (cName.includes('amd') || bName.includes('amd') || pName.includes('amd') || pName.includes('b650') || pName.includes('x670') || pName.includes('b550') || pName.includes('am5') || pName.includes('am4')) {
      return 'Motherboards/AMD Motherboards';
    }
    if (cName.includes('intel') || bName.includes('intel') || pName.includes('intel') || pName.includes('z790') || pName.includes('b760') || pName.includes('b860') || pName.includes('z890') || pName.includes('lga')) {
      return 'Motherboards/Intel Motherboards';
    }
    return 'Motherboards';
  }

  // 3. RAM Memory
  if (cName.includes('ram') || cName.includes('memory')) {
    if (rType.includes('ddr5') || pName.includes('ddr5')) {
      return 'Ram/DDR5';
    }
    if (rType.includes('ddr4') || pName.includes('ddr4')) {
      return 'Ram/DDR4';
    }
    return 'Ram';
  }

  // 4. Graphics Cards
  if (cName.includes('graphic') || cName.includes('gpu')) {
    return 'Graphics Cards';
  }

  // 5. Storage / SSD
  if (cName.includes('ssd') || cName.includes('storage') || cName.includes('nvme')) {
    return 'Internal SSD';
  }

  // 6. Cabinets / Cases
  if (cName.includes('cabinet') || cName.includes('case')) {
    return 'Cabinets';
  }

  // 7. Power Supply
  if (cName.includes('power') || cName.includes('psu')) {
    return 'Power Supply';
  }

  // 8. Liquid Coolers
  if (cName.includes('liquid') || cName.includes('aio')) {
    return 'Liquid Coolers';
  }

  // 9. Air Coolers
  if (cName.includes('air') || cName.includes('cooler')) {
    return 'Air Coolers';
  }

  // 10. Monitors
  if (cName.includes('monitor') || cName.includes('display')) {
    return 'Monitors';
  }

  // Fallback matching existing directory on disk
  const baseDir = path.resolve(process.cwd(), 'uploads/products_images');
  if (fs.existsSync(baseDir)) {
    const existingDirs = fs.readdirSync(baseDir).filter((f) => fs.statSync(path.join(baseDir, f)).isDirectory());
    const match = existingDirs.find(
      (d) => d.toLowerCase() === cName || d.toLowerCase().replace(/[^a-z0-9]/g, '') === cName.replace(/[^a-z0-9]/g, '')
    );
    if (match) return match;
  }

  return 'uncategorized';
}

// Configure Multer storage engine for existing category & subfolder uploading
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const categoryId = (req.body.categoryId || req.query.categoryId) as string;
      const brandId = (req.body.brandId || req.query.brandId) as string;
      const ramType = (req.body.ramType || req.query.ramType) as string;
      const productName = (req.body.name || req.query.name) as string;

      let categoryName = '';
      let brandName = '';

      if (categoryId) {
        const cat = await prisma.category.findUnique({ where: { id: categoryId } });
        if (cat) categoryName = cat.name;
      }
      if (brandId) {
        const b = await prisma.brand.findUnique({ where: { id: brandId } });
        if (b) brandName = b.name;
      }

      const relativeFolder = resolveTargetFolder(categoryName, brandName, ramType, productName);
      const dir = path.resolve(process.cwd(), 'uploads/products_images', relativeFolder);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    } catch (err: any) {
      cb(err, path.resolve(process.cwd(), 'uploads/products_images'));
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const cleanName = path.basename(file.originalname, ext).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    cb(null, `${cleanName}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB file limit
});

// Apply Auth and Admin checks for all /api/admin routes
router.use(requireAuth, requireAdmin);

// Dashboard
router.get('/dashboard', AdminController.getDashboardStats);

// Products CRUD & Upload
router.get('/brands', AdminController.getBrands);
router.post('/upload-image', upload.single('image'), AdminController.uploadProductImage);
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

// Contact Inquiries
router.get('/inquiries', AdminController.getInquiries);
router.put('/inquiries/:id/status', AdminController.updateInquiryStatus);
router.delete('/inquiries/:id', AdminController.deleteInquiry);

export default router;
