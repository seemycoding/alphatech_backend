import dotenv from 'dotenv';
import path from 'path';

// 🔍 Multi-location .env loader for Hostinger / cPanel versioned deployment paths
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { PrismaClient } from '@prisma/client';
import { seedProducts } from '../scripts/seedFromExcel';

const dbUrl = process.env.DATABASE_URL || '';

function getMaskedUrl(url: string): string {
  if (!url) return 'UNDEFINED';
  return url.replace(/(:[^:@]+@)/, ':****@');
}

console.log(`🔌 [DATABASE DEBUG] Using Connection URL: ${dbUrl}`);

export const prisma = new PrismaClient({
  datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
  log: ['error', 'warn']
});

export const connectDB = async () => {
  try {
    console.log(`📡 [Prisma] Attempting connection to: ${getMaskedUrl(dbUrl)}`);
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
  } catch (error: any) {
    console.error(`❌ Connection failed for URL [${getMaskedUrl(dbUrl)}]:`, error?.message || error);
  }
};
