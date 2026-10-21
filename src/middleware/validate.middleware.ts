import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, z } from 'zod';

export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      // If the schema does not define top-level container keys ('body', 'query', or 'params'),
      // validate req.body directly to prevent false 422 errors on flat body schemas.
      if (schema instanceof z.ZodObject) {
        const shape = schema.shape;
        const hasContainer = 'body' in shape || 'query' in shape || 'params' in shape;
        if (!hasContainer) {
          req.body = schema.parse(req.body);
          return next();
        }
      }

      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as any;

      if (parsed && typeof parsed === 'object') {
        if (parsed.body !== undefined) req.body = parsed.body;
        if (parsed.query !== undefined) req.query = parsed.query;
        if (parsed.params !== undefined) req.params = parsed.params;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(422).json({
          success: false,
          message: 'Validation failed',
          errors: err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(err);
    }
  };
