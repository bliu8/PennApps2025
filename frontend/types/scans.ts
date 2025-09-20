import { ImpactEstimate } from './impact';

export type ScanRecord = {
  id: string;
  title: string;
  allergens: string[];
  expiryDate: string | null;
  rawText: string;
  notes?: string | null;
  mimeType?: string;
  createdAt: string;
  impactEstimates?: ImpactEstimate | null;
  detectionSource?: 'gemini' | 'vision' | 'fallback';
};
