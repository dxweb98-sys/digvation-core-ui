# Codebase Map

| Path | Ownership |
| --- | --- |
| `src/app/error-boundary` | Application-level uncaught error handling |
| `src/app/providers` | Application-wide design-system and query providers |
| `src/app/router` | Route definitions and route-level failure handling |
| `src/app/shell` | Operator shell and primary navigation composition |
| `src/features/overview` | BF-01 overview page, hook, types, and data source |
| `src/shared/config` | Typed environment/configuration boundary |
| `src/test` | Shared test-environment setup only |
| `src/main.tsx` | Browser bootstrap |
| `src/styles.css` | Application layout and responsive composition |
| `docs/architecture` | Product and system ownership decisions |
| `docs/engineering` | Operational engineering standards |

Create feature subdirectories only when real files need them. Do not create a
root `src/components`, speculative layers, or barrel exports.
