const path = require("path");
module.exports = {
	// setupFiles: ['dist-uvu/jestSetUp.js'],
	// snapshotResolver: 'test/snapshotResolver.js',
	// customMatchers: '@testing-library/jest-dom/matchers',
	// rootPath: __dirname,
	emitResultPath: path.resolve(__dirname, 'report.json')
};
