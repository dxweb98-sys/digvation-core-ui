import { z } from 'zod';

export const productFeatureFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Feature code is required.')
    .max(120, 'Feature code must be 120 characters or fewer.')
    .regex(
      /^[a-z0-9][a-z0-9._-]+$/,
      'Use lowercase letters, numbers, dots, underscores, or hyphens only.',
    ),
  name: z
    .string()
    .trim()
    .min(1, 'Feature name is required.')
    .max(150, 'Feature name must be 150 characters or fewer.'),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be 500 characters or fewer.')
    .optional(),
});

export type ProductFeatureFormValues = z.infer<typeof productFeatureFormSchema>;

export function normalizeProductFeatureCode(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}
