import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolvePrice, resolvePriceLabel, PricingLimits, type PriceOption } from '../utils/pricing.js';

test('resolvePrice uses nudged defaults for free and low options', () => {
  assert.equal(resolvePrice('free', '12'), 0);
  assert.equal(resolvePrice('low', '12'), 1);
});

test('resolvePrice rounds custom input and clamps to pricing limits', () => {
  const rounded = resolvePrice('custom', '2.239');
  assert.equal(rounded, 2.24);
  assert.equal(resolvePriceLabel(rounded), '$2.24 suggested share');

  const invalid = resolvePrice('custom', '-3');
  assert.equal(invalid, 1);
  assert.equal(resolvePriceLabel(invalid), '$1 climate-friendly contribution');

  const tooHigh = resolvePrice('custom', String(PricingLimits.MAX_CUSTOM_PRICE + 10));
  assert.equal(tooHigh, PricingLimits.MAX_CUSTOM_PRICE);
  assert.equal(resolvePriceLabel(tooHigh), `$${PricingLimits.MAX_CUSTOM_PRICE.toFixed(2)} suggested share`);
});

test('resolvePriceLabel falls back to pay-it-forward messaging when price is invalid', () => {
  assert.equal(resolvePriceLabel(Number.NaN), 'Free · pay it forward');
  assert.equal(resolvePriceLabel(-5), 'Free · pay it forward');
});

test('custom option accepts currency strings with whitespace', () => {
  const option: PriceOption = 'custom';
  assert.equal(resolvePrice(option, ' 3.5 '), 3.5);
});
