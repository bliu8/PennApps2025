import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Db } from 'mongodb';
import type { ScanImpactEstimates } from '../src/parsers.js';

process.env.MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/test';
process.env.MONGODB_DB_NAME = process.env.MONGODB_DB_NAME ?? 'leftys-test';
process.env.PORT = process.env.PORT ?? '0';
process.env.SEED_DATABASE = 'false';

const { createApp } = await import('../src/app.js');

const DAY_MS = 1000 * 60 * 60 * 24;

type PostingFixture = {
  _id: { toString(): string };
  title: string;
  quantityLabel: string;
  pickupLocationHint: string;
  status: string;
  allergens: string[];
  impactNarrative: string;
  impactEstimates: ScanImpactEstimates;
  expiryDate: Date;
  createdAt: Date;
  price: number;
  priceLabel: string;
  ownerId: string;
};

type ScanFixture = {
  _id: { toString(): string };
  title: string;
  allergens: string[];
  rawText: string;
  impactEstimates: ScanImpactEstimates;
  createdAt: Date;
  expiryDate: Date;
  notes: string;
  detectionSource: 'gemini';
};

function makeId(value: string) {
  return {
    toString() {
      return value;
    },
  };
}

function createFixtures() {
  const now = Date.now();
  const postings: PostingFixture[] = [
    {
      _id: makeId('p1'),
      title: 'Veggie soup jars',
      quantityLabel: '2 sealed jars',
      pickupLocationHint: 'Community fridge',
      status: 'open',
      allergens: ['soy'],
      impactNarrative: 'Shared to avoid compost overflow',
      impactEstimates: {
        foodWasteDivertedLbs: 1.567,
        co2AvoidedLbs: 3.456,
        methaneAvoidedLbs: 0.789,
        waterSavedGallons: 40.123,
        source: 'gemini',
      },
      expiryDate: new Date(now + DAY_MS),
      createdAt: new Date(now - 3 * 60 * 60 * 1000),
      price: 1,
      priceLabel: '$1 climate-friendly share',
      ownerId: 'demo-user',
    },
    {
      _id: makeId('p2'),
      title: 'Frozen bread loaf',
      quantityLabel: '1 loaf',
      pickupLocationHint: 'Lobby freezer',
      status: 'reserved',
      allergens: ['gluten'],
      impactNarrative: 'Frozen to stay fresh',
      impactEstimates: {
        foodWasteDivertedLbs: 2.005,
        co2AvoidedLbs: 4.444,
        methaneAvoidedLbs: 0.333,
        waterSavedGallons: 55.55,
        source: 'gemini',
      },
      expiryDate: new Date(now + 5 * DAY_MS),
      createdAt: new Date(now - 2 * DAY_MS),
      price: 0,
      priceLabel: 'Free · pay it forward',
      ownerId: 'demo-user',
    },
  ];

  const scans: ScanFixture[] = [
    {
      _id: makeId('s1'),
      title: 'Greek yogurt cup',
      allergens: ['dairy'],
      rawText: 'Use by soon',
      impactEstimates: {
        foodWasteDivertedLbs: 0.876,
        co2AvoidedLbs: 1.234,
        methaneAvoidedLbs: 0.222,
        waterSavedGallons: 22.22,
        source: 'gemini',
      },
      createdAt: new Date(now - 6 * 60 * 60 * 1000),
      expiryDate: new Date(now + 3 * DAY_MS),
      notes: 'OCR via Gemini',
      detectionSource: 'gemini',
    },
  ];

  return { postings, scans };
}

function createCursor<T>(items: T[]) {
  return {
    toArray: async () => items.map((item) => ({ ...item })),
    map: <U>(mapper: (item: T) => U) => createCursor(items.map(mapper)),
  };
}

function createMockDb(fixtures: { postings: PostingFixture[]; scans: ScanFixture[] }): Db {
  return {
    collection(name: string) {
      if (name === 'postings') {
        return {
          find: () => createCursor(fixtures.postings),
          insertOne: async () => ({ insertedId: makeId('new-posting') }),
        };
      }
      if (name === 'scans') {
        return {
          find: () => createCursor(fixtures.scans),
          insertOne: async () => ({ insertedId: makeId('new-scan') }),
        };
      }
      throw new Error(`Unexpected collection ${name}`);
    },
  } as unknown as Db;
}

async function requestJson(app: ReturnType<typeof createApp>, path: string) {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));

  try {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    const body = await response.json();
    return { status: response.status, body } as const;
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

function createTestApp() {
  const fixtures = createFixtures();
  const mockDb = createMockDb(fixtures);
  const app = createApp({
    getDatabase: async () => mockDb,
    seedDatabase: async () => undefined,
  });
  return { app, fixtures };
}

test('GET /api/accounts/overview returns aggregated climate metrics and inventory', async () => {
  const { app, fixtures } = createTestApp();
  const response = await requestJson(app, '/api/accounts/overview');

  assert.equal(response.status, 200);
  const overview = response.body;
  assert.ok(overview?.account);
  assert.deepStrictEqual(overview.account.totals, {
    foodWasteDivertedLbs: 4.5,
    co2AvoidedLbs: 9.1,
    methaneAvoidedLbs: 1.3,
    waterSavedGallons: 118,
    activeListings: 2,
  });
  assert.equal(overview.account.shareRatePercent, 45);

  assert.ok(Array.isArray(overview.account.inventory));
  assert.equal(overview.account.inventory.length, 3);
  const veggieSoup = overview.account.inventory.find((item: any) => item.id === 'p1');
  assert.ok(veggieSoup);
  assert.equal(veggieSoup.price, 1);
  assert.equal(veggieSoup.priceLabel, '$1 climate-friendly share');

  assert.ok(Array.isArray(overview.account.expiringSoon));
  assert.equal(overview.account.expiringSoon.length, 1);
  assert.equal(overview.account.expiringSoon[0].id, 'p1');

  assert.ok(Array.isArray(overview.notifications));
  const shareRate = overview.notifications.find((note: any) => note.id === 'share-rate');
  assert.ok(shareRate);
  assert.match(shareRate.title, /45% of neighbors shared this week/);
  const climateTotal = overview.notifications.find((note: any) => note.id === 'climate-total');
  assert.ok(climateTotal);
  assert.match(climateTotal.title, /9\.1 lbs CO₂e/);

  const expectedDays = Math.ceil((fixtures.postings[0].expiryDate.getTime() - Date.now()) / DAY_MS);
  assert.equal(overview.account.expiringSoon[0].expiresInDays, expectedDays);
});

test('GET /api/notifications reuses computed overview summaries', async () => {
  const { app } = createTestApp();
  const response = await requestJson(app, '/api/notifications');

  assert.equal(response.status, 200);
  const payload = response.body;
  assert.ok(Array.isArray(payload.notifications));
  const shareRate = payload.notifications.find((note: any) => note.id === 'share-rate');
  assert.ok(shareRate);
  assert.equal(payload.shareRatePercent, 45);
  const climateTotal = payload.notifications.find((note: any) => note.id === 'climate-total');
  assert.ok(climateTotal);
});
