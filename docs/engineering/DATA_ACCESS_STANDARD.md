# Data Access Standard

Every screen reads and writes CORE through one client:

```text
page/component -> feature query hook -> feature api module -> shared/api client -> CORE
```

Rules:

- `src/shared/api/schema.d.ts` is generated from `../core-v2/docs/openapi.json`
  with `npm run api:types`. Do not edit it by hand; regenerate and commit it
  when the CORE contract changes.
- Features use the generated shapes through `Dto<'Name'>` from
  `src/shared/api/types.ts`. Do not restate a CORE shape by hand.
- `src/shared/api/client.ts` is the only code that calls `fetch`. It unwraps
  `{ success, data, request_id }`, returns paged lists as
  `{ items, pagination }`, sends the in-memory bearer token, refreshes once
  through the HttpOnly refresh cookie plus `X-CSRF-Token`, and throws
  `ApiError` with the stable `code`, `details` and `request_id`.
- Operators never see CORE's English error text. Show
  `friendlyErrorMessage(error)` (Indonesian, keyed by error code) and put
  `fieldErrors(error)` on the matching form fields.
- Each feature keeps its requests in `<feature>-api.ts` and its TanStack Query
  hooks (keys, caching, invalidation) in `<feature>-queries.ts`.
- Money stays a minor-unit string end to end; convert only at the edge with
  `src/shared/format/money.ts`. IDR is shown and typed as whole rupiah.
- Business dates are `YYYY-MM-DD` in Asia/Jakarta; instants are shown in
  Asia/Jakarta (`src/shared/format/date.ts`).
- There is no mock mode. Tests stub `fetch` with `src/test/fetch-mock.ts`;
  application code never fakes CORE.
- Controls the operator may not use are hidden with `usePermissions().can`.
  CORE still enforces every request.
- Forms are `FormDialog`/`ConfirmDialog` (`src/shared/forms`) driven by field
  specs named after the CORE request fields; destructive and lifecycle actions
  always confirm, and ask for the reason CORE records.
