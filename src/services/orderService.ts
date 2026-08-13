import { prisma } from '../config/db';
import { OrderInput } from '../types';
import { Msg91Service } from './msg91Service';
import { PdfService } from './pdfService';

export class OrderService {
  static async calculateSummary(
    items: { productId: string; quantity: number }[],
    shippingMethod: string = 'standard'
  ) {
    let subtotal = 0;
    const summaryItems: any[] = [];

    for (const item of items) {
      const product = await prisma.product.findFirst({
        where: {
          OR: [{ id: item.productId }, { sku: item.productId }, { slug: item.productId }]
        }
      });

      if (product) {
        const itemTotal = Number(product.price) * item.quantity;
        subtotal += itemTotal;
        summaryItems.push({
          productId: product.id,
          dbProductId: product.id,
          name: product.name,
          sku: product.sku,
          price: Number(product.price),
          quantity: item.quantity,
          imageUrl: product.imageUrl
        });
      } else {
        const itemTotal = 15000 * item.quantity;
        subtotal += itemTotal;
        summaryItems.push({
          productId: item.productId,
          dbProductId: null,
          name: `Custom PC Build Component (${item.productId})`,
          sku: 'CUSTOM-PC',
          price: 15000,
          quantity: item.quantity,
          imageUrl: null
        });
      }
    }

    const shippingCost = shippingMethod === 'express' ? 499 : shippingMethod === 'priority' ? 999 : 0;
    const tax = Math.round(subtotal * 0.18);
    const totalAmount = subtotal + shippingCost + tax;

    return {
      subtotal,
      shippingCost,
      tax,
      totalAmount,
      items: summaryItems
    };
  }

  static async createOrder(param1: any, param2?: any) {
    let userId: string | undefined;
    let input: OrderInput;

    if (typeof param1 === 'string' || !param1?.items) {
      userId = param1;
      input = param2;
    } else {
      input = param1;
      userId = param2;
    }

    const summary = await this.calculateSummary(input.items, input.shippingMethod);
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const orderNumber = `ALPHA-${randomNum}-TX`;

    let fallbackProduct = await prisma.product.findFirst();
    if (!fallbackProduct) {
      const cat = await prisma.category.findFirst();
      const brand = await prisma.brand.findFirst();
      if (cat && brand) {
        fallbackProduct = await prisma.product.create({
          data: {
            name: 'Custom Component Fallback',
            slug: `fallback-${Date.now()}`,
            sku: `FB-${Date.now()}`,
            price: 0,
            inStock: true,
            imageUrl: '/uploads/products_images/fallback.png',
            specifications: [],
            categoryId: cat.id,
            brandId: brand.id
          }
        });
      }
    }

    let validUserId: string | null = null;
    if (userId) {
      const userExists = await prisma.user.findUnique({ where: { id: userId } });
      if (userExists) validUserId = userId;
    }

    const isCod = (input.paymentMethod || '').toUpperCase() === 'COD';

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: validUserId,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        shippingAddress: input.shippingAddress as any,
        shippingMethod: input.shippingMethod,
        paymentMethod: input.paymentMethod || 'RAZORPAY',
        paymentStatus: 'PENDING',
        orderStatus: 'ORDER_RECEIVED',
        subtotal: summary.subtotal,
        shippingCost: summary.shippingCost,
        tax: summary.tax,
        totalAmount: summary.totalAmount,
        items: {
          create: summary.items.map((it) => ({
            productId: it.dbProductId || (fallbackProduct ? fallbackProduct.id : undefined),
            quantity: it.quantity,
            price: it.price
          })).filter((i) => i.productId)
        }
      },
      include: { items: { include: { product: true } } }
    });

    // 🎯 Dispatch confirmation email IMMEDIATELY for COD orders ONLY.
    // For online/Razorpay payments, email is dispatched AFTER payment is verified as PAID!
    if (isCod) {
      try {
        const pdfBuffer = await PdfService.generateInvoicePdfBuffer(order);
        await Msg91Service.sendOrderConfirmationEmail(
          input.customerEmail,
          input.customerName,
          orderNumber,
          `₹${summary.totalAmount.toLocaleString('en-IN')}`,
          summary.items,
          pdfBuffer
        );
      } catch (pdfErr) {
        await Msg91Service.sendOrderConfirmationEmail(
          input.customerEmail,
          input.customerName,
          orderNumber,
          `₹${summary.totalAmount.toLocaleString('en-IN')}`,
          summary.items
        );
      }
    }

    return order;
  }

  static async getOrdersByUser(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getUserOrders(userId: string) {
    return this.getOrdersByUser(userId);
  }

  static async getOrderByNumber(orderNumber: string) {
    return prisma.order.findUnique({
      where: { orderNumber },
      include: { items: { include: { product: true } } }
    });
  }

  static async updateOrderStatus(orderId: string, orderStatus: any) {
    return prisma.order.update({
      where: { id: orderId },
      data: { orderStatus }
    });
  }
}
