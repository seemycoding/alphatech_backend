import { prisma } from '../config/db';

async function checkBrands() {
  const brands = await prisma.brand.findMany();
  console.log('📦 Existing Brands in DB:', brands);

  if (brands.length === 0) {
    console.log('⚠️ No brands found! Seeding a default Brand...');
    const defaultBrand = await prisma.brand.create({
      data: {
        id: 'brand-1',
        name: 'Generic',
        slug: 'generic'
      }
    });
    console.log('✅ Created default brand:', defaultBrand);
  }
  await prisma.$disconnect();
}

checkBrands();
