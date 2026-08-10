import { prisma } from '../config/db';
import { OrderInput } from '../types';
import { Msg91Service } from './msg91Service';
import { PdfService } from './pdfService';

export class OrderService {
  static async calculateSummary(
    items: { productId: string; price?: number; quantity: number }[],
    shippingMethod: string,
    dbProductsList?: any[]
  ) {
    const productIds = items.map((i) => i.productId);

    const products = dbProductsList || await prisma.product.findMany({
      where: {
        OR: [
          { id: { in: productIds } },
          { sku: { in: productIds } },
          { slug: { in: productIds } }
        ]
      }
    });

    let subtotal = 0;
    const validatedItems = items.map((item) => {
      const p = products.find(
        (prod) => prod.id === item.productId || prod.sku === item.productId || prod.slug === item.productId
      );
      const price = p ? Number(p.price) : Number(item.price || 0);
      subtotal += price * item.quantity;
      return {
        productId: item.productId,
        dbProductId: p ? p.id : null,
        quantity: item.quantity,
        price,
        name: p?.name || 'Hardware Product'
      };
    });

    let shippingCost = 0;
    if (shippingMethod === 'express') shippingCost = 499;
    if (shippingMethod === 'priority') shippingCost = 999;

    const tax = Math.round(subtotal * 0.18);
    const totalAmount = subtotal + shippingCost + tax;

    return {
      subtotal,
      shippingCost,
      tax,
      totalAmount,
      formattedTotal: `₹${totalAmount.toLocaleString('en-IN')}`,
      items: validatedItems
    };
  }

  static async createOrder(userId: string | undefined, input: OrderInput) {
    // 🎯 1. Fetch matching database products & fallback product for Foreign Key safety
    const itemIds = input.items.map((i) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: {
        OR: [
          { id: { in: itemIds } },
          { sku: { in: itemIds } },
          { slug: { in: itemIds } }
        ]
      }
    });

    const fallbackProduct = dbProducts[0] || (await prisma.product.findFirst());

    if (!fallbackProduct) {
      throw new Error('Database product catalog is empty. Please seed products first.');
    }

    const summary = await this.calculateSummary(input.items, input.shippingMethod, dbProducts);

    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const orderNumber = `ALPHA-${randomNum}-TX`;

    // 🎯 2. Verify userId foreign key validity
    let validUserId: string | null = null;
    if (userId) {
      const userExists = await prisma.user.findUnique({ where: { id: userId } });
      if (userExists) validUserId = userId;
    }

    // 🎯 3. Create order with guaranteed Foreign Key constraint compliance
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
            productId: it.dbProductId || fallbackProduct.id,
            quantity: it.quantity,
            price: it.price
          }))
        }
      },
      include: { items: { include: { product: true } } }
    });

    // 🎯 4. Generate PDF Invoice Buffer & Send Email with Attachment
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

    return order;
  }

  static async getOrderByNumber(orderNumber: string) {
    return prisma.order.findFirst({
      where: {
        OR: [{ orderNumber }, { id: orderNumber }]
      },
      include: { items: { include: { product: true } } }
    });
  }

  static async getUserOrders(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: true } } }
    });
  }

  static async updateOrderStatus(orderId: string, status: any) {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { orderStatus: status },
      include: { items: { include: { product: true } } }
    });

    // Send MSG91 Status Update Email
    await Msg91Service.sendStatusUpdateEmail(
      order.customerEmail,
      order.customerName,
      order.orderNumber,
      status
    );

    return order;
  }
}
