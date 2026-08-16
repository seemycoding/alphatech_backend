import { Request, Response } from 'express';
import { prisma } from '../config/db';

export class SettingController {
  // Public settings (Markups % & Warranty text)
  static async getPublicSettings(req: Request, res: Response) {
    try {
      const settings = await prisma.siteSetting.findMany({
        where: {
          key: { in: ['product_markup_percent', 'build_warranty_text'] }
        }
      });
      const data: Record<string, string> = {
        product_markup_percent: '15',
        build_warranty_text: 'Your build includes 3 years of technical support, 1 year on-site warranty, and pre-delivery stress testing (Prime95 + Furmark).'
      };

      settings.forEach((s) => {
        data[s.key] = s.value;
      });

      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Public Top Flash Banner
  static async getFlashOffer(req: Request, res: Response) {
    try {
      const flashOffer = await prisma.offer.findFirst({
        where: { isFlashBanner: true, isActive: true },
        orderBy: { updatedAt: 'desc' }
      });
      res.json({ success: true, data: flashOffer });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Validate Promo Coupon Code at Checkout
  static async validateCoupon(req: Request, res: Response) {
    try {
      const { code, cartTotal } = req.body;
      if (!code) {
        return res.status(400).json({ success: false, message: 'Coupon code is required' });
      }

      const coupon = await prisma.coupon.findUnique({
        where: { code: code.toUpperCase() }
      });

      if (!coupon || !coupon.isActive) {
        return res.status(404).json({ success: false, message: 'Invalid or expired coupon code' });
      }

      if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
        return res.status(400).json({ success: false, message: 'Coupon code has expired' });
      }

      const total = parseFloat(cartTotal || '0');
      if (coupon.minOrderAmount && total < Number(coupon.minOrderAmount)) {
        return res.status(400).json({
          success: false,
          message: `Minimum order amount of ₹${Number(coupon.minOrderAmount).toLocaleString('en-IN')} is required for this coupon`
        });
      }

      let discountAmount = 0;
      if (coupon.type === 'PERCENTAGE') {
        discountAmount = (total * Number(coupon.value)) / 100;
        if (coupon.maxDiscount && discountAmount > Number(coupon.maxDiscount)) {
          discountAmount = Number(coupon.maxDiscount);
        }
      } else {
        discountAmount = Number(coupon.value);
      }

      const finalDiscount = Math.round(discountAmount);

      res.json({
        success: true,
        coupon: {
          code: coupon.code,
          type: coupon.type,
          value: Number(coupon.value)
        },
        discountAmount: finalDiscount,
        data: {
          code: coupon.code,
          discountAmount: finalDiscount,
          formattedDiscountAmount: `₹${finalDiscount.toLocaleString('en-IN')}`,
          type: coupon.type,
          value: Number(coupon.value)
        },
        message: 'Coupon applied successfully'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
