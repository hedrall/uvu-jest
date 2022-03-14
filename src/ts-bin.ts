#!/usr/bin/env node
import sade from 'sade';
import { parse } from './parse';
import { run } from './ts-run';

sade('uvu [dir] [pattern]')
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
			await run(ctx.suites, opts);
		} catch (err: any) {
			console.log(err);
			process.exit(1);
		}
	})
	.parse(process.argv);
