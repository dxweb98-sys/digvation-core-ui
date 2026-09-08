import { applicationConfig } from '../../../shared/config/application-config';
import { createMockAccessDataSource } from './mock-access-data-source';

function resolveAccessDataSource() {
  switch (applicationConfig.dataSourceMode) {
    case 'mock': return createMockAccessDataSource();
  }
}
export const accessDataSource = resolveAccessDataSource();
