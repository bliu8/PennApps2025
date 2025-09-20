import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import axios from 'axios';

import { config } from './config.js';
import { getDatabase } from './db.js';
import { seedDatabase } from './seed.js';
import { parseDetectedText, ParsedScan } from './parsers.js';
import { fetchGeminiNudges, fetchListingAssist, FALLBACK_NUDGES } from './gemini.js';

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
};

function mapPosting(doc: RawPosting) {
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
    id: 'pickup-speed',
    label: 'Median pickup time',
    value: '—',
    helperText: 'Post items or enable push data to unlock this metric.',
    icon: 'sparkles',
  },
];

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
    const db = await getDatabase();
    if (config.seedDatabase) {
      await seedDatabase(db);
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
    const db = await getDatabase();
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
    } = req.body ?? {};

    if (!title || !quantityLabel) {
      res.status(400).json({ error: 'title and quantityLabel are required' });
      return;
    }

    const sanitizedAllergens = Array.isArray(allergens) ? allergens.map((value: unknown) => String(value)) : [];
    const sanitizedTags = Array.isArray(tags) ? tags.map((value: unknown) => String(value)).slice(0, 4) : [];

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
    const db = await getDatabase();
    const postings = (await db.collection('postings').find({}).toArray()) as unknown as RawPosting[];

    if (postings.length === 0) {
      res.json({ metrics: FALLBACK_IMPACT_METRICS, source: 'fallback' });
      return;
    }

    const totalListings = postings.length;
    const totalInterest = postings.reduce((acc, posting) => acc + Math.max(posting.reserverCount ?? 0, 0), 0);
    const neighborTouches = totalListings + totalInterest;
    const divertedLbs = postings.reduce((acc, posting) => acc + 3.2 + (posting.allergens?.length ?? 0) * 0.2, 0);
    const co2Avoided = divertedLbs * 2.5;
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
        value: `${divertedLbs.toFixed(1)} lbs`,
        helperText: `≈ ${co2Avoided.toFixed(1)} lbs CO₂ prevented`,
        icon: 'leaf.fill',
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

app.get('/api/nudges', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const countParam = Number.parseInt(String(req.query.count ?? ''), 10);
    const count = Number.isFinite(countParam) ? Math.max(1, Math.min(countParam, 5)) : 3;
    const persona = typeof req.query.persona === 'string' && req.query.persona.trim().length > 0 ? req.query.persona : 'Alex';
    const focus =
      typeof req.query.focus === 'string' && req.query.focus.trim().length > 0
        ? req.query.focus
        : 'cutting food waste with joyful defaults';

    const result = await fetchGeminiNudges({
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
    const result = await fetchListingAssist(req.body ?? {});
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/api/scans', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = await getDatabase();
    const scans = await db
      .collection('scans')
      .find({}, { sort: { createdAt: -1 } })
      .map((doc: any) => ({
        id: doc._id.toString(),
        title: doc.title,
        allergens: doc.allergens ?? [],
        expiryDate: doc.expiryDate ?? null,
        notes: doc.notes ?? null,
        rawText: doc.rawText ?? '',
        createdAt: doc.createdAt ?? new Date(),
      }))
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

    const db = await getDatabase();
    const buffer = req.file.buffer;
    const mimeType = req.file.mimetype;

    let parsed: ParsedScan;
    let notes: string | undefined;

    if (config.googleVisionApiKey) {
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
    } else {
      const fileName = req.file.originalname.replace(/\.[^/.]+$/, '');
      parsed = {
        title: fileName || 'Untitled scan',
        allergens: [],
        rawText: '',
        notes: 'Vision API key missing; populated from file name only.',
      };
      notes = parsed.notes;
    }

    const scanDoc = {
      title: parsed.title,
      allergens: parsed.allergens,
      expiryDate: parsed.expiryDate,
      rawText: parsed.rawText,
      mimeType,
      createdAt: new Date(),
      notes: notes ?? parsed.notes,
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
  res.status(500).json({ error: 'Unexpected server error', details: error instanceof Error ? error.message : String(error) });
});

app.listen(config.port, () => {
  console.log(`Leftys API listening on http://localhost:${config.port}`);
});
