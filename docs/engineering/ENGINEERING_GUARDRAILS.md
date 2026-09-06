# Engineering Guardrails

## Scope and ownership

- Implement only the approved checkpoint. Do not turn placeholders into
  unapproved feature implementations.
- Keep domain code feature-owned and shared code demonstrably cross-feature.
- Use TanStack Query for remote/server state and local React state for transient
  UI state. Add dependencies only for a present, documented need.

## Naming and tree

- Directories, route segments, and files: kebab-case. Resource routes use plural
  nouns where applicable.
- Components and types: PascalCase. Functions and variables: camelCase. Hooks:
  `useSomething`. Immutable true constants: UPPER_SNAKE_CASE.
- Prefer full domain words such as `installation`, `infrastructure`, and
  `runtimeService`; avoid arbitrary abbreviations and dumping-ground filenames.
- Do not add barrels solely to shorten imports or duplicate code ownership.

## UI

- Import canonical `D*` primitives from `@digvation-labs/ui@1.0.0` directly.
- Application components may compose workflow or layout responsibilities, but
  must not be prop-forwarding primitive wrappers.
- Use design-system semantic CSS variables. Do not add competing tokens,
  decorative dashboards, or unneeded animation.
- Operational page roots use the full workspace width after the application
  sidebar; preserve responsive padding and apply local readability limits only
  to long-form text.
- Use `DDialog` for small create/edit work and quick record detail. Reserve
  dedicated routes for complex, tabbed, or deep-link-worthy workspaces.
- Use `DConfirmDialog` for simple destructive confirmation. When an operation
  requires input such as a lifecycle reason, use `DDialog` with explicit
  confirmation instead.
- Use canonical design-system `DToastProvider` feedback: inline errors for
  field validation, toasts for mutation success or failure, and
  `DConnectionError` for page data failures. Keep `DDataTable`,
  `DSearchInput`, `DStatusFilter`, and `DPagination` canonical.

## Integration and safety

- Backend-dependent behavior remains mock-backed until its integration
  checkpoint is approved.
- Never access `import.meta.env` outside `src/shared/config`.
- Do not expose credentials or connect the browser directly to monitoring or
  infrastructure control endpoints.
- Real operational actions require later authorization, confirmation, audit,
  idempotency, and backend policy design.
