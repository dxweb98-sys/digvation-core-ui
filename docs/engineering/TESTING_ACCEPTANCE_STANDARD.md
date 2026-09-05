# Testing and Acceptance Standard

Testing follows work units, not individual edits.

During implementation, run targeted checks only when they materially reduce
risk. At a coherent checkpoint boundary, run the full checkpoint acceptance set
once and record results in the completion report.

BF-01 acceptance requires:

1. `npm run lint`
2. `npm run typecheck`
3. `npm test` for meaningful routing, shell, overview, and not-found behavior
4. `npm run build`

Add tests for behavior and important boundaries, not coverage arithmetic.
Browser automation is deferred until a checkpoint has an acceptance need that
unit/component tests cannot cover.

A checkpoint is ready for review only when its required checks pass or a genuine
environmental blocker is reported explicitly.
