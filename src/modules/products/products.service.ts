import { prisma } from '../../config/database';
import slugify from 'slugify';

export const productsService = {
  async list(query: { page: number; limit: number; search?: string; categoryId?: string; isActive?: boolean; isFeatured?: boolean }) {
    const { page, limit, search, categoryId, isActive, isFeatured } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }];
    if (categoryId) where.categoryId = categoryId;
    if (isActive !== undefined) where.isActive = isActive;
    if (isFeatured !== undefined) where.isFeatured = isFeatured;

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: { select: { id: true, name: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true, createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!product) throw Object.assign(new Error('Product not found'), { status: 404 });
    return product;
  },

  async getBySlug(slug: string) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: { category: true },
    });
    if (!product) throw Object.assign(new Error('Product not found'), { status: 404 });
    return product;
  },

  async create(data: any, userId?: string) {
    const slug = data.slug || slugify(data.name, { lower: true, strict: true });
    return prisma.product.create({
      data: {
        ...data,
        slug,
        images: data.images || [],
        specifications: data.specifications || {},
        tags: data.tags || [],
        createdById: userId,
      },
      include: { category: true },
    });
  },

  async update(id: string, data: any) {
    if (data.name && !data.slug) {
      data.slug = slugify(data.name, { lower: true, strict: true });
    }
    return prisma.product.update({ where: { id }, data, include: { category: true } });
  },

  async delete(id: string) {
    return prisma.product.delete({ where: { id } });
  },

  async listCategories() {
    return prisma.productCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  },

  async createCategory(data: { name: string; description?: string; imageUrl?: string }) {
    const slug = slugify(data.name, { lower: true, strict: true });
    return prisma.productCategory.create({ data: { ...data, slug } });
  },
};
