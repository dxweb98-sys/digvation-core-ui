import parkedAreas from '../../parked-areas.json';

/**
 * Areas whose backend unit is not in the current CORE contract (core-v2
 * docs/openapi.json). Their code stays in src/features/<folder> but is not
 * routed, not in the menu, and kept out of typecheck, lint and tests
 * (tsconfig.app.json, eslint.config.js, vite.config.ts read the same list).
 * See src/features/PARKED.md.
 */
export const PARKED_AREAS: readonly { folder: string; paths: readonly string[] }[] = parkedAreas;

export function isParkedPath(path: string): boolean {
  return PARKED_AREAS.some((area) =>
    area.paths.some((parked) => path === parked || path.startsWith(`${parked}/`)),
  );
}
