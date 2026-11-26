import { describe, expect, it } from 'vitest';
import { formatPhone, normalizePhoneInput } from './phone';

describe('phones', () => {
  it.each([
    ['081234567890', '6281234567890'],
    ['0812-3456-7890', '6281234567890'],
    ['62 812 3456 7890', '6281234567890'],
    ['+6281234567890', '6281234567890'],
    ['+62 21 5550100', '62215550100'],
  ])('accepts %s as CORE does, storing %s', (input, stored) => {
    expect(normalizePhoneInput(input)).toBe(stored);
  });

  it.each(['12345', '+1 202 555 0100', '0812abc', '', '62', '0212345678'])('refuses %p as CORE does', (input) => {
    expect(normalizePhoneInput(input)).toBeUndefined();
  });

  it('shows stored digits as a local number', () => {
    expect(formatPhone('6281234567890')).toBe('0812 3456 7890');
    expect(formatPhone('6281200000001')).toBe('0812 0000 0001');
    expect(formatPhone('628123456789')).toBe('0812 3456 789');
    expect(formatPhone('62215550100')).toBe('021 5550100');
    expect(formatPhone('62274123456')).toBe('0274 123456');
    expect(formatPhone('+1 202')).toBe('+1 202');
    expect(formatPhone(null)).toBe('');
  });
});
