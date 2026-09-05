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

## Integration and safety

- Backend-dependent behavior remains mock-backed until its integration
  checkpoint is approved.
- Never access `import.meta.env` outside `src/shared/config`.
- Do not expose credentials or connect the browser directly to monitoring or
  infrastructure control endpoints.
- Real operational actions require later authorization, confirmation, audit,
  idempotency, and backend policy design.
