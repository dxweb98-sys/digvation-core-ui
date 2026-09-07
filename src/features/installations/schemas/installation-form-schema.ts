import { z } from 'zod';

export const installationFormSchema = z.object({
  clientProductId: z.string().min(1, 'Select a client product.'),
  code: z.string().trim().min(2, 'Installation code must contain at least 2 characters.').max(32, 'Installation code must contain at most 32 characters.').regex(/^[A-Z0-9-]+$/, 'Use uppercase letters, numbers, and hyphens only.'),
  name: z.string().trim().min(2, 'Installation name must contain at least 2 characters.').max(120, 'Installation name must contain at most 120 characters.'),
  environment: z.enum(['PRODUCTION', 'STAGING', 'DEVELOPMENT']),
  deploymentMode: z.enum(['SHARED', 'DEDICATED']),
  infrastructureOwnership: z.enum(['DIGVATION', 'CLIENT']),
  managedByDigvation: z.boolean(),
  region: z.string().trim().max(120, 'Region must contain at most 120 characters.').optional(),
  applicationUrl: z.string().trim().url('Enter a valid application URL.').optional().or(z.literal('')),
});
export type InstallationFormValues = z.infer<typeof installationFormSchema>;
export function normalizeInstallationCode(value: string) { return value.trim().toUpperCase().replace(/\s+/g, '-'); }
