import { z } from 'zod';

const applicationConfigSchema = z.object({
  dataSourceMode: z.enum(['mock', 'core']).default('mock'),
  coreApiUrl: z.string().url().default('http://localhost:4002'),
  mockDashboardState: z
    .enum(['populated', 'empty', 'error'])
    .default('populated'),
});

export type ApplicationConfig = z.infer<typeof applicationConfigSchema>;

function readApplicationConfig(): ApplicationConfig {
  return applicationConfigSchema.parse({
    dataSourceMode: import.meta.env.VITE_DATA_SOURCE_MODE ?? 'mock',
    coreApiUrl: import.meta.env.VITE_CORE_API_URL ?? 'http://localhost:4002',
    mockDashboardState: import.meta.env.VITE_MOCK_DASHBOARD_STATE,
  });
}

export const applicationConfig = readApplicationConfig();
