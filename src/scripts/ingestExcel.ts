import path from 'path';
import fs from 'fs';
import XLSX from 'xlsx';
import { prisma } from '../config/db';

/**
 * Universal Specification Line Parser
 * Handles colon-separated ("SOCKET : AM4") and space-separated ("Number Of CPU Cores 6") Excel dumps cleanly.
 */
export function parseSpecLines(lines: string[]) {
  const specMap: Record<string, string> = {};
  const specsArray: { label: string; val: string }[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.toLowerCase() === 'features') return;

    let label = '';
    let val = '';

    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      label = parts[0].trim();
      val = parts.slice(1).join(':').trim();
    } else {
      // Regex for space-separated specification pairs (e.g., "Number Of CPU Cores 6" or "System Memory Type DDR4")
      const match = trimmed.match(/^(.*?)\s+([0-9.]+[A-Za-z%]*|Yes|No|AM4|AM5|LGA1700|DDR4|DDR5|ATX|Micro-ATX|[0-9]+\s*[A-Za-z0-9\s-]+)$/i);
      if (match) {
        label = match[1].trim();
        val = match[2].trim();
      } else {
        const lastSpaceIndex = trimmed.lastIndexOf(' ');
        if (lastSpaceIndex > 0) {
          label = trimmed.substring(0, lastSpaceIndex).trim();
          val = trimmed.substring(lastSpaceIndex + 1).trim();
        }
      }
    }

    if (label && val && label.length < 50 && label.toUpperCase() !== 'SKU' && label.toUpperCase() !== 'NAME') {
      // Avoid duplicate keys if already added with colon
      if (!specMap[label.toUpperCase()]) {
        specMap[label.toUpperCase()] = val;
        specsArray.push({ label, val });
      }
    }
  });

  return { specMap, specsArray };
}

/**
 * 100% Pure Excel Data Ingestion Pipeline
 */
export async function ingestExcelFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found at path: ${filePath}`);
  }

  console.log(`🚀 [Ingestion Pipeline] Opening file: ${filePath}`);

  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;

  console.log(`📑 [Ingestion Pipeline] Reading ${sheetNames.length} sheets:`, sheetNames.join(', '));

  let totalIngested = 0;

  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (rawRows.length === 0) continue;

    console.log(`📊 [Sheet: "${sheetName}"] Parsing ${rawRows.length} rows...`);

    let sheetCount = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];

      const cellValues: string[] = Object.values(row)
        .map((v) => String(v).trim())
        .filter(Boolean);

      if (cellValues.length === 0) continue;

      const fullText = cellValues.join('\n');
      const lines = fullText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      // Parse specifications cleanly using dual-mode parser
      const { specMap, specsArray } = parseSpecLines(lines);

      // 🔍 1. Extract Product Name
      let name = '';
      for (const key of Object.keys(row)) {
        const k = key.trim().toLowerCase();
        const val = String(row[key]).trim();
        if (
          (k.includes('name') || k.includes('title') || k.includes('model') || k === 'product' || k === 'item' || k === 'processor') &&
          val.length > 2
        ) {
          name = val;
          break;
        }
      }

      if (!name) {
        for (const line of lines) {
          const uLine = line.toUpperCase();
          if (
            !uLine.startsWith('SKU') &&
            !uLine.startsWith('BRAND') &&
            !uLine.startsWith('SOCKET') &&
            !uLine.startsWith('THREADS') &&
            !uLine.startsWith('SERIES') &&
            !uLine.startsWith('CACHE') &&
            !uLine.startsWith('PRICE') &&
            !uLine.startsWith('INTEGRATED GRAPHICS') &&
            !line.includes(':') &&
            line.toLowerCase() !== 'features' &&
            line.length > 3
          ) {
            name = line;
            break;
          }
        }
      }

      if (!name && specMap['SKU']) name = specMap['SKU'];
      if (!name && lines[0]) name = lines[0].substring(0, 100);

      name = name.replace(/^SKU\s*:\s*/i, '').replace(/^NAME\s*:\s*/i, '').trim();

      // 🔍 2. Extract Price
      let price = 0;
      for (const key of Object.keys(row)) {
        const k = key.trim().toLowerCase();
        if (k.includes('price') || k.includes('mrp') || k.includes('cost')) {
          const pVal = parseFloat(String(row[key]).replace(/[^0-9.]/g, ''));
          if (!isNaN(pVal) && pVal > 0) {
            price = pVal;
            break;
          }
        }
      }

      if (price === 0 && specMap['PRICE']) {
        price = parseFloat(specMap['PRICE'].replace(/[^0-9.]/g, ''));
      }

      // 🔍 3. Extract Category & Brand
      let categoryName = row.Category || row.category || specMap['CATEGORY'] || sheetName;
      let brandName = row.Brand || row.brand || specMap['BRAND'] || (name.includes('Intel') ? 'Intel' : 'AMD');

      const catSlug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const category = await prisma.category.upsert({
        where: { slug: catSlug },
        update: {},
        create: { name: categoryName, slug: catSlug }
      });

      const brand = await prisma.brand.upsert({
        where: { slug: brandSlug },
        update: {},
        create: { name: brandName, slug: brandSlug }
      });

      const sku = specMap['SKU'] || row.SKU || `EXCEL-${name.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase()}-${i + 1}`;
      const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}-${i + 1}`;

      const socket = specMap['SOCKET'] || specMap['SOCKET AM4'] ? 'AM4' : specMap['SOCKET AM5'] ? 'AM5' : row.Socket || null;
      const series = specMap['SERIES'] || row.Series || null;
      const hasIntegratedGpu = specMap['INTEGRATED GRAPHICS']?.toLowerCase() === 'yes' || specMap['INTEGRATED GRAPHICS']?.toLowerCase() === 'radeon';
      const threads = specMap['THREADS'] || specMap['NUMBER OF CPU THREADS'] ? parseInt(specMap['THREADS'] || specMap['NUMBER OF CPU THREADS']) : null;
      const tdp = specMap['TDP'] ? parseInt(specMap['TDP']) : null;
      const cache = specMap['CACHE'] || specMap['TOTAL L3 CACHE'] || null;
      const maxTurboFrequency = specMap['MAX TURBO FREQUENCY'] || specMap['MAX BOOST CLOCK'] || null;
      const ramType = specMap['RAM TYPE'] || specMap['SYSTEM MEMORY TYPE'] || null;
      const formFactor = specMap['FORM FACTOR'] || null;
      const badge = specMap['BADGE'] || row.Badge || null;
      const imageUrl = row.Image || row.image || row.ImageUrl || 'https://images.pexels.com/photos/11272008/pexels-photo-11272008.jpeg';

      await prisma.product.upsert({
        where: { sku },
        update: {
          name,
          price,
          originalPrice: price > 0 ? price * 1.15 : null,
          inStock: true,
          specifications: specsArray as any,
          description: fullText
        },
        create: {
          sku,
          name,
          slug,
          price,
          originalPrice: price * 1.15,
          inStock: true,
          stockQuantity: 20,
          badge,
          imageUrl,
          categoryId: category.id,
          brandId: brand.id,
          socket,
          series,
          hasIntegratedGpu,
          threads,
          cache,
          maxTurboFrequency,
          tdp,
          ramType,
          formFactor,
          description: fullText,
          specifications: specsArray as any,
          features: specsArray.slice(0, 8).map((s) => `${s.label}: ${s.val}`)
        }
      });

      sheetCount++;
    }

    console.log(`  └─ Ingested ${sheetCount} products with universal spec parsing from sheet "${sheetName}".`);
    totalIngested += sheetCount;
  }

  console.log(`\n🎉 [Ingestion Pipeline] Complete! ${totalIngested} products stored cleanly.`);
  return totalIngested;
}

// CLI runner
if (require.main === module) {
  const targetFile = process.argv[2] || path.join(__dirname, '../../sample_data.csv');
  ingestExcelFile(targetFile)
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error('❌ Ingestion Error:', err);
      prisma.$disconnect();
      process.exit(1);
    });
}
