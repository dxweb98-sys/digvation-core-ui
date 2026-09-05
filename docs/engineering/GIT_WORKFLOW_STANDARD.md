# Git Workflow Standard

Work only in the supplied repository/worktree and preserve unrelated valid user
changes. Inspect `git status --short --branch` and recent history before edits.

Each checkpoint should remain reviewable as one coherent work unit. Run its
acceptance checks before requesting review. Version changes occur only at an
accepted lifecycle boundary according to `VERSIONING_STANDARD.md`.

Git mutations are explicit-authority actions:

- Do not commit, push, tag, create a PR, merge, rebase, or alter remotes unless
  the user asks for that exact stage.
- When commit approval is given, stage only intended checkpoint files and use a
  focused conventional commit message.
- Never hide failing checks or mix unrelated workspace changes into a commit.
