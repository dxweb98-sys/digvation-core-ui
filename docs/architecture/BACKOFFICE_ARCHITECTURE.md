# Backoffice Architecture

## Purpose

Digvation Control Center is an internal operator-facing frontend. It will expose
administrative control-plane workflows and operational visibility without
becoming the system of record for either domain.

## System boundaries

- CORE owns clients, products, relationships, subscriptions, entitlements,
  installations, identity, access, and audit data.
- Monitoring and telemetry platforms own metrics, logs, traces, and runtime
  alert signals.
- The Control Center owns operator navigation, presentation, interaction state,
  frontend validation, and orchestration of approved backend capabilities.
- Infrastructure mutations must eventually use explicit secured backend APIs;
  the browser must never connect directly to infrastructure control surfaces.
- The Control Center will evolve toward an operational command plane. Future
  start, stop, restart, redeploy, maintenance, and remote health operations
  must flow through an audited orchestration layer and secured runtime agents or
  connectors, never browser-to-server SSH. Each operation requires authorization,
  a reason, execution status, result, and auditability. AI may summarize
  incidents, correlate telemetry, or recommend actions, but must use this same
  governed action boundary for execution.

## Frontend structure

The application is feature-oriented. `src/app` owns composition, routing, shell,
and application-level failure handling; `src/features` owns domain UI and data
access; `src/shared` contains only proven cross-feature configuration, libraries,
hooks, and types.

Each integrated feature exposes a minimal data-source contract. Its page calls a
feature hook; the hook calls the selected data source. During foundation work,
the implementation is mock-only. A later CORE implementation can replace the
mock behind the contract without rewriting the page.

TanStack Query owns server-state lifecycle. Local React state owns ephemeral UI
state. React Hook Form and Zod own future form state and validation. No global
client state library is justified for the current dashboard scope.

## UI foundation

`@digvation-labs/ui@1.0.0` is the primitive and semantic-token authority.
Application CSS may compose layout and responsive behavior but must not create a
parallel token system or duplicate `D*` components.
