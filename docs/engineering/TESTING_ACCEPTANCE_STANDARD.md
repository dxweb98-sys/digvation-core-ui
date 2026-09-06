# Testing and Acceptance Standard

Testing follows work units, not individual edits.

During implementation, run targeted checks only when they materially reduce
risk. At a coherent checkpoint boundary, run the full checkpoint acceptance set
once and record results in the completion report.

Frontend checkpoint acceptance requires:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test -- --run` for meaningful feature and shell behavior
5. `npm run build`

Feature review additionally requires one manual browser smoke review of the
affected routes, navigation, responsive layout, controlled loading/error
behavior, console, and visual hierarchy.

Add tests for behavior and important boundaries, not coverage arithmetic.
Browser automation is deferred until a checkpoint has an acceptance need that
unit/component tests cannot cover.

A checkpoint is ready for review only when its required checks pass or a genuine
environmental blocker is reported explicitly.
