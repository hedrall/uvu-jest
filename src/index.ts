process.env.NODE_ENV = 'test';
import kleur from 'kleur';
import { compare } from '../diff';
import { Assertion } from './ts-assert';

let isCLI = false, isNode = false;
let hrtime = ( now = Date.now() ) => () => (Date.now() - now).toFixed( 2 ) + 'ms';
let write = console.log;

type State = {
	__test__?: string;
	__suite__?: string;
} & {
	[key in string]: any;
}

type Handler = ( state: State ) => void | Promise<void>

type HookRegister = ( handler: Handler ) => void;
type TestRegister = ( name: string, handler: Handler ) => void;
export type SuiteRegister = ( suite: Suite ) => void;

export type PrimaryHook = HookRegister & {
	each: HookRegister;
};
type SuiteProps = {
	before: PrimaryHook;
	after: HookRegister & {
		each: HookRegister;
	};
	only: TestRegister;
	nest: SuiteRegister;
	skip: () => void;
	run: () => void;
	runSync: ( filename?: string, suiteNames?: string[] ) => Promise<RunnerResponse>;
}
export type Suite = TestRegister & SuiteProps;

export class Test {
	name: string;
	handler: Handler;

	constructor ( name: string, handler: Handler ) {
		this.name = name;
		this.handler = handler;
	}
}

type TestQueKeys = 'tests' | 'only';
type HookQueKeys = 'before' | 'bEach' | 'after' | 'aEach';
type Context = {
	skips: number;
	state: State;
	filename: string;
} & {
	[key in TestQueKeys]: (Test | Suite)[];
} & {
	[Key in HookQueKeys]: Handler[];
}
const into = ( ctx: Context, key: TestQueKeys ): TestRegister => ( name: string, handler: Handler ) => {ctx[key].push( new Test( name, handler ) )};
const intoSuite = ( ctx: Context, key: 'tests' ): SuiteRegister => ( suite: Suite ) => {ctx[key].push( suite )};
const context = ( state: State ): Context => ({
	tests: [],
	before: [],
	after: [],
	bEach: [],
	aEach: [],
	only: [],
	skips: 0,
	state,
	filename: 'not set'
});
const milli = ( arr: number[] ) => (arr[0] * 1e3 + arr[1] / 1e6).toFixed( 2 ) + 'ms';
const hook = ( ctx: Context, key: HookQueKeys ): HookRegister => ( handler: Handler ) => {ctx[key].push( handler )};

if ( isNode = typeof process < 'u' && typeof process.stdout < 'u' ) {
	// globalThis polyfill; Node < 12
	if ( typeof globalThis !== 'object' ) {
		Object.defineProperty( global, 'globalThis', {
			get: function () { return this }
		} );
	}

	/**
	 * bin.js
	 * .bin/ts-uvu
	 * @type {RegExp}
	 */
	let rgx = /(ts-bin\.ts|bin\.js|\.bin[\\+\/]uj|uvu-jest[\\+\/]bin\.js)/i;
	isCLI = process.argv.some( x => rgx.test( x ) );

	// attach node-specific utils
	write = x => process.stdout.write( x );
	// @ts-ignore
	hrtime = ( now = process.hrtime() ) => () => milli( process.hrtime( now ) );
} else if ( typeof performance < 'u' ) {
	hrtime = ( now = performance.now() ) => () => (performance.now() - now).toFixed( 2 ) + 'ms';
}

export type TestRunner = ( filename?: string ) => Promise<RunnerResponse>;
declare const globalThis: {
	UVU_QUEUE: ([null | { name: string, file: string }, ...TestRunner[]])[],
	UVU_INDEX: number,
	CURRENT_FILE_PATH?: string
	CURRENT_TEST_NAME?: string
	CURRENT_SUITE_NAMES: string[]
};
globalThis.UVU_QUEUE = globalThis.UVU_QUEUE || [];
isCLI || globalThis.UVU_QUEUE.push( [null] );

const QUOTE = kleur.dim( '"' ), GUTTER = '\n        ';
const IGNORE = /^\s*at.*(?:\(|\s)(?:node|(internal\/[\w/]*))/;
const FAILURE = kleur.bold().bgRed( ' FAIL ' );
const SUCCESS = kleur.bold().bgGreen( ' SUCCESS ' );
const FILE = kleur.bold().underline().white;
const SUITE = kleur.bgWhite().bold;
const TestResultIcon = ( result: boolean ) => result ? '✔' : '✘';

function stack ( stack: string, idx: number ) {
	let i = 0, line, out = '';
	let arr = stack.substring( idx ).replace( /\\/g, '/' ).split( '\n' );
	for ( ; i < arr.length; i++ ) {
		line = arr[i].trim();
		if ( line.length && !IGNORE.test( line ) ) {
			out += '\n    ' + line;
		}
	}
	return kleur.grey( out ) + '\n';
}

const isAssertion = ( err: Error ): err is Assertion => {
	return err.name.startsWith( 'AssertionError' );
}

function format ( name: string, err: Error, suite = '' ) {
	let { details, operator = '' } = err as any as { details: string | undefined, operator: string | undefined };
	let idx = err.stack && err.stack.indexOf( '\n' ).toString();
	if ( isAssertion( err ) && !operator.includes( 'not' ) ) {
		// @ts-ignore
		details = compare( err.actual, err.expected );
	} // TODO?
	let str = '  ' + FAILURE + (suite ? kleur.red( SUITE( ` ${suite} ` ) ) : '') + ' ' + QUOTE + kleur.red().bold( name ) + QUOTE;
	str += '\n    ' + err.message + (operator ? kleur.italic().dim( `  (${operator})` ) : '') + '\n';
	if ( details ) str += GUTTER + details.split( '\n' ).join( GUTTER );
	// @ts-ignore
	if ( !!~idx ) str += stack( err.stack as string, idx );
	return str + '\n';
}

type TestResult = {
	name: string,
	result: boolean,
	errorMessage?: string,
};

type SuiteResult = {
	filename?: string;
	childResults?: SuiteResult[];
	suiteName: string;
	suiteResult: boolean;
	thisSuiteResult: boolean;
	testResults: TestResult[];
}

type RunnerResponse = {
	errorMessages: string | true,
	count: {
		test: {
			passed: number,
			skipped: number,
			errored: number,
		},
		suite: {
			passed: number,
			errored: number,
		},
	}
	result: SuiteResult
};

const executeWithErrorReporting = async ( fn: ( ...args: any[] ) => Promise<any> | any, where?: {
	filename?: string,
	nameStack?: string[],
} ) => {
	try {
		return await fn();
	} catch ( err ) {
		const { filename, nameStack } = where || { filename: '', nameStack: [] };

		if ( filename ) console.log( FILE( filename ) );
		const whereString = nameStack ? FAILURE + SUITE( ` ${nameStack.join( ' > ' )} ` ) : undefined;
		console.error( ...[whereString, err].filter( Boolean ) );
	}
};

async function runner ( ctx: Context, thisSuiteName: string, filename?: string, suiteNameStack?: string[] ): Promise<RunnerResponse> {
	let { only, tests, before, after, bEach, aEach, state } = ctx;
	let arr = only.length ? only : tests;
	const res: Omit<RunnerResponse, 'result'> = {
		errorMessages: true,
		count: {
			test: {
				passed: 0,
				skipped: (only.length ? tests.length : 0) + ctx.skips,
				errored: 0
			},
			suite: { passed: 0, errored: 0 }
		},
	}
	// let passed=0, errors='', errorCounts=0,
	let errorCountOfThis = 0;
	const testResults: TestResult[] = []
	const childSuiteResults: SuiteResult[] = []

	try {
		for ( const hook of before ) {
			await executeWithErrorReporting(
				hook.bind( 0, state ),
				{
					filename,
					nameStack: [thisSuiteName, ...suiteNameStack || [], 'before'],
				}
			);
		}

		for ( const test of arr ) {
			if ( !(test instanceof Test) ) {
				const suite = test;
				// nested suite
				const result = await suite.runSync( filename, [...suiteNameStack || [], thisSuiteName] );
				res.errorMessages += result.errorMessages === true ? '' : result.errorMessages;
				res.count.test.passed += result.count.test.passed;
				res.count.test.skipped += result.count.test.skipped;
				res.count.test.errored += result.count.test.errored;
				res.count.suite.passed += result.count.suite.passed;
				res.count.suite.errored += result.count.suite.errored;
				childSuiteResults.push( result.result );
			} else {
				// test
				state.__test__ = test.name;
				globalThis.CURRENT_TEST_NAME = test.name;
				globalThis.CURRENT_SUITE_NAMES = [...suiteNameStack || [], thisSuiteName];
				try {
					for ( const beHook of bEach ) {
						await executeWithErrorReporting(
							beHook.bind( 0, state ),
							{
								filename,
								nameStack: [thisSuiteName, ...suiteNameStack || [], 'beforeEach'],
							}
						);
					}
					await test.handler( state );
					for ( const aeHook of aEach ) {
						await executeWithErrorReporting(
							aeHook.bind( 0, state ),
							{
								filename,
								nameStack: [thisSuiteName, ...suiteNameStack || [], 'afterEach'],
							}
						);
					}
					res.count.test.passed++;
					testResults.push( {
						name: test.name,
						result: true,
					} );
				} catch ( err ) {
					for ( const aeHook of aEach ) {
						await executeWithErrorReporting(
							aeHook.bind( 0, state ),
							{
								filename,
								nameStack: [thisSuiteName, ...suiteNameStack || [], 'afterEach'],
							}

						);
					}
					if ( typeof res.errorMessages === 'string' && res.errorMessages.length ) res.errorMessages += '\n';
					const errorMessage = format( test.name, err as Assertion, thisSuiteName );
					res.errorMessages += errorMessage;
					res.count.test.errored++;
					errorCountOfThis++;
					testResults.push( {
						name: test.name,
						result: false,
						errorMessage,
					} );
				}
			}
		}
	} finally {
		state.__test__ = '';
		for ( const afterHook of after ) {
			await executeWithErrorReporting(
				afterHook.bind( 0, state ),
				{
					filename,
					nameStack: [thisSuiteName, ...suiteNameStack || [], 'after'],
				}
			);
		}

		if ( errorCountOfThis ) {
			res.count.suite.errored++;
		} else {
			res.count.suite.passed++;
		}
		return {
			...res,
			result: {
				filename,
				suiteName: ctx.state.__suite__ || 'unknown',
				testResults,
				suiteResult: res.count.test.errored === 0,
				thisSuiteResult: errorCountOfThis === 0,
				childResults: childSuiteResults,
			}
		};
	}
}

let timer: any;

function defer () {
	clearTimeout( timer );
	timer = setTimeout( exec );
}

function suiteFactory ( ctx: Context, name = '' ): Suite {
	ctx.state.__test__ = '';
	ctx.state.__suite__ = name;

	const props: SuiteProps = {
		before: Object.assign(
			hook( ctx, 'before' ), {
				each: hook( ctx, 'bEach' ),
			} ),
		after: Object.assign(
			hook( ctx, 'after' ), {
				each: hook( ctx, 'aEach' ),
			} ),
		only: into( ctx, 'only' ),
		nest: intoSuite( ctx, 'tests' ),
		skip: () => { ctx.skips++ },
		runSync: ( filename?: string, suiteNames?: string[] ) => {
			const copy = { ...ctx };
			Object.assign( ctx, context( copy.state ) );
			return runner.bind( 0 )( copy, name, filename, suiteNames );
		},
		run: () => {
			const copy = { ...ctx };
			Object.assign( ctx, context( copy.state ) );
			globalThis.UVU_QUEUE[globalThis.UVU_INDEX || 0].push( runner.bind( 0, copy, name ) );
			isCLI || defer();
		}
	};
	return Object.assign( into( ctx, 'tests' ), props )
}

export const suite = ( name = '', state = {} ) => suiteFactory( context( state ), name );
export const test = suite();

const reportResults = ( result: SuiteResult, depth: number = 1 ) => {
	const { filename, suiteName, thisSuiteResult, testResults, childResults } = result;
	if ( depth === 1 && filename ) {
		console.group( '👾 Each Suite Result: ' );
		console.log( FILE( filename ) );
	}
	console.group( SUITE( ` ${suiteName} ` ) );
	testResults.forEach( ( { name, result } ) => {
		console.log( (result ? kleur.green : kleur.red)(
			`${TestResultIcon( result )} ${name}`
		) );
	} );
	if ( childResults ) {
		childResults.forEach( cr => reportResults( cr, depth + 1 ) );
	}
	console.groupEnd();
	if ( depth === 1 ) {
		console.groupEnd();
	}
}

const results: SuiteResult[] = [];

const reportErrorSuites = ( _result: SuiteResult | SuiteResult[] = results, resultStack: SuiteResult[] = [] ) => {
	if ( Array.isArray( _result ) ) {
		results.forEach( r => reportErrorSuites( r, resultStack ) );
		return;
	}
	if ( !_result.thisSuiteResult ) {
		if ( _result.filename ) {
			console.group( FILE( _result.filename ) );
		}
		// report
		const message = [
			...resultStack
				.map( r => (r.thisSuiteResult ? '' : FAILURE) + (SUITE( r.suiteName )) ),
			FAILURE + SUITE( _result.suiteName )
		].join( ' > ' );
		console.group( message );
		_result.testResults.forEach( ( { name, result } ) => {
			console.log( (result ? kleur.green : kleur.red)(
				`${TestResultIcon( result )} ${name}`
			) );
		} );
		console.groupEnd();

		if ( _result.filename ) {
			console.groupEnd();
		}
	}
	if ( _result.childResults ) {
		_result.childResults.forEach( r => reportErrorSuites( r, [...resultStack, _result] ) );
	}
};

export async function exec ( bail: boolean ) {
	let timer = hrtime();
	let exitCode = 0;
	const counts: {
		tests: { total: number, passed: number, skipped: number, errored: number, };
		suite: { passed: number, errored: number, },
	} = {
		tests: { total: 0, passed: 0, skipped: 0, errored: 0, },
		suite: { passed: 0, errored: 0, }
	}
	const files = globalThis.UVU_QUEUE.length;

	for ( let group of globalThis.UVU_QUEUE ) {
		console.log();

		const [name, ...testRunners] = group;
		if ( name?.file ) {
			globalThis.CURRENT_FILE_PATH = name.file;
		}

		for ( let _runner of testRunners ) {
			let result = await _runner( name?.name || undefined );
			counts.tests.skipped += result.count.test.skipped;
			counts.suite.passed += result.count.suite.passed;
			counts.suite.errored += result.count.suite.errored;
			counts.tests.passed += result.count.test.passed;
			counts.tests.errored += result.count.test.errored;
			counts.tests.total += result.count.test.passed + result.count.test.errored;
			results.push( result.result );

			reportResults( result.result );
			if ( result.errorMessages.toString() !== 'true' && result.errorMessages ) {
				write( '\n' + result.errorMessages + '\n' );
				exitCode = 1;
				if ( bail ) return isNode && process.exit( 1 );
			}
		}
	}

	console.log();
	console.group( `💎 ${counts.tests.errored ? FAILURE : SUCCESS} Total results by here` );
	console.group( kleur.bold().underline().blue( 'Total:' ) );
	console.log( `Files:  ${files}` );
	console.log( `Suites: ${counts.suite.passed + counts.suite.errored}` );
	console.log( `Tests:  ${counts.tests.passed + counts.tests.errored}` );
	console.groupEnd();
	if ( counts.tests.errored > 0 ) {
		console.group( kleur.bold().underline().red( 'Errors:' ) )
		console.log( kleur.red( 'Errored Suites: ' + counts.suite.errored ) );
		console.log( kleur.red( 'Errored Tests:  ' + counts.tests.errored ) );
		console.groupEnd();
	}
	console.group( kleur.bold().underline().blue( 'Details:' ) )
	console.log( 'Skipped:  ' + (counts.tests.skipped ? kleur.yellow( counts.tests.skipped ) : counts.tests.skipped) );
	console.log( 'Duration: ' + timer() + '\n\n' );
	console.groupEnd();
	console.groupEnd();

	if ( counts.suite.errored > 0 ) {
		console.group( '💥 Errored Tests' );
		reportErrorSuites();
		console.groupEnd();
	}

	if ( isNode ) process.exitCode = exitCode;
}
