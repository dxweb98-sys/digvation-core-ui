# Codebase Map

| Path | Ownership |
| --- | --- |
| `src/app/error-boundary` | Application-level uncaught error handling |
| `src/app/providers` | Design-system, query and auth providers |
| `src/app/router` | Route definitions, home redirect and route-level failure handling |
| `src/app/shell` | Operator shell and the permission-filtered navigation |
| `src/features/auth` | Session, sign-in, permissions (`usePermissions`, `<Can>`) |
| `src/shared/api` | The single CORE client, generated OpenAPI types, error mapping |
| `src/shared/format` | Money (minor units, whole rupiah) and Asia/Jakarta date formatting |
| `src/shared/forms` | Form validation helpers |
| `src/shared/ui` | Application compositions over `@digvation/ui` |
| `src/shared/config` | Typed environment/configuration boundary |
| `src/test` | Test-environment setup and the test-only `fetch` stub |
| `src/main.tsx` | Browser bootstrap |
| `src/styles.css` | Application layout and responsive composition |
| `docs/architecture` | Product and system ownership decisions |
| `docs/engineering` | Operational engineering standards |

A feature keeps its CORE requests in `<feature>-api.ts`, its query hooks in
`<feature>-queries.ts`, and its screens under `pages/` and `components/`.

Create feature subdirectories only when real files need them. Do not create a
root `src/components`, speculative layers, or barrel exports.
