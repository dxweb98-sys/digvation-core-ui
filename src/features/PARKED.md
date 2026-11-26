# Parked areas

These folders are kept but not routed, not in the menu, and excluded from typecheck, lint and tests. The list lives in `parked-areas.json`. An area returns when its backend unit is in core-v2 `docs/openapi.json`. The Indonesian copy for these pages is on `backup/core-ui-wip-2026-11-24`.

- `services`: `/services` and `/clients/{id}/services` are not in the contract. Returns with the CORE services unit.
- `contracts`: `/contracts` is not in the contract. Returns with the CORE contracts and terms unit.
- `billing`: `/invoices`, `/payments`, `/credit-notes` and `/billing/*` are not in the contract. Returns with the CORE billing unit (D33).
- `catalog`: `/products` and `/catalog/*` are not in the contract. Returns with the CORE product catalog unit.

The parked areas still import client helpers that left `src/features/clients` when it was rebuilt on spec v1.27 (for example `useClientOptions`, `useBrands`, the client tabs). They are rebuilt against the current client contract when their area returns.
