import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
export declare const cmsController: {
    listBlogs(req: Request, res: Response, next: NextFunction): Promise<void>;
    getBlogBySlug(req: Request, res: Response, next: NextFunction): Promise<void>;
    createBlog(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateBlog(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteBlog(req: Request, res: Response, next: NextFunction): Promise<void>;
    listGallery(req: Request, res: Response, next: NextFunction): Promise<void>;
    createGalleryImage(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateGalleryImage(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteGalleryImage(req: Request, res: Response, next: NextFunction): Promise<void>;
    listHeroSlides(_req: Request, res: Response, next: NextFunction): Promise<void>;
    createHeroSlide(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateHeroSlide(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteHeroSlide(req: Request, res: Response, next: NextFunction): Promise<void>;
    listCatalogs(_req: Request, res: Response, next: NextFunction): Promise<void>;
    createCatalog(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteCatalog(req: Request, res: Response, next: NextFunction): Promise<void>;
    listFaqs(req: Request, res: Response, next: NextFunction): Promise<void>;
    createFaq(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateFaq(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteFaq(req: Request, res: Response, next: NextFunction): Promise<void>;
    listTestimonials(_req: Request, res: Response, next: NextFunction): Promise<void>;
    createTestimonial(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateTestimonial(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteTestimonial(req: Request, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=cms.controller.d.ts.map