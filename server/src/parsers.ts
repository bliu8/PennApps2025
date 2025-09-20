const ALLERGENS = ['gluten', 'dairy', 'nuts', 'peanuts', 'soy', 'eggs', 'fish', 'shellfish', 'sesame'];

const DATE_REGEX = /(?:best\s+by|use\s+by|exp(?:ires|iry)?|bb|sell\s+by)[^0-9]*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i;
const ISO_DATE_REGEX = /([0-9]{4}-[0-9]{2}-[0-9]{2})/;

export type ParsedScan = {
  title: string;
  allergens: string[];
  expiryDate?: string;
  rawText: string;
  notes?: string;
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
