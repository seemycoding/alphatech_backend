import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { ENV } from '../config/env';
import { Msg91Service } from '../services/msg91Service';
import { AppError } from '../middlewares/errorHandler';

export class AuthController {
  /**
   * Request MSG91 Email OTP for New Account Registration
   */
  static async requestRegisterOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, fullName, password } = req.body;

      if (!email || !fullName || !password) {
        return next(new AppError('Full name, email, and password are required', 400));
      }

      const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (existingUser) {
        return next(new AppError('An account with this email already exists. Please Sign In instead.', 400));
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = await bcrypt.hash(otp, 8);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

      await prisma.otpVerification.create({
        data: {
          email: email.toLowerCase(),
          otpHash,
          type: 'REGISTER_OTP',
          expiresAt
        }
      });

      // Send 6-Digit Email OTP via MSG91
      await Msg91Service.sendOtpEmail(email, otp, 'Account Registration Verification');

      res.json({
        success: true,
        message: `6-Digit Email Registration OTP sent via MSG91 to ${email}`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify MSG91 Email OTP & Complete Registration
   */
  static async verifyRegisterOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp, password, fullName, phone, company } = req.body;

      if (!email || !otp || !password || !fullName) {
        return next(new AppError('Full name, email, password, and OTP code are required', 400));
      }

      const record = await prisma.otpVerification.findFirst({
        where: {
          email: email.toLowerCase(),
          type: 'REGISTER_OTP',
          used: false,
          expiresAt: { gte: new Date() }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!record) {
        return next(new AppError('Invalid or expired Registration OTP code', 400));
      }

      const isOtpValid = await bcrypt.compare(otp, record.otpHash);
      if (!isOtpValid) {
        return next(new AppError('Invalid Registration OTP code', 400));
      }

      await prisma.otpVerification.update({
        where: { id: record.id },
        data: { used: true }
      });

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          fullName,
          phone,
          company,
          role: 'CUSTOMER'
        }
      });

      // Send MSG91 Welcome Email
      Msg91Service.sendWelcomeEmail(user.email, user.fullName);

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
        ENV.JWT_SECRET,
        { expiresIn: ENV.JWT_EXPIRES_IN as any }
      );

      res.status(201).json({
        success: true,
        message: 'Account created & verified successfully',
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * User Password Login
   */
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return next(new AppError('Email and password are required', 400));
      }

      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (!user || !user.passwordHash) {
        return next(new AppError('Invalid email or password', 401));
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return next(new AppError('Invalid email or password', 401));
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
        ENV.JWT_SECRET,
        { expiresIn: ENV.JWT_EXPIRES_IN as any }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send Login / Password Reset MSG91 Email OTP
   */
  static async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, type = 'LOGIN_OTP' } = req.body;

      if (!email) {
        return next(new AppError('Email address is required', 400));
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = await bcrypt.hash(otp, 8);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.otpVerification.create({
        data: {
          email: email.toLowerCase(),
          otpHash,
          type,
          expiresAt
        }
      });

      await Msg91Service.sendOtpEmail(email, otp, type === 'LOGIN_OTP' ? 'Login Authentication' : 'Password Reset');

      res.json({
        success: true,
        message: `6-Digit Email OTP sent via MSG91 to ${email}`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify MSG91 Login Email OTP
   */
  static async verifyLoginOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return next(new AppError('Email and OTP code are required', 400));
      }

      const record = await prisma.otpVerification.findFirst({
        where: {
          email: email.toLowerCase(),
          type: 'LOGIN_OTP',
          used: false,
          expiresAt: { gte: new Date() }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!record) {
        return next(new AppError('Invalid or expired Login OTP code', 400));
      }

      const isOtpValid = await bcrypt.compare(otp, record.otpHash);
      if (!isOtpValid) {
        return next(new AppError('Invalid Login OTP code', 400));
      }

      await prisma.otpVerification.update({
        where: { id: record.id },
        data: { used: true }
      });

      let user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: email.toLowerCase(),
            fullName: email.split('@')[0].toUpperCase(),
            role: 'CUSTOMER'
          }
        });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
        ENV.JWT_SECRET,
        { expiresIn: ENV.JWT_EXPIRES_IN as any }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
