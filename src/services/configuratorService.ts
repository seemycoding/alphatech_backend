import { prisma } from '../config/db';
import { ConfiguratorCheckPayload } from '../types';

function getProductSocket(p: any): string | null {
  if (p.socket) return p.socket;
  const fullText = `${p.name} ${JSON.stringify(p.specifications || [])}`;
  if (/\bAM5\b/i.test(fullText)) return 'AM5';
  if (/\bAM4\b/i.test(fullText)) return 'AM4';
  if (/\b(LGA1851|LGA-1851|1851)\b/i.test(fullText)) return 'LGA1851';
  if (/\b(LGA1700|LGA-1700|1700)\b/i.test(fullText)) return 'LGA1700';
  if (/\b(LGA1200|LGA-1200|1200)\b/i.test(fullText)) return 'LGA1200';
  if (/\b(LGA1151|LGA-1151|1151)\b/i.test(fullText)) return 'LGA1151';
  return null;
}

function getProductRamType(p: any): string | null {
  if (p.ramType) return p.ramType;
  const fullText = `${p.name} ${JSON.stringify(p.specifications || [])}`;
  if (/\bDDR5\b/i.test(fullText)) return 'DDR5';
  if (/\bDDR4\b/i.test(fullText)) return 'DDR4';
  if (/\bDDR3\b/i.test(fullText)) return 'DDR3';
  return null;
}

function getProductFormFactor(p: any): string | null {
  if (p.formFactor) return p.formFactor;
  const fullText = `${p.name} ${JSON.stringify(p.specifications || [])}`;
  if (/\b(E-ATX|EATX)\b/i.test(fullText)) return 'E-ATX';
  if (/\b(Micro-ATX|m-ATX|mATX|Micro ATX)\b/i.test(fullText)) return 'Micro-ATX';
  if (/\b(Mini-ITX|Mini ITX|ITX)\b/i.test(fullText)) return 'Mini-ITX';
  if (/\bATX\b/i.test(fullText)) return 'ATX';
  return null;
}

export class ConfiguratorService {
  static async getConfiguratorOptions() {
    const products = await prisma.product.findMany({
      where: { inStock: true },
      include: { category: true, brand: true }
    });

    const optionsMap: Record<string, any[]> = {
      processor: [],
      motherboard: [],
      ram: [],
      gpu: [],
      cooler: [],
      storage: [],
      psu: [],
      case: []
    };

    products.forEach((p) => {
      const catSlug = p.category.slug.toLowerCase();
      const socket = getProductSocket(p);
      const ramType = getProductRamType(p);
      const formFactor = getProductFormFactor(p);

      const option = {
        id: p.id,
        name: p.name,
        brand: p.brand.name,
        price: Number(p.price),
        formattedPrice: `₹${Number(p.price).toLocaleString('en-IN')}`,
        socket,
        tdp: p.tdp || 65,
        hasIntegratedGpu: p.hasIntegratedGpu,
        ramType,
        formFactor,
        image: p.imageUrl,
        specs: p.specifications
      };

      if (catSlug.includes('process') || catSlug === 'cpu') optionsMap.processor.push(option);
      else if (catSlug.includes('motherboard') || catSlug === 'mobo') optionsMap.motherboard.push(option);
      else if (catSlug.includes('ram') || catSlug.includes('memory')) optionsMap.ram.push(option);
      else if (catSlug.includes('gpu') || catSlug.includes('graphic') || catSlug.includes('card')) optionsMap.gpu.push(option);
      else if (catSlug.includes('cooler') || catSlug.includes('cooling')) optionsMap.cooler.push(option);
      else if (catSlug.includes('storage') || catSlug.includes('ssd') || catSlug.includes('drive')) optionsMap.storage.push(option);
      else if (catSlug.includes('psu') || catSlug.includes('power')) optionsMap.psu.push(option);
      else if (catSlug.includes('case') || catSlug.includes('cabinet')) optionsMap.case.push(option);
    });

    return optionsMap;
  }

  static async checkCompatibility(payload: ConfiguratorCheckPayload) {
    const ids = Object.values(payload).filter(Boolean) as string[];
    if (ids.length === 0) {
      return {
        compatible: true,
        totalPrice: 0,
        formattedTotalPrice: '₹0',
        estimatedTdp: 0,
        recommendedPsuWattage: 450,
        warnings: [],
        errors: []
      };
    }

    const selectedProducts = await prisma.product.findMany({
      where: { id: { in: ids } },
      include: { category: true }
    });

    const partMap: Record<string, any> = {};
    let totalPrice = 0;
    let totalTdp = 100;

    selectedProducts.forEach((p) => {
      const catSlug = p.category.slug.toLowerCase();
      totalPrice += Number(p.price);
      if (p.tdp) totalTdp += p.tdp;

      if (catSlug.includes('process') || catSlug === 'cpu') partMap.processor = p;
      if (catSlug.includes('motherboard')) partMap.motherboard = p;
      if (catSlug.includes('ram')) partMap.ram = p;
      if (catSlug.includes('gpu') || catSlug.includes('graphic')) partMap.gpu = p;
      if (catSlug.includes('cooler')) partMap.cooler = p;
      if (catSlug.includes('psu') || catSlug.includes('power')) partMap.psu = p;
      if (catSlug.includes('case')) partMap.case = p;
    });

    const warnings: string[] = [];
    const errors: string[] = [];

    if (partMap.processor && partMap.motherboard) {
      const cpuSocket = getProductSocket(partMap.processor);
      const moboSocket = getProductSocket(partMap.motherboard);

      if (cpuSocket && moboSocket) {
        if (cpuSocket.toUpperCase() !== moboSocket.toUpperCase()) {
          errors.push(
            `Socket Mismatch: Selected CPU uses socket ${cpuSocket}, but Motherboard uses socket ${moboSocket}.`
          );
        }
      }
    }

    if (partMap.ram && partMap.motherboard) {
      const ramType = getProductRamType(partMap.ram);
      const moboRamType = getProductRamType(partMap.motherboard);

      if (ramType && moboRamType) {
        if (ramType.toUpperCase() !== moboRamType.toUpperCase()) {
          errors.push(
            `RAM Type Incompatibility: Selected RAM is ${ramType}, but Motherboard supports ${moboRamType} only.`
          );
        }
      }
    }

    if (partMap.processor && !partMap.processor.hasIntegratedGpu && !partMap.gpu) {
      warnings.push(
        `Graphics Warning: Selected CPU (${partMap.processor.name}) has no integrated graphics. A dedicated Graphics Card is required for video output.`
      );
    }

    const recommendedPsu = Math.ceil((totalTdp * 1.25) / 50) * 50;
    if (partMap.psu && partMap.psu.tdp) {
      if (partMap.psu.tdp < totalTdp) {
        warnings.push(
          `Power Supply Buffer Warning: Estimated system draw is ${totalTdp}W. Selected ${partMap.psu.tdp}W PSU may cause system stability issues under heavy gaming or rendering loads.`
        );
      }
    }

    if (partMap.motherboard && partMap.case) {
      const moboForm = getProductFormFactor(partMap.motherboard);
      const caseForm = getProductFormFactor(partMap.case);

      if (moboForm === 'ATX' && caseForm === 'Micro-ATX') {
        errors.push(
          `Physical Clearance Error: ATX Motherboard cannot physically fit inside Micro-ATX Cabinet.`
        );
      }
    }

    return {
      compatible: errors.length === 0,
      totalPrice,
      formattedTotalPrice: `₹${totalPrice.toLocaleString('en-IN')}`,
      estimatedTdp: totalTdp,
      recommendedPsuWattage: recommendedPsu,
      warnings,
      errors
    };
  }
}
