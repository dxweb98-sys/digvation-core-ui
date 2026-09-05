import { z } from 'zod';

const applicationConfigSchema = z.object({
  dataSourceMode: z.literal('mock'),
});

export type ApplicationConfig = z.infer<typeof applicationConfigSchema>;

function readApplicationConfig(): ApplicationConfig {
  return applicationConfigSchema.parse({
    dataSourceMode: import.meta.env.VITE_DATA_SOURCE_MODE ?? 'mock',
  });
}

export const applicationConfig = readApplicationConfig();
