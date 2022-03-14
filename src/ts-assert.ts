import { dequal } from 'dequal';
import { compare, lines } from './diff';

function dedent(str: string) {
	str = str.replace(/\r?\n/g, '\n');
	let arr = str.match(/^[ \t]*(?=\S)/gm);
	let i = 0, min = 1/0, len = (arr||[]).length;
	// @ts-ignore
	for (; i < len; i++) min = Math.min(min, arr[i].length);
	return len && min ? str.replace(new RegExp(`^[ \\t]{${min}}`, 'gm'), '') : str;
}

export class Assertion extends Error {
	name = 'Assertion';
	code = 'ERR_ASSERTION';
	details: false | string;
	generated: boolean;
	operator: string;
	expects: any;
	actual: any;

	constructor(opts: {
		message: Message;
		details: string | false;
		generated?: boolean;
		operator: string;
		expects: any;
		actual: any;
	}) {
		super(opts.message instanceof Error ? opts.message.message : opts.message);
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
		this.details = opts.details || false;
		this.generated = !!opts.generated;
		this.operator = opts.operator;
		this.expects = opts.expects;
		this.actual = opts.actual;
	}
}

export type Message = string | Error;

type AssertProps = [
	bool: boolean,
	actual: any,
	expects: any,
	operator: string,
	detailer: typeof compare | typeof lines | typeof lineNums | false,
	backup: string,
	msg?: Message
];
export function assert(...props: AssertProps) {
	const [bool, actual, expects, operator, detailer, backup, msg] = props;
	if (bool) return;
	const message = msg || backup;
	if (msg instanceof Error) throw msg;
	const details = detailer && detailer(actual, expects);
	throw new Assertion({ actual, expects, operator, message, details, generated: !msg });
}

export function ok(val: any, msg: Message) {
	assert(!!val, false, true, 'ok', false, 'Expected value to be truthy', msg);
}

export function is(val: any, exp: any, msg?: Message) {
	assert(val === exp, val, exp, 'is', compare, 'Expected values to be strictly equal:', msg);
}

export function equal(val: any, exp: any, msg?: Message) {
	assert(dequal(val, exp), val, exp, 'equal', compare, 'Expected values to be deeply equal:', msg);
}

export function unreachable(msg?: Message) {
	assert(false, true, false, 'unreachable', false, 'Expected not to be reached!', msg);
}

export function type(val: any, exp: any, msg: Message) {
	let tmp = typeof val;
	assert(tmp === exp, tmp, exp, 'type', false, `Expected "${tmp}" to be "${exp}"`, msg);
}

export function instance(val: any, exp: any, msg: Message) {
	let name = '`' + (exp.name || exp.constructor.name) + '`';
	assert(val instanceof exp, val, exp, 'instance', false, `Expected value to be an instance of ${name}`, msg);
}

export function match(val: any, exp: any, msg: Message) {
	if (typeof exp === 'string') {
		assert(val.includes(exp), val, exp, 'match', false, `Expected value to include "${exp}" substring`, msg);
	} else {
		assert(exp.test(val), val, exp, 'match', false, `Expected value to match \`${String(exp)}\` pattern`, msg);
	}
}

export function snapshot(val: any, exp: any, msg: Message) {
	val=dedent(val); exp=dedent(exp);
	assert(val === exp, val, exp, 'snapshot', lines, 'Expected value to match snapshot:', msg);
}

const lineNums = (x: any, y: any) => lines(x, y, 1);
export function fixture(val: any, exp: any, msg: Message) {
	val=dedent(val); exp=dedent(exp);
	assert(val === exp, val, exp, 'fixture', lineNums, 'Expected value to match fixture:', msg);
}

export function throws(blk: any, exp: any, msg: Message) {
	if (!msg && typeof exp === 'string') {
		msg = exp; exp = null;
	}

	try {
		blk();
		assert(false, false, true, 'throws', false, 'Expected function to throw', msg);
	} catch (err: any) {
		if (err instanceof Assertion) throw err;

		if (typeof exp === 'function') {
			assert(exp(err), false, true, 'throws', false, 'Expected function to throw matching exception', msg);
		} else if (exp instanceof RegExp) {
			assert(exp.test(err.message), false, true, 'throws', false, `Expected function to throw exception matching \`${String(exp)}\` pattern`, msg);
		}
	}
}

// ---

export function not(val: any, msg: Message) {
	assert(!val, true, false, 'not', false, 'Expected value to be falsey', msg);
}

not.ok = not;

is.not = function (val: any, exp: any, msg?: Message) {
	assert(val !== exp, val, exp, 'is.not', false, 'Expected values not to be strictly equal', msg);
}

not.equal = function (val: any, exp: any, msg?: Message) {
	assert(!dequal(val, exp), val, exp, 'not.equal', false, 'Expected values not to be deeply equal', msg);
}

not.type = function (val: any, exp: any, msg: Message) {
	let tmp = typeof val;
	assert(tmp !== exp, tmp, exp, 'not.type', false, `Expected "${tmp}" not to be "${exp}"`, msg);
}

not.instance = function (val: any, exp: any, msg: Message) {
	let name = '`' + (exp.name || exp.constructor.name) + '`';
	assert(!(val instanceof exp), val, exp, 'not.instance', false, `Expected value not to be an instance of ${name}`, msg);
}

not.snapshot = function (val: any, exp: any, msg: Message) {
	val=dedent(val); exp=dedent(exp);
	assert(val !== exp, val, exp, 'not.snapshot', false, 'Expected value not to match snapshot', msg);
}

not.fixture = function (val: any, exp: any, msg: Message) {
	val=dedent(val); exp=dedent(exp);
	assert(val !== exp, val, exp, 'not.fixture', false, 'Expected value not to match fixture', msg);
}

not.match = function (val: any, exp: any, msg: Message) {
	if (typeof exp === 'string') {
		assert(!val.includes(exp), val, exp, 'not.match', false, `Expected value not to include "${exp}" substring`, msg);
	} else {
		assert(!exp.test(val), val, exp, 'not.match', false, `Expected value not to match \`${String(exp)}\` pattern`, msg);
	}
}

not.throws = function (blk: any, exp: any, msg: Message) {
	if (!msg && typeof exp === 'string') {
		msg = exp; exp = null;
	}

	try {
		blk();
	} catch (err: any) {
		if (typeof exp === 'function') {
			assert(!exp(err), true, false, 'not.throws', false, 'Expected function not to throw matching exception', msg);
		} else if (exp instanceof RegExp) {
			assert(!exp.test(err.message), true, false, 'not.throws', false, `Expected function not to throw exception matching \`${String(exp)}\` pattern`, msg);
		} else if (!exp) {
			assert(false, true, false, 'not.throws', false, 'Expected function not to throw', msg);
		}
	}
}
