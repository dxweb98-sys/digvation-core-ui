# Digvation Control Center

Internal Digvation backoffice for customer control-plane administration,
operations visibility, observability, and incident management.

The frontend will eventually combine CORE-owned business/control-plane data and
telemetry-owned runtime signals in one operator experience. It is not a client
application, a POS backoffice, a CORE replacement, or a monitoring database.

## Current checkpoint

BF-02 adds the first operator-facing dashboard, grouped Control Center
navigation, responsive shell behavior, and realistic mock operational state.
The dashboard covers attention items, client application health, managed
infrastructure, deployments, and recent events. Real integrations remain out of
scope.

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

Current version: `0.1.0-alpha.1`. See
`docs/engineering/VERSIONING_STANDARD.md` for release lifecycle rules.
