import { Db } from 'mongodb';

import { estimateImpactFromScan } from './parsers.js';

const ACCOUNT_OWNER_ID = 'demo-user';

export async function seedDatabase(db: Db) {
  const postings = db.collection('postings');
  const existing = await postings.estimatedDocumentCount();

  if (existing > 0) {
    return;
  }

  const now = new Date();

  await postings.insertMany([
    {
      title: 'Granola bar bundle',
      quantityLabel: '4 sealed twin-packs',
      pickupWindowLabel: 'Today · 5:30 – 6:00 PM',
      pickupLocationHint: 'Lobby bookshelf near the mailroom',
      status: 'open',
      allergens: ['gluten', 'nuts'],
      socialProof: '3 neighbors picked this up last week',
      reserverCount: 2,
      distanceKm: 0.6,
      coordinates: { latitude: 39.9526, longitude: -75.1652 },
      impactNarrative: 'Redirects pantry extras and saved ~6 lbs of CO₂ last pickup.',
      tags: ['ZeroWaste', 'SnackRescue'],
      createdAt: now,
      ownerId: ACCOUNT_OWNER_ID,
      price: 1,
      priceLabel: '$1 climate-friendly contribution',
      expiryDate: new Date(now.getTime() + 48 * 60 * 60 * 1000),
      impactEstimates: estimateImpactFromScan({ allergens: ['gluten', 'nuts'], rawText: '4 sealed bars' }),
    },
    {
      title: 'Citrus seltzer 6-pack',
      quantityLabel: 'All cans sealed & chilled',
      pickupWindowLabel: 'Today · 7:00 – 8:00 PM',
      pickupLocationHint: 'Corner table at Willow Commons',
      status: 'reserved',
      allergens: [],
      socialProof: 'Reserved in under 12 minutes yesterday',
      reserverCount: 1,
      distanceKm: 1.1,
      coordinates: { latitude: 39.9498, longitude: -75.171 },
      impactNarrative: 'Chilled beverages keep neighbors hydrated without buying new plastic.',
      tags: ['Hydration', 'PlasticFree'],
      createdAt: now,
      ownerId: ACCOUNT_OWNER_ID,
      price: 0,
      priceLabel: 'Free · pay it forward',
      expiryDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      impactEstimates: estimateImpactFromScan({ allergens: [], rawText: '6 cans seltzer 72 oz' }),
    },
    {
      title: 'Tomato basil pasta kit',
      quantityLabel: '2 boxed kits + sauce pouch',
      pickupWindowLabel: 'Tomorrow · 11:00 – 13:00',
      pickupLocationHint: 'Public library info desk basket',
      status: 'open',
      allergens: ['gluten'],
      socialProof: 'Neighborhood favorite • 9 saves',
      reserverCount: 0,
      distanceKm: 1.8,
      coordinates: { latitude: 39.955, longitude: -75.1495 },
      impactNarrative: 'Pantry staple rescue — enough for 6 servings and 4 lbs of waste avoided.',
      tags: ['Pantry', 'FamilyMeal'],
      createdAt: now,
      ownerId: ACCOUNT_OWNER_ID,
      price: 1.5,
      priceLabel: '$1.50 family bundle (suggested)',
      expiryDate: new Date(now.getTime() + 72 * 60 * 60 * 1000),
      impactEstimates: estimateImpactFromScan({ allergens: ['gluten'], rawText: '2 boxed kits + sauce pouch' }),
    },
  ]);
}
