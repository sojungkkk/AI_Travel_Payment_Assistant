const test = require('node:test');
const assert = require('node:assert/strict');
const { transferFee } = require('./fee');

test('같은 은행으로 10000원을 이체하면 수수료는 0원이다', () => {
  assert.equal(transferFee(10000, true), 0);
});

test('다른 은행으로 10000원을 이체하면 수수료는 500원이다', () => {
  assert.equal(transferFee(10000, false), 500);
});

test('다른 은행으로 한도와 같은 5000000원을 이체하면 수수료는 500원이다', () => {
  assert.equal(transferFee(5000000, false), 500);
});

test('다른 은행으로 5000001원을 이체하면 LIMIT_PER_TX 오류가 발생한다', () => {
  assert.throws(() => transferFee(5000001, false), {
    name: 'Error',
    message: 'LIMIT_PER_TX',
  });
});

test('같은 은행으로 0원을 이체하면 INVALID_AMOUNT 오류가 발생한다', () => {
  assert.throws(() => transferFee(0, true), {
    name: 'Error',
    message: 'INVALID_AMOUNT',
  });
});

test('다른 은행으로 -1000원을 이체하면 INVALID_AMOUNT 오류가 발생한다', () => {
  assert.throws(() => transferFee(-1000, false), {
    name: 'Error',
    message: 'INVALID_AMOUNT',
  });
});
