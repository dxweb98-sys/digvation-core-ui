import { applicationConfig } from '../config/application-config';

export function isCoreMode() {
  return applicationConfig.dataSourceMode === 'core';
}

export class NotConnectedError extends Error {
  constructor(area: string) {
    super(`${area} is not connected yet.`);
    this.name = 'NotConnectedError';
  }
}

/**
 * Stands in for a data source that has no CORE contract yet, so core mode can
 * never fall through to mock records. Every method rejects.
 */
export function notConnectedDataSource<T extends object>(area: string): T {
  return new Proxy({} as T, {
    get: () => () => Promise.reject(new NotConnectedError(area)),
  });
}
