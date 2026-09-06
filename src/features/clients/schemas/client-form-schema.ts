import { z } from 'zod';

export const clientFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Client code must contain at least 2 characters.')
    .max(24, 'Client code must contain at most 24 characters.')
    .regex(/^[A-Z0-9-]+$/, 'Use uppercase letters, numbers, and hyphens only.'),
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name must contain at least 2 characters.')
    .max(120, 'Display name must contain at most 120 characters.'),
  legalName: z.string().trim().max(180, 'Legal name must contain at most 180 characters.').optional(),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;

export function normalizeClientCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '-');
}
