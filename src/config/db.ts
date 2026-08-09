import { PrismaClient } from '@prisma/client';
import { seedProducts } from '../scripts/seedFromExcel';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL Database connected successfully via Prisma');

    // Auto-seed if database has 0 products
    const productCount = await prisma.product.count();
    if (productCount === 0) {
      console.log('📦 Database is empty. Running auto-seeder for Excel hardware products...');
      await seedProducts();
    } else {
      console.log(`📦 Database loaded with ${productCount} active hardware products.`);
    }
  } catch (error) {
    console.error('❌ Database connection failed. Please ensure PostgreSQL is running and check DATABASE_URL in .env:', error);
  }
};
