import { z } from 'zod';

const optionalUrl = z.string().trim().url('Enter a valid URL.').optional().or(z.literal(''));
const optionalEmail = z.string().trim().email('Enter a valid email address.').optional().or(z.literal(''));

export const installationFormSchema = z
  .object({
    clientId: z.string().min(1, 'Select a client.'),
    clientProductIds: z.array(z.string()).min(1, 'Select at least one product.'),
    code: z
      .string()
      .trim()
      .min(2, 'Installation code must contain at least 2 characters.')
      .max(80, 'Installation code must contain at most 80 characters.')
      .regex(/^[A-Z0-9][A-Z0-9_-]+$/, 'Use uppercase letters, numbers, hyphens, or underscores.'),
    name: z.string().trim().min(2, 'Installation name must contain at least 2 characters.').max(150),
    environment: z.enum(['PRODUCTION', 'STAGING', 'DEVELOPMENT']),
    deploymentMode: z.enum(['SHARED', 'DEDICATED']),
    infrastructureOwnership: z.enum(['DIGVATION', 'CLIENT']),
    managedByDigvation: z.boolean(),
    region: z.string().trim().max(100).optional(),
    applicationUrl: optionalUrl,
    brandingMode: z.enum(['DIGVATION', 'WHITE_LABEL']),
    brandName: z.string().trim().max(150).optional(),
    logoUrl: optionalUrl,
    faviconUrl: optionalUrl,
    primaryColor: z.string().trim().max(32).optional(),
    secondaryColor: z.string().trim().max(32).optional(),
    customDomain: z.string().trim().max(255).optional(),
    supportName: z.string().trim().max(150).optional(),
    supportEmail: optionalEmail,
  })
  .superRefine((values, context) => {
    if (values.deploymentMode === 'DEDICATED' && values.brandingMode !== 'WHITE_LABEL') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['brandingMode'],
        message: 'Dedicated installations require white-label branding.',
      });
    }
    if (values.brandingMode === 'WHITE_LABEL' && !values.brandName?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['brandName'],
        message: 'Brand name is required for white-label installations.',
      });
    }
  });

export type InstallationFormValues = z.infer<typeof installationFormSchema>;

export function normalizeInstallationCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '-');
}
