#!/usr/bin/env node
const sade = require('sade');
const pkg = require('./package');
const { parse } = require('./parse');

const dimport = x => new Function(`return import(${ JSON.stringify(x) })`).call(0);

const hasImport = (() => {
	try { new Function('import').call(0) }
	catch (err) { return !/unexpected/i.test(err.message) }
})();

sade('uvu [dir] [pattern]')
	.version(pkg.version)
	.option('-b, --bail', 'Exit on first failure')
	.option('-i, --ignore', 'Any file patterns to ignore')
	.option('-r, --require', 'Additional module(s) to preload')
	.option('-C, --cwd', 'The current directory to resolve from', '.')
	.option('-c, --color', 'Print colorized output', true)
	.option('-u, --updateSnapshot', 'update snapshots', false)
	.action(async (dir, pattern, opts) => {
		try {
			if (opts.color) process.env.FORCE_COLOR = '1';
			if (opts.updateSnapshot && !process.env.UPDATE_SNAPSHOT) {
				process.env.UPDATE_SNAPSHOT = 'true';
			}
			let ctx = await parse(dir, pattern, opts);

			if (!ctx.requires && hasImport) {
				await dimport('ts-uvu/run').then(m => m.run(ctx.suites, opts));
			} else {
				await require('ts-uvu/run').run(ctx.suites, opts);
			}
		} catch (err) {
			console.error(err.stack || err.message);
			process.exit(1);
		}
	})
	.parse(process.argv);
