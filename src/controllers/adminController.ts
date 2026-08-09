import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/db';
import { OrderService } from '../services/orderService';
import { ingestExcelFile } from '../scripts/ingestExcel';

export class AdminController {
  static async getDashboardStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const [totalOrders, totalRevenue, pendingAssembly, lowStockProducts] = await Promise.all([
        prisma.order.count(),
        prisma.order.aggregate({
          where: { paymentStatus: 'PAID' },
          _sum: { totalAmount: true }
        }),
        prisma.order.count({
          where: { orderStatus: 'PRECISION_ASSEMBLY' }
        }),
        prisma.product.count({
          where: { stockQuantity: { lte: 3 } }
        })
      ]);

      res.json({
        success: true,
        data: {
          totalOrders,
          totalRevenue: totalRevenue._sum.totalAmount || 0,
          pendingAssembly,
          lowStockProducts
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAdminOrders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const orders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { product: true } } }
      });

      res.json({ success: true, data: orders });
    } catch (error) {
      next(error);
    }
  }

  static async updateOrderStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { orderId } = req.params as { orderId: string };
      const { status } = req.body;

      const order = await OrderService.updateOrderStatus(orderId, status);
      res.json({ success: true, message: `Order status updated to ${status}`, data: order });
    } catch (error) {
      next(error);
    }
  }

  static async createProduct(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const {
        name,
        sku,
        price,
        categoryName,
        brandName,
        socket,
        series,
        hasIntegratedGpu,
        tdp,
        imageUrl,
        specifications,
        features
      } = req.body;

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

      const category = await prisma.category.upsert({
        where: { name: categoryName || 'Processor' },
        update: {},
        create: {
          name: categoryName || 'Processor',
          slug: (categoryName || 'Processor').toLowerCase().replace(/[^a-z0-9]+/g, '-')
        }
      });

      const brand = await prisma.brand.upsert({
        where: { name: brandName || 'AMD' },
        update: {},
        create: {
          name: brandName || 'AMD',
          slug: (brandName || 'AMD').toLowerCase().replace(/[^a-z0-9]+/g, '-')
        }
      });

      const product = await prisma.product.create({
        data: {
          name,
          sku,
          slug,
          price,
          categoryId: category.id,
          brandId: brand.id,
          socket,
          series,
          hasIntegratedGpu: !!hasIntegratedGpu,
          tdp,
          imageUrl: imageUrl || 'https://images.pexels.com/photos/11272008/pexels-photo-11272008.jpeg',
          specifications: specifications || [],
          features: features || []
        }
      });

      res.status(201).json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Excel File Upload Data Ingestion Endpoint
   */
  static async uploadAndIngestExcel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No Excel or CSV file uploaded.' });
      }

      const count = await ingestExcelFile(req.file.path);
      res.json({
        success: true,
        message: `Successfully ingested ${count} hardware products from uploaded Excel file!`,
        count
      });
    } catch (error) {
      next(error);
    }
  }
}
