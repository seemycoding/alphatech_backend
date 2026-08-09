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
    const limit = Math.max(1, parseInt(query.limit || '12'));
    const skip = (page - 1) * limit;

    const where: any = {};

    // 🎯 Direct Category ID Foreign Key Filtering
    if (query.categoryId && query.categoryId.toLowerCase() !== 'all') {
      where.categoryId = query.categoryId;
    } else if (query.category && query.category.toLowerCase() !== 'all') {
      where.category = {
        OR: [
          { id: query.category },
          { slug: query.category.toLowerCase() },
          { name: { equals: query.category, mode: 'insensitive' } }
        ]
      };
    }

    if (query.brand) {
      where.brand = {
        OR: [
          { slug: { contains: query.brand.toLowerCase(), mode: 'insensitive' } },
          { name: { contains: query.brand, mode: 'insensitive' } }
        ]
      };
    }

    if (query.socket) {
      where.socket = { equals: query.socket, mode: 'insensitive' };
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
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { series: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (query.sortBy === 'price-low') orderBy = { price: 'asc' };
    if (query.sortBy === 'price-high') orderBy = { price: 'desc' };
    if (query.sortBy === 'name') orderBy = { name: 'asc' };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { category: true, brand: true }
      }),
      prisma.product.count({ where })
    ]);

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getProductByIdOrSlug(idOrSlug: string) {
    return prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }, { sku: idOrSlug }]
      },
      include: { category: true, brand: true }
    });
  }

  static async getCategories() {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { products: true } }
      },
      orderBy: { name: 'asc' }
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      count: c._count.products
    }));
  }

  static async getBrands() {
    return prisma.brand.findMany({ orderBy: { name: 'asc' } });
  }

  static async getFilterMetadata() {
    const [priceStats, socketsRaw, brands] = await Promise.all([
      prisma.product.aggregate({
        _min: { price: true },
        _max: { price: true }
      }),
      prisma.product.findMany({
        select: { socket: true },
        distinct: ['socket'],
        where: { socket: { not: null } }
      }),
      prisma.brand.findMany({ select: { id: true, name: true, slug: true } })
    ]);

    return {
      minPrice: priceStats._min.price ? Number(priceStats._min.price) : 0,
      maxPrice: priceStats._max.price ? Number(priceStats._max.price) : 150000,
      sockets: socketsRaw.map((s) => s.socket).filter(Boolean),
      brands
    };
  }
}
