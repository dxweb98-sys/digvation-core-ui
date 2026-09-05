# Digvation Control Center Agent Guide

Digvation Control Center is Digvation's internal operator console. It combines
control-plane administration and operational visibility; it does not replace
CORE or telemetry systems.

Before implementation, read these authoritative documents:

1. `docs/architecture/BACKOFFICE_ARCHITECTURE.md`
2. `docs/engineering/CODEBASE_MAP.md`
3. `docs/engineering/ENGINEERING_GUARDRAILS.md`
4. `docs/engineering/TESTING_ACCEPTANCE_STANDARD.md`
5. `docs/engineering/VERSIONING_STANDARD.md`
6. `docs/engineering/GIT_WORKFLOW_STANDARD.md`
7. `docs/engineering/DATA_ACCESS_STANDARD.md`

Non-negotiable rules:

- Keep directories and files kebab-case; components and types PascalCase;
  functions and variables camelCase; hooks `useSomething`; booleans should use
  `is`, `has`, `can`, or `should` prefixes.
- Keep feature-owned code in `src/features/<feature>`. Add shared code only when
  it is genuinely cross-feature. Do not create speculative directories or
  barrels.
- Use `@digvation-labs/ui` version `1.0.0` and canonical `D*` components. Never
  wrap a design-system primitive merely to forward props or create competing
  design tokens.
- Pages and components consume feature hooks, never mock arrays or transport
  clients directly. Mock implementations live behind feature-owned data-source
  interfaces until integration is explicitly approved.
- Do not prematurely integrate CORE, authentication, monitoring, telemetry, or
  operational actions.
- Test at coherent checkpoints. Use targeted checks during implementation and
  run the full defined acceptance set once at the checkpoint boundary.
- Do not commit, push, tag, create a PR, or change a remote unless the user
  explicitly requests that Git action.
