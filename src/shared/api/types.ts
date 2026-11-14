import type { components } from './schema';

/** Response and request shapes of the CORE API, generated from its OpenAPI document. */
export type Schemas = components['schemas'];
export type Dto<Name extends keyof Schemas> = Schemas[Name];
export type ErrorCode = Schemas['ErrorCode'];
export type Pagination = Schemas['PaginationDto'];

export interface Page<T> {
  items: T[];
  pagination: Pagination;
}
