import { prisma } from '../../config/database';
import slugify from 'slugify';

export const cmsService = {
  // Blogs
  async listBlogs(query: { page: number; limit: number; status?: string; search?: string }) {
    const { page, limit, status, search } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (search) where.OR = [{ title: { contains: search, mode: 'insensitive' } }];
    const [items, total] = await Promise.all([
      prisma.blog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.blog.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getBlogBySlug(slug: string) {
    const blog = await prisma.blog.findUnique({ where: { slug } });
    if (!blog) throw Object.assign(new Error('Blog post not found'), { status: 404 });
    return blog;
  },

  async createBlog(data: any, authorId?: string) {
    const slug = data.slug || slugify(data.title, { lower: true, strict: true });
    return prisma.blog.create({ data: { ...data, slug, tags: data.tags || [], author: data.author || 'Admin' } });
  },

  async updateBlog(id: string, data: any) {
    return prisma.blog.update({ where: { id }, data });
  },

  async deleteBlog(id: string) {
    return prisma.blog.delete({ where: { id } });
  },

  // Gallery
  async listGallery(query: { page: number; limit: number; category?: string }) {
    const { page, limit, category } = query;
    const skip = (page - 1) * limit;
    const where: any = { isActive: true };
    if (category) where.category = category;
    const [items, total] = await Promise.all([
      prisma.galleryImage.findMany({ where, orderBy: { sortOrder: 'asc' }, skip, take: limit }),
      prisma.galleryImage.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async createGalleryImage(data: any) {
    return prisma.galleryImage.create({ data: { ...data, tags: data.tags || [] } });
  },

  async updateGalleryImage(id: string, data: any) {
    return prisma.galleryImage.update({ where: { id }, data });
  },

  async deleteGalleryImage(id: string) {
    return prisma.galleryImage.delete({ where: { id } });
  },

  // Hero Slides
  async listHeroSlides() {
    return prisma.heroSlide.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  },
  async createHeroSlide(data: any) { return prisma.heroSlide.create({ data }); },
  async updateHeroSlide(id: string, data: any) { return prisma.heroSlide.update({ where: { id }, data }); },
  async deleteHeroSlide(id: string) { return prisma.heroSlide.delete({ where: { id } }); },

  // Catalogs
  async listCatalogs() { return prisma.catalog.findMany({ where: { published: true }, orderBy: { createdAt: 'desc' } }); },
  async createCatalog(data: any) { return prisma.catalog.create({ data }); },
  async deleteCatalog(id: string) { return prisma.catalog.delete({ where: { id } }); },

  // FAQs
  async listFaqs(category?: string) {
    return prisma.faq.findMany({ where: { isActive: true, ...(category ? { category } : {}) }, orderBy: { sortOrder: 'asc' } });
  },
  async createFaq(data: any) { return prisma.faq.create({ data }); },
  async updateFaq(id: string, data: any) { return prisma.faq.update({ where: { id }, data }); },
  async deleteFaq(id: string) { return prisma.faq.delete({ where: { id } }); },

  // Testimonials
  async listTestimonials() { return prisma.testimonial.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }); },
  async createTestimonial(data: any) { return prisma.testimonial.create({ data }); },
  async updateTestimonial(id: string, data: any) { return prisma.testimonial.update({ where: { id }, data }); },
  async deleteTestimonial(id: string) { return prisma.testimonial.delete({ where: { id } }); },
};
