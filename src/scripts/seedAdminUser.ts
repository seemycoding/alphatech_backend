import { prisma } from '../config/db';
import bcrypt from 'bcryptjs';

export async function seedAdminUser() {
  const adminEmail = 'admin@alphatech.com';
  const rawPassword = 'admin123password';

  console.log(`🔍 Checking if admin user exists (${adminEmail})...`);

  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: 'ADMIN',
      fullName: 'Alphaatech Administrator',
      passwordHash
    },
    create: {
      email: adminEmail,
      fullName: 'Alphaatech Administrator',
      passwordHash,
      phone: '+91 9876543210',
      role: 'ADMIN'
    }
  });

  console.log(`✅ Admin user ready!`);
  console.log(`📧 Email: ${admin.email}`);
  console.log(`🔑 Password: ${rawPassword}`);
  console.log(`🛡️ Role: ${admin.role}`);

  await prisma.$disconnect();
}

if (require.main === module) {
  seedAdminUser().catch((err) => {
    console.error('❌ Error seeding admin user:', err);
    process.exit(1);
  });
}
