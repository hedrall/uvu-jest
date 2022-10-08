import kleur from 'kleur';
import { SuiteResult } from './types';

export const FILE = kleur.bold().underline().white;
export const SUITE = kleur.bgWhite().bold;
export const FAILURE = kleur.bold().bgRed( ' FAIL ' );

export const TestResultIcon = ( result: boolean ) => result ? '✔' : '✘';

type Logger = {
	group: (i: string) => void;
	groupEnd: () => void;
	log: (i: string) => void;
}
export const reportResult = ( result: SuiteResult, depth: number = 1, logger: Logger = console)  => {
	const { filename, suiteName, thisSuiteResult, testResults, childResults } = result;
	if ( depth === 1 && filename ) {
		logger.group( '👾 Each Suite Result: ' );
		logger.log( FILE( filename ) );
	}
	logger.group( SUITE( ` ${suiteName} ` ) );
	testResults.forEach( ( { name, result } ) => {
		logger.log( (result ? kleur.green : kleur.red)(
			`${TestResultIcon( result )} ${name}`
		) );
	} );
	if ( childResults ) {
		childResults.forEach( cr => reportResult( cr, depth + 1 ) );
	}
	logger.groupEnd();
	if ( depth === 1 ) {
		logger.groupEnd();
	}
}

export const reportErrorSuites = ( _result: SuiteResult | SuiteResult[], resultStack: SuiteResult[] = [] ) => {
	if ( Array.isArray( _result ) ) {
		_result.forEach( r => reportErrorSuites( r, resultStack ) );
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
