"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmsService = void 0;
const database_1 = require("../../config/database");
const slugify_1 = __importDefault(require("slugify"));
exports.cmsService = {
    // Blogs
    async listBlogs(query) {
        const { page, limit, status, search } = query;
        const skip = (page - 1) * limit;
        const where = {};
        if (status)
            where.status = status;
        if (search)
            where.OR = [{ title: { contains: search, mode: 'insensitive' } }];
        const [items, total] = await Promise.all([
            database_1.prisma.blog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
            database_1.prisma.blog.count({ where }),
        ]);
        return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    },
    async getBlogBySlug(slug) {
        const blog = await database_1.prisma.blog.findUnique({ where: { slug } });
        if (!blog)
            throw Object.assign(new Error('Blog post not found'), { status: 404 });
        return blog;
    },
    async createBlog(data, authorId) {
        const slug = data.slug || (0, slugify_1.default)(data.title, { lower: true, strict: true });
        return database_1.prisma.blog.create({ data: { ...data, slug, tags: data.tags || [], author: data.author || 'Admin' } });
    },
    async updateBlog(id, data) {
        return database_1.prisma.blog.update({ where: { id }, data });
    },
    async deleteBlog(id) {
        return database_1.prisma.blog.delete({ where: { id } });
    },
    // Gallery
    async listGallery(query) {
        const { page, limit, category } = query;
        const skip = (page - 1) * limit;
        const where = { isActive: true };
        if (category)
            where.category = category;
        const [items, total] = await Promise.all([
            database_1.prisma.galleryImage.findMany({ where, orderBy: { sortOrder: 'asc' }, skip, take: limit }),
            database_1.prisma.galleryImage.count({ where }),
        ]);
        return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    },
    async createGalleryImage(data) {
        return database_1.prisma.galleryImage.create({ data: { ...data, tags: data.tags || [] } });
    },
    async updateGalleryImage(id, data) {
        return database_1.prisma.galleryImage.update({ where: { id }, data });
    },
    async deleteGalleryImage(id) {
        return database_1.prisma.galleryImage.delete({ where: { id } });
    },
    // Hero Slides
    async listHeroSlides() {
        return database_1.prisma.heroSlide.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
    },
    async createHeroSlide(data) { return database_1.prisma.heroSlide.create({ data }); },
    async updateHeroSlide(id, data) { return database_1.prisma.heroSlide.update({ where: { id }, data }); },
    async deleteHeroSlide(id) { return database_1.prisma.heroSlide.delete({ where: { id } }); },
    // Catalogs
    async listCatalogs() { return database_1.prisma.catalog.findMany({ where: { published: true }, orderBy: { createdAt: 'desc' } }); },
    async createCatalog(data) { return database_1.prisma.catalog.create({ data }); },
    async deleteCatalog(id) { return database_1.prisma.catalog.delete({ where: { id } }); },
    // FAQs
    async listFaqs(category) {
        return database_1.prisma.faq.findMany({ where: { isActive: true, ...(category ? { category } : {}) }, orderBy: { sortOrder: 'asc' } });
    },
    async createFaq(data) { return database_1.prisma.faq.create({ data }); },
    async updateFaq(id, data) { return database_1.prisma.faq.update({ where: { id }, data }); },
    async deleteFaq(id) { return database_1.prisma.faq.delete({ where: { id } }); },
    // Testimonials
    async listTestimonials() { return database_1.prisma.testimonial.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }); },
    async createTestimonial(data) { return database_1.prisma.testimonial.create({ data }); },
    async updateTestimonial(id, data) { return database_1.prisma.testimonial.update({ where: { id }, data }); },
    async deleteTestimonial(id) { return database_1.prisma.testimonial.delete({ where: { id } }); },
};
//# sourceMappingURL=cms.service.js.map