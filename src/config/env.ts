import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || '5001',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Razorpay
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',

  // MSG91 & SMTP Email Credentials
  SMTP_HOST: process.env.SMTP_HOST || process.env.MSG91_SMTP_HOST || 'smtp.msg91.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || process.env.MSG91_SMTP_PORT || '587'),
  SMTP_USER: process.env.SMTP_USER || process.env.MSG91_SMTP_USER || process.env.MSG91_FROM_EMAIL || '',
  SMTP_PASS: process.env.SMTP_PASS || process.env.MSG91_SMTP_PASS || process.env.MSG91_AUTH_KEY || '',
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',

  MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY || '',
  MSG91_DOMAIN: process.env.MSG91_DOMAIN || 'alphaatechh.in',
  MSG91_FROM_EMAIL: process.env.MSG91_FROM_EMAIL || 'support@alphaatechh.in',
  MSG91_FROM_NAME: process.env.MSG91_FROM_NAME || 'AlphaaTechh Computers',
  MSG91_WELCOME_TEMPLATE_ID: process.env.MSG91_WELCOME_TEMPLATE_ID || '',
  MSG91_ORDER_CONFIRM_TEMPLATE_ID: process.env.MSG91_ORDER_CONFIRM_TEMPLATE_ID || '',
  MSG91_STATUS_UPDATE_TEMPLATE_ID: process.env.MSG91_STATUS_UPDATE_TEMPLATE_ID || '',
  MSG91_OTP_TEMPLATE_ID: process.env.MSG91_OTP_TEMPLATE_ID || ''
};
