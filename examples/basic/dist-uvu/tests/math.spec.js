"use strict";
const jest_wrapper_1 = require("uvu-jest/jest-wrapper");
const math = require('../src/math');
jest_wrapper_1.describe('sum', ({ beforeAll, afterAll, describe, test, expect }) => {
    test('case 1', () => expect(typeof math.sum).toBe('function'));
    test('case 2', () => expect(math.sum(1, 2)).toBe(3));
    test('case 3', () => expect(math.sum(-1, -2)).toBe(-3));
    test('case 4', () => expect(math.sum(-1, 1)).toBe(0));
});
jest_wrapper_1.describe('div', ({ beforeAll, afterAll, describe, test, expect }) => {
    test('case 1', () => expect(typeof math.div).toBe('function'));
    test('case 2', () => expect(math.div(1, 2)).toBe(0.5));
    test('case 3', () => expect(math.div(-1, -2)).toBe(0.5));
    test('case 4', () => expect(math.div(-1, 1)).toBe(-1));
});
jest_wrapper_1.describe('mod', ({ beforeAll, afterAll, describe, test, expect }) => {
    test('case 1', () => expect(typeof math.mod).toBe('function'));
    test('case 2', () => expect(math.mod(1, 2)).toBe(1));
    test('case 3', () => expect(math.mod(-3, -2)).toBe(-1));
    test('case 4', () => expect(math.mod(7, 4)).toBe(3));
});
