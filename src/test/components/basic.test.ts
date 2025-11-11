import { describe, it, expect } from 'vitest';

describe('Basic Test Suite', () => {
  it('should work', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle arrays', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
  });
});