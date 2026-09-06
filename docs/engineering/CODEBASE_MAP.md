# Codebase Map

| Path | Ownership |
| --- | --- |
| `src/app/error-boundary` | Application-level uncaught error handling |
| `src/app/providers` | Application-wide design-system and query providers |
| `src/app/router` | Route definitions and route-level failure handling |
| `src/app/shell` | Operator shell and primary navigation composition |
| `src/features/dashboard` | Operational dashboard UI, types, query hook, and mock data source |
| `src/features/clients` | Client management UI, lifecycle composition, forms, hooks, and mock data source |
| `src/features/products` | Product catalog UI, lifecycle composition, forms, hooks, and mock data source |
| `src/features/client-products` | Contextual client-to-product relationship UI, lifecycle composition, hooks, and mock data source |
| `src/shared/config` | Typed environment/configuration boundary |
| `src/test` | Shared test-environment setup only |
| `src/main.tsx` | Browser bootstrap |
| `src/styles.css` | Application layout and responsive composition |
| `docs/architecture` | Product and system ownership decisions |
| `docs/engineering` | Operational engineering standards |

Create feature subdirectories only when real files need them. Do not create a
root `src/components`, speculative layers, or barrel exports.

Routes for future domains use the application-owned placeholder composition
until their checkpoint creates feature-owned implementation.
