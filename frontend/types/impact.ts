export type ImpactMetricIcon = 'heart.fill' | 'sparkles' | 'leaf.fill' | 'drop.fill' | 'wind';

export type ImpactMetric = {
  id: string;
  label: string;
  value: string;
  helperText: string;
  icon: ImpactMetricIcon;
};

export type ImpactResponse = {
  metrics: ImpactMetric[];
  source: 'live' | 'fallback';
};

export type ImpactEstimate = {
  foodWasteDivertedLbs: number;
  co2AvoidedLbs: number;
  methaneAvoidedLbs: number;
  waterSavedGallons: number;
  source: 'gemini' | 'heuristic';
};
