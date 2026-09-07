import type { InfrastructureDataSource } from './infrastructure-data-source';
import { createMockInfrastructureDataSource } from './mock-infrastructure-data-source';
export function resolveInfrastructureDataSource(): InfrastructureDataSource { return createMockInfrastructureDataSource(); }
