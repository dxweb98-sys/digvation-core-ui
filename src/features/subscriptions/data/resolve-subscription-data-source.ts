import { applicationConfig } from '../../../shared/config/application-config';
import type { SubscriptionDataSource } from './subscription-data-source';
import { coreSubscriptionDataSource } from './core-subscription-data-source';
import { createMockSubscriptionDataSource } from './mock-subscription-data-source';

let source: SubscriptionDataSource | undefined;

export function resolveSubscriptionDataSource(): SubscriptionDataSource {
  source ??=
    applicationConfig.dataSourceMode === 'core'
      ? coreSubscriptionDataSource
      : createMockSubscriptionDataSource();
  return source;
}
