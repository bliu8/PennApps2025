import { ImpactMetric } from '@/types/impact';
import { AiNudge } from '@/types/nudge';

export const fallbackImpactMetrics: ImpactMetric[] = [
  {
    id: 'neighbors-helped',
    label: 'Neighbors helped',
    value: '12',
    helperText: 'Up 3 this month — keep the momentum! ❤️',
    icon: 'heart.fill',
  },
  {
    id: 'waste-avoided',
    label: 'Waste avoided',
    value: '18 lbs',
    helperText: 'Equals ~36 meals redirected.',
    icon: 'leaf.fill',
  },
  {
    id: 'wins-this-week',
    label: 'Quick pickup streak',
    value: '4',
    helperText: 'Average pickup time: 22 minutes.',
    icon: 'sparkles',
  },
];

export const fallbackPickupPrompts: AiNudge[] = [
  {
    id: 'default-window',
    headline: 'Default to a 30-minute pickup window',
    supportingCopy: 'It keeps momentum high and matches what most neighbors expect.',
    defaultLabel: 'Suggested: 30 min window',
  },
  {
    id: 'location-hint',
    headline: 'Pick a public handoff spot upfront',
    supportingCopy: 'Library entrances, grocery foyers, and lobbies feel safest for everyone.',
    defaultLabel: 'Popular: Public lobby shelves',
  },
];

export const allergenFriendlyFilters = [
  'Dairy-free',
  'Nut-free',
  'Gluten-free',
  'Vegan snacks',
];

export const fallbackHeroMessages: AiNudge[] = [
  {
    id: 'hero-quick-start',
    headline: 'Tap to cycle micro-nudges',
    supportingCopy: 'Each tap reveals a new sustainability cue to optimize your post.',
    defaultLabel: 'Tap for another nudge',
  },
  {
    id: 'hero-impact',
    headline: 'Lead with the climate win',
    supportingCopy: 'Mention how many meals or pounds of CO₂ you are preventing—Gemini can draft it for you.',
    defaultLabel: 'Add impact stat',
  },
  {
    id: 'hero-reminder',
    headline: 'Default to smart reminders',
    supportingCopy: 'Auto ping your claimer 15 minutes before pickup to keep success rates sky high.',
    defaultLabel: 'Reminder enabled',
  },
];

// Sample recipes for UI testing
export const sampleRecipes = [
  {
    name: 'Spinach Omelette',
    description: 'A quick, protein-packed breakfast with fresh spinach and cheese.',
    ingredients: [
      '2 eggs',
      '1 cup spinach',
      '2 tbsp shredded cheese',
      '1 tbsp olive oil',
      'Salt and pepper',
    ],
    instructions: [
      'Whisk eggs with salt and pepper.',
      'Sauté spinach in olive oil until wilted.',
      'Pour eggs, sprinkle cheese, fold and cook through.',
    ],
    image:
      'https://images.unsplash.com/photo-1516683037151-9d2d81f56c3e?q=80&w=1200&auto=format&fit=crop',
  },
  {
    name: 'Greek Yogurt Parfait',
    description: 'Creamy yogurt layered with berries, honey, and crunchy granola.',
    ingredients: [
      '1 cup Greek yogurt',
      '1/2 cup granola',
      '1/2 cup mixed berries',
      '1 tbsp honey',
    ],
    instructions: [
      'Spoon yogurt into a glass.',
      'Layer with berries and granola.',
      'Drizzle with honey and serve chilled.',
    ],
    image:
      'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?q=80&w=1200&auto=format&fit=crop',
  },
  {
    name: 'Pasta Primavera',
    description: 'Light pasta tossed with seasonal vegetables and parmesan.',
    ingredients: [
      '8 oz pasta',
      '1 cup cherry tomatoes',
      '1 cup broccoli florets',
      '1/2 cup peas',
      '2 tbsp olive oil',
      'Parmesan, salt, pepper',
    ],
    instructions: [
      'Cook pasta until al dente.',
      'Sauté vegetables in olive oil until tender-crisp.',
      'Toss pasta with veggies, season, and top with parmesan.',
    ],
    image:
      'https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=1200&auto=format&fit=crop',
  },
  {
    name: 'Chickpea Salad',
    description: 'Refreshing lemony salad with cucumber, tomato, and herbs.',
    ingredients: [
      '1 can chickpeas (rinsed)',
      '1 cucumber (diced)',
      '1 tomato (diced)',
      '2 tbsp parsley (chopped)',
      '1 lemon (juiced)',
      '2 tbsp olive oil',
      'Salt and pepper',
    ],
    instructions: [
      'Combine chickpeas and chopped vegetables.',
      'Whisk lemon juice with olive oil, salt, and pepper.',
      'Toss together and garnish with parsley.',
    ],
    image:
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?q=80&w=1200&auto=format&fit=crop',
  },
  {
    name: 'Avocado Toast',
    description: 'Toasted bread topped with smashed avocado and chili flakes.',
    ingredients: [
      '2 slices sourdough',
      '1 ripe avocado',
      '1 tsp lemon juice',
      'Chili flakes, salt, pepper',
    ],
    instructions: [
      'Toast the bread to your liking.',
      'Mash avocado with lemon, salt, and pepper.',
      'Spread on toast and sprinkle chili flakes.',
    ],
    image:
      'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=1200&auto=format&fit=crop',
  },
];

// Sample inventory items for UI testing
export const sampleInventoryItems = [
  {
    id: 'item-1',
    name: 'Spinach',
    quantity: 2,
    baseUnit: 'pieces',
    displayUnit: 'bag',
    unitsPerDisplay: 1,
    input_date: new Date(Date.now() - 2 * 86400000).toISOString(),
    est_expiry_date: new Date(Date.now() + 1 * 86400000).toISOString(),
  },
  {
    id: 'item-2',
    name: 'Greek Yogurt',
    quantity: 3,
    baseUnit: 'pieces',
    displayUnit: 'tub',
    unitsPerDisplay: 1,
    input_date: new Date(Date.now() - 1 * 86400000).toISOString(),
    est_expiry_date: new Date(Date.now() + 3 * 86400000).toISOString(),
  },
  {
    id: 'item-3',
    name: 'Cherry Tomatoes',
    quantity: 1,
    baseUnit: 'pieces',
    displayUnit: 'clamshell',
    unitsPerDisplay: 1,
    input_date: new Date().toISOString(),
    est_expiry_date: new Date(Date.now() + 2 * 86400000).toISOString(),
  },
  {
    id: 'item-4',
    name: 'Avocados',
    quantity: 4,
    baseUnit: 'pieces',
    input_date: new Date(Date.now() - 3 * 86400000).toISOString(),
    est_expiry_date: new Date(Date.now() + 5 * 86400000).toISOString(),
  },
  {
    id: 'item-5',
    name: 'Broccoli',
    quantity: 1,
    baseUnit: 'pieces',
    displayUnit: 'head',
    unitsPerDisplay: 1,
    input_date: new Date(Date.now() - 5 * 86400000).toISOString(),
    est_expiry_date: new Date(Date.now() + 1 * 86400000).toISOString(),
  },
];
