import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/productService';
import { AppError } from '../middlewares/errorHandler';

export class ProductController {
  static async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ProductService.getProducts(req.query as any);
      res.json({ success: true, ...data });
    } catch (error) {
      next(error);
    }
  }

  static async getProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const product = await ProductService.getProductByIdOrSlug(id);
      if (!product) {
        return next(new AppError('Product not found', 404));
      }
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await ProductService.getCategories();
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }

  static async getBrands(req: Request, res: Response, next: NextFunction) {
    try {
      const brands = await ProductService.getBrands();
      res.json({ success: true, data: brands });
    } catch (error) {
      next(error);
    }
  }

  static async getFilterMetadata(req: Request, res: Response, next: NextFunction) {
    try {
      const metadata = await ProductService.getFilterMetadata();
      res.json({ success: true, data: metadata });
    } catch (error) {
      next(error);
    }
  }
}
