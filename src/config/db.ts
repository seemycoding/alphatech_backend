import dotenv from 'dotenv';
import path from 'path';

// 🔍 Multi-location .env loader for Hostinger / cPanel versioned deployment paths
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { PrismaClient } from '@prisma/client';
import { seedProducts } from '../scripts/seedFromExcel';

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.warn('⚠️ WARNING: process.env.DATABASE_URL is undefined! Check Hostinger Environment Variables or .env file.');
}

export const prisma = new PrismaClient({
  datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('✅ MySQL Database connected successfully via Prisma');

    // Auto-seed if database has 0 products
    const productCount = await prisma.product.count();
    if (productCount === 0) {
      console.log('📦 Database is empty. Running auto-seeder for Excel hardware products...');
      await seedProducts();
    } else {
      console.log(`📦 Database loaded with ${productCount} active hardware products.`);
    }
  } catch (error) {
    console.error('❌ Database connection failed. Please ensure MySQL is running and check DATABASE_URL in Hostinger environment / .env:', error);
  }
};
