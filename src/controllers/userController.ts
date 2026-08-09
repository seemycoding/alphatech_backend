import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../types';
import { prisma } from '../config/db';
import { AppError } from '../middlewares/errorHandler';

export class UserController {
  static async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) return next(new AppError('Unauthorized', 401));

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { addresses: true }
      });

      if (!user) return next(new AppError('User not found', 404));

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          company: user.company,
          role: user.role,
          addresses: user.addresses
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { fullName, phone, company, currentPassword, newPassword } = req.body;

      if (!userId) return next(new AppError('Unauthorized', 401));

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return next(new AppError('User not found', 404));

      const updateData: any = {};
      if (fullName) updateData.fullName = fullName;
      if (phone) updateData.phone = phone;
      if (company) updateData.company = company;

      if (newPassword) {
        if (!currentPassword || !user.passwordHash) {
          return next(new AppError('Current password required to set new password', 400));
        }
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
          return next(new AppError('Current password is incorrect', 400));
        }
        updateData.passwordHash = await bcrypt.hash(newPassword, 10);
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: updateData
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: updated.id,
          email: updated.email,
          fullName: updated.fullName
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async addAddress(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) return next(new AppError('Unauthorized', 401));

      const { title, fullName, line1, line2, city, state, postalCode, phone, isDefault } = req.body;

      if (isDefault) {
        await prisma.address.updateMany({
          where: { userId },
          data: { isDefault: false }
        });
      }

      const address = await prisma.address.create({
        data: {
          userId,
          title: title.toUpperCase(),
          fullName,
          line1,
          line2,
          city,
          state,
          postalCode,
          phone,
          isDefault: !!isDefault
        }
      });

      res.status(201).json({ success: true, data: address });
    } catch (error) {
      next(error);
    }
  }

  static async deleteAddress(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { addressId } = req.params as { addressId: string };
      if (!userId) return next(new AppError('Unauthorized', 401));

      await prisma.address.deleteMany({
        where: { id: addressId, userId }
      });

      res.json({ success: true, message: 'Address deleted' });
    } catch (error) {
      next(error);
    }
  }
}
