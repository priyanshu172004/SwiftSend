import { z } from 'zod';

export const createFolderSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, 'Folder name is required')
      .max(255, 'Folder name must not exceed 255 characters'),
    parentId: z.number().int().positive().optional()
      .nullable()
  })
});

export const updateFileSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, 'Name is required')
      .max(255, 'Name must not exceed 255 characters')
      .optional()
  })
});

export const shareWithUsersSchema = z.object({
  body: z.object({
    userIds: z.array(z.number().int().positive())
      .min(1, 'At least one user ID is required'),
    permission: z.enum(['read']).default('read')
  })
});

export const publicShareSchema = z.object({
  body: z.object({
    isPublic: z.boolean()
  })
});

export const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse({ body: req.body, params: req.params });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }
      next(error);
    }
  };
};
