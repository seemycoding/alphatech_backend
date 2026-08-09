import { prisma } from '../config/db';

const allProductsData = [
  // Processors
  { name: 'AMD Ryzen 5 5500', price: 8640, category: 'Processor', brand: 'AMD', rawDesc: `SKU : RYZEN-5-5500\nBRAND : AMD\nSOCKET : AM4\nINTEGRATED GRAPHICS : No\nTHREADS : 12\nSERIES : Ryzen 5\nCACHE : 16MB\nMAX TURBO FREQUENCY : 4.2 GHz` },
  { name: 'AMD Ryzen 5 3400G', price: 8990, category: 'Processor', brand: 'AMD', rawDesc: `SKU : YD3400C5FHBOX\nBRAND : AMD\nSOCKET : AM4\nINTEGRATED GRAPHICS : Yes\nTHREADS : 8\nSERIES : Ryzen 5\nCACHE : 6MB\nMAX TURBO FREQUENCY : 4.2 GHz` },
  { name: 'AMD Ryzen 7 5700', price: 11990, category: 'Processor', brand: 'AMD', rawDesc: `SKU : 100-100000743BOX\nBRAND : AMD\nTHREADS : 16\nCACHE : 16MB\nSERIES : Ryzen 7\nSOCKET : AM4\nMAX TURBO FREQUENCY : 4.6GHz\nINTEGRATED GRAPHICS : No` },
  { name: 'AMD Ryzen 5 5500 GT', price: 13290, category: 'Processor', brand: 'AMD', rawDesc: `SKU : 100-100001489BOX\nBRAND : AMD\nTHREADS : 12\nCACHE : 16MB\nSERIES : Ryzen 5\nSOCKET : AM4\nMAX TURBO FREQUENCY : 4.4 GHz\nINTEGRATED GRAPHICS : Yes` },
  { name: 'AMD Ryzen 5 5600', price: 13690, category: 'Processor', brand: 'AMD', rawDesc: `SKU : RYZEN-5-5600\nBRAND : AMD\nSOCKET : AM4\nINTEGRATED GRAPHICS : No\nTHREADS : 12\nSERIES : Ryzen 5\nCACHE : 32MB\nMAX TURBO FREQUENCY : 4.4 GHz` },
  { name: 'AMD Ryzen 5 5600G', price: 14290, category: 'Processor', brand: 'AMD', rawDesc: `SKU : 100-100000252BOX\nBRAND : AMD\nSOCKET : AM4\nINTEGRATED GRAPHICS : Yes\nTHREADS : 12\nSERIES : Ryzen 5\nCACHE : 16MB\nMAX TURBO FREQUENCY : 4.4 GHz` },
  { name: 'AMD Ryzen 5 5600X', price: 14990, category: 'Processor', brand: 'AMD', rawDesc: `SKU : 100-100000065BOX\nBRAND : AMD\nSOCKET : AM4\nINTEGRATED GRAPHICS : No\nTHREADS : 12\nSERIES : Ryzen 5\nCACHE : 32MB\nMAX TURBO FREQUENCY : 4.6 GHz` },
  { name: 'AMD Ryzen 5 7500F', price: 15190, category: 'Processor', brand: 'AMD', rawDesc: `SKU : 100-000000597\nBRAND : AMD\nTHREADS : 12\nCACHE : 32MB\nSERIES : Ryzen 5\nSOCKET : AM5\nMAX TURBO FREQUENCY : 5.0 GHz` },
  { name: 'AMD Ryzen 5 8500G', price: 15990, category: 'Processor', brand: 'AMD', rawDesc: `SKU : 100-100000931BOX\nBRAND : AMD\nSOCKET : AM5\nSERIES : Ryzen 5\nINTEGRATED GRAPHICS : Yes\nTHREADS : 12\nMAX TURBO FREQUENCY : 5.0 GHz\nCACHE : 16MB` },
  { name: 'AMD Ryzen 5 7600X', price: 18790, category: 'Processor', brand: 'AMD', rawDesc: `SKU : 100-100000593WOF\nBRAND : AMD\nSOCKET : AM5\nINTEGRATED GRAPHICS : Yes\nTHREADS : 12\nSERIES : Ryzen 5\nCACHE : 32MB\nMAX TURBO FREQUENCY : 5.3 GHz` },
  { name: 'AMD Ryzen 5 8600G', price: 19390, category: 'Processor', brand: 'AMD', rawDesc: `SKU : 100-100001237BOX\nBRAND : AMD\nSOCKET : AM5\nSERIES : Ryzen 5\nINTEGRATED GRAPHICS : Yes\nTHREADS : 12\nMAX TURBO FREQUENCY : 5.0 GHz\nCACHE : 22MB` },
  { name: 'AMD Ryzen 5 9600X', price: 21690, category: 'Processor', brand: 'AMD', rawDesc: `SKU : 100-100001405WOF\nBRAND : AMD\nTHREADS : 12\nCACHE : 32MB\nSERIES : Ryzen 5\nSOCKET : AM5\nMAX TURBO FREQUENCY : 5.4 GHz\nINTEGRATED GRAPHICS : Yes` },
  { name: 'AMD Ryzen 7 7700X', price: 28490, category: 'Processor', brand: 'AMD', rawDesc: `SKU : 100-100000591WOF\nBRAND : AMD\nSOCKET : AM5\nINTEGRATED GRAPHICS : Yes\nTHREADS : 16\nCACHE : 32MB\nMAX TURBO FREQUENCY : 5.4 GHz\nSERIES : Ryzen 7` },
  { name: 'AMD Ryzen 7 8700G', price: 28890, category: 'Processor', brand: 'AMD', rawDesc: `SKU : 100-100001236BOX\nBRAND : AMD\nSOCKET : AM5\nSERIES : Ryzen 7\nINTEGRATED GRAPHICS : Yes\nTHREADS : 16\nMAX TURBO FREQUENCY : 5.1 GHz\nCACHE : 24MB` },
  { name: 'AMD Ryzen 7 9700X', price: 30950, category: 'Processor', brand: 'AMD', rawDesc: `SKU : 100-100001404WOF\nBRAND : AMD\nTHREADS : 16\nCACHE : 32MB\nSERIES : Ryzen 7\nSOCKET : AM5\nMAX TURBO FREQUENCY : 5.5 GHz\nINTEGRATED GRAPHICS : Yes` },
  { name: 'AMD Ryzen 9 7900X', price: 35990, category: 'Processor', brand: 'AMD', rawDesc: `SKU : 100-100000589WOF\nBRAND : AMD\nSOCKET : AM5\nSERIES : Ryzen 9\nINTEGRATED GRAPHICS : Yes\nTHREADS : 24\nMAX TURBO FREQUENCY : 5.6 GHz\nCACHE : 64MB` },
  { name: 'AMD Ryzen 7 5800X3D', price: 38990, category: 'Processor', brand: 'AMD', rawDesc: `SKU : 100-100000651POF\nBRAND : AMD\nTHREADS : 16\nCACHE : 100 MB\nSERIES : Ryzen 7\nMAX TURBO FREQUENCY : 4.5 GHz` },
  { name: 'AMD Ryzen 7 7800X3D', price: 40990, category: 'Processor', brand: 'AMD', rawDesc: `SKU : 100-100000910WOF\nBRAND : AMD\nINTEGRATED GRAPHICS : Yes\nSERIES : Ryzen 7\nSOCKET : AM5\nMAX TURBO FREQUENCY : 5.0 GHz\nCACHE : 96MB\nTHREADS : 16` },
  { name: 'AMD Ryzen 9 9900X', price: 43190, category: 'Processor', brand: 'AMD', rawDesc: `SKU : 100-100000662WOF\nBRAND : AMD\nTHREADS : 24\nCACHE : 64MB\nSERIES : Ryzen 9\nSOCKET : AM5\nMAX TURBO FREQUENCY : 5.6 GHz\nINTEGRATED GRAPHICS : Yes` },
  { name: 'AMD Ryzen 7 9800X3D', price: 47990, category: 'Processor', brand: 'AMD', rawDesc: `SKU : 100-100001084WOF\nBRAND : AMD\nTHREADS : 16\nCACHE : 96MB\nSERIES : Ryzen 7\nSOCKET : AM5\nMAX TURBO FREQUENCY : 5.2 GHz\nINTEGRATED GRAPHICS : Yes` },
  { name: 'AMD Ryzen 9 9850X3D', price: 53490, category: 'Processor', brand: 'AMD', rawDesc: `SKU : 100-100001973WOF\nBRAND : AMD\nSOCKET : AM5\nINTEGRATED GRAPHICS : Yes\nTHREADS : 16\nSERIES : Ryzen 7\nCACHE : 104MB\nMAX TURBO FREQUENCY : 5.6 GHz` },
  { name: 'AMD Ryzen 9 9950X', price: 58990, category: 'Processor', brand: 'AMD', rawDesc: `SKU : 100-100001277WOF\nBRAND : AMD\nTHREADS : 32\nCACHE : 64MB\nSERIES : Ryzen 9\nSOCKET : AM5\nMAX TURBO FREQUENCY : 5.7 GHz\nINTEGRATED GRAPHICS : Yes` },
  { name: 'AMD Ryzen 9 9900X3D', price: 59490, category: 'Processor', brand: 'AMD', rawDesc: `SKU : 100-100001368WOF\nBRAND : AMD\nTHREADS : 24\nCACHE : 140MB\nSERIES : Ryzen 9\nSOCKET : AM5\nMAX TURBO FREQUENCY : 5.5 GHz\nINTEGRATED GRAPHICS : Yes` },
  { name: 'AMD Ryzen 9 9950X3D', price: 72490, category: 'Processor', brand: 'AMD', rawDesc: `SKU : 100-100000719WOF\nBRAND : AMD\nTHREADS : 32\nCACHE : 144MB\nSERIES : Ryzen 9\nSOCKET : AM5\nMAX TURBO FREQUENCY : 5.7 GHz\nINTEGRATED GRAPHICS : Yes` },
  { name: 'AMD Ryzen 9 9950X3D2 Dual Edition', price: 101990, category: 'Processor', brand: 'AMD', rawDesc: `SKU : 100-100001978WOF\nBRAND : AMD\nTHREADS : 32\nCACHE : 192MB\nSERIES : Ryzen 9\nMAX TURBO FREQUENCY : 5.6 GHz` },

  // Motherboards
  { name: 'ROG Strix B850-F Gaming WiFi', price: 24999, category: 'Motherboard', brand: 'ASUS', rawDesc: `SKU : ROG-B850F-WIFI\nBRAND : ASUS\nSOCKET : AM5\nFORM FACTOR : ATX\nRAM TYPE : DDR5` },
  { name: 'MSI B760M Bomber WIFI', price: 11490, category: 'Motherboard', brand: 'MSI', rawDesc: `SKU : MSI-B760M-BOMBER\nBRAND : MSI\nSOCKET : LGA1700\nFORM FACTOR : Micro-ATX\nRAM TYPE : DDR5` },
  { name: 'Gigabyte B650M Gaming Plus WiFi', price: 14990, category: 'Motherboard', brand: 'Gigabyte', rawDesc: `SKU : GB-B650M-GAMING\nBRAND : Gigabyte\nSOCKET : AM5\nFORM FACTOR : Micro-ATX\nRAM TYPE : DDR5` },

  // RAM
  { name: 'Corsair Vengeance 32GB DDR5 6000MHz', price: 9799, category: 'RAM', brand: 'Corsair', rawDesc: `SKU : CMK32GX5M2B6000C36\nBRAND : Corsair\nRAM TYPE : DDR5` },
  { name: 'G.Skill Trident Z5 RGB 32GB DDR5', price: 12990, category: 'RAM', brand: 'G.Skill', rawDesc: `SKU : F5-6000J3038F16GX2-TZ5NR\nBRAND : G.Skill\nRAM TYPE : DDR5` },

  // GPUs
  { name: 'Zotac GeForce RTX 4060 Ti 8GB Twin Edge', price: 36490, category: 'GPU', brand: 'Zotac', rawDesc: `SKU : ZT-D40610E-10M\nBRAND : Zotac\nTDP : 160` },
  { name: 'ASUS ROG Strix RTX 4090 24GB OC Edition', price: 199990, category: 'GPU', brand: 'ASUS', rawDesc: `SKU : ROG-STRIX-RTX4090-O24G\nBRAND : ASUS\nTDP : 450` },

  // Coolers
  { name: 'DeepCool AK620 Digital CPU Air Cooler', price: 6490, category: 'Cooler', brand: 'DeepCool', rawDesc: `SKU : R-AK620-BKNNMT-G-1\nBRAND : DeepCool` },
  { name: 'NZXT Kraken Elite 360 RGB AIO Liquid Cooler', price: 24990, category: 'Cooler', brand: 'NZXT', rawDesc: `SKU : RL-KR36E-B1\nBRAND : NZXT` },

  // Storage
  { name: 'Crucial T700 2TB PCIe Gen5 NVMe M.2 SSD', price: 28990, category: 'Storage', brand: 'Crucial', rawDesc: `SKU : CT2000T700SSD3\nBRAND : Crucial` },

  // PSUs
  { name: 'Corsair RM850e 850W 80+ Gold Fully Modular PSU', price: 10490, category: 'PSU', brand: 'Corsair', rawDesc: `SKU : CP-9020263-IN\nBRAND : Corsair\nTDP : 850` },

  // Cabinets
  { name: 'Lian Li O11 Dynamic EVO RGB Cabinet', price: 15990, category: 'Cabinet', brand: 'Lian Li', rawDesc: `SKU : O11DE-RGB-BLACK\nBRAND : Lian Li\nFORM FACTOR : ATX` }
];

export async function seedProducts() {
  console.log('🌱 [Seeder] Starting 100% Strict Excel Product Seeding...');

  for (const item of allProductsData) {
    const catSlug = item.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const brandSlug = item.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const category = await prisma.category.upsert({
      where: { slug: catSlug },
      update: {},
      create: { name: item.category, slug: catSlug }
    });

    const brand = await prisma.brand.upsert({
      where: { slug: brandSlug },
      update: {},
      create: { name: item.brand, slug: brandSlug }
    });

    const lines = item.rawDesc.split('\n').map((l) => l.trim()).filter(Boolean);
    const specMap: Record<string, string> = {};
    const specsArray: { label: string; val: string }[] = [];

    lines.forEach((line) => {
      if (line.includes(':')) {
        const parts = line.split(':');
        const label = parts[0].trim();
        const val = parts.slice(1).join(':').trim();
        if (label && val) {
          specMap[label.toUpperCase()] = val;
          specsArray.push({ label, val });
        }
      }
    });

    const sku = specMap['SKU'] || `ALPHA-${item.name.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase()}`;
    const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const socket = specMap['SOCKET'] || null;
    const hasIntegratedGpu = specMap['INTEGRATED GRAPHICS']?.toLowerCase() === 'yes';
    const series = specMap['SERIES'] || null;
    const threads = specMap['THREADS'] ? parseInt(specMap['THREADS']) : null;
    const cache = specMap['CACHE'] || null;
    const maxTurboFrequency = specMap['MAX TURBO FREQUENCY'] || null;

    await prisma.product.upsert({
      where: { sku },
      update: {
        name: item.name,
        price: item.price,
        originalPrice: item.price * 1.15,
        inStock: true,
        specifications: specsArray as any
      },
      create: {
        sku,
        name: item.name,
        slug,
        price: item.price,
        originalPrice: item.price * 1.15,
        inStock: true,
        stockQuantity: 25,
        badge: item.price > 40000 ? 'HOT' : null,
        imageUrl: 'https://images.pexels.com/photos/11272008/pexels-photo-11272008.jpeg',
        categoryId: category.id,
        brandId: brand.id,
        socket,
        series,
        hasIntegratedGpu,
        threads,
        cache,
        maxTurboFrequency,
        description: item.rawDesc,
        specifications: specsArray as any,
        features: ['Zen Architecture', 'Official Warranty', 'Bench-Tested']
      }
    });
  }

  console.log(`✅ [Seeder] Seeded ${allProductsData.length} Exact Excel Products into PostgreSQL!`);
}

if (process.argv[1]?.includes('seedFromExcel')) {
  seedProducts()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
    });
}
