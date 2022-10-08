export type TestResult = {
	name: string,
	result: boolean,
	errorMessage?: string,
};

export type SuiteResult = {
	filename?: string;
	childResults?: SuiteResult[];
	suiteName: string;
	suiteResult: boolean;
	thisSuiteResult: boolean;
	testResults: TestResult[];
}

export type RunnerResponse = {
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
