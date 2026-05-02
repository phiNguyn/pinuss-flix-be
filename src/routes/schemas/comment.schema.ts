import { z } from 'zod';

export const createCommentSchema = z.object({
  body: z.object({
    movieSlug: z.string().min(1, 'Movie slug is required'),
    text: z.string().min(1, 'Comment text is required').max(2000, 'Comment too long'),
    parentId: z.string().optional().nullable(),
  }),
});

export const getCommentsSchema = z.object({
  params: z.object({
    movieSlug: z.string().min(1),
  }),
  query: z.object({
    page: z.string().optional().transform((val) => parseInt(val || '1', 10)),
    limit: z.string().optional().transform((val) => parseInt(val || '20', 10)),
    parentId: z.string().optional().nullable(),
  }),
});

export const likeCommentSchema = z.object({
  params: z.object({
    commentId: z.string().min(1),
  }),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type GetCommentsInput = z.infer<typeof getCommentsSchema>;
export type LikeCommentInput = z.infer<typeof likeCommentSchema>;
