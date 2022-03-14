"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jest_wrapper_1 = require("uvu-jest/jest-wrapper");
const utils = require("../src/utils");
jest_wrapper_1.describe('capitalize', ({ beforeAll, afterAll, describe, test, expect }) => {
    test('case 1', () => expect(typeof utils.capitalize).toBe('function'));
    test('case 2', () => expect(utils.capitalize('hello')).toBe('Hello'));
    test('case 3', () => expect(utils.capitalize('foo bar')).toBe('Foo bar'));
});
jest_wrapper_1.describe('dashify', ({ beforeAll, afterAll, describe, test, expect }) => {
    test('case 1', () => expect(typeof utils.dashify).toBe('function'));
    test('case 2', () => expect(utils.dashify('fooBar')).toBe('foo-bar'));
    test('case 3', () => expect(utils.dashify('FooBar')).toBe('foo-bar'));
    test('case 4', () => expect(utils.dashify('foobar')).toBe('foobar'));
});
