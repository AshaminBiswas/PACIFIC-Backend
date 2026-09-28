"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cms_controller_1 = require("./cms.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
// ─── Public CMS Routes ────────────────────────────────────────────────────────
router.get('/blogs', cms_controller_1.cmsController.listBlogs);
router.get('/blogs/slug/:slug', cms_controller_1.cmsController.getBlogBySlug);
router.get('/gallery', cms_controller_1.cmsController.listGallery);
router.get('/hero-slides', cms_controller_1.cmsController.listHeroSlides);
router.get('/catalogs', cms_controller_1.cmsController.listCatalogs);
router.get('/faqs', cms_controller_1.cmsController.listFaqs);
router.get('/testimonials', cms_controller_1.cmsController.listTestimonials);
// ─── Admin CMS Routes ─────────────────────────────────────────────────────────
router.post('/blogs', auth_middleware_1.requireAuth, cms_controller_1.cmsController.createBlog);
router.put('/blogs/:id', auth_middleware_1.requireAuth, cms_controller_1.cmsController.updateBlog);
router.patch('/blogs/:id', auth_middleware_1.requireAuth, cms_controller_1.cmsController.updateBlog);
router.delete('/blogs/:id', auth_middleware_1.requireAuth, cms_controller_1.cmsController.deleteBlog);
router.post('/gallery', auth_middleware_1.requireAuth, cms_controller_1.cmsController.createGalleryImage);
router.put('/gallery/:id', auth_middleware_1.requireAuth, cms_controller_1.cmsController.updateGalleryImage);
router.patch('/gallery/:id', auth_middleware_1.requireAuth, cms_controller_1.cmsController.updateGalleryImage);
router.delete('/gallery/:id', auth_middleware_1.requireAuth, cms_controller_1.cmsController.deleteGalleryImage);
router.post('/hero-slides', auth_middleware_1.requireAuth, cms_controller_1.cmsController.createHeroSlide);
router.put('/hero-slides/:id', auth_middleware_1.requireAuth, cms_controller_1.cmsController.updateHeroSlide);
router.delete('/hero-slides/:id', auth_middleware_1.requireAuth, cms_controller_1.cmsController.deleteHeroSlide);
router.post('/catalogs', auth_middleware_1.requireAuth, cms_controller_1.cmsController.createCatalog);
router.delete('/catalogs/:id', auth_middleware_1.requireAuth, cms_controller_1.cmsController.deleteCatalog);
router.post('/faqs', auth_middleware_1.requireAuth, cms_controller_1.cmsController.createFaq);
router.put('/faqs/:id', auth_middleware_1.requireAuth, cms_controller_1.cmsController.updateFaq);
router.delete('/faqs/:id', auth_middleware_1.requireAuth, cms_controller_1.cmsController.deleteFaq);
router.post('/testimonials', auth_middleware_1.requireAuth, cms_controller_1.cmsController.createTestimonial);
router.put('/testimonials/:id', auth_middleware_1.requireAuth, cms_controller_1.cmsController.updateTestimonial);
router.delete('/testimonials/:id', auth_middleware_1.requireAuth, cms_controller_1.cmsController.deleteTestimonial);
exports.default = router;
//# sourceMappingURL=cms.routes.js.map