import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { RazorpayService } from '../services/razorpayService';
import { Msg91Service } from '../services/msg91Service';
import { PdfService } from '../services/pdfService';
import { prisma } from '../config/db';
import { ENV } from '../config/env';
import { AppError } from '../middlewares/errorHandler';

export class PaymentController {
  static async createRazorpayOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { orderId } = req.body;
      const order = await prisma.order.findUnique({ where: { id: orderId } });

      if (!order) {
        return next(new AppError('Order not found', 404));
      }

      const razorpayOrder = await RazorpayService.createOrder(
        Number(order.totalAmount),
        order.orderNumber
      );

      await prisma.order.update({
        where: { id: order.id },
        data: { razorpayOrderId: razorpayOrder.id }
      });

      res.json({
        success: true,
        data: {
          id: razorpayOrder.id,
          orderId: razorpayOrder.id,
          key: razorpayOrder.key || ENV.RAZORPAY_KEY_ID,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          isMock: razorpayOrder.id.startsWith('order_mock_')
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyRazorpayPayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

      const isValid = RazorpayService.verifyPaymentSignature(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      );

      if (!isValid) {
        return next(new AppError('Payment signature verification failed', 400));
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'PAID',
          orderStatus: 'PRECISION_ASSEMBLY',
          razorpayPaymentId
        },
        include: { items: { include: { product: true } } }
      });

      // 🎯 Dispatch Order Confirmation Email & PDF Invoice ONLY AFTER PAYMENT VERIFIED!
      try {
        const pdfBuffer = await PdfService.generateInvoicePdfBuffer(updatedOrder);
        await Msg91Service.sendOrderConfirmationEmail(
          updatedOrder.customerEmail,
          updatedOrder.customerName,
          updatedOrder.orderNumber,
          `₹${Number(updatedOrder.totalAmount).toLocaleString('en-IN')}`,
          updatedOrder.items,
          pdfBuffer
        );
      } catch (emailErr) {
        console.error('⚠️ Post-payment email dispatch warning:', emailErr);
      }

      res.json({
        success: true,
        message: 'Payment verified successfully. Order moved to Precision Assembly.',
        data: updatedOrder
      });
    } catch (error) {
      next(error);
    }
  }

  static async handleRazorpayWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const event = req.body;
      console.log('⚡ [Razorpay Webhook Received]:', event?.event);

      if (event?.event === 'payment.captured') {
        const payment = event.payload.payment.entity;
        const updatedOrders = await prisma.order.findMany({
          where: { razorpayOrderId: payment.order_id }
        });

        await prisma.order.updateMany({
          where: { razorpayOrderId: payment.order_id },
          data: {
            paymentStatus: 'PAID',
            orderStatus: 'PRECISION_ASSEMBLY',
            razorpayPaymentId: payment.id
          }
        });

        for (const ord of updatedOrders) {
          try {
            const fullOrd = await prisma.order.findUnique({
              where: { id: ord.id },
              include: { items: { include: { product: true } } }
            });
            if (fullOrd) {
              const pdfBuffer = await PdfService.generateInvoicePdfBuffer(fullOrd);
              await Msg91Service.sendOrderConfirmationEmail(
                fullOrd.customerEmail,
                fullOrd.customerName,
                fullOrd.orderNumber,
                `₹${Number(fullOrd.totalAmount).toLocaleString('en-IN')}`,
                fullOrd.items,
                pdfBuffer
              );
            }
          } catch (e) {}
        }
      }

      res.json({ status: 'ok' });
    } catch (error) {
      next(error);
    }
  }
}
