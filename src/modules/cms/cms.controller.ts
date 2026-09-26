import { Request, Response, NextFunction } from 'express';
import { cmsService } from './cms.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export const cmsController = {
  // ─── Blogs ──────────────────────────────────────────────────────────────────
  async listBlogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await cmsService.listBlogs({ page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 20, status: req.query.status as string, search: req.query.search as string }) }); }
    catch (err) { next(err); }
  },
  async getBlogBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await cmsService.getBlogBySlug(req.params.slug) }); }
    catch (err) { next(err); }
  },
  async createBlog(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ success: true, data: await cmsService.createBlog(req.body, req.user?.id) }); }
    catch (err) { next(err); }
  },
  async updateBlog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await cmsService.updateBlog(req.params.id, req.body) }); }
    catch (err) { next(err); }
  },
  async deleteBlog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { await cmsService.deleteBlog(req.params.id); res.json({ success: true, message: 'Blog deleted' }); }
    catch (err) { next(err); }
  },

  // ─── Gallery ─────────────────────────────────────────────────────────────────
  async listGallery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await cmsService.listGallery({ page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 50, category: req.query.category as string }) }); }
    catch (err) { next(err); }
  },
  async createGalleryImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ success: true, data: await cmsService.createGalleryImage(req.body) }); }
    catch (err) { next(err); }
  },
  async updateGalleryImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await cmsService.updateGalleryImage(req.params.id, req.body) }); }
    catch (err) { next(err); }
  },
  async deleteGalleryImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { await cmsService.deleteGalleryImage(req.params.id); res.json({ success: true, message: 'Image deleted' }); }
    catch (err) { next(err); }
  },

  // ─── Hero Slides ─────────────────────────────────────────────────────────────
  async listHeroSlides(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await cmsService.listHeroSlides() }); }
    catch (err) { next(err); }
  },
  async createHeroSlide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ success: true, data: await cmsService.createHeroSlide(req.body) }); }
    catch (err) { next(err); }
  },
  async updateHeroSlide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await cmsService.updateHeroSlide(req.params.id, req.body) }); }
    catch (err) { next(err); }
  },
  async deleteHeroSlide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { await cmsService.deleteHeroSlide(req.params.id); res.json({ success: true, message: 'Slide deleted' }); }
    catch (err) { next(err); }
  },

  // ─── Catalogs ─────────────────────────────────────────────────────────────────
  async listCatalogs(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await cmsService.listCatalogs() }); }
    catch (err) { next(err); }
  },
  async createCatalog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ success: true, data: await cmsService.createCatalog(req.body) }); }
    catch (err) { next(err); }
  },
  async deleteCatalog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { await cmsService.deleteCatalog(req.params.id); res.json({ success: true, message: 'Catalog deleted' }); }
    catch (err) { next(err); }
  },

  // ─── FAQs ─────────────────────────────────────────────────────────────────────
  async listFaqs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await cmsService.listFaqs(req.query.category as string) }); }
    catch (err) { next(err); }
  },
  async createFaq(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ success: true, data: await cmsService.createFaq(req.body) }); }
    catch (err) { next(err); }
  },
  async updateFaq(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await cmsService.updateFaq(req.params.id, req.body) }); }
    catch (err) { next(err); }
  },
  async deleteFaq(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { await cmsService.deleteFaq(req.params.id); res.json({ success: true, message: 'FAQ deleted' }); }
    catch (err) { next(err); }
  },

  // ─── Testimonials ─────────────────────────────────────────────────────────────
  async listTestimonials(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await cmsService.listTestimonials() }); }
    catch (err) { next(err); }
  },
  async createTestimonial(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ success: true, data: await cmsService.createTestimonial(req.body) }); }
    catch (err) { next(err); }
  },
  async updateTestimonial(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await cmsService.updateTestimonial(req.params.id, req.body) }); }
    catch (err) { next(err); }
  },
  async deleteTestimonial(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { await cmsService.deleteTestimonial(req.params.id); res.json({ success: true, message: 'Testimonial deleted' }); }
    catch (err) { next(err); }
  },
};
