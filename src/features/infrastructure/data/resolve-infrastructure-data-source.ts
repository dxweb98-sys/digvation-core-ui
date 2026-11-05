import { isCoreMode, notConnectedDataSource } from '../../../shared/data/data-availability';
import type { InfrastructureDataSource } from './infrastructure-data-source';
import { createMockInfrastructureDataSource } from './mock-infrastructure-data-source';
export function resolveInfrastructureDataSource(): InfrastructureDataSource { return isCoreMode() ? notConnectedDataSource<InfrastructureDataSource>('Infrastructure') : createMockInfrastructureDataSource(); }
