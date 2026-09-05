import type { OverviewFoundation } from '../types/overview-foundation';

export interface OverviewDataSource {
  getFoundation(): Promise<OverviewFoundation>;
}
