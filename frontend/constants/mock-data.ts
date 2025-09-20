export type Posting = {
  id: string;
  title: string;
  quantityLabel: string;
  distanceKm: number;
  pickupWindow: string;
  pickupLocationHint: string;
  status: 'open' | 'reserved';
  allergens: string[];
  socialProof: string;
  reserverCount: number;
};

export type ImpactMetric = {
  id: string;
  label: string;
  value: string;
  helperText: string;
  icon: 'heart.fill' | 'sparkles' | 'leaf.fill';
};

export type PickupPrompt = {
  id: string;
  title: string;
  supportingCopy: string;
  defaultLabel: string;
};

export const demoPostings: Posting[] = [
  {
    id: 'granola-bundle',
    title: 'Granola bar bundle',
    quantityLabel: '4 sealed twin-packs',
    distanceKm: 0.6,
    pickupWindow: 'Today · 5:30 – 6:00 PM',
    pickupLocationHint: 'Lobby bookshelf near the mailroom',
    status: 'open',
    allergens: ['gluten', 'nuts'],
    socialProof: '3 neighbors picked this up last week',
    reserverCount: 2,
  },
  {
    id: 'seltzer-pack',
    title: 'Citrus seltzer 6-pack',
    quantityLabel: 'All cans sealed & chilled',
    distanceKm: 1.1,
    pickupWindow: 'Today · 7:00 – 8:00 PM',
    pickupLocationHint: 'Corner table at Willow Commons',
    status: 'reserved',
    allergens: [],
    socialProof: 'Reserved in under 12 minutes yesterday',
    reserverCount: 1,
  },
  {
    id: 'pasta-night',
    title: 'Tomato basil pasta kit',
    quantityLabel: '2 boxed kits + sauce pouch',
    distanceKm: 1.8,
    pickupWindow: 'Tomorrow · 11:00 – 13:00',
    pickupLocationHint: 'Public library info desk basket',
    status: 'open',
    allergens: ['gluten'],
    socialProof: 'Neighborhood favorite • 9 saves',
    reserverCount: 0,
  },
];

export const impactMetrics: ImpactMetric[] = [
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

export const pickupPrompts: PickupPrompt[] = [
  {
    id: 'default-window',
    title: 'Default to a 30-minute pickup window',
    supportingCopy: 'It keeps momentum high and matches what most neighbors expect.',
    defaultLabel: 'Suggested: 30 min window',
  },
  {
    id: 'location-hint',
    title: 'Pick a public handoff spot upfront',
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
