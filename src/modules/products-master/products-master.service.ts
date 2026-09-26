import { prisma } from '../../config/database';
import { qrService } from '../qr/qr.service';
import { auditService } from '../audit/audit.service';

export const productsMasterService = {
  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    materialId?: string;
    finishId?: string;
    isActive?: boolean;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.materialId) where.materialId = query.materialId;
    if (query.finishId) where.finishId = query.finishId;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search, mode: 'insensitive' } },
        { hsnSac: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          subcategory: true,
          material: true,
          finish: true,
          unit: true,
          variants: true,
          qrCodes: true,
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        subcategory: true,
        material: true,
        finish: true,
        unit: true,
        variants: true,
        documents: true,
        qrCodes: true,
      },
    });

    if (!product) throw Object.assign(new Error('Product not found'), { status: 404 });
    return product;
  },

  async create(data: any, userId?: string) {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        shortDesc: data.shortDesc,
        sku: data.sku,
        barcode: data.barcode,
        hsnSac: data.hsnSac || '9403',
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        materialId: data.materialId,
        finishId: data.finishId,
        unitId: data.unitId,
        thickness: data.thickness,
        cuttingSize: data.cuttingSize,
        gstRate: data.gstRate ?? 18.0,
        basePrice: data.basePrice,
        costPrice: data.costPrice,
        isFeatured: Boolean(data.isFeatured),
        isActive: data.isActive !== false,
        images: data.images || [],
        specifications: data.specifications || {},
        tags: data.tags || [],
        createdById: userId,
      },
      include: {
        category: true,
        material: true,
        finish: true,
        unit: true,
      },
    });

    // Create a product QR code
    const token = qrService.generateToken('PRODUCT', product.id);
    await prisma.qrCode.create({
      data: {
        entityType: 'PRODUCT',
        entityId: product.id,
        productId: product.id,
        token,
        qrData: `http://localhost:5176/admin/dashboard/products?id=${product.id}`,
        status: 'ACTIVE',
      },
    });

    await auditService.log({
      userId,
      action: 'CREATE',
      module: 'Products',
      entityType: 'Product',
      entityId: product.id,
      newData: product,
    });

    return product;
  },

  async update(id: string, data: any, userId?: string) {
    const old = await prisma.product.findUnique({ where: { id } });

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        shortDesc: data.shortDesc,
        sku: data.sku,
        barcode: data.barcode,
        hsnSac: data.hsnSac,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        materialId: data.materialId,
        finishId: data.finishId,
        unitId: data.unitId,
        thickness: data.thickness,
        cuttingSize: data.cuttingSize,
        gstRate: data.gstRate,
        basePrice: data.basePrice,
        costPrice: data.costPrice,
        isFeatured: data.isFeatured,
        isActive: data.isActive,
        images: data.images,
        specifications: data.specifications,
        tags: data.tags,
      },
      include: {
        category: true,
        material: true,
        finish: true,
        unit: true,
      },
    });

    await auditService.log({
      userId,
      action: 'UPDATE',
      module: 'Products',
      entityType: 'Product',
      entityId: id,
      oldData: old,
      newData: updated,
    });

    return updated;
  },

  async delete(id: string, userId?: string) {
    const product = await prisma.product.delete({ where: { id } });
    await auditService.log({
      userId,
      action: 'DELETE',
      module: 'Products',
      entityType: 'Product',
      entityId: id,
      oldData: product,
    });
    return product;
  },

  // Metadata catalogs
  async getMaterials() {
    return prisma.productMaterial.findMany({ orderBy: { name: 'asc' } });
  },

  async getFinishes() {
    return prisma.productFinish.findMany({ orderBy: { name: 'asc' } });
  },

  async getUnits() {
    return prisma.productUnit.findMany({ orderBy: { name: 'asc' } });
  },

  async getSubcategories(categoryId?: string) {
    return prisma.productSubcategory.findMany({
      where: categoryId ? { categoryId } : undefined,
      orderBy: { name: 'asc' },
    });
  },
};
