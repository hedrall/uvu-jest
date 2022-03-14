import { suite } from './src';
import * as assert from './src/assert';

const sleep = () => new Promise(resolve => {
	setTimeout(resolve, 0);
})
const Suite1 = suite('suite1');
Suite1.filename(__filename);

Suite1.before(async () => {
	console.log('>>>>> Suite1 before start');
	await sleep()
	// console.log('>>>>> Suite1 before end');
})


Suite1.after(async () => {
	// console.log('>>>>> Suite1 after start');
	await sleep()
	// console.log('>>>>> Suite1 after end');
})
Suite1('test1-1', () => {
	assert.is(1, 1);
	// assert.is(1, 2);
});

const Suite11 = suite('suite11');
Suite11('test11-1', () => {
	// assert.is(1, 1);
	assert.is(1, 2);
});
Suite11.before(() => {
	console.log('>>>>> Suite11 before start');
})
Suite1.nest(Suite11);

Suite1('test1-2', () => {
	assert.is(1, 1);
	// assert.is(1, 2);
});


const Suite2 = suite('suite2');

Suite2('test2-1', () => {
	// assert.is(1, 1);
	assert.is(1, 2)
});

Suite1.run();
Suite2.run();
// (async () => {
// 	await run([Suite1, Suite2]);
// })().catch(console.error);
// setTimeout(() => {
// }, 2000);
