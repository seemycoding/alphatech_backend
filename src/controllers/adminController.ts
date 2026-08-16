import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/db';

export class AdminController {
  // Upload Product Image into Category Subfolder
  static async uploadProductImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file provided' });
      }

      const relPath = req.file.path.replace(/\\/g, '/');
      const uploadsIndex = relPath.indexOf('uploads/');
      const webPath = uploadsIndex !== -1 ? '/' + relPath.substring(uploadsIndex) : '/' + relPath;

      res.json({
        success: true,
        imageUrl: webPath,
        message: 'Product image uploaded successfully'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // 1. Dashboard Analytics & Summary Stats
  static async getDashboardStats(req: Request, res: Response) {
    try {
      const [totalOrders, totalProducts, totalCustomers, lowStockCount, paidOrders, recentOrders] =
        await Promise.all([
          prisma.order.count(),
          prisma.product.count(),
          prisma.user.count({ where: { role: 'CUSTOMER' } }),
          prisma.product.count({ where: { stockQuantity: { lte: 5 } } }),
          prisma.order.aggregate({
            where: { paymentStatus: 'PAID' },
            _sum: { totalAmount: true }
          }),
          prisma.order.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
              items: { include: { product: true } }
            }
          })
        ]);

      const totalRevenue = Number(paidOrders._sum.totalAmount || 0);

      res.json({
        success: true,
        data: {
          totalRevenue,
          formattedTotalRevenue: `₹${totalRevenue.toLocaleString('en-IN')}`,
          totalOrders,
          totalProducts,
          totalCustomers,
          lowStockCount,
          recentOrders
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // 2. Product Management (CRUD)
  static async getProducts(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = (req.query.search as string) || '';
      const categoryId = req.query.categoryId as string;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { sku: { contains: search } },
          { socket: { contains: search } }
        ];
      }
      if (categoryId && categoryId !== 'all') {
        where.categoryId = categoryId;
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { category: true, brand: true }
        }),
        prisma.product.count({ where })
      ]);

      res.json({
        success: true,
        data: products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getBrands(req: Request, res: Response) {
    try {
      const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' } });
      res.json({ success: true, data: brands });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async createProduct(req: Request, res: Response) {
    try {
      const {
        name,
        sku,
        price,
        originalPrice,
        categoryId,
        brandId,
        socket,
        ramType,
        formFactor,
        tdp,
        stockQuantity,
        imageUrl,
        description,
        specifications
      } = req.body;

      let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
      const existingSlugProduct = await prisma.product.findUnique({ where: { slug } });
      if (existingSlugProduct) {
        slug = `${slug}-${Math.floor(100 + Math.random() * 900)}`;
      }

      let finalSku = (sku && typeof sku === 'string' && sku.trim().length > 0)
        ? sku.trim()
        : `SKU-${Date.now()}`;

      const existingSkuProduct = await prisma.product.findUnique({ where: { sku: finalSku } });
      if (existingSkuProduct) {
        return res.status(400).json({
          success: false,
          message: `This SKU ("${finalSku}") is already saved in the database. Please cross verify.`
        });
      }

      // Ensure brandId is a valid foreign key in the database
      let validBrandId = brandId;
      if (validBrandId) {
        const brandExists = await prisma.brand.findUnique({ where: { id: validBrandId } });
        if (!brandExists) validBrandId = null;
      }

      if (!validBrandId) {
        const fallbackBrand = await prisma.brand.findFirst();
        if (fallbackBrand) {
          validBrandId = fallbackBrand.id;
        } else {
          const createdBrand = await prisma.brand.create({
            data: { name: 'Generic', slug: 'generic' }
          });
          validBrandId = createdBrand.id;
        }
      }

      const product = await prisma.product.create({
        data: {
          name,
          sku: finalSku,
          slug,
          price: parseFloat(price),
          originalPrice: originalPrice ? parseFloat(originalPrice) : null,
          categoryId,
          brandId: validBrandId,
          socket: socket || null,
          ramType: ramType || null,
          formFactor: formFactor || null,
          tdp: tdp ? parseInt(tdp) : null,
          stockQuantity: stockQuantity ? parseInt(stockQuantity) : 10,
          imageUrl: imageUrl || '/uploads/products_images/sample.jpg',
          description: description || '',
          specifications: specifications || []
        },
        include: { category: true, brand: true }
      });

      res.status(201).json({ success: true, data: product, message: 'Product created successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async updateProduct(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const data = { ...req.body };

      if (data.sku && typeof data.sku === 'string' && data.sku.trim() !== '') {
        const trimmedSku = data.sku.trim();
        const existingSku = await prisma.product.findFirst({
          where: {
            sku: trimmedSku,
            id: { not: id }
          }
        });
        if (existingSku) {
          return res.status(400).json({
            success: false,
            message: `This SKU ("${trimmedSku}") is already saved in the database. Please cross verify.`
          });
        }
        data.sku = trimmedSku;
      }

      if (data.price) data.price = parseFloat(data.price);
      if (data.originalPrice) data.originalPrice = parseFloat(data.originalPrice);
      if (data.stockQuantity) data.stockQuantity = parseInt(data.stockQuantity);
      if (data.tdp) data.tdp = parseInt(data.tdp);

      const product = await prisma.product.update({
        where: { id },
        data,
        include: { category: true, brand: true }
      });

      res.json({ success: true, data: product, message: 'Product updated successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async deleteProduct(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await prisma.product.delete({ where: { id } });
      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // 3. Category Management (CRUD)
  static async getCategories(req: Request, res: Response) {
    try {
      const categories = await prisma.category.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { products: true } } }
      });
      res.json({ success: true, data: categories });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async createCategory(req: Request, res: Response) {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ success: false, message: 'Category name is required' });
      }

      const cleanName = name.trim();
      const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const category = await prisma.category.create({
        data: { name: cleanName, slug }
      });

      // Auto-create corresponding image directory in uploads/products_images/
      const categoryDir = path.resolve(process.cwd(), 'uploads/products_images', cleanName);
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true });
      }

      res.status(201).json({ success: true, data: category, message: 'Category created successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async updateCategory(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { name } = req.body;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const category = await prisma.category.update({
        where: { id },
        data: { name, slug }
      });
      res.json({ success: true, data: category, message: 'Category updated successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async deleteCategory(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await prisma.category.delete({ where: { id } });
      res.json({ success: true, message: 'Category deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // 4. Users Registry List
  static async getUsers(req: Request, res: Response) {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          company: true,
          role: true,
          createdAt: true,
          _count: { select: { orders: true } }
        }
      });
      res.json({ success: true, data: users });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // 5. Order Management & Stage Updates (ORDER_RECEIVED -> PRECISION_ASSEMBLY -> STRESS_TESTING -> SHIPPED -> DELIVERED)
  static async getOrders(req: Request, res: Response) {
    try {
      const status = req.query.status as string;
      const where: any = {};
      if (status && status !== 'all') {
        where.orderStatus = status;
      }

      const orders = await prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { product: true } }
        }
      });
      res.json({ success: true, data: orders });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async updateOrderStatus(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { orderStatus, paymentStatus } = req.body;

      const updateData: any = {};
      if (orderStatus) updateData.orderStatus = orderStatus;
      if (paymentStatus) updateData.paymentStatus = paymentStatus;

      const order = await prisma.order.update({
        where: { id },
        data: updateData,
        include: { items: { include: { product: true } } }
      });

      res.json({ success: true, data: order, message: `Order updated to ${order.orderStatus}` });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // 6. Payments Tracking List
  static async getPayments(req: Request, res: Response) {
    try {
      const orders = await prisma.order.findMany({
        where: {
          OR: [{ razorpayPaymentId: { not: null } }, { paymentMethod: 'COD' }]
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerEmail: true,
          paymentMethod: true,
          paymentStatus: true,
          totalAmount: true,
          razorpayPaymentId: true,
          razorpayOrderId: true,
          createdAt: true
        }
      });

      res.json({ success: true, data: orders });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // 7. Coupon Management (CRUD)
  static async getCoupons(req: Request, res: Response) {
    try {
      const coupons = await prisma.coupon.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json({ success: true, data: coupons });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async createCoupon(req: Request, res: Response) {
    try {
      const { code, type, value, minOrderAmount, maxDiscount, usageLimit, expiresAt } = req.body;
      const coupon = await prisma.coupon.create({
        data: {
          code: code.toUpperCase(),
          type: type || 'PERCENTAGE',
          value: parseFloat(value),
          minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
          maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
          usageLimit: usageLimit ? parseInt(usageLimit) : null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          isActive: true
        }
      });
      res.status(201).json({ success: true, data: coupon, message: 'Coupon created successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async updateCoupon(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const coupon = await prisma.coupon.update({
        where: { id },
        data: req.body
      });
      res.json({ success: true, data: coupon, message: 'Coupon updated successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async deleteCoupon(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await prisma.coupon.delete({ where: { id } });
      res.json({ success: true, message: 'Coupon deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // 8. Offers & Flash Banners (CRUD)
  static async getOffers(req: Request, res: Response) {
    try {
      const offers = await prisma.offer.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json({ success: true, data: offers });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async createOffer(req: Request, res: Response) {
    try {
      const { title, bannerText, isFlashBanner, discountType, discountValue, bannerImageUrl, isActive } = req.body;

      if (isFlashBanner) {
        await prisma.offer.updateMany({
          where: { isFlashBanner: true },
          data: { isFlashBanner: false }
        });
      }

      const offer = await prisma.offer.create({
        data: {
          title,
          bannerText,
          isFlashBanner: !!isFlashBanner,
          discountType: discountType || null,
          discountValue: discountValue ? parseFloat(discountValue) : null,
          bannerImageUrl: bannerImageUrl || null,
          isActive: isActive !== undefined ? isActive : true
        }
      });
      res.status(201).json({ success: true, data: offer, message: 'Offer banner created successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async updateOffer(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      if (req.body.isFlashBanner) {
        await prisma.offer.updateMany({
          where: { id: { not: id }, isFlashBanner: true },
          data: { isFlashBanner: false }
        });
      }
      const offer = await prisma.offer.update({
        where: { id },
        data: req.body
      });
      res.json({ success: true, data: offer, message: 'Offer updated successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async deleteOffer(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await prisma.offer.delete({ where: { id } });
      res.json({ success: true, message: 'Offer deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // 9. Site Settings (Margin % & Build Assurance Text)
  static async getSettings(req: Request, res: Response) {
    try {
      const settings = await prisma.siteSetting.findMany();
      const settingsMap: Record<string, string> = {};
      settings.forEach((s) => {
        settingsMap[s.key] = s.value;
      });
      res.json({ success: true, data: settingsMap });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async updateSettings(req: Request, res: Response) {
    try {
      const settingsObj: Record<string, string> = req.body;
      for (const [key, value] of Object.entries(settingsObj)) {
        await prisma.siteSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) }
        });
      }
      res.json({ success: true, message: 'Settings updated successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // 10. Contact Inquiries Management
  static async getInquiries(req: Request, res: Response) {
    try {
      const inquiries = await prisma.contactMessage.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json({ success: true, data: inquiries });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async updateInquiryStatus(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { status } = req.body;
      const inquiry = await prisma.contactMessage.update({
        where: { id },
        data: { status }
      });
      res.json({ success: true, data: inquiry, message: 'Inquiry status updated' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async deleteInquiry(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await prisma.contactMessage.delete({ where: { id } });
      res.json({ success: true, message: 'Inquiry deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // 11. Newsletter Subscribers Management
  static async getSubscribers(req: Request, res: Response) {
    try {
      const subscribers = await prisma.newsletterSubscription.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json({ success: true, data: subscribers });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async deleteSubscriber(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await prisma.newsletterSubscription.delete({ where: { id } });
      res.json({ success: true, message: 'Subscriber deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
