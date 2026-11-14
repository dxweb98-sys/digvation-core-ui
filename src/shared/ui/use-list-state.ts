import { useState } from 'react';
import type { Query } from '../api/client';

/**
 * Page, page size, search and filters for a server-paged CORE list. A new
 * search or filter goes back to page 1.
 */
export function useListState(initial: { limit?: number; filters?: Query } = {}) {
  const [state, setState] = useState({
    page: 1,
    limit: initial.limit ?? 20,
    search: '',
    filters: initial.filters ?? ({} as Query),
  });

  const query: Query = {
    page: state.page,
    limit: state.limit,
    search: state.search.trim() || undefined,
    ...state.filters,
  };

  return {
    state,
    query,
    setPage: (page: number) => setState((current) => ({ ...current, page })),
    setLimit: (limit: number) => setState((current) => ({ ...current, limit, page: 1 })),
    setSearch: (search: string) => setState((current) => ({ ...current, search, page: 1 })),
    setFilter: (name: string, value: string | undefined) =>
      setState((current) => ({
        ...current,
        page: 1,
        filters: { ...current.filters, [name]: value === 'ALL' ? undefined : value },
      })),
    tableProps: {
      searchValue: state.search,
      onSearchChange: (search: string) => setState((current) => ({ ...current, search, page: 1 })),
      onPageChange: (page: number) => setState((current) => ({ ...current, page })),
      onPageSizeChange: (limit: number) => setState((current) => ({ ...current, limit, page: 1 })),
    },
  };
}
