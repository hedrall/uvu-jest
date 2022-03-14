<div align="center" style="display: flex; justify-content: space-around; margin : 20px">
  <img src="shots/jest-seeklogo.com.svg" height="120">
  <span style="font-size: 80px">▶︎</span>
  <img src="shots/uvu.jpg" alt="uvu" height="120" />
</div>

<div align="center">
  <a href="https://npmjs.org/package/uvu-jest">
    <img src="https://badgen.now.sh/npm/v/uvu-jest" alt="version" />
  </a>
  <a href="https://npmjs.org/package/uvu-jest">
    <img src="https://badgen.now.sh/npm/dm/uvu-jest" alt="downloads" />
  </a>
  <a href="https://packagephobia.now.sh/result?p=uvu-jest">
    <img src="https://packagephobia.now.sh/badge?p=uvu-jest" alt="install size" />
  </a>
</div>

<div align="center">
  <b>uvu-jest</b> is a tool that runs test code written in existing Jest with its own lightweight and fast test runner that is a fork of uvu. <br>
</div>

[JP: 日本語ドキュメントはこちら](./readme.jp.md)

## Why

As of 2022, Jest is widely used for unit/integration testing in Node.js environment, but it is often over-specified or too heavy for small to medium size use cases, and many developers want to improve their DX (development experience) by using a lighter and faster test runner.

So I recently found an ultra-lightweight and fast test runner called [uvu](https://github.com/lukeed/uvu). I was very impressed with its super fast startup, minimal functionality implemented, and easy to use API interface.

On the other hand, uvu is still a Series 0 library, and considering the introduction of uvu to existing products that use Jest, there are many cases where we cannot easily decide to replace it.

In light of the above, I wanted to convert the existing test code written in Jest into a code that can be run by a `uvu`-like test runner to achieve fast test execution.

## Usage Restriction

- The test file name must be in the format `*.spec.ts` or `*.spec.js`.

## Usage

> Check out [examples](./examples) for a list of working demos!

1. Install packaged

```bash
npm i -D uvu-jest uvu-jest-ts-plugin ttypescript
```

2. Create tsconfig.**ttsc**.json

```json
{
  "compilerOptions": {
    // Specify the plugin for the conversion
    "plugins": [
      {
        "transform": "uvu-jest-ts-plugin"
      }
    ],
    "outDir": "./dist-uvu",
    "target": "ESNext",
    "module": "commonjs",
    "allowJs": true,
    "checkJs": false
  }
}
```

3. Convert existing test files written in Jest.

```bash
npx ttsc -p tsconfig.ttsc.json
# The dist-uvu will be created
```

4. Run tests

4.1 with CLI

```bash
npx uj dist-uvu spec
```

The first argument of the command is the directory, and the second argument is an optional pattern (same with uvu).
In the directory, tests that match the specified pattern will be executed.

For other CLI command features, please refer to the [uvu documentation](https://github.com/lukeed/uvu/blob/master/docs/cli.md) .

4.2 directly with node

```bash
node dist-uvu/{hoge}/{huga}/{piyo}.js
```

## Configuration file

You can place configuration file named ‘uvu-jest.config.js’ at root path of project.

example

```typescript
module.exports = {
  setupFiles: ['dist-uvu/jestSetUp.js'],
  snapshotResolver: 'test/snapshotResolver.js',
  customMatchers: '@testing-library/jest-dom/matchers',
};
```

- setupFiles
  - Similar to Jest's setupFiles, you can specify files to be executed before the test is run.
  - ex) set up env variables
- snapshotResolver
  - Similar to the snapshotResolver in Jest, you can change the destination of the snapshot file for the test file.
  - Only the resolveSnapshotPath is supported.
- customMatchers
  - Add matcher to expect function.
  - It is assumed to be exported in the form `Record<string, MatcherFn>`.

## How do it work

### 1. Why I forked uvu?

I wish I could have used uvu as it is, but the main reason is that there was one difficulty in rewriting tests written in Jest to uvu.
Jest has a lifecycle hook called `afterAll`, which can be nested with describe. uvu also has a hook called `suite.after`, but it can't reproduce the execution order of nested cases as shown below.

```typescript
describe('desc1', () => {
  afterAll(() => { /* after all 1 */})
  test('test1', () => {});
  describe('desc2', () => {
    afterAll(() => { /* after all 2 */})
    test('test2', () => {});
  });
});
```

In this case, the execution order is `test1 => test2 => after all 2 => after all 1`. As you can see, afterAll specifies the lifecycle for each level of describe, so without the ability to nest, you can't rewrite the Jest code. However, the nesting feature in uvu was still [under discussion](https://github.com/lukeed/uvu/issues/43).

So I decided to fork uvu and add a new function called `suite.nest`.

> When sufficient functionality for uvu-jest is added to UVU, I would like to remove the fork and use the original uvu.

### 2. wrapper

Since it would be too much work to leave everything to the transformer to transform the Jest code, and since it would be difficult to debug if the transformed code is too far from the existing code, I prepared a [wrapper](./src/jest-wrapper.ts) .
([Referred to here](https://github.com/lukeed/uvu/issues/43#issuecomment-740817223))

Specifically, the wrapper replaces describe, as below,

```typescript
export function describe (name: string, handler: Handler) {
  const test = suite(name);

  handler({
    test,
    expect, // It's defined elsewhere.
    describe,
    afterAll: test.after,
    beforeAll: test.before,
  });

  test.run();
}
```

An example of rewriting the Jest code is as follows,

```typescript
describe('desc1', ({ afterAll, test, expect, describe }) => {
  afterAll(() => {});
  test('test1', () => {
    expect(parseInt(0.0000005)).not.toBe(0);
  });
  describe('desc2', ({ afterAll, test, expect, describe }) => {
    afterAll(() => {});
    test('test2', () => {
      expect(parseInt(0.0000005)).toBe(5);
    });
  })
});
```

### 3. Test code conversion

For the transformation, I used Transformer API in TypeScript's CompilerAPIs, which allows us to change the input TS file in the middle of the transpile.
As explained in Chapter 2, the necessary modifications are to add an import statement of the wrapper of describe, and to provide arguments to the handler of describe .

Note that the custom Transform plugin cannot be specified in TypeScript (tsconfig.json), so have to use [ttypescript](https://github.com/cevek/ttypescript).

## Support for Jest features

### Matcher

- expect().toBe()
- expect().toEqual()
- expect().not.toBe()
- expect().not.toEqual()
- expect().rejects.thThrow()
- expect().toMatchSnapshot()

### snapshot tests

Although uvu also has a snapshot test function, we can use [jest-snapshot](https://www.npmjs.com/package/jest-snapshot) to make use of the existing snapshot created by jest. The snapshot testing mechanism of Jest is directly used.

Since the snapshot test needs to get the path to the executable file, it must be run in the CLI.
Also, by specifying the `-u` flag in the CLI, you can update the snapshot just like in jest.

> jest-snapshot is a huge package and takes hundreds of ms to load, so it will only be loaded when needed.

## Testing Library support

The `Testing Library` is basically designed to be used with `Jest`, but like [#using-without-jest](https://testing-library.com/docs/react-testing-library/setup/#Using-without-jest) , you can use it by replacing execute command `uj` to `node -r global-jsdom/register node_modules/.bin/uj`.

Also, the `Testing Library` provides its own custom matchers such as `toBeInTheDocument`, which can be used by registering them in `uvu-jest.config.js`.

```js
module.exports = {
  customMatchers: '@testing-library/jest-dom/matchers',
  /* ... other settnigs */
};
```

## TODO

- [ ] uvu features
  - [ ] skip, only
- [ ] jest features
  - [x] .not.
- [x] uvu.config.js
  - [x] setup file
  - [x] snapshot resolver
  - [ ] make transform target filename regexp configurable
- [x] make examples

## What not to do

## FAQ

### When use TS path alias

The JS files generated using `uvu-jest-ts-plugin` are compiled by TSC, so the TS path alias is not resolved.

Therefore, it is recommended that a configuration using (module-alias)[https://github.com/ilearnio/module-alias], which resolves aliases at runtime, be loaded in setup file.

## CONTRIBUTE

It would be helpful to receive requests and feedback on PRs and issues.

## License

MIT © [hedrall](https://blog.hedrall.work)
