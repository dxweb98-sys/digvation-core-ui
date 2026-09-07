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
  organizationEmail: z.string().trim().email('Enter a valid organization email.').optional().or(z.literal('')),
  organizationPhone: z.string().trim().max(40, 'Organization phone must contain at most 40 characters.').optional(),
  website: z.string().trim().url('Enter a valid website URL.').optional().or(z.literal('')),
  taxIdentifier: z.string().trim().max(80, 'Tax identifier must contain at most 80 characters.').optional(),
  country: z.string().trim().max(80, 'Country must contain at most 80 characters.').optional(),
  timezone: z.string().trim().max(80, 'Timezone must contain at most 80 characters.').optional(),
  address: z.string().trim().max(320, 'Address must contain at most 320 characters.').optional(),
  notes: z.string().trim().max(1000, 'Notes must contain at most 1000 characters.').optional(),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;

export function normalizeClientCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '-');
}
