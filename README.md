# Digvation Control Center

Internal Digvation backoffice for customer control-plane administration,
operations visibility, observability, and incident management.

The frontend will eventually combine CORE-owned business/control-plane data and
telemetry-owned runtime signals in one operator experience. It is not a client
application, a POS backoffice, a CORE replacement, or a monitoring database.

## Current scope

The Control Center manages CORE access, clients and brands, the product
catalog, client services, contracts and billing against the CORE API. The
installation, manifest, deployment and monitoring areas are not part of the
current release.

API types are generated from the paired CORE repository: `npm run api:types`
reads `../core-v2/docs/openapi.json`.

## Requirements and commands

- Node.js `>=20`
- npm

```bash
cp .env.example .env.local
npm install
npm run dev
```

Checkpoint verification:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Current version: `0.1.0-alpha.4`. See
`docs/engineering/VERSIONING_STANDARD.md` for release lifecycle rules.
