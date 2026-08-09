import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { OrderService } from '../services/orderService';
import { PdfService } from '../services/pdfService';
import { AppError } from '../middlewares/errorHandler';

export class OrderController {
  static async calculateSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { items, shippingMethod = 'standard' } = req.body;
      if (!items || !Array.isArray(items)) {
        return next(new AppError('Items array is required', 400));
      }

      const summary = await OrderService.calculateSummary(items, shippingMethod);
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  static async createOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const order = await OrderService.createOrder(userId, req.body);
      res.status(201).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }

  static async getOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { orderNumber } = req.params as { orderNumber: string };
      const order = await OrderService.getOrderByNumber(orderNumber);
      if (!order) {
        return next(new AppError('Order not found', 404));
      }
      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }

  static async getUserOrders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError('Authentication required', 401));
      }

      const orders = await OrderService.getUserOrders(userId);
      res.json({ success: true, data: orders });
    } catch (error) {
      next(error);
    }
  }

  static async getInvoicePdf(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { orderNumber } = req.params as { orderNumber: string };
      const order = await OrderService.getOrderByNumber(orderNumber);
      if (!order) {
        return next(new AppError('Order not found', 404));
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="INVOICE_${order.orderNumber}.pdf"`);

      const pdfDoc = PdfService.generateInvoicePdf(order);
      pdfDoc.pipe(res);
      pdfDoc.end();
    } catch (error) {
      next(error);
    }
  }
}
