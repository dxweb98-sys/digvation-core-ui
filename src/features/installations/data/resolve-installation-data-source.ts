import { applicationConfig } from '../../../shared/config/application-config';
import type { InstallationDataSource } from './installation-data-source';
import { coreInstallationDataSource } from './core-installation-data-source';
import { createMockInstallationDataSource } from './mock-installation-data-source';

let mockDataSource: InstallationDataSource | null = null;

export function resolveInstallationDataSource(): InstallationDataSource {
  if (applicationConfig.dataSourceMode === 'core') return coreInstallationDataSource;
  if (!mockDataSource) mockDataSource = createMockInstallationDataSource();
  return mockDataSource;
}
