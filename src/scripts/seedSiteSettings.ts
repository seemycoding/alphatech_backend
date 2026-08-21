import { prisma } from '../config/db';

export async function seedSiteSettings() {
  console.log('⚙️ Seeding default site settings & coupons...');

  const defaultSettings = [
    {
      key: 'product_markup_percent',
      value: '15',
      description: 'Crossed-out price markup percentage for shop products and custom PC builds'
    },
    {
      key: 'build_warranty_text',
      value: 'Your build includes 3 years of technical support, 1 year on-site warranty, and pre-delivery stress testing (Prime95 + Furmark).',
      description: 'Build assurance and warranty text displayed on the /build configurator page'
    },
    { key: 'payment_credit_card_enabled', value: 'true', description: 'Enable/Disable Credit Card payment method' },
    { key: 'payment_debit_card_enabled', value: 'false', description: 'Enable/Disable Debit Card payment method' },
    { key: 'payment_upi_enabled', value: 'true', description: 'Enable/Disable UPI & QR Code payment method' },
    { key: 'payment_netbanking_enabled', value: 'true', description: 'Enable/Disable Net Banking payment method' },
    { key: 'payment_emi_enabled', value: 'true', description: 'Enable/Disable EMI Options payment method' },
    { key: 'payment_wallets_enabled', value: 'true', description: 'Enable/Disable Digital Wallets payment method' }
  ];

  for (const s of defaultSettings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s
    });
  }

  // Seed sample coupon if none exist
  const existingCoupon = await prisma.coupon.findFirst();
  if (!existingCoupon) {
    await prisma.coupon.create({
      data: {
        code: 'ALPHA10',
        type: 'PERCENTAGE',
        value: 10,
        minOrderAmount: 2000,
        maxDiscount: 2000,
        usageLimit: 100,
        isActive: true
      }
    });
    console.log('🎟️ Created sample coupon: ALPHA10 (10% OFF)');
  }

  // Seed sample flash banner offer if none exist
  const existingOffer = await prisma.offer.findFirst();
  if (!existingOffer) {
    await prisma.offer.create({
      data: {
        title: 'Independence PC Sale',
        bannerText: '🔥 Special Launch Offer: Flat 10% OFF on all Custom PC Builds with code ALPHA10!',
        isFlashBanner: true,
        isActive: true
      }
    });
    console.log('📢 Created sample flash offer banner');
  }

  console.log('✅ Site settings seeded successfully!');
  await prisma.$disconnect();
}

if (require.main === module) {
  seedSiteSettings().catch((err) => {
    console.error('❌ Error seeding site settings:', err);
    process.exit(1);
  });
}
