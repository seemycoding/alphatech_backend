import { Router } from 'express';
import { ProductController } from '../controllers/productController';

const router = Router();

router.get('/', ProductController.getProducts);
router.get('/categories', ProductController.getCategories);
router.get('/brands', ProductController.getBrands);
router.get('/filter-metadata', ProductController.getFilterMetadata);
router.get('/:id', ProductController.getProduct);

export default router;
