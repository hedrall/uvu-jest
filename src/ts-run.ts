import { exec, TestRunner } from './index';

type ParsedSuite = {
	name: string;
	file: string;
};

declare const globalThis: {
	UVU_QUEUE: ([null | { name: string, file: string }, ...TestRunner[]])[],
	UVU_INDEX: number,
	CURRENT_TEST_NAME?: string,
	UVU_DEFER: number,
};

export const run = async function (suites: ParsedSuite[], opts: any = {}) {
	globalThis.UVU_DEFER = 1;

	suites.forEach((suite, idx) => {
		globalThis.UVU_QUEUE.push([suite]);
		globalThis.UVU_INDEX = idx;
		require(suite.file);
	});

	await new Promise(resolve => {
		setTimeout(() => exec(opts.bail).then(resolve));
	});

}
