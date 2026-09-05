# Data Access Standard

Backend-dependent features use a small, feature-owned data-source boundary:

```text
page/component -> feature hook -> data-source contract -> selected implementation
```

Rules:

- Pages and components do not import mock arrays, call `fetch`, or read
  environment values directly.
- The feature data-source contract expresses only current UI needs. Do not build
  a generic repository framework.
- Mock fixtures and behavior live in `mock-<feature>-data-source.ts`.
- Future CORE implementations use `core-<feature>-data-source.ts` behind the same
  contract only after integration approval.
- TanStack Query hooks own request caching, loading, error, and refresh state.
- Data-source selection reads typed configuration from `src/shared/config`.
- `VITE_DATA_SOURCE_MODE` is currently restricted to `mock`; unsupported values
  fail configuration validation instead of silently selecting another backend.

BF-01 proves this pattern only for Overview. Add other feature contracts when
their checkpoint introduces real UI requirements.
