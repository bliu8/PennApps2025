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
