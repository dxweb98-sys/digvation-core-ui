# CORE UI designs (approved)

This folder holds the product owner's approved designs. Each screen is built to match its file here.

## Rules

- A screen is built only after its design is approved. Drafts live on the Claude Design canvas "Digvation CORE — desain UI", never in this folder.
- One file per screen. An approved change replaces the file in place; there are no versioned copies.
- `00-foundation.md` applies to every screen: theme tokens (dark and warm light), font, radii, components, and the logo.
- Components come from `@digvation/ui`. CORE identity is set through `DThemeProvider` tokens. A missing component is added to the design system first, except app layout (shell, sidebar), which belongs to this app.
- If a design and the API contract disagree, stop and ask the product owner.

## Files

| File | Screen | Approved |
|---|---|---|
| `00-foundation.md` | Theme tokens, type, radii, components, logo (status contrast raised and warm light tokens strengthened 2026-11-24) | 2026-11-24 |
| `01-login.html` | Sign in, forgot password, set a new password (all states, ID/EN copy) | 2026-11-24 |
| `02-users.html` | App shell (sidebar, top bar, account menu) and the users list with deactivate/reactivate | 2026-11-24 |
| `03-change-roles.html` | Change roles dialog (multi-select, locks, server errors) and the warm light token change | 2026-11-24 |
| `04-roles.html` | Roles page, permission editor, create/edit role, deactivate/reactivate (status filter re-rendered in the `DStatusFilter` style 2026-11-25) | 2026-11-25 |
| `05-invitations.html` | Invitations page, invite dialog, revoke, give roles to an accepted invitation, accept invitation (public), account without a role | 2026-11-25 |
| `digvation-mark.svg` | Digvation logo mark (`fill="currentColor"`) | 2026-11-24 |

Open the `.html` files in a browser. Each one starts with the behaviour and copy, followed by every state as rendered.
