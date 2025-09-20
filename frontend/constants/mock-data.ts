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
