import { Platform } from 'react-native';

import { API_BASE_URL } from '@/utils/env';
import { Posting } from '@/types/posting';
import { ScanRecord } from '@/types/scans';
import { ImpactResponse } from '@/types/impact';
import { NudgesResponse } from '@/types/nudge';

type ApiPosting = Omit<Posting, 'createdAt' | 'distanceLabel'> & {
  createdAt?: string;
};

type PostingsResponse = {
  postings: ApiPosting[];
};

type ScansResponse = {
  scans: ScanRecord[];
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

  return {
    ...posting,
    pickupWindowLabel,
    distanceLabel,
    createdAt: posting.createdAt ?? new Date().toISOString(),
  };
}

function buildHeaders(accessToken: string, init?: HeadersInit): Headers {
  if (!accessToken) {
    throw new Error('Authentication required. Sign in to continue.');
  }

  const headers = new Headers(init ?? {});
  headers.set('Authorization', `Bearer ${accessToken}`);
  return headers;
}

export async function fetchPostings(accessToken: string): Promise<Posting[]> {
  const response = await fetch(`${API_BASE_URL}/postings`, {
    headers: buildHeaders(accessToken),
  });
  if (!response.ok) {
    throw new Error(`Unable to load postings (${response.status})`);
  }
  const data = (await response.json()) as PostingsResponse;
  return data.postings.map((posting) => mapPosting(posting));
}

export async function createPosting(payload: CreatePostingPayload, accessToken: string): Promise<Posting> {
  const response = await fetch(`${API_BASE_URL}/postings`, {
    method: 'POST',
    headers: buildHeaders(accessToken, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Unable to publish posting (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { posting: ApiPosting };
  return mapPosting(data.posting);
}

export async function fetchImpactMetrics(accessToken: string): Promise<ImpactResponse> {
  const response = await fetch(`${API_BASE_URL}/impact`, {
    headers: buildHeaders(accessToken),
  });
  if (!response.ok) {
    throw new Error(`Unable to load impact metrics (${response.status})`);
  }

  return (await response.json()) as ImpactResponse;
}

export async function fetchNudges(
  accessToken: string,
  params?: { count?: number; persona?: string; focus?: string },
): Promise<NudgesResponse> {
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

  const response = await fetch(url.toString(), {
    headers: buildHeaders(accessToken),
  });
  if (!response.ok) {
    throw new Error(`Unable to load nudges (${response.status})`);
  }

  return (await response.json()) as NudgesResponse;
}

export async function requestListingAssist(
  payload: ListingAssistPayload,
  accessToken: string,
): Promise<ListingAssistantResponse> {
  const response = await fetch(`${API_BASE_URL}/ai/listing-assistant`, {
    method: 'POST',
    headers: buildHeaders(accessToken, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch listing assistant (${response.status})`);
  }

  return (await response.json()) as ListingAssistantResponse;
}

export async function fetchScans(accessToken: string): Promise<ScanRecord[]> {
  const response = await fetch(`${API_BASE_URL}/scans`, {
    headers: buildHeaders(accessToken),
  });
  if (!response.ok) {
    throw new Error(`Unable to load scan history (${response.status})`);
  }
  const data = (await response.json()) as ScansResponse;
  return data.scans.map((scan) => ({
    ...scan,
    createdAt: scan.createdAt ?? new Date().toISOString(),
  }));
}

export async function uploadScan(
  uri: string,
  fileName: string,
  mimeType: string | undefined,
  accessToken: string,
): Promise<ScanRecord> {
  const formData = new FormData();
  formData.append('image', {
    uri,
    name: fileName,
    type: mimeType ?? 'image/jpeg',
  } as any);

  const response = await fetch(`${API_BASE_URL}/scans`, {
    method: 'POST',
    body: formData,
    headers:
      Platform.OS === 'web'
        ? buildHeaders(accessToken, { 'Content-Type': 'multipart/form-data' })
        : buildHeaders(accessToken),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Unable to process scan (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { scan: ScanRecord };
  return {
    ...data.scan,
    createdAt: data.scan.createdAt ?? new Date().toISOString(),
  };
}
