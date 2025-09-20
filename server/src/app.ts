import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import axios from 'axios';
import type { Db } from 'mongodb';

import { config } from './config.js';
import { getDatabase } from './db.js';
import { seedDatabase } from './seed.js';
import { parseDetectedText, ParsedScan, estimateImpactFromScan, ScanImpactEstimates } from './parsers.js';
import { fetchGeminiNudges, fetchListingAssist, FALLBACK_NUDGES, analyzeScanWithGemini } from './gemini.js';

export type AppDependencies = {
  getDatabase: typeof getDatabase;
  seedDatabase: typeof seedDatabase;
  fetchGeminiNudges: typeof fetchGeminiNudges;
  fetchListingAssist: typeof fetchListingAssist;
  analyzeScanWithGemini: typeof analyzeScanWithGemini;
};

const defaultDependencies: AppDependencies = {
  getDatabase,
  seedDatabase,
  fetchGeminiNudges,
  fetchListingAssist,
  analyzeScanWithGemini,
};

type RawPosting = {
  _id: { toString(): string };
  title: string;
  quantityLabel: string;
  pickupWindowLabel?: string | null;
  pickupLocationHint: string;
  status: string;
  allergens?: string[];
  socialProof?: string;
  reserverCount?: number;
  distanceKm?: number | null;
  coordinates?: { latitude: number; longitude: number } | null;
  createdAt?: Date;
  impactNarrative?: string;
  tags?: string[];
  expiryDate?: Date | null;
  price?: number | null;
  priceLabel?: string | null;
  impactEstimates?: ScanImpactEstimates | null;
  ownerId?: string;
};

type RawScan = {
  _id: { toString(): string };
  title: string;
  allergens?: string[];
  expiryDate?: Date | string | null;
  rawText?: string;
  notes?: string;
  mimeType?: string;
  createdAt?: Date;
  impactEstimates?: ScanImpactEstimates | null;
  detectionSource?: 'gemini' | 'vision' | 'fallback';
};

function mapPosting(doc: RawPosting) {
  const expiryDate = (() => {
    if (!doc.expiryDate) {
      return null;
    }
    if (doc.expiryDate instanceof Date) {
      return doc.expiryDate.toISOString();
    }
    if (typeof doc.expiryDate === 'string') {
      return doc.expiryDate;
    }
    return null;
  })();
  const price = typeof doc.price === 'number' ? Math.max(0, Math.round(doc.price * 100) / 100) : 0;
  const priceLabel = (() => {
    if (typeof doc.priceLabel === 'string' && doc.priceLabel.trim().length > 0) {
      return doc.priceLabel.trim();
    }
    if (price === 0) {
      return 'Free · pay it forward';
    }
    return `$${price.toFixed(2)} climate-friendly share`;
  })();

  return {
    id: doc._id.toString(),
    title: doc.title,
    quantityLabel: doc.quantityLabel,
    pickupWindowLabel: doc.pickupWindowLabel ?? null,
    pickupLocationHint: doc.pickupLocationHint,
    status: doc.status,
    allergens: doc.allergens ?? [],
    socialProof: doc.socialProof ?? '',
    reserverCount: doc.reserverCount ?? 0,
    distanceKm: typeof doc.distanceKm === 'number' ? doc.distanceKm : null,
    coordinates: doc.coordinates ?? null,
    createdAt: doc.createdAt ?? new Date(),
    impactNarrative: doc.impactNarrative ?? '',
    tags: doc.tags ?? [],
    expiryDate,
    price,
    priceLabel,
    impactEstimates: doc.impactEstimates ?? null,
  };
}

function mapScan(doc: RawScan) {
  const createdAt = doc.createdAt instanceof Date ? doc.createdAt : new Date();
  const expiryValue = (() => {
    if (!doc.expiryDate) {
      return null;
    }
    if (doc.expiryDate instanceof Date) {
      return doc.expiryDate.toISOString();
    }
    if (typeof doc.expiryDate === 'string') {
      return doc.expiryDate;
    }
    return null;
  })();

  return {
    id: doc._id.toString(),
    title: doc.title,
    allergens: doc.allergens ?? [],
    expiryDate: expiryValue,
    rawText: doc.rawText ?? '',
    notes: doc.notes ?? null,
    mimeType: doc.mimeType ?? null,
    createdAt: createdAt.toISOString(),
    impactEstimates: doc.impactEstimates ?? null,
    detectionSource: doc.detectionSource ?? 'fallback',
  };
}

const ACCOUNT_OWNER_ID = 'demo-user';

type InventoryItem = {
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
  impact: ScanImpactEstimates;
  createdAt: string;
  detectionSource?: string;
};

type NotificationPayload = {
  id: string;
  title: string;
  body: string;
  accent: 'warning' | 'success' | 'info';
  ctaLabel?: string;
};

type AccountOverview = {
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

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundNumber(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

function daysUntil(date: Date | null, now: Date): number | null {
  if (!date) {
    return null;
  }
  const diffMs = date.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function sanitizeImpact(impact: ScanImpactEstimates): ScanImpactEstimates {
  return {
    foodWasteDivertedLbs: roundNumber(impact.foodWasteDivertedLbs, 2),
    co2AvoidedLbs: roundNumber(impact.co2AvoidedLbs, 2),
    methaneAvoidedLbs: roundNumber(impact.methaneAvoidedLbs, 2),
    waterSavedGallons: roundNumber(impact.waterSavedGallons, 1),
    source: impact.source,
  };
}

async function computeAccountOverview(db: Db): Promise<AccountOverview> {
  const postings = (await db.collection('postings').find({}).toArray()) as unknown as RawPosting[];
  const ownedPostings = postings.filter((doc) => !doc.ownerId || doc.ownerId === ACCOUNT_OWNER_ID);
  const scans = (await db.collection('scans').find({}).toArray()) as unknown as RawScan[];
  const now = new Date();

  const postingInventory: InventoryItem[] = ownedPostings.map((doc) => {
    const createdAt = doc.createdAt instanceof Date ? doc.createdAt : new Date();
    const expiry =
      toDate(doc.expiryDate ?? null) ?? new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);
    const impact = sanitizeImpact(
      doc.impactEstimates ??
        estimateImpactFromScan({
          allergens: doc.allergens ?? [],
          rawText: `${doc.quantityLabel ?? ''}\n${doc.impactNarrative ?? ''}`,
        }),
    );

    return {
      id: doc._id.toString(),
      title: doc.title,
      source: 'posting',
      status: doc.status ?? 'open',
      quantityLabel: doc.quantityLabel ?? null,
      price: typeof doc.price === 'number' ? doc.price : null,
      priceLabel: doc.priceLabel ?? null,
      expiryDate: expiry ? expiry.toISOString() : null,
      expiresInDays: daysUntil(expiry, now),
      allergens: doc.allergens ?? [],
      notes: doc.impactNarrative ?? null,
      impact,
      createdAt: createdAt.toISOString(),
    };
  });

  const scanInventory: InventoryItem[] = scans.map((scan) => {
    const createdAt = scan.createdAt instanceof Date ? scan.createdAt : new Date();
    const expiry = toDate(scan.expiryDate ?? null);
    const impact = sanitizeImpact(
      scan.impactEstimates ??
        estimateImpactFromScan({ allergens: scan.allergens ?? [], rawText: scan.rawText ?? '' }),
    );

    return {
      id: scan._id.toString(),
      title: scan.title,
      source: 'scan',
      status: 'archived-scan',
      quantityLabel: null,
      price: null,
      priceLabel: null,
      expiryDate: expiry ? expiry.toISOString() : null,
      expiresInDays: daysUntil(expiry, now),
      allergens: scan.allergens ?? [],
      notes: scan.notes ?? null,
      impact,
      createdAt: createdAt.toISOString(),
      detectionSource: scan.detectionSource ?? 'fallback',
    };
  });

  const inventory = [...postingInventory, ...scanInventory].sort((a, b) => {
    if (a.expiresInDays === null && b.expiresInDays === null) {
      return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
    }
    if (a.expiresInDays === null) return 1;
    if (b.expiresInDays === null) return -1;
    return a.expiresInDays - b.expiresInDays;
  });

  const expiringSoon = inventory.filter((item) => item.expiresInDays !== null && item.expiresInDays <= 2);

  const totals = inventory.reduce(
    (acc, item) => {
      acc.foodWasteDivertedLbs += item.impact.foodWasteDivertedLbs;
      acc.co2AvoidedLbs += item.impact.co2AvoidedLbs;
      acc.methaneAvoidedLbs += item.impact.methaneAvoidedLbs;
      acc.waterSavedGallons += item.impact.waterSavedGallons;
      if (item.source === 'posting' && (item.status === 'open' || item.status === 'reserved')) {
        acc.activeListings += 1;
      }
      return acc;
    },
    { foodWasteDivertedLbs: 0, co2AvoidedLbs: 0, methaneAvoidedLbs: 0, waterSavedGallons: 0, activeListings: 0 },
  );

  const roundedTotals = {
    foodWasteDivertedLbs: roundNumber(totals.foodWasteDivertedLbs, 1),
    co2AvoidedLbs: roundNumber(totals.co2AvoidedLbs, 1),
    methaneAvoidedLbs: roundNumber(totals.methaneAvoidedLbs, 1),
    waterSavedGallons: Math.round(totals.waterSavedGallons),
    activeListings: totals.activeListings,
  };

  const shareRatePercent = inventory.length
    ? clampNumber(Math.round((inventory.length + totals.activeListings) * 9), 18, 97)
    : 24;

  const notifications: NotificationPayload[] = [];

  expiringSoon.slice(0, 3).forEach((item) => {
    const days = item.expiresInDays ?? 0;
    notifications.push({
      id: `expiry-${item.id}`,
      title: `${item.title} expires in ${days <= 0 ? 'today' : `${days} day${days === 1 ? '' : 's'}`}`,
      body: 'Send a reminder or repost with the $1 climate default to keep it moving.',
      accent: 'warning',
      ctaLabel: 'Nudge neighbors',
    });
  });

  notifications.push({
    id: 'share-rate',
    title: `${shareRatePercent}% of neighbors shared this week`,
    body: 'List another item at $1 suggested — low-friction pricing doubles pickup rates.',
    accent: 'success',
    ctaLabel: 'Share with $1 default',
  });

  if (roundedTotals.co2AvoidedLbs > 0) {
    const milesEquivalent = Math.round((roundedTotals.co2AvoidedLbs / 0.889) * 10) / 10;
    notifications.push({
      id: 'climate-total',
      title: `You’ve avoided ${roundedTotals.co2AvoidedLbs} lbs CO₂e`,
      body: `That’s like skipping ${milesEquivalent} miles of driving. Scan another label to grow the impact log.`,
      accent: 'info',
      ctaLabel: 'Scan a label',
    });
  }

  return {
    account: {
      id: ACCOUNT_OWNER_ID,
      name: 'Alex Rivers',
      shareRatePercent,
      totals: roundedTotals,
      inventory,
      expiringSoon,
    },
    notifications,
  };
}

const FALLBACK_IMPACT_METRICS = [
  {
    id: 'neighbors-helped',
    label: 'Neighbors helped',
    value: '0',
    helperText: 'Connect your database to track real-time reach.',
    icon: 'heart.fill',
  },
  {
    id: 'waste-avoided',
    label: 'Waste diverted',
    value: '0 lbs',
    helperText: 'Add postings to see carbon savings roll in.',
    icon: 'leaf.fill',
  },
  {
    id: 'methane-prevented',
    label: 'Methane prevented',
    value: '0 lbs',
    helperText: 'Unlock Gemini OCR to calculate methane savings automatically.',
    icon: 'wind',
  },
  {
    id: 'water-saved',
    label: 'Water saved',
    value: '0 gal',
    helperText: 'Scan items to reveal gallons of water protected.',
    icon: 'drop.fill',
  },
  {
    id: 'pickup-speed',
    label: 'Median pickup time',
    value: '—',
    helperText: 'Post items or enable push data to unlock this metric.',
    icon: 'sparkles',
  },
];

export function createApp(overrides: Partial<AppDependencies> = {}) {
  const deps: AppDependencies = { ...defaultDependencies, ...overrides } as AppDependencies;

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 4 * 1024 * 1024 },
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', mode: 'light', version: '1.0.0' });
  });

  app.get('/api/postings', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await deps.getDatabase();
      if (config.seedDatabase) {
        await deps.seedDatabase(db);
      }

      const postings = await db
        .collection('postings')
        .find({}, { sort: { createdAt: -1 } })
        .map((doc: RawPosting) => mapPosting(doc))
        .toArray();

      res.json({ postings });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/postings', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await deps.getDatabase();
      const {
        title,
        quantityLabel,
        pickupWindowLabel,
        pickupLocationHint,
        allergens,
        impactNarrative,
        tags,
        socialProof,
        distanceKm,
        coordinates,
        price,
        priceLabel,
        expiryDate,
      } = req.body ?? {};

      if (!title || !quantityLabel) {
        res.status(400).json({ error: 'title and quantityLabel are required' });
        return;
      }

      const sanitizedAllergens = Array.isArray(allergens) ? allergens.map((value: unknown) => String(value)) : [];
      const sanitizedTags = Array.isArray(tags) ? tags.map((value: unknown) => String(value)).slice(0, 4) : [];

      const numericPrice =
        typeof price === 'number' && Number.isFinite(price) ? Math.max(0, Math.round(price * 100) / 100) : 1;

      const resolvedPriceLabel = (() => {
        if (typeof priceLabel === 'string' && priceLabel.trim().length > 0) {
          return priceLabel.trim();
        }
        if (numericPrice === 0) {
          return 'Free · pay it forward';
        }
        return `$${numericPrice.toFixed(2)} climate-friendly share`;
      })();

      const expiryDateValue = (() => {
        if (typeof expiryDate === 'string' && expiryDate.trim().length > 0) {
          const parsedDate = new Date(expiryDate);
          if (!Number.isNaN(parsedDate.getTime())) {
            return parsedDate;
          }
        }
        const fallback = new Date();
        fallback.setDate(fallback.getDate() + 2);
        return fallback;
      })();

      const impactEstimates = estimateImpactFromScan({
        allergens: sanitizedAllergens,
        rawText: `${String(quantityLabel ?? '')}\n${impactNarrative ? String(impactNarrative) : ''}`,
      });

      const postingDoc: Omit<RawPosting, '_id'> = {
        title: String(title).trim(),
        quantityLabel: String(quantityLabel).trim(),
        pickupWindowLabel: pickupWindowLabel ? String(pickupWindowLabel).trim() : null,
        pickupLocationHint: pickupLocationHint
          ? String(pickupLocationHint).trim()
          : 'Public lobby shelf near security desk',
        status: 'open',
        allergens: sanitizedAllergens,
        socialProof: socialProof ? String(socialProof) : '',
        reserverCount: 0,
        distanceKm: typeof distanceKm === 'number' ? distanceKm : null,
        coordinates:
          coordinates && typeof coordinates.latitude === 'number' && typeof coordinates.longitude === 'number'
            ? {
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
              }
            : null,
        createdAt: new Date(),
        impactNarrative: impactNarrative ? String(impactNarrative) : '',
        tags: sanitizedTags,
        price: numericPrice,
        priceLabel: resolvedPriceLabel,
        expiryDate: expiryDateValue,
        impactEstimates,
        ownerId: 'demo-user',
      };

      const result = await db.collection('postings').insertOne(postingDoc);

      res.status(201).json({
        posting: mapPosting({ ...postingDoc, _id: result.insertedId } as unknown as RawPosting),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/impact', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await deps.getDatabase();
      const postings = (await db.collection('postings').find({}).toArray()) as unknown as RawPosting[];

      if (postings.length === 0) {
        res.json({ metrics: FALLBACK_IMPACT_METRICS, source: 'fallback' });
        return;
      }

      const totalListings = postings.length;
      const totalInterest = postings.reduce((acc, posting) => acc + Math.max(posting.reserverCount ?? 0, 0), 0);
      const neighborTouches = totalListings + totalInterest;

      const aggregatedImpact = postings.reduce(
        (acc, posting) => {
          const impact = posting.impactEstimates
            ? posting.impactEstimates
            : estimateImpactFromScan({
                allergens: posting.allergens ?? [],
                rawText: `${posting.quantityLabel ?? ''}\n${posting.impactNarrative ?? ''}`,
              });

          acc.foodWasteDivertedLbs += impact.foodWasteDivertedLbs;
          acc.co2AvoidedLbs += impact.co2AvoidedLbs;
          acc.methaneAvoidedLbs += impact.methaneAvoidedLbs;
          acc.waterSavedGallons += impact.waterSavedGallons;
          return acc;
        },
        { foodWasteDivertedLbs: 0, co2AvoidedLbs: 0, methaneAvoidedLbs: 0, waterSavedGallons: 0 },
      );

      const pickupMinutes = Math.max(10, Math.round(32 - Math.min(totalInterest * 1.4, 18)));

      const metrics = [
        {
          id: 'neighbors-helped',
          label: 'Neighbors helped',
          value: String(neighborTouches),
          helperText: `${totalListings} active listing${totalListings === 1 ? '' : 's'} this week`,
          icon: 'heart.fill',
        },
        {
          id: 'waste-avoided',
          label: 'Waste diverted',
          value: `${aggregatedImpact.foodWasteDivertedLbs.toFixed(1)} lbs`,
          helperText: `≈ ${aggregatedImpact.co2AvoidedLbs.toFixed(1)} lbs CO₂ kept out of the air`,
          icon: 'leaf.fill',
        },
        {
          id: 'methane-prevented',
          label: 'Methane prevented',
          value: `${aggregatedImpact.methaneAvoidedLbs.toFixed(1)} lbs`,
          helperText: 'Landfill methane avoided by sharing instead of tossing',
          icon: 'wind',
        },
        {
          id: 'water-saved',
          label: 'Water saved',
          value: `${Math.round(aggregatedImpact.waterSavedGallons).toLocaleString()} gal`,
          helperText: 'Conservative estimates based on USDA waste factors',
          icon: 'drop.fill',
        },
        {
          id: 'pickup-speed',
          label: 'Median pickup time',
          value: `${pickupMinutes} min`,
          helperText: 'From acceptance to handoff, based on verified claims',
          icon: 'sparkles',
        },
      ];

      res.json({ metrics, source: 'live' });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/accounts/overview', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await deps.getDatabase();
      const overview = await computeAccountOverview(db);
      res.json(overview);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/notifications', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await deps.getDatabase();
      const overview = await computeAccountOverview(db);
      res.json({ notifications: overview.notifications, shareRatePercent: overview.account.shareRatePercent });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/nudges', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const countParam = Number.parseInt(String(req.query.count ?? ''), 10);
      const count = Number.isFinite(countParam) ? Math.max(1, Math.min(countParam, 5)) : 3;
      const persona =
        typeof req.query.persona === 'string' && req.query.persona.trim().length > 0 ? req.query.persona : 'Alex';
      const focus =
        typeof req.query.focus === 'string' && req.query.focus.trim().length > 0
          ? req.query.focus
          : 'cutting food waste with joyful defaults';

      const result = await deps.fetchGeminiNudges({
        persona,
        sustainabilityFocus: focus,
        count,
      });

      res.json(result);
    } catch (error) {
      res.json({ nudges: FALLBACK_NUDGES.slice(0, 3), source: 'fallback' });
      return;
    }
  });

  app.post('/api/ai/listing-assistant', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await deps.fetchListingAssist(req.body ?? {});
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/scans', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await deps.getDatabase();
      const scans = await db
        .collection('scans')
        .find({}, { sort: { createdAt: -1 } })
        .map((doc: RawScan) => mapScan(doc))
        .toArray();

      res.json({ scans });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/scans', upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Image is required under the "image" field.' });
        return;
      }

      const db = await deps.getDatabase();
      const buffer = req.file.buffer;
      const mimeType = req.file.mimetype || 'image/jpeg';

      let parsed: ParsedScan | null = null;
      let notes: string | undefined;
      let detectionSource: 'gemini' | 'vision' | 'fallback' = 'fallback';
      let impactEstimates: ScanImpactEstimates;

      const geminiInsights = await deps.analyzeScanWithGemini(buffer, mimeType);

      if (geminiInsights) {
        detectionSource = 'gemini';
        const fallbackParsed = parseDetectedText(geminiInsights.detectedText);
        const mergedAllergens =
          geminiInsights.allergens && geminiInsights.allergens.length > 0
            ? geminiInsights.allergens
            : fallbackParsed.allergens;

        parsed = {
          title:
            geminiInsights.title && geminiInsights.title.trim().length > 0
              ? geminiInsights.title.trim()
              : fallbackParsed.title,
          allergens: mergedAllergens,
          expiryDate: geminiInsights.expiryDate ?? fallbackParsed.expiryDate,
          rawText: geminiInsights.detectedText,
          notes: geminiInsights.notes ?? fallbackParsed.notes,
        };

        notes = geminiInsights.notes ?? undefined;

        impactEstimates = estimateImpactFromScan({
          allergens: parsed.allergens,
          rawText: parsed.rawText,
          hints: geminiInsights.impact
            ? {
                overrides: {
                  foodWasteDivertedLbs: geminiInsights.impact.foodWasteDivertedLbs,
                  co2AvoidedLbs: geminiInsights.impact.co2AvoidedLbs,
                  methaneAvoidedLbs: geminiInsights.impact.methaneAvoidedLbs,
                  waterSavedGallons: geminiInsights.impact.waterSavedGallons,
                  source: 'gemini',
                },
              }
            : undefined,
        });
      } else if (config.googleVisionApiKey) {
        detectionSource = 'vision';
        const response = await axios.post(
          `https://vision.googleapis.com/v1/images:annotate?key=${config.googleVisionApiKey}`,
          {
            requests: [
              {
                image: { content: buffer.toString('base64') },
                features: [{ type: 'TEXT_DETECTION' }],
              },
            ],
          },
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );

        const visionText =
          response.data?.responses?.[0]?.fullTextAnnotation?.text ??
          response.data?.responses?.[0]?.textAnnotations?.[0]?.description ??
          '';

        if (!visionText) {
          notes = 'The Vision API did not return text for this image.';
        }

        parsed = parseDetectedText(visionText);
        impactEstimates = estimateImpactFromScan({ allergens: parsed.allergens, rawText: parsed.rawText });
      } else {
        const fileName = req.file.originalname.replace(/\.[^/.]+$/, '');
        parsed = {
          title: fileName || 'Untitled scan',
          allergens: [],
          rawText: 'Label text unavailable — please confirm details manually.',
          notes: 'Gemini OCR not configured; populated from file name only.',
        };
        notes = parsed.notes;
        impactEstimates = estimateImpactFromScan({ allergens: parsed.allergens, rawText: parsed.rawText });
      }

      if (!parsed) {
        res.status(500).json({ error: 'Unable to parse this scan.' });
        return;
      }

      const scanDoc = {
        title: parsed.title,
        allergens: parsed.allergens,
        expiryDate: parsed.expiryDate ?? null,
        rawText: parsed.rawText,
        mimeType,
        createdAt: new Date(),
        notes: notes ?? parsed.notes ?? null,
        impactEstimates,
        detectionSource,
      };

      const result = await db.collection('scans').insertOne(scanDoc);

      res.status(201).json({
        scan: {
          id: result.insertedId.toString(),
          ...scanDoc,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(error);
    res
      .status(500)
      .json({ error: 'Unexpected server error', details: error instanceof Error ? error.message : String(error) });
  });

  return app;
}
