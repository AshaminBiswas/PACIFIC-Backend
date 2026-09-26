import { Router } from 'express';
import { cmsController } from './cms.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

// ─── Public CMS Routes ────────────────────────────────────────────────────────
router.get('/blogs', cmsController.listBlogs);
router.get('/blogs/slug/:slug', cmsController.getBlogBySlug);
router.get('/gallery', cmsController.listGallery);
router.get('/hero-slides', cmsController.listHeroSlides);
router.get('/catalogs', cmsController.listCatalogs);
router.get('/faqs', cmsController.listFaqs);
router.get('/testimonials', cmsController.listTestimonials);

// ─── Admin CMS Routes ─────────────────────────────────────────────────────────
router.post('/blogs', requireAuth, cmsController.createBlog);
router.put('/blogs/:id', requireAuth, cmsController.updateBlog);
router.patch('/blogs/:id', requireAuth, cmsController.updateBlog);
router.delete('/blogs/:id', requireAuth, cmsController.deleteBlog);

router.post('/gallery', requireAuth, cmsController.createGalleryImage);
router.put('/gallery/:id', requireAuth, cmsController.updateGalleryImage);
router.patch('/gallery/:id', requireAuth, cmsController.updateGalleryImage);
router.delete('/gallery/:id', requireAuth, cmsController.deleteGalleryImage);

router.post('/hero-slides', requireAuth, cmsController.createHeroSlide);
router.put('/hero-slides/:id', requireAuth, cmsController.updateHeroSlide);
router.delete('/hero-slides/:id', requireAuth, cmsController.deleteHeroSlide);

router.post('/catalogs', requireAuth, cmsController.createCatalog);
router.delete('/catalogs/:id', requireAuth, cmsController.deleteCatalog);

router.post('/faqs', requireAuth, cmsController.createFaq);
router.put('/faqs/:id', requireAuth, cmsController.updateFaq);
router.delete('/faqs/:id', requireAuth, cmsController.deleteFaq);

router.post('/testimonials', requireAuth, cmsController.createTestimonial);
router.put('/testimonials/:id', requireAuth, cmsController.updateTestimonial);
router.delete('/testimonials/:id', requireAuth, cmsController.deleteTestimonial);

export default router;
