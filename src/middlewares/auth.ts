import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { AuthRequest, AuthenticatedUser } from '../types';
import { AppError } from './errorHandler';

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication token missing or invalid', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (error) {
    return next(new AppError('Invalid or expired authentication token', 401));
  }
};

export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthenticatedUser;
      req.user = decoded;
    } catch {
      // Ignore token errors for optional auth
    }
  }

  next();
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'ADMIN') {
      return next(new AppError('Forbidden: Admin access required', 403));
    }
    next();
  });
};
