const { exec } = require('ts-uvu');

exports.run = async function (suites, opts={}) {
	globalThis.UVU_DEFER = 1;

	suites.forEach((suite, idx) => {
		globalThis.UVU_QUEUE.push([suite]);
		globalThis.UVU_INDEX = idx;
		require(suite.file);
	});

	await exec(opts.bail);
}
