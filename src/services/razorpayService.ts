import Razorpay from 'razorpay';
import crypto from 'crypto';
import { ENV } from '../config/env';

let razorpayInstance: Razorpay | null = null;

if (ENV.RAZORPAY_KEY_ID && ENV.RAZORPAY_KEY_SECRET) {
  razorpayInstance = new Razorpay({
    key_id: ENV.RAZORPAY_KEY_ID,
    key_secret: ENV.RAZORPAY_KEY_SECRET
  });
}

export class RazorpayService {
  static async createOrder(amountRupees: number, receiptId: string) {
    const amountPaise = Math.round(amountRupees * 100);

    if (!razorpayInstance) {
      console.log(`[Mock Razorpay Order] Receipt: ${receiptId} | Amount: ₹${amountRupees}`);
      return {
        id: `order_mock_${Date.now()}`,
        amount: amountPaise,
        currency: 'INR',
        receipt: receiptId,
        key: ENV.RAZORPAY_KEY_ID || 'rzp_test_mockkey'
      };
    }

    const order = await razorpayInstance.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: receiptId
    });

    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      key: ENV.RAZORPAY_KEY_ID
    };
  }

  static verifyPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): boolean {
    if (!ENV.RAZORPAY_KEY_SECRET) {
      console.log('[Mock Razorpay Verification] Skipping signature check in test mode.');
      return true;
    }

    const generatedSignature = crypto
      .createHmac('sha256', ENV.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    return generatedSignature === razorpaySignature;
  }
}
