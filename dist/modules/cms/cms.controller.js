"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmsController = void 0;
const cms_service_1 = require("./cms.service");
exports.cmsController = {
    // ─── Blogs ──────────────────────────────────────────────────────────────────
    async listBlogs(req, res, next) {
        try {
            res.json({ success: true, data: await cms_service_1.cmsService.listBlogs({ page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 20, status: req.query.status, search: req.query.search }) });
        }
        catch (err) {
            next(err);
        }
    },
    async getBlogBySlug(req, res, next) {
        try {
            res.json({ success: true, data: await cms_service_1.cmsService.getBlogBySlug(req.params.slug) });
        }
        catch (err) {
            next(err);
        }
    },
    async createBlog(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await cms_service_1.cmsService.createBlog(req.body, req.user?.id) });
        }
        catch (err) {
            next(err);
        }
    },
    async updateBlog(req, res, next) {
        try {
            res.json({ success: true, data: await cms_service_1.cmsService.updateBlog(req.params.id, req.body) });
        }
        catch (err) {
            next(err);
        }
    },
    async deleteBlog(req, res, next) {
        try {
            await cms_service_1.cmsService.deleteBlog(req.params.id);
            res.json({ success: true, message: 'Blog deleted' });
        }
        catch (err) {
            next(err);
        }
    },
    // ─── Gallery ─────────────────────────────────────────────────────────────────
    async listGallery(req, res, next) {
        try {
            res.json({ success: true, data: await cms_service_1.cmsService.listGallery({ page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 50, category: req.query.category }) });
        }
        catch (err) {
            next(err);
        }
    },
    async createGalleryImage(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await cms_service_1.cmsService.createGalleryImage(req.body) });
        }
        catch (err) {
            next(err);
        }
    },
    async updateGalleryImage(req, res, next) {
        try {
            res.json({ success: true, data: await cms_service_1.cmsService.updateGalleryImage(req.params.id, req.body) });
        }
        catch (err) {
            next(err);
        }
    },
    async deleteGalleryImage(req, res, next) {
        try {
            await cms_service_1.cmsService.deleteGalleryImage(req.params.id);
            res.json({ success: true, message: 'Image deleted' });
        }
        catch (err) {
            next(err);
        }
    },
    // ─── Hero Slides ─────────────────────────────────────────────────────────────
    async listHeroSlides(_req, res, next) {
        try {
            res.json({ success: true, data: await cms_service_1.cmsService.listHeroSlides() });
        }
        catch (err) {
            next(err);
        }
    },
    async createHeroSlide(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await cms_service_1.cmsService.createHeroSlide(req.body) });
        }
        catch (err) {
            next(err);
        }
    },
    async updateHeroSlide(req, res, next) {
        try {
            res.json({ success: true, data: await cms_service_1.cmsService.updateHeroSlide(req.params.id, req.body) });
        }
        catch (err) {
            next(err);
        }
    },
    async deleteHeroSlide(req, res, next) {
        try {
            await cms_service_1.cmsService.deleteHeroSlide(req.params.id);
            res.json({ success: true, message: 'Slide deleted' });
        }
        catch (err) {
            next(err);
        }
    },
    // ─── Catalogs ─────────────────────────────────────────────────────────────────
    async listCatalogs(_req, res, next) {
        try {
            res.json({ success: true, data: await cms_service_1.cmsService.listCatalogs() });
        }
        catch (err) {
            next(err);
        }
    },
    async createCatalog(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await cms_service_1.cmsService.createCatalog(req.body) });
        }
        catch (err) {
            next(err);
        }
    },
    async deleteCatalog(req, res, next) {
        try {
            await cms_service_1.cmsService.deleteCatalog(req.params.id);
            res.json({ success: true, message: 'Catalog deleted' });
        }
        catch (err) {
            next(err);
        }
    },
    // ─── FAQs ─────────────────────────────────────────────────────────────────────
    async listFaqs(req, res, next) {
        try {
            res.json({ success: true, data: await cms_service_1.cmsService.listFaqs(req.query.category) });
        }
        catch (err) {
            next(err);
        }
    },
    async createFaq(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await cms_service_1.cmsService.createFaq(req.body) });
        }
        catch (err) {
            next(err);
        }
    },
    async updateFaq(req, res, next) {
        try {
            res.json({ success: true, data: await cms_service_1.cmsService.updateFaq(req.params.id, req.body) });
        }
        catch (err) {
            next(err);
        }
    },
    async deleteFaq(req, res, next) {
        try {
            await cms_service_1.cmsService.deleteFaq(req.params.id);
            res.json({ success: true, message: 'FAQ deleted' });
        }
        catch (err) {
            next(err);
        }
    },
    // ─── Testimonials ─────────────────────────────────────────────────────────────
    async listTestimonials(_req, res, next) {
        try {
            res.json({ success: true, data: await cms_service_1.cmsService.listTestimonials() });
        }
        catch (err) {
            next(err);
        }
    },
    async createTestimonial(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await cms_service_1.cmsService.createTestimonial(req.body) });
        }
        catch (err) {
            next(err);
        }
    },
    async updateTestimonial(req, res, next) {
        try {
            res.json({ success: true, data: await cms_service_1.cmsService.updateTestimonial(req.params.id, req.body) });
        }
        catch (err) {
            next(err);
        }
    },
    async deleteTestimonial(req, res, next) {
        try {
            await cms_service_1.cmsService.deleteTestimonial(req.params.id);
            res.json({ success: true, message: 'Testimonial deleted' });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=cms.controller.js.map