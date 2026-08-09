import { prisma } from '../config/db';
import { OrderInput } from '../types';
import { Msg91Service } from './msg91Service';

export class OrderService {
  static async calculateSummary(items: { productId: string; quantity: number }[], shippingMethod: string) {
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });

    let subtotal = 0;
    const validatedItems = items.map((item) => {
      const p = products.find((prod) => prod.id === item.productId);
      const price = p ? Number(p.price) : 0;
      subtotal += price * item.quantity;
      return {
        productId: item.productId,
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
    const summary = await this.calculateSummary(input.items, input.shippingMethod);

    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const orderNumber = `ALPHA-${randomNum}-TX`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: userId || null,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        shippingAddress: input.shippingAddress as any,
        shippingMethod: input.shippingMethod,
        paymentMethod: input.paymentMethod,
        paymentStatus: 'PENDING',
        orderStatus: 'ORDER_RECEIVED',
        subtotal: summary.subtotal,
        shippingCost: summary.shippingCost,
        tax: summary.tax,
        totalAmount: summary.totalAmount,
        items: {
          create: summary.items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            price: it.price
          }))
        }
      },
      include: { items: { include: { product: true } } }
    });

    // Send MSG91 Order Confirmation Email
    await Msg91Service.sendOrderConfirmationEmail(
      input.customerEmail,
      input.customerName,
      orderNumber,
      `₹${summary.totalAmount.toLocaleString('en-IN')}`,
      summary.items
    );

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
