# Digvation CORE UI — Repository Agent Contract

This file adds CORE Control Center UI-specific rules to the Digvation lifecycle standards.

## Application role

CORE UI is the Digvation control-plane administration experience.

It manages control-plane concepts.

It must not become the UI for product operational transactions.

## Paired CORE contract

`digvation-core-ui` and `core-v2` are paired control-plane repositories.

For operator-facing CORE work:

1. verify the authoritative backend contract and current backend repository reality first;
2. align UI vocabulary, validation assumptions, and lifecycle behavior with that authority;
3. do not invent UI-only business rules to compensate for a missing backend contract;
4. if an accepted UI flow exposes a legitimate control-plane need that the backend does not yet own, classify and implement the additive backend contract in the paired work unit;
5. do not force a change in either repository when the paired side has no actual impact.

All CORE access goes through the single client in `src/shared/api`, typed from the generated OpenAPI schema. There is no mock mode; do not add ad-hoc `fetch` calls or fake CORE data in application code.

## Product boundaries

Display/manage:

- clients;
- products and ProductFeature catalog;
- reusable Capability catalog and ProductCapability compatibility;
- client Product/Feature/Capability entitlement composition where scoped;
- subscriptions and commercial terms/pricing where scoped;
- installations;
- branding/white-label configuration where scoped;
- entitled domain/runtime composition metadata where supported;
- deployment/version metadata where supported.

Do not implement POS/Workshop/Inventory or other business-domain operational behavior inside CORE UI.

Use explicit backend contracts.

`ProductCapability` is compatibility catalog metadata. Showing a Capability under a Product does not mean every Client of that Product owns it. Client entitlement remains a separate control-plane decision.

Do not display mandatory platform foundations as optional Product capabilities. For example, the shared Catalog foundation belongs to base platform architecture and must not appear as a selectable `CATALOG` capability unless the ecosystem contract is explicitly changed.

A planned/draft Product may expose compatibility metadata that is already decided, but the UI must not invent detailed ProductFeature scope for a Product whose feature contract has not been locked. Draft Products must not be presented as assignable/effective Client Products.

Commercial catalog/list price and per-Client agreed price must be presented separately. Do not overwrite or visually reinterpret the canonical Product price when a Client has negotiated/promotional pricing.

Product is the default billable unit. Capability may be bundled or sold as an add-on. ProductFeature is not a per-feature pricing unit by default.

## Client onboarding direction

The accepted control-plane onboarding experience composes these independent decisions:

- Client identity;
- Products;
- Product Features;
- compatible Capabilities;
- commercial terms/agreed pricing;
- deployment mode;
- infrastructure ownership;
- branding;
- final review/provision action.

The operator may experience this as one final `Create & Provision` action even though backend execution uses multiple owned/idempotent steps.

Do not put deployment mode, branding, pricing, or Product selection into Client identity merely to shorten the form.

Shared/SaaS and Dedicated are Installation behaviors, not Client types. Shared may use Digvation branding or an entitled white-label configuration. Dedicated requires white-label configuration by current product policy. Neither mode grants Products, Features, or Capabilities.

## UI consistency

Use the canonical Digvation Design System where configured.

Use the installed UI/UX specialist guidance when available, while treating repository reality and the Digvation Design System as authoritative.

Shared page/shell/table/dialog/pagination rules should be applied consistently across current pages, not fixed one page at a time.

Do not create local reusable primitives when the Design System already provides them.

Preserve accepted Product and Client detail structures. Extend existing tabs/dialogs rather than redesigning healthy accepted surfaces without an explicit redesign task.

## Naming

Internal planning labels must not appear in branch names, commits, code, files, variables, routes, or release names.

Use actual control-plane domain vocabulary.

## Validation

Production code first.

Run only the scoped CORE UI validation at the complete work-unit boundary.

Full test/build/release checks belong to explicit acceptance/release preparation.

STOP for manual review before merge/release/deployment.

## Review and commit

Follow the review and commit protocol in the lifecycle delivery standard (`standards/DELIVERY_RELEASE_STANDARD.md`, section 6A, at the lifecycle root). Nothing is committed or pushed without the product owner's explicit written approval. In addition, for CORE UI:

- **Package manager.** npm: `package-lock.json` is the lockfile. Install with `npm ci`; do not create another lockfile.
- **Checks before a commit.** All of these must pass; stop if any fails:
  - `npm run typecheck` (`tsc -b`, covering `tsconfig.app.json` and `tsconfig.node.json`)
  - `npm run lint`
  - `npm run test` (all Vitest tests)
- **Never staged.** `dist/` and `*.tsbuildinfo` (both ignored).
- **Work branch.** Never commit on `main` or on the shared dev branch `digvation-core-ui-dev`.
