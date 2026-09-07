import type { InstallationDataSource } from './installation-data-source';
import { createMockInstallationDataSource } from './mock-installation-data-source';
export function resolveInstallationDataSource(): InstallationDataSource { return createMockInstallationDataSource(); }
