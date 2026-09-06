# Digvation CORE UI — Repository Agent Contract

This file adds CORE Control Center UI-specific rules to the Digvation lifecycle standards.

## Application role

CORE UI is the Digvation control-plane administration experience.

It manages control-plane concepts.

It must not become the UI for product operational transactions.

## Product boundaries

Display/manage:

- clients;
- products/features;
- subscriptions/entitlements;
- installations;
- deployment/version metadata where supported.

Do not implement POS/Workshop operational domain behavior inside CORE UI.

Use explicit backend contracts.

## UI consistency

Use the canonical Digvation Design System where configured.

Shared page/shell/table/dialog/pagination rules should be applied consistently across current pages, not fixed one page at a time.

Do not create local reusable primitives when the Design System already provides them.

## Naming

Internal planning labels must not appear in branch names, commits, code, files, variables, routes, or release names.

Use actual control-plane domain vocabulary.

## Validation

Production code first.

Run only the scoped CORE UI validation at the complete work-unit boundary.

Full test/build/release checks belong to explicit acceptance/release preparation.

STOP for manual review before commit/merge unless explicitly authorized.
