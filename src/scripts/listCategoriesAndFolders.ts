import { prisma } from '../config/db';
import fs from 'fs';
import path from 'path';

async function main() {
  const categories = await prisma.category.findMany();
  console.log('📋 Categories in DB:');
  categories.forEach((c) => console.log(` - ID: ${c.id} | Name: "${c.name}" | Slug: "${c.slug}"`));

  const baseDir = path.resolve(process.cwd(), 'uploads/products_images');
  console.log('\n📁 Existing Folders in uploads/products_images:');

  function scan(dir: string, indent = ' ') {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.name.startsWith('.')) continue;
      if (item.isDirectory()) {
        const fullPath = path.join(dir, item.name);
        const relPath = path.relative(baseDir, fullPath);
        console.log(`${indent}📁 ${relPath}`);
        scan(fullPath, indent + '  ');
      }
    }
  }

  scan(baseDir);
  await prisma.$disconnect();
}

main();
