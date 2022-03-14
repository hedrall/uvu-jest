import * as assert from './ts-assert';
import { PrimaryHook, suite, Suite } from './index';
import { loadConfig } from './loadConfig';
import { customAssert } from './customAssert';

const config = loadConfig();

type Asserts = {
  toEqual: (e: any) => void;
  toBe: (e: any) => void;
  toMatchSnapshot: () => void;
}

const createCustomMatchers = (r: any | Promise<any>): Record<string, CallableFunction> => {
  if (!config.customMatchers) return {};
  return Object.entries(config.customMatchers).reduce<Record<string, CallableFunction>>((pre, [key, func]) => {
    return {
      ...pre,
      [key]: () => func(r),
    };
  }, {});
}

export function expect(promise: Promise<any>): {
  rejects: {
    toThrow: (errorMessage?: string) => Promise<void>;
  };
};
export function expect(any: any): Asserts;
export function expect(any: any): { not: Omit<Asserts, 'toMatchSnapshot'> };
export function expect(r: any | Promise<any>) {
  const toEqual = ( e: any) => assert.equal(r, e);
  return {
    ...createCustomMatchers(r),
    not: {
      toBe: (e: any) => assert.is.not(r, e),
      toEqual: (e: any) => assert.not.equal(r, e),
    },
    toBe: (e: any) => assert.is(r, e),
    toEqual: toEqual,
    toStrictEqual: toEqual,
    toMatchSnapshot: (_filename?: string) => {
      // @ts-ignore
      const filename = globalThis.CURRENT_FILE_PATH;
      if (!filename) {
        throw new Error('To get filename, you must pass `__filename` to first variable of toMatchSnapshot when you not use cli.');
      }
      // @ts-ignore
      const testName = globalThis.CURRENT_TEST_NAME as string;
      // @ts-ignore
      const suiteNames = globalThis.CURRENT_SUITE_NAMES as string[] | undefined;
      customAssert.toMatchSnapshot(r, testName, suiteNames, filename, config.snapshotResolver);
    },
    rejects: {
      toThrow: async (errorMessage?: string) => {
        try {
          await (r as Promise<void>);
          assert.unreachable();
        } catch (e: any) {
          if (typeof errorMessage === 'string') {
            assert.is(e.message, errorMessage);
          }
        }
      },
    },
  };
}

type HandlerProps = {
  test: Suite;
  expect: typeof expect;
  describe: typeof describe;
  afterAll: PrimaryHook;
  beforeAll: PrimaryHook;
};

type Handler = (props: HandlerProps) => void;

export function describe (name: string, handler: Handler, baseSuite?: Suite) {
  const test = suite(name);
  if (baseSuite) {
    baseSuite.nest(test);
  }
  handler({
    test,
    expect,
    describe: (name: string, handler: Handler) => describe(name, handler, test),
    afterAll: test.after,
    beforeAll: test.before,
  });
  if (!baseSuite) {
    test.run();
  }
}
