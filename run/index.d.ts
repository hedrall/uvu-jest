import type { Suite } from 'ts-uvu/parse';
export function run(suites: Suite[], options?: { bail: boolean }): Promise<void>;
