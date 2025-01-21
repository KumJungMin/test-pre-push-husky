import { describe } from 'node:test';
import { sum, multiply, sayonara } from '../../../folder1/folder2/hello';

describe('sum', () => {
  it('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3);
  });
});

describe ('multiply', () => {
  it('multiplies 2 * 3 to equal 6', () => {
    expect(multiply(2, 3)).toBe(6);
  });
})

describe('sayonara', () => {
  it('prints Sayonara', () => {
    const consoleMock = vitest.spyOn(console, 'log');

    sayonara();

    expect(consoleMock).toHaveBeenCalledWith('Sayonara');
  });
});