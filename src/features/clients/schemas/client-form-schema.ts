import { z } from 'zod';

export const clientFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Client code must contain at least 2 characters.')
    .max(64, 'Client code must contain at most 64 characters.')
    .regex(
      /^[A-Z0-9][A-Z0-9_-]+$/,
      'Use uppercase letters, numbers, underscores, and hyphens only.',
    ),
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name must contain at least 2 characters.')
    .max(150, 'Display name must contain at most 150 characters.'),
  legalName: z
    .string()
    .trim()
    .max(200, 'Legal name must contain at most 200 characters.')
    .optional(),
  organizationEmail: z
    .string()
    .trim()
    .email('Enter a valid organization email.')
    .max(254, 'Organization email must contain at most 254 characters.')
    .optional()
    .or(z.literal('')),
  organizationPhone: z
    .string()
    .trim()
    .max(40, 'Organization phone must contain at most 40 characters.')
    .optional(),
  website: z
    .string()
    .trim()
    .url('Enter a valid website URL.')
    .max(500, 'Website must contain at most 500 characters.')
    .optional()
    .or(z.literal('')),
  taxIdentifier: z
    .string()
    .trim()
    .max(80, 'Tax identifier must contain at most 80 characters.')
    .optional(),
  country: z
    .string()
    .trim()
    .max(80, 'Country must contain at most 80 characters.')
    .optional(),
  timezone: z
    .string()
    .trim()
    .max(80, 'Timezone must contain at most 80 characters.')
    .optional(),
  address: z
    .string()
    .trim()
    .max(320, 'Address must contain at most 320 characters.')
    .optional(),
  notes: z
    .string()
    .trim()
    .max(1000, 'Notes must contain at most 1000 characters.')
    .optional(),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;

export function normalizeClientCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '-');
}
