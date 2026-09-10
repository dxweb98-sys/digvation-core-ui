import { z } from 'zod';

export const capabilityFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Capability code is required.')
    .max(64, 'Capability code must be 64 characters or fewer.')
    .regex(/^[A-Z0-9][A-Z0-9_-]*$/, 'Use uppercase letters, numbers, underscores, or hyphens only.'),
  name: z
    .string()
    .trim()
    .min(1, 'Capability name is required.')
    .max(150, 'Capability name must be 150 characters or fewer.'),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be 500 characters or fewer.')
    .optional(),
});

export type CapabilityFormValues = z.infer<typeof capabilityFormSchema>;

export function normalizeCapabilityCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '_');
}
