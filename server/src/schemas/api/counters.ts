import { z } from 'zod';

export const InitializeRequestSchema = z.object({
  handle: z.string(),
  count: z.number().int().nonnegative(),
});

export const IncrementRequestSchema = z.object({
  increment: z.number().int().positive(),
});
