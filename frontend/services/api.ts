import { Platform } from 'react-native';

import { API_BASE_URL } from '@/utils/env';
import { Posting } from '@/types/posting';
import { ScanRecord } from '@/types/scans';

type ApiPosting = Omit<Posting, 'createdAt' | 'distanceLabel'> & {
  createdAt?: string;
};

type PostingsResponse = {
  postings: ApiPosting[];
};

type ScansResponse = {
  scans: ScanRecord[];
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

export async function fetchPostings(): Promise<Posting[]> {
  const response = await fetch(`${API_BASE_URL}/postings`);
  if (!response.ok) {
    throw new Error(`Unable to load postings (${response.status})`);
  }
  const data = (await response.json()) as PostingsResponse;
  return data.postings.map((posting) => mapPosting(posting as Posting));
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
  };
}
