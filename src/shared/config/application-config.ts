import { z } from 'zod';

const applicationConfigSchema = z.object({
  coreApiUrl: z.string().url().default('http://localhost:4002'),
});

export type ApplicationConfig = z.infer<typeof applicationConfigSchema>;

export const applicationConfig: ApplicationConfig = applicationConfigSchema.parse({
  coreApiUrl: import.meta.env.VITE_CORE_API_URL ?? 'http://localhost:4002',
});
