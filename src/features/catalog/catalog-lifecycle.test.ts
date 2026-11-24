import { describe, expect, it } from 'vitest';
import { CATALOG_TRANSITIONS, RELEASE_TRANSITIONS } from './catalog-api';
import { targetLabel } from '../../shared/forms/use-transitions';

describe('catalog lifecycle (core-v2 catalog.lifecycle.ts)', () => {
  it('offers only the moves CORE accepts', () => {
    expect(CATALOG_TRANSITIONS.DRAFT).toEqual(['ACTIVE', 'RETIRED']);
    expect(CATALOG_TRANSITIONS.ACTIVE).toEqual(['RETIRED']);
    expect(CATALOG_TRANSITIONS.RETIRED).toEqual(['DRAFT']);
    expect(RELEASE_TRANSITIONS.WITHDRAWN).toEqual([]);
  });

  it('names each move as an action', () => {
    expect(targetLabel('RELEASED')).toBe('Rilis');
    expect(targetLabel('WITHDRAWN')).toBe('Tarik');
    expect(targetLabel('RETIRED')).toBe('Pensiunkan');
    expect(targetLabel('DRAFT')).toBe('Kembalikan ke draf');
  });
});
