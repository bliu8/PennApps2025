export type PriceOption = 'free' | 'low' | 'custom';

const MAX_CUSTOM_PRICE = 20;

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function resolvePrice(option: PriceOption, customInput: string): number {
  if (option === 'free') {
    return 0;
  }
  if (option === 'low') {
    return 1;
  }

  const parsed = Number.parseFloat(customInput);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 1;
  }

  const rounded = roundToCents(parsed);
  if (rounded <= 0) {
    return 1;
  }

  return Math.min(MAX_CUSTOM_PRICE, rounded);
}

export function resolvePriceLabel(price: number): string {
  if (!Number.isFinite(price) || price <= 0) {
    return 'Free · pay it forward';
  }
  if (price <= 1) {
    return '$1 climate-friendly contribution';
  }
  return `$${price.toFixed(2)} suggested share`;
}

export const PricingLimits = {
  MAX_CUSTOM_PRICE,
};
