export const ALLERGENS = ['gluten', 'dairy', 'nuts', 'peanuts', 'soy', 'eggs', 'fish', 'shellfish', 'sesame'];

const DATE_REGEX = /(?:best\s+by|use\s+by|exp(?:ires|iry)?|bb|sell\s+by)[^0-9]*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i;
const ISO_DATE_REGEX = /([0-9]{4}-[0-9]{2}-[0-9]{2})/;

export type ParsedScan = {
  title: string;
  allergens: string[];
  expiryDate?: string;
  rawText: string;
  notes?: string;
};

export type ScanImpactEstimates = {
  foodWasteDivertedLbs: number;
  co2AvoidedLbs: number;
  methaneAvoidedLbs: number;
  waterSavedGallons: number;
  source: 'gemini' | 'heuristic';
};

export type ImpactEstimationHints = {
  overrides?: Partial<Omit<ScanImpactEstimates, 'source'>> & { source?: ScanImpactEstimates['source'] };
  statedWeightLbs?: number | null;
  servings?: number | null;
};

export function parseDetectedText(text: string): ParsedScan {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let title = lines[0] ?? 'Unlabeled item';

  // Remove generic prefixes that Vision often returns
  if (/^(best|use)\b/i.test(title) && lines.length > 1) {
    title = lines[1];
  }

  const lowerText = text.toLowerCase();
  const allergens = ALLERGENS.filter((allergen) => lowerText.includes(allergen));

  let expiryDate: string | undefined;
  const match = DATE_REGEX.exec(text) ?? ISO_DATE_REGEX.exec(text);
  if (match?.[1]) {
    const raw = match[1].replace(/\s+/g, '');
    const normalized = normalizeDateString(raw);
    if (normalized) {
      expiryDate = normalized;
    }
  }

  return {
    title,
    allergens,
    expiryDate,
    rawText: text,
  };
}

function clampMetric(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundMetric(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function extractWeightFromText(text: string): number | null {
  const lbMatch = text.match(/(\d+(?:\.\d+)?)\s?(?:lb|lbs|pounds?)/i);
  if (lbMatch) {
    const pounds = Number.parseFloat(lbMatch[1]);
    if (!Number.isNaN(pounds) && pounds > 0) {
      return pounds;
    }
  }

  const ozMatch = text.match(/(\d+(?:\.\d+)?)\s?(?:oz|ounces?)/i);
  if (ozMatch) {
    const ounces = Number.parseFloat(ozMatch[1]);
    if (!Number.isNaN(ounces) && ounces > 0) {
      return ounces / 16;
    }
  }

  return null;
}

export function estimateImpactFromScan({
  allergens,
  rawText,
  hints,
}: {
  allergens: string[];
  rawText: string;
  hints?: ImpactEstimationHints;
}): ScanImpactEstimates {
  const allergenFactor = clampMetric(allergens.length * 0.15, 0, 1.5);
  const textWeight = extractWeightFromText(rawText) ?? null;
  const providedWeight = hints?.statedWeightLbs ?? null;

  const baseWaste = (() => {
    if (hints?.overrides?.foodWasteDivertedLbs && hints.overrides.foodWasteDivertedLbs > 0) {
      return hints.overrides.foodWasteDivertedLbs;
    }
    if (providedWeight && providedWeight > 0) {
      return providedWeight;
    }
    if (textWeight && textWeight > 0) {
      return textWeight;
    }
    const servings = hints?.servings && hints.servings > 0 ? hints.servings : clampMetric(rawText.split(/\n|,|;/).length * 0.2, 1, 6);
    return 0.8 + allergenFactor + servings * 0.25;
  })();

  const foodWasteDivertedLbs = clampMetric(roundMetric(baseWaste, 2), 0.1, 25);

  const methaneAvoided = (() => {
    if (hints?.overrides?.methaneAvoidedLbs && hints.overrides.methaneAvoidedLbs > 0) {
      return hints.overrides.methaneAvoidedLbs;
    }
    return foodWasteDivertedLbs * 0.32;
  })();

  const co2Avoided = (() => {
    if (hints?.overrides?.co2AvoidedLbs && hints.overrides.co2AvoidedLbs > 0) {
      return hints.overrides.co2AvoidedLbs;
    }
    return foodWasteDivertedLbs * 2.5;
  })();

  const waterSaved = (() => {
    if (hints?.overrides?.waterSavedGallons && hints.overrides.waterSavedGallons > 0) {
      return hints.overrides.waterSavedGallons;
    }
    return foodWasteDivertedLbs * 55;
  })();

  return {
    foodWasteDivertedLbs: clampMetric(roundMetric(foodWasteDivertedLbs, 2), 0.1, 100),
    co2AvoidedLbs: clampMetric(roundMetric(co2Avoided, 2), 0.1, 300),
    methaneAvoidedLbs: clampMetric(roundMetric(methaneAvoided, 2), 0.05, 40),
    waterSavedGallons: clampMetric(roundMetric(waterSaved, 1), 1, 5000),
    source: hints?.overrides?.source ?? 'heuristic',
  };
}

function normalizeDateString(input: string): string | undefined {
  if (ISO_DATE_REGEX.test(input)) {
    return input;
  }

  const parts = input.split(/[\/.\-]/).map((part) => part.padStart(2, '0'));
  if (parts.length !== 3) {
    return undefined;
  }

  const [part1, part2, part3] = parts;

  // Determine whether the year is first or last
  if (part3.length === 4) {
    // assume mm/dd/yyyy
    const [month, day, year] = [part1, part2, part3];
    return `${year}-${month}-${day}`;
  }

  if (part1.length === 4) {
    const [year, month, day] = [part1, part2, part3];
    return `${year}-${month}-${day}`;
  }

  // fallback to mm/dd/yy -> convert to 20xx
  const year = Number(part3);
  if (Number.isNaN(year)) {
    return undefined;
  }
  const century = year > 50 ? 1900 : 2000;
  return `${century + year}-${part1}-${part2}`;
}
