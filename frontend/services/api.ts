import { API_BASE_URL } from '@/utils/env';
import { ImpactResponse } from '@/types/impact';

function buildHeaders(accessToken: string, init?: HeadersInit): Headers {
  if (!accessToken) {
    throw new Error('Authentication required. Sign in to continue.');
  }

  const headers = new Headers(init ?? {});
  headers.set('Authorization', `Bearer ${accessToken}`);
  return headers;
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
