import { prisma } from '../config/db';

export class ProductService {
  static async getProducts(query: {
    category?: string;
    categoryId?: string;
    brand?: string;
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
    const limit = Math.max(1, parseInt(query.limit || '50'));
    const skip = (page - 1) * limit;

    const where: any = {};

    // 🎯 Robust Category Filtering (Fully compatible with MySQL and PostgreSQL)
    if (query.categoryId && query.categoryId.toLowerCase() !== 'all') {
      where.categoryId = query.categoryId;
    } else if (query.category && query.category.toLowerCase() !== 'all') {
      const catSearch = query.category.toLowerCase();
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

      where.category = {
        OR: searchTerms.flatMap((term) => [
          { id: term },
          { slug: { contains: term } },
          { name: { contains: term } }
        ])
      };
    }

    if (query.brand) {
      where.brand = {
        OR: [
          { slug: { contains: query.brand.toLowerCase() } },
          { name: { contains: query.brand } }
        ]
      };
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
      where.OR = [
        { name: { contains: query.search } },
        { sku: { contains: query.search } },
        { description: { contains: query.search } },
        { brand: { name: { contains: query.search } } },
        { category: { name: { contains: query.search } } }
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (query.sortBy === 'price-low') {
      orderBy = { price: 'asc' };
    } else if (query.sortBy === 'price-high') {
      orderBy = { price: 'desc' };
    } else if (query.sortBy === 'popular') {
      orderBy = { stockQuantity: 'desc' };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: true,
          brand: true
        }
      }),
      prisma.product.count({ where })
    ]);

    return {
      products,
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
    const [sockets, ramTypes, formFactors] = await Promise.all([
      prisma.product.findMany({
        select: { socket: true },
        where: { socket: { not: null } },
        distinct: ['socket']
      }),
      prisma.product.findMany({
        select: { ramType: true },
        where: { ramType: { not: null } },
        distinct: ['ramType']
      }),
      prisma.product.findMany({
        select: { formFactor: true },
        where: { formFactor: { not: null } },
        distinct: ['formFactor']
      })
    ]);

    return {
      sockets: sockets.map((s) => s.socket).filter(Boolean),
      ramTypes: ramTypes.map((r) => r.ramType).filter(Boolean),
      formFactors: formFactors.map((f) => f.formFactor).filter(Boolean)
    };
  }
}
