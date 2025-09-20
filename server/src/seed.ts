import { Db } from 'mongodb';

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
      createdAt: now,
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
      createdAt: now,
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
      createdAt: now,
    },
  ]);
}
