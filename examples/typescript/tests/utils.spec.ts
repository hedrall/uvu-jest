import * as utils from '../src/utils';

describe('capitalize', () => {
	test('case 1', () => expect(typeof utils.capitalize).toBe('function'));
	test('case 2', () => expect(utils.capitalize('hello')).toBe('Hello'));
	test('case 3', () => expect(utils.capitalize('foo bar')).toBe('Foo bar'));
});

describe('dashify', () => {
	test('case 1', () => expect(typeof utils.dashify).toBe('function'));
	test('case 2', () => expect(utils.dashify('fooBar')).toBe('foo-bar'));
	test('case 3', () => expect(utils.dashify('FooBar')).toBe('foo-bar'));
	test('case 4', () => expect(utils.dashify('foobar')).toBe('foobar'));
});
