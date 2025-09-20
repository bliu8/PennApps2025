export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type PostingStatus = 'open' | 'reserved' | 'draft';

export type Posting = {
  id: string;
  title: string;
  quantityLabel: string;
  pickupWindowLabel?: string;
  pickupLocationHint: string;
  status: PostingStatus;
  allergens: string[];
  socialProof?: string;
  reserverCount?: number;
  distanceKm: number | null;
  distanceLabel?: string;
  coordinates: Coordinates | null;
  createdAt: string;
};
