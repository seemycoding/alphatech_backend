import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { prisma } from '../config/db';
import { ENV } from '../config/env';

interface ImageFile {
  imageName: string;
  relativePath: string;
  absolutePath: string;
  normalizedName: string;
  folderCategory?: string;
}

interface ProductItem {
  id: string;
  name: string;
  slug?: string;
  sku?: string;
  imageUrl?: string;
  category?: { name: string } | string;
  brand?: { name: string } | string;
  normalizedName: string;
  tokens: string[];
}

interface MatchResult {
  imageName: string;
  relativePath: string;
  absolutePath: string;
  imageUrl: string;
  matchedProductId: string;
  matchedProductName: string;
  matchedProductSku?: string;
  matchedCategory?: string;
  matchType: 'EXACT_NAME' | 'SLUG_MATCH' | 'SKU_MATCH' | 'TOKEN_SIMILARITY';
  confidenceScore: number;
  dbUpdated: boolean;
}

interface UnmatchedImage {
  imageName: string;
  relativePath: string;
  absolutePath: string;
  reason: string;
}

interface UnmatchedProduct {
  productId: string;
  productName: string;
  sku?: string;
  category?: string;
}

// Allowed image extensions
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg', '.avif', '.gif', '.bmp']);

/**
 * Recursively find all image files in a directory
 */
function getAllImageFiles(dirPath: string, rootUploadsDir: string): ImageFile[] {
  let results: ImageFile[] = [];
  if (!fs.existsSync(dirPath)) return results;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllImageFiles(fullPath, rootUploadsDir));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTENSIONS.has(ext)) {
        const relativePath = path.relative(rootUploadsDir, fullPath);
        const baseName = path.basename(entry.name, ext);
        const normalizedName = normalizeString(baseName);
        const folderParts = relativePath.split(path.sep);
        const folderCategory = folderParts.length > 1 ? folderParts[folderParts.length - 2] : undefined;

        results.push({
          imageName: entry.name,
          relativePath,
          absolutePath: fullPath,
          normalizedName,
          folderCategory
        });
      }
    }
  }

  return results;
}

/**
 * Clean & normalize string for fuzzy matching
 */
function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[_]/g, ' ')
    .replace(/[-]/g, ' ')
    .replace(/[^a-z0-9\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize string into significant words (ignoring short generic words)
 */
function tokenize(str: string): string[] {
  const normalized = normalizeString(str);
  const stopWords = new Set(['and', 'with', 'the', 'for', 'box', 'edition', 'series', 'gen', 'v2', 'v3', 'rgb', 'argb']);
  return normalized
    .split(' ')
    .filter((token) => token.length >= 2 && !stopWords.has(token));
}

/**
 * Fetch product list via API or fallback directly to Prisma Database
 */
async function fetchProducts(): Promise<ProductItem[]> {
  const apiBaseUrl = ENV.FRONTEND_URL.includes('localhost')
    ? `http://localhost:${ENV.PORT || 5001}/api`
    : 'https://api.alphaatechh.com/api';

  console.log(`🌐 Fetching products from API endpoint (${apiBaseUrl}/products)...`);

  try {
    const response = await axios.get(`${apiBaseUrl}/products`, {
      params: { limit: 10000 },
      timeout: 5000
    });

    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      console.log(`✅ Successfully fetched ${response.data.data.length} products via API.`);
      return response.data.data.map(mapApiProduct);
    } else if (response.data && Array.isArray(response.data.products)) {
      console.log(`✅ Successfully fetched ${response.data.products.length} products via API.`);
      return response.data.products.map(mapApiProduct);
    }
  } catch (apiError: any) {
    console.log(`⚠️ API Request un-reachable (${apiError.message}). Falling back to direct Prisma Database query...`);
  }

  // Fallback to direct DB query
  const dbProducts = await prisma.product.findMany({
    include: {
      category: true,
      brand: true
    }
  });

  console.log(`🗄️ Successfully fetched ${dbProducts.length} products directly from Prisma Database.`);

  return dbProducts.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku || undefined,
    imageUrl: p.imageUrl || undefined,
    category: p.category?.name || undefined,
    brand: p.brand?.name || undefined,
    normalizedName: normalizeString(p.name),
    tokens: tokenize(p.name)
  }));
}

function mapApiProduct(p: any): ProductItem {
  const categoryName = typeof p.category === 'object' ? p.category?.name : p.category;
  const brandName = typeof p.brand === 'object' ? p.brand?.name : p.brand;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    imageUrl: p.imageUrl,
    category: categoryName,
    brand: brandName,
    normalizedName: normalizeString(p.name),
    tokens: tokenize(p.name)
  };
}

/**
 * Main mapping & output generator script
 */
async function runImageMapping() {
  console.log(`\n======================================================`);
  console.log(`🔍 ALPHATECHH IMAGE-TO-PRODUCT MAPPING & DB UPDATE SCRIPT`);
  console.log(`======================================================\n`);

  const uploadsDir = path.resolve(process.cwd(), 'uploads');

  if (!fs.existsSync(uploadsDir)) {
    console.error(`❌ Uploads directory not found at: ${uploadsDir}`);
    process.exit(1);
  }

  console.log(`📁 Scanning uploads folder: ${uploadsDir}`);
  const images = getAllImageFiles(uploadsDir, uploadsDir);
  console.log(`📸 Found ${images.length} total image files inside uploads folder.\n`);

  const products = await fetchProducts();

  const matchedImages: MatchResult[] = [];
  const unmatchedImages: UnmatchedImage[] = [];
  const matchedProductIds = new Set<string>();

  console.log(`\n🔄 Matching images & updating Prisma database imageUrl field...`);
  let dbUpdateCount = 0;

  for (const img of images) {
    let bestMatch: { product: ProductItem; matchType: MatchResult['matchType']; score: number } | null = null;

    for (const prod of products) {
      const prodNorm = prod.normalizedName;
      const imgNorm = img.normalizedName;

      // 1. Exact Normalized Name Match
      if (imgNorm === prodNorm || imgNorm.includes(prodNorm) || prodNorm.includes(imgNorm)) {
        const score = imgNorm === prodNorm ? 100 : 95;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { product: prod, matchType: 'EXACT_NAME', score };
        }
      }

      // 2. Slug or SKU match
      if (!bestMatch && prod.slug && (imgNorm === normalizeString(prod.slug) || imgNorm.includes(normalizeString(prod.slug)))) {
        bestMatch = { product: prod, matchType: 'SLUG_MATCH', score: 90 };
      }
      if (!bestMatch && prod.sku && imgNorm.includes(normalizeString(prod.sku))) {
        bestMatch = { product: prod, matchType: 'SKU_MATCH', score: 90 };
      }

      // 3. Token similarity match
      if (!bestMatch || bestMatch.score < 90) {
        const imgTokens = tokenize(img.imageName);
        const prodTokens = prod.tokens;

        if (imgTokens.length > 0 && prodTokens.length > 0) {
          let matchedTokenCount = 0;
          for (const token of imgTokens) {
            if (prodTokens.includes(token)) {
              matchedTokenCount++;
            }
          }

          const score = Math.round((matchedTokenCount / Math.max(imgTokens.length, prodTokens.length)) * 100);

          // Threshold for confident match: at least 2 tokens matched or 60% overlap
          if (matchedTokenCount >= 2 || (matchedTokenCount >= 1 && score >= 50)) {
            if (!bestMatch || score > bestMatch.score) {
              bestMatch = { product: prod, matchType: 'TOKEN_SIMILARITY', score };
            }
          }
        }
      }
    }

    if (bestMatch && bestMatch.score >= 40) {
      matchedProductIds.add(bestMatch.product.id);
      const formattedImageUrl = `/uploads/${img.relativePath.replace(/\\/g, '/')}`;

      let dbUpdated = false;
      try {
        await prisma.product.update({
          where: { id: bestMatch.product.id },
          data: { imageUrl: formattedImageUrl }
        });
        dbUpdated = true;
        dbUpdateCount++;
      } catch (dbErr: any) {
        console.error(`⚠️ Failed to update DB for product ID ${bestMatch.product.id}:`, dbErr.message);
      }

      matchedImages.push({
        imageName: img.imageName,
        relativePath: img.relativePath,
        absolutePath: img.absolutePath,
        imageUrl: formattedImageUrl,
        matchedProductId: bestMatch.product.id,
        matchedProductName: bestMatch.product.name,
        matchedProductSku: bestMatch.product.sku,
        matchedCategory: typeof bestMatch.product.category === 'string' ? bestMatch.product.category : bestMatch.product.category?.name,
        matchType: bestMatch.matchType,
        confidenceScore: bestMatch.score,
        dbUpdated
      });
    } else {
      unmatchedImages.push({
        imageName: img.imageName,
        relativePath: img.relativePath,
        absolutePath: img.absolutePath,
        reason: 'No matching product found'
      });
    }
  }

  // Find products that didn't match any image
  const unmatchedProducts: UnmatchedProduct[] = products
    .filter((p) => !matchedProductIds.has(p.id))
    .map((p) => ({
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      category: typeof p.category === 'string' ? p.category : p.category?.name
    }));

  const totalImages = images.length;
  const totalMatched = matchedImages.length;
  const totalUnmatched = unmatchedImages.length;
  const matchRate = totalImages > 0 ? ((totalMatched / totalImages) * 100).toFixed(2) + '%' : '0%';

  const outputData = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalImagesFound: totalImages,
      totalProductsFetched: products.length,
      totalMatchedImages: totalMatched,
      totalUnmatchedImages: totalUnmatched,
      totalProductsWithImages: matchedProductIds.size,
      totalProductsWithoutImages: unmatchedProducts.length,
      totalDbRecordsUpdated: dbUpdateCount,
      matchAccuracyRate: matchRate
    },
    matchedImages,
    unmatchedImages,
    unmatchedProducts
  };

  const outputFilePath = path.resolve(process.cwd(), 'image_product_mapping.json');
  fs.writeFileSync(outputFilePath, JSON.stringify(outputData, null, 2), 'utf-8');

  console.log(`\n======================================================`);
  console.log(`📊 MAPPING & DB UPDATE SUMMARY REPORT:`);
  console.log(`======================================================`);
  console.log(` Total Images Scanned      : ${totalImages}`);
  console.log(` Total Products Loaded     : ${products.length}`);
  console.log(` ✅ Matched Images         : ${totalMatched} (${matchRate})`);
  console.log(` 💾 DB imageUrl Records Updated: ${dbUpdateCount}`);
  console.log(` ❌ Unmatched Images       : ${totalUnmatched}`);
  console.log(` 📦 Products With Images   : ${matchedProductIds.size}`);
  console.log(` ⚠️ Products Without Images: ${unmatchedProducts.length}`);
  console.log(`======================================================`);
  console.log(`💾 JSON Mapping File Saved:`);
  console.log(` 👉 ${outputFilePath}\n`);
}

runImageMapping()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Script execution error:', err);
    process.exit(1);
  });
