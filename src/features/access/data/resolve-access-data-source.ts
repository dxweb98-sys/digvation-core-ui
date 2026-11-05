import { coreAccessDataSource } from './core-access-data-source';
import type { AccessDataSource } from './access-data-source';
import { applicationConfig } from '../../../shared/config/application-config';
import { createMockAccessDataSource } from './mock-access-data-source';

function resolveAccessDataSource(): AccessDataSource {
  switch (applicationConfig.dataSourceMode) {
    case 'mock': return createMockAccessDataSource();
    case 'core': return coreAccessDataSource;
  }
}
export const accessDataSource = resolveAccessDataSource();
