# Codebase Map

| Path | Ownership |
| --- | --- |
| `src/app/error-boundary` | Application-level uncaught error handling |
| `src/app/providers` | Design-system, query and auth providers |
| `src/app/router` | Route definitions, home redirect and route-level failure handling |
| `src/app/shell` | Operator shell and the permission-filtered navigation |
| `src/features/auth` | Session, sign-in, password reset, invitation acceptance, permissions (`usePermissions`) |
| `src/features/access` | Profile, users, roles, invitations, access audit |
| `src/features/clients` | Clients, brands, contacts and the client page tabs |
| `src/features/catalog` | Products, features, capabilities, add-ons, list prices, releases, catalog items |
| `src/features/services` | Client services: provisioning, features, held add-ons, lifecycle |
| `src/features/contracts` | Contracts, terms, renewals, one-off charges, contract add-ons |
| `src/features/billing` | Billing settings, invoices, payments, credit notes, client balance |
| `src/shared/api` | The single CORE client, generated OpenAPI types, error mapping |
| `src/shared/format` | Money (minor units, whole rupiah) and Asia/Jakarta date formatting |
| `src/shared/forms` | Field-spec form and confirmation dialogs, lifecycle transitions |
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
