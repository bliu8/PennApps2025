import { Platform } from 'react-native';

import { API_BASE_URL } from '@/utils/env';
import { Posting } from '@/types/posting';
import { ScanRecord } from '@/types/scans';
import { ImpactResponse } from '@/types/impact';
import { NudgesResponse } from '@/types/nudge';
import { AccountOverview, NotificationPayload } from '@/types/account';

type ApiPosting = Omit<Posting, 'createdAt' | 'distanceLabel'> & {
  createdAt?: string;
};

type PostingsResponse = {
  postings: ApiPosting[];
};

type ScansResponse = {
  scans: ScanRecord[];
};

type AccountOverviewResponse = AccountOverview;

type NotificationsResponse = {
  notifications: NotificationPayload[];
  shareRatePercent: number;
};

export type ListingAssistantResponse = {
  suggestion: {
    titleSuggestion: string;
    quantityLabel: string;
    pickupWindowLabel: string;
    pickupLocationHint: string;
    impactNarrative: string;
    tags: string[];
  };
  source: 'live' | 'fallback';
};

export type CreatePostingPayload = {
  title: string;
  quantityLabel: string;
  pickupWindowLabel?: string;
  pickupLocationHint?: string;
  allergens: string[];
  impactNarrative?: string;
  tags?: string[];
  price?: number;
  priceLabel?: string;
  expiryDate?: string;
};

export type ListingAssistPayload = {
  title?: string;
  quantityLabel?: string;
  allergens?: string[];
  notes?: string | null;
  expiryDate?: string | null;
};

function mapPosting(posting: ApiPosting): Posting {
  const pickupWindowLabel = posting.pickupWindowLabel ?? 'Add a pickup window';
  const distanceLabel = typeof posting.distanceKm === 'number' ? `${posting.distanceKm.toFixed(1)} km away` : 'Distance pending';
  const price = typeof posting.price === 'number' ? posting.price : null;
  const priceLabel =
    posting.priceLabel ?? (price === null || price === 0 ? 'Free · pay it forward' : `$${price.toFixed(2)} climate-friendly share`);
  const expiryDate = posting.expiryDate ?? null;
  const impactEstimates = posting.impactEstimates ?? null;

  return {
    ...posting,
    pickupWindowLabel,
    distanceLabel,
    createdAt: posting.createdAt ?? new Date().toISOString(),
    price,
    priceLabel,
    expiryDate,
    impactEstimates,
  };
}

function normalizeInventoryItem<T extends { price?: number | null; priceLabel?: string | null }>(item: T): T {
  const price = typeof item.price === 'number' ? item.price : null;
  const priceLabel =
    item.priceLabel ?? (price === null || price === 0 ? 'Free · pay it forward' : `$${price.toFixed(2)} climate-friendly share`);

  return {
    ...item,
    price,
    priceLabel,
  };
}

export async function fetchPostings(): Promise<Posting[]> {
  const response = await fetch(`${API_BASE_URL}/postings`);
  if (!response.ok) {
    throw new Error(`Unable to load postings (${response.status})`);
  }
  const data = (await response.json()) as PostingsResponse;
  return data.postings.map((posting) => mapPosting(posting));
}

export async function createPosting(payload: CreatePostingPayload): Promise<Posting> {
  const response = await fetch(`${API_BASE_URL}/postings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Unable to publish posting (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { posting: ApiPosting };
  return mapPosting(data.posting);
}

export async function fetchImpactMetrics(): Promise<ImpactResponse> {
  const response = await fetch(`${API_BASE_URL}/impact`);
  if (!response.ok) {
    throw new Error(`Unable to load impact metrics (${response.status})`);
  }

  return (await response.json()) as ImpactResponse;
}

export async function fetchNudges(params?: { count?: number; persona?: string; focus?: string }): Promise<NudgesResponse> {
  const url = new URL(`${API_BASE_URL}/nudges`);
  if (params?.count) {
    url.searchParams.set('count', String(params.count));
  }
  if (params?.persona) {
    url.searchParams.set('persona', params.persona);
  }
  if (params?.focus) {
    url.searchParams.set('focus', params.focus);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Unable to load nudges (${response.status})`);
  }

  return (await response.json()) as NudgesResponse;
}

export async function requestListingAssist(payload: ListingAssistPayload): Promise<ListingAssistantResponse> {
  const response = await fetch(`${API_BASE_URL}/ai/listing-assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch listing assistant (${response.status})`);
  }

  return (await response.json()) as ListingAssistantResponse;
}

export async function fetchScans(): Promise<ScanRecord[]> {
  const response = await fetch(`${API_BASE_URL}/scans`);
  if (!response.ok) {
    throw new Error(`Unable to load scan history (${response.status})`);
  }
  const data = (await response.json()) as ScansResponse;
  return data.scans.map((scan) => ({
    ...scan,
    createdAt: scan.createdAt ?? new Date().toISOString(),
    impactEstimates: scan.impactEstimates ?? null,
    detectionSource: scan.detectionSource ?? 'fallback',
  }));
}

export async function uploadScan(uri: string, fileName: string, mimeType?: string): Promise<ScanRecord> {
  const formData = new FormData();
  formData.append('image', {
    uri,
    name: fileName,
    type: mimeType ?? 'image/jpeg',
  } as any);

  const response = await fetch(`${API_BASE_URL}/scans`, {
    method: 'POST',
    body: formData,
    headers: Platform.OS === 'web' ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Unable to process scan (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { scan: ScanRecord };
  return {
    ...data.scan,
    createdAt: data.scan.createdAt ?? new Date().toISOString(),
    impactEstimates: data.scan.impactEstimates ?? null,
    detectionSource: data.scan.detectionSource ?? 'fallback',
  };
}

export async function fetchAccountOverview(): Promise<AccountOverview> {
  const response = await fetch(`${API_BASE_URL}/accounts/overview`);
  if (!response.ok) {
    throw new Error(`Unable to load account overview (${response.status})`);
  }

  const data = (await response.json()) as AccountOverviewResponse;
  return {
    ...data,
    account: {
      ...data.account,
      inventory: data.account.inventory.map((item) => normalizeInventoryItem(item)),
      expiringSoon: data.account.expiringSoon.map((item) => normalizeInventoryItem(item)),
    },
  };
}

export async function fetchNotifications(): Promise<NotificationsResponse> {
  const response = await fetch(`${API_BASE_URL}/notifications`);
  if (!response.ok) {
    throw new Error(`Unable to load notifications (${response.status})`);
  }

  return (await response.json()) as NotificationsResponse;
}
