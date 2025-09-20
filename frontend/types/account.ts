import { ImpactEstimate } from './impact';

export type NotificationAccent = 'warning' | 'success' | 'info';

export type NotificationPayload = {
  id: string;
  title: string;
  body: string;
  accent: NotificationAccent;
  ctaLabel?: string;
};

export type InventoryItem = {
  id: string;
  title: string;
  source: 'posting' | 'scan';
  status: string;
  quantityLabel?: string | null;
  price?: number | null;
  priceLabel?: string | null;
  expiryDate: string | null;
  expiresInDays: number | null;
  allergens: string[];
  notes?: string | null;
  impact: ImpactEstimate;
  createdAt: string;
  detectionSource?: string;
};

export type AccountOverview = {
  account: {
    id: string;
    name: string;
    shareRatePercent: number;
    totals: {
      foodWasteDivertedLbs: number;
      co2AvoidedLbs: number;
      methaneAvoidedLbs: number;
      waterSavedGallons: number;
      activeListings: number;
    };
    inventory: InventoryItem[];
    expiringSoon: InventoryItem[];
  };
  notifications: NotificationPayload[];
};
