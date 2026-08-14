import { prisma } from '../config/db';

export async function enrichProductMetadata() {
  console.log('🚀 Starting Product Metadata Analysis & Enrichment...');

  const products = await prisma.product.findMany({
    include: { category: true, brand: true }
  });

  console.log(`📦 Found ${products.length} total products in database.`);

  let updatedSockets = 0;
  let updatedRamTypes = 0;
  let updatedFormFactors = 0;
  let updatedTdps = 0;
  let updatedGpus = 0;

  for (const p of products) {
    const fullText = [
      p.name,
      p.category?.name || '',
      p.brand?.name || '',
      p.description || '',
      JSON.stringify(p.specifications || []),
      JSON.stringify(p.features || [])
    ].join(' ');

    let socket: string | null = p.socket;
    let ramType: string | null = p.ramType;
    let formFactor: string | null = p.formFactor;
    let tdp: number | null = p.tdp;
    let hasIntegratedGpu: boolean = p.hasIntegratedGpu;

    // 1. Socket Extraction
    if (!socket) {
      if (/\bAM5\b/i.test(fullText)) socket = 'AM5';
      else if (/\bAM4\b/i.test(fullText)) socket = 'AM4';
      else if (/\b(LGA1851|LGA-1851|1851)\b/i.test(fullText)) socket = 'LGA1851';
      else if (/\b(LGA1700|LGA-1700|1700)\b/i.test(fullText)) socket = 'LGA1700';
      else if (/\b(LGA1200|LGA-1200|1200)\b/i.test(fullText)) socket = 'LGA1200';
      else if (/\b(LGA1151|LGA-1151|1151)\b/i.test(fullText)) socket = 'LGA1151';
      else if (/\bsTR5\b/i.test(fullText)) socket = 'sTR5';
    }

    // 2. RAM Type Extraction
    if (!ramType) {
      if (/\bDDR5\b/i.test(fullText)) ramType = 'DDR5';
      else if (/\bDDR4\b/i.test(fullText)) ramType = 'DDR4';
      else if (/\bDDR3\b/i.test(fullText)) ramType = 'DDR3';
    }

    // 3. Form Factor Extraction
    if (!formFactor) {
      if (/\b(E-ATX|EATX)\b/i.test(fullText)) formFactor = 'E-ATX';
      else if (/\b(Micro-ATX|m-ATX|mATX|Micro ATX)\b/i.test(fullText)) formFactor = 'Micro-ATX';
      else if (/\b(Mini-ITX|Mini ITX|ITX)\b/i.test(fullText)) formFactor = 'Mini-ITX';
      else if (/\bATX\b/i.test(fullText)) formFactor = 'ATX';
    }

    // 4. TDP Extraction
    if (!tdp) {
      const tdpMatch = fullText.match(/\b(\d{2,3})\s*W\b/i) || fullText.match(/TDP\D*(\d{2,3})/i);
      if (tdpMatch && tdpMatch[1]) {
        const val = parseInt(tdpMatch[1]);
        if (val >= 35 && val <= 450) tdp = val;
      }
      if (!tdp) {
        // Sensible defaults based on category
        const catName = p.category?.name.toLowerCase() || '';
        if (catName.includes('processor')) tdp = 65;
        else if (catName.includes('graphic') || catName.includes('gpu')) tdp = 220;
      }
    }

    // 5. Integrated GPU Detection
    const nameLower = p.name.toLowerCase();
    const catLower = (p.category?.name || '').toLowerCase();
    if (catLower.includes('processor') || catLower.includes('cpu')) {
      if (/\b\d{4,5}[fF]\b/.test(p.name) || /\bultra\s+\d+\s+\d+f\b/i.test(p.name) || nameLower.includes('no graphics') || nameLower.includes('discrete graphics required')) {
        hasIntegratedGpu = false;
      } else if (nameLower.includes('graphics') || nameLower.includes('radeon') || nameLower.includes('uhd') || nameLower.includes('intel core') || nameLower.includes('ryzen')) {
        hasIntegratedGpu = true;
      }
    }

    // Check if anything changed
    const updated =
      socket !== p.socket ||
      ramType !== p.ramType ||
      formFactor !== p.formFactor ||
      tdp !== p.tdp ||
      hasIntegratedGpu !== p.hasIntegratedGpu;

    if (updated) {
      if (socket !== p.socket) updatedSockets++;
      if (ramType !== p.ramType) updatedRamTypes++;
      if (formFactor !== p.formFactor) updatedFormFactors++;
      if (tdp !== p.tdp) updatedTdps++;
      if (hasIntegratedGpu !== p.hasIntegratedGpu) updatedGpus++;

      await prisma.product.update({
        where: { id: p.id },
        data: {
          socket,
          ramType,
          formFactor,
          tdp,
          hasIntegratedGpu
        }
      });
    }
  }

  console.log('✅ Metadata Enrichment Complete!');
  console.log(`📊 Summary of Population:`);
  console.log(`   - Sockets Populated: ${updatedSockets}`);
  console.log(`   - RAM Types Populated: ${updatedRamTypes}`);
  console.log(`   - Form Factors Populated: ${updatedFormFactors}`);
  console.log(`   - TDP Values Populated: ${updatedTdps}`);
  console.log(`   - iGPU Flags Populated: ${updatedGpus}`);

  await prisma.$disconnect();
}

if (require.main === module) {
  enrichProductMetadata().catch((err) => {
    console.error('❌ Error during enrichment:', err);
    process.exit(1);
  });
}
