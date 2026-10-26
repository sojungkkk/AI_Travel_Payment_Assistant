function transferFee(amount, sameBank) {
  if (amount <= 0) {
    throw new Error('INVALID_AMOUNT');
  }
  if (amount > 5000000) {
    throw new Error('LIMIT_PER_TX');
  }
  return sameBank ? 0 : 500;
}

module.exports = { transferFee };
