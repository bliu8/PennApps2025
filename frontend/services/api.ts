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

// REPLACE ENDPOINTS WITH REAL BACKEND ROUTES
// TODO make sure that all of this works
export async function updateInventoryQuantity(accessToken: string, itemId: string, newQuantity: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/inventory/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    headers: buildHeaders(accessToken, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ quantity: newQuantity }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update quantity: ${response.status}`);
  }
}

export async function consumeInventoryItem(
  accessToken: string,
  itemId: string,
  quantityDelta: number,
  reason: 'used' | 'discarded',
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/inventory/${encodeURIComponent(itemId)}/consume`, {
    method: 'POST',
    headers: buildHeaders(accessToken, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ quantity_delta: quantityDelta, reason }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to consume item: ${response.status}`);
  }
}

export async function deleteInventoryItem(accessToken: string, itemId: string): Promise<void> {
  await fetch(`${API_BASE_URL}/inventory/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
    headers: buildHeaders(accessToken),
  }).catch(() => {});
}

// Placeholder endpoint: backend to define the route contract
export async function submitBarcode(accessToken: string, code: string, symbology?: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/scan/barcode`, {
    method: 'POST',
    headers: buildHeaders(accessToken, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ code, symbology }),
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Failed to submit barcode: ${response.status} ${errorText}`);
  }
}
