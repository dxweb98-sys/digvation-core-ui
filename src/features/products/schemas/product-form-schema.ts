import { z } from 'zod';

export const productFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Product code must contain at least 2 characters.')
    .max(24, 'Product code must contain at most 24 characters.')
    .regex(/^[A-Z0-9-]+$/, 'Use uppercase letters, numbers, and hyphens only.'),
  name: z
    .string()
    .trim()
    .min(2, 'Product name must contain at least 2 characters.')
    .max(120, 'Product name must contain at most 120 characters.'),
  description: z.string().trim().max(500, 'Description must contain at most 500 characters.').optional(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export function normalizeProductCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '-');
}
