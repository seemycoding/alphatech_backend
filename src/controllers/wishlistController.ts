import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/db';
import { AppError } from '../middlewares/errorHandler';

export class WishlistController {
  static async getWishlist(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) return next(new AppError('Unauthorized', 401));

      const items = await prisma.wishlistItem.findMany({
        where: { userId },
        include: { product: { include: { category: true } } },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        count: items.length,
        data: items.map((i) => ({
          wishlistId: i.id,
          addedAt: i.createdAt,
          product: {
            id: i.product.id,
            name: i.product.name,
            price: Number(i.product.price),
            formattedPrice: `₹${Number(i.product.price).toLocaleString('en-IN')}`,
            imageUrl: i.product.imageUrl,
            category: i.product.category.name,
            inStock: i.product.inStock
          }
        }))
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleWishlist(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { productId } = req.body;
      if (!userId) return next(new AppError('Unauthorized', 401));
      if (!productId) return next(new AppError('Product ID is required', 400));

      const existing = await prisma.wishlistItem.findUnique({
        where: { userId_productId: { userId, productId } }
      });

      let action = 'ADDED';
      if (existing) {
        await prisma.wishlistItem.delete({ where: { id: existing.id } });
        action = 'REMOVED';
      } else {
        await prisma.wishlistItem.create({ data: { userId, productId } });
      }

      const totalCount = await prisma.wishlistItem.count({ where: { userId } });

      res.json({
        success: true,
        action,
        inWishlist: action === 'ADDED',
        wishlistCount: totalCount,
        message: action === 'ADDED' ? 'Product added to wishlist' : 'Product removed from wishlist'
      });
    } catch (error) {
      next(error);
    }
  }

  static async syncGuestWishlist(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { guestProductIds } = req.body;
      if (!userId || !Array.isArray(guestProductIds)) {
        return next(new AppError('Invalid sync payload', 400));
      }

      for (const prodId of guestProductIds) {
        try {
          await prisma.wishlistItem.create({
            data: { userId, productId: prodId }
          });
        } catch {
          // Ignore duplicate constraint violations
        }
      }

      const totalCount = await prisma.wishlistItem.count({ where: { userId } });
      res.json({ success: true, wishlistCount: totalCount });
    } catch (error) {
      next(error);
    }
  }
}
