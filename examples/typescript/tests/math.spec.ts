import * as math from '../src/math';

describe('sum', () => {
	test('case 1', () => expect(typeof math.sum).toBe('function'));
	test('case 2', () => expect(math.sum(1, 2)).toBe(3));
	test('case 3', () => expect(math.sum(-1, -2)).toBe(-3));
	test('case 4', () => expect(math.sum(-1, 1)).toBe(0));
});

describe('div', () => {
	test('case 1', () => expect(typeof math.div).toBe('function'));
	test('case 2', () => expect(math.div(1, 2)).toBe(0.5));
	test('case 3', () => expect(math.div(-1, -2)).toBe(0.5));
	test('case 4', () => expect(math.div(-1, 1)).toBe(-1));
});

describe('mod', () => {
	test('case 1', () => expect(typeof math.mod).toBe('function'));
	test('case 2', () => expect(math.mod(1, 2)).toBe(1));
	test('case 3', () => expect(math.mod(-3, -2)).toBe(-1));
	test('case 4', () => expect(math.mod(7, 4)).toBe(3));
});
