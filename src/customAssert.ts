import type { SnapshotResolver, SnapshotState, toMatchSnapshot } from 'jest-snapshot';
import type { Context } from 'jest-snapshot/build/types';
import { assert } from './ts-assert';
import * as path from 'path';

const EXTENSION = 'snap';
const DOT_EXTENSION = '.' + EXTENSION;

const defaultSnapshotResolver: SnapshotResolver =
   {
    resolveSnapshotPath: testPath =>
      path.join(
        path.join(path.dirname(testPath), '__snapshots__'),
        path.basename(testPath) + DOT_EXTENSION
      ),
    resolveTestPath: snapshotPath =>
      path.resolve(
        path.dirname(snapshotPath),
        '..',
        path.basename(snapshotPath, DOT_EXTENSION)
      ),
    testPathForConsistencyCheck: path.posix.join(
      'consistency_check',
      '__tests__',
      'example.test.js'
    )
  };

type JestSnapshotModule = {
  SnapshotState: typeof SnapshotState,
  _toMatchSnapshot: typeof toMatchSnapshot,
};
let jestSnapshotModule: JestSnapshotModule | null = null;

const getJestModule = (): JestSnapshotModule => {
  if (jestSnapshotModule) {
    return jestSnapshotModule;
  }
  const module = require('jest-snapshot');
  jestSnapshotModule = {
    SnapshotState: module.SnapshotState,
    _toMatchSnapshot: module.toMatchSnapshot,
  };
  return jestSnapshotModule;
}
export const customAssert = {
  toMatchSnapshot (
    actual: any,
    testName: string,
    suiteNames: string[] | undefined,
    currentTestFilePath: string,
    _snapshotResolver?: SnapshotResolver
  ) {
    const snapshotResolver = _snapshotResolver || defaultSnapshotResolver;
    const testFilePath: string = snapshotResolver.resolveSnapshotPath(currentTestFilePath, DOT_EXTENSION);
    const update = process.env.UPDATE_SNAPSHOT === 'true';

    const {SnapshotState, _toMatchSnapshot} = getJestModule();

    const snapshotState = new SnapshotState( testFilePath, {
      updateSnapshot: update ? 'all' : 'new',
    } as any );

    const result = _toMatchSnapshot.call(
      {
        snapshotState,
        currentTestName: [...suiteNames || [], testName].join(' '),
      } as Context,
      actual
    );

    snapshotState.save();

    assert(
      result.pass,
      actual,
      '',
      'toMatchSnapshot',
      result.message || false,
      'Expected value to match snapshot:',
      ''// result.message?.()
    )
  }
}
