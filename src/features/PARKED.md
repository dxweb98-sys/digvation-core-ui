# Parked areas

These folders are kept but not routed, not in the menu, and excluded from typecheck, lint and tests. The list lives in `parked-areas.json`. An area returns when its backend unit is in core-v2 `docs/openapi.json`. The Indonesian copy for these pages is on `backup/core-ui-wip-2026-11-24`.

- `clients`: stale against spec v1.27 (D32, D34, D35). Reworked in UI-2 and UI-3 against unit 2a, which is already in the contract.
- `services`: `/services` and `/clients/{id}/services` are not in the contract. Returns with the CORE services unit.
- `contracts`: `/contracts` is not in the contract. Returns with the CORE contracts and terms unit.
- `billing`: `/invoices`, `/payments`, `/credit-notes` and `/billing/*` are not in the contract. Returns with the CORE billing unit (D33).
- `catalog`: `/products` and `/catalog/*` are not in the contract. Returns with the CORE product catalog unit.
