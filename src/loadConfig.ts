import * as path from 'path';
import { SnapshotResolver } from 'jest-snapshot';

const appRootPath = require('app-root-path').path as string

type Config = {
  rootPath?: string;
  setupFiles?: string[],
  snapshotResolver?: string,
  customMatchers?: string,
}

type LoadConfigResult = {
  snapshotResolver?: SnapshotResolver;
  customMatchers?: Record<string, CallableFunction>;
  config: Config;
}
export const loadConfig = (): LoadConfigResult => {
  let config: Config = {};
  const result: LoadConfigResult = {
    config: {}
  };

  const rootPath = config.rootPath || appRootPath;
  try {
    config = require(path.resolve(rootPath, 'uvu-jest.config.js')) as Config
    result.config = config;
  } catch ( e ) {
    // ignore
  }

  // setupFiles
  if (config.setupFiles) {
    for (const filePath of config.setupFiles) {
      const setupFilePath = path.resolve(rootPath, filePath);
      require(setupFilePath);
    }
  }

  // snapshotResolver
  if (config.snapshotResolver) {
    result.snapshotResolver = require(
      path.resolve(rootPath, config.snapshotResolver)
    );
  }

  // custom matchers
  if (config.customMatchers) {
    try {
      result.customMatchers = require( config.customMatchers );
    } catch (e) {
      console.log(`Cannot find custom matcher package ${config.customMatchers} specified in uvu-jest.config.js`);
    }
  }

  return result;
}
