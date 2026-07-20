/**
 * Phase 1 pure-logic self checks (no test runner required).
 * Import and call `runPhase1SelfTests()` from a console or temporary button.
 */
import {
  canRefundAmount,
  computeChange,
  createIdempotencyKey,
  needsManagerPinForDiscount,
  validateCashTender,
  validateSplitPayment,
} from '../lib/validators';

export function runPhase1SelfTests(): { passed: number; failed: string[] } {
  const failed: string[] = [];
  const assert = (cond: boolean, msg: string) => {
    if (!cond) failed.push(msg);
  };

  assert(validateCashTender(100, 100).ok, 'exact cash should pass');
  assert(validateCashTender(100, 99).ok === false, 'under-tender should fail');
  assert(validateCashTender(100, -1).ok === false, 'negative tender should fail');
  assert(computeChange(100, 150) === 50, 'change calc');

  assert(
    validateSplitPayment(100, [
      { method: 'cash', amount: 40 },
      { method: 'upi', amount: 60 },
    ]).ok,
    'valid split'
  );
  assert(validateSplitPayment(100, [{ method: 'cash', amount: 30 }]).ok === false, 'under split');

  assert(needsManagerPinForDiscount(15, 10) === true, 'pin threshold');
  assert(needsManagerPinForDiscount(5, 10) === false, 'below threshold');

  assert(canRefundAmount(100, 0, 100).ok, 'full refund');
  assert(canRefundAmount(100, 40, 70).ok === false, 'over refund');
  assert(canRefundAmount(100, 40, 60).ok, 'remaining refund');

  assert(createIdempotencyKey(['a', 'b']).includes('a:b'), 'idempotency key');

  return { passed: 11 - failed.length, failed };
}
