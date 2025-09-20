export type ImpactMetricIcon = 'heart.fill' | 'sparkles' | 'leaf.fill';

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
