import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safe-next';

describe('safeNextPath', () => {
  it('allows same-site paths', () => {
    expect(safeNextPath('/t/abc/dashboard')).toBe('/t/abc/dashboard');
  });

  it('blocks redirects to other websites', () => {
    expect(safeNextPath('https://evil.example')).toBeNull();
    expect(safeNextPath('//evil.example')).toBeNull();
    expect(safeNextPath('/\\evil.example')).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });
});
