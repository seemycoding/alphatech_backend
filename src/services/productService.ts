import { prisma } from '../config/db';

export class ProductService {
  static async getProducts(query: {
    category?: string;
    categories?: string;
    categoryId?: string;
    brand?: string;
    brands?: string;
    socket?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
    sortBy?: string;
    search?: string;
    page?: string;
    limit?: string;
  }) {
    const page = Math.max(1, parseInt(query.page || '1'));
    const limit = Math.max(1, parseInt(query.limit || '12'));
    const skip = (page - 1) * limit;

    const where: any = {};

    // 🎯 Robust Multi-Category Filtering (comma-separated or single)
    const rawCatStr = query.categories || query.category || '';
    if (query.categoryId && query.categoryId.toLowerCase() !== 'all') {
      where.categoryId = query.categoryId;
    } else if (rawCatStr && rawCatStr.toLowerCase() !== 'all') {
      const catList = rawCatStr
        .split(',')
        .map((c) => c.trim().toLowerCase())
        .filter((c) => c && c !== 'all');

      if (catList.length > 0) {
        const catOrConditions: any[] = [];
        for (const catSearch of catList) {
          let searchTerms: string[] = [catSearch];
          if (catSearch === 'gpu' || catSearch.includes('graphic')) {
            searchTerms.push('gpu', 'graphics', 'card');
          } else if (catSearch === 'processor' || catSearch === 'processors' || catSearch === 'cpu') {
            searchTerms.push('processor', 'processors', 'cpu');
          } else if (catSearch === 'motherboard' || catSearch === 'motherboards' || catSearch === 'mobo') {
            searchTerms.push('motherboard', 'motherboards', 'mobo');
          } else if (catSearch === 'ram' || catSearch.includes('memory')) {
            searchTerms.push('ram', 'memory');
          } else if (catSearch === 'storage' || catSearch.includes('ssd') || catSearch.includes('drive')) {
            searchTerms.push('storage', 'ssd', 'drive', 'nvme');
          } else if (catSearch === 'psu' || catSearch.includes('power')) {
            searchTerms.push('psu', 'power', 'supply');
          }

          for (const term of searchTerms) {
            catOrConditions.push(
              { categoryId: term },
              { category: { slug: { contains: term } } },
              { category: { name: { contains: term } } }
            );
          }
        }

        where.OR = where.OR ? [...where.OR, ...catOrConditions] : catOrConditions;
      }
    }

    // 🎯 Robust Multi-Brand Filtering (comma-separated or single)
    const rawBrandStr = query.brands || query.brand || '';
    if (rawBrandStr && rawBrandStr.toLowerCase() !== 'all') {
      const brandList = rawBrandStr
        .split(',')
        .map((b) => b.trim().toLowerCase())
        .filter((b) => b && b !== 'all');

      if (brandList.length > 0) {
        const brandOrConditions: any[] = [];
        for (const brandSearch of brandList) {
          brandOrConditions.push(
            { brand: { slug: { contains: brandSearch } } },
            { brand: { name: { contains: brandSearch } } }
          );
        }

        if (where.OR) {
          where.AND = [{ OR: where.OR }, { OR: brandOrConditions }];
          delete where.OR;
        } else {
          where.OR = brandOrConditions;
        }
      }
    }

    if (query.socket) {
      where.socket = { equals: query.socket };
    }

    if (query.inStock === 'true') {
      where.inStock = true;
    }

    if (query.minPrice || query.maxPrice) {
      where.price = {};
      if (query.minPrice) where.price.gte = parseFloat(query.minPrice);
      if (query.maxPrice) where.price.lte = parseFloat(query.maxPrice);
    }

    if (query.search) {
      const searchOr = [
        { name: { contains: query.search } },
        { sku: { contains: query.search } },
        { description: { contains: query.search } },
        { brand: { name: { contains: query.search } } },
        { category: { name: { contains: query.search } } }
      ];

      if (where.AND) {
        where.AND.push({ OR: searchOr });
      } else if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchOr }];
        delete where.OR;
      } else {
        where.OR = searchOr;
      }
    }

    let orderBy: any = { createdAt: 'desc' };
    if (query.sortBy === 'price-low') {
      orderBy = { price: 'asc' };
    } else if (query.sortBy === 'price-high') {
      orderBy = { price: 'desc' };
    } else if (query.sortBy === 'popular') {
      orderBy = { stockQuantity: 'desc' };
    }

    const products = await prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        category: true,
        brand: true
      }
    });

    const total = await prisma.product.count({ where });

    return {
      products,
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getProductByIdOrSlug(idOrSlug: string) {
    return prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }, { sku: idOrSlug }]
      },
      include: {
        category: true,
        brand: true
      }
    });
  }

  static async getCategories() {
    return prisma.category.findMany({
      include: {
        _count: { select: { products: true } }
      },
      orderBy: { name: 'asc' }
    });
  }

  static async getBrands() {
    return prisma.brand.findMany({
      include: {
        _count: { select: { products: true } }
      },
      orderBy: { name: 'asc' }
    });
  }

  static async getFilterMetadata() {
    const sockets = await prisma.product.findMany({
      select: { socket: true },
      where: { socket: { not: null } },
      distinct: ['socket']
    });

    const ramTypes = await prisma.product.findMany({
      select: { ramType: true },
      where: { ramType: { not: null } },
      distinct: ['ramType']
    });

    const formFactors = await prisma.product.findMany({
      select: { formFactor: true },
      where: { formFactor: { not: null } },
      distinct: ['formFactor']
    });

    return {
      sockets: sockets.map((s) => s.socket).filter(Boolean),
      ramTypes: ramTypes.map((r) => r.ramType).filter(Boolean),
      formFactors: formFactors.map((f) => f.formFactor).filter(Boolean)
    };
  }
}
