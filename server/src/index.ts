import express from 'express';
import cors from 'cors';
import multer from 'multer';
import axios from 'axios';

import { config } from './config.js';
import { getDatabase } from './db.js';
import { seedDatabase } from './seed.js';
import { parseDetectedText, ParsedScan } from './parsers.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', mode: 'light', version: '1.0.0' });
});

app.get('/api/postings', async (_req, res, next) => {
  try {
    const db = await getDatabase();
    if (config.seedDatabase) {
      await seedDatabase(db);
    }

    const postings = await db
      .collection('postings')
      .find({}, { sort: { createdAt: -1 } })
      .map((doc) => ({
        id: doc._id.toString(),
        title: doc.title,
        quantityLabel: doc.quantityLabel,
        pickupWindowLabel: doc.pickupWindowLabel,
        pickupLocationHint: doc.pickupLocationHint,
        status: doc.status,
        allergens: doc.allergens ?? [],
        socialProof: doc.socialProof ?? '',
        reserverCount: doc.reserverCount ?? 0,
        distanceKm: typeof doc.distanceKm === 'number' ? doc.distanceKm : null,
        coordinates: doc.coordinates ?? null,
        createdAt: doc.createdAt ?? new Date(),
      }))
      .toArray();

    res.json({ postings });
  } catch (error) {
    next(error);
  }
});

app.get('/api/scans', async (_req, res, next) => {
  try {
    const db = await getDatabase();
    const scans = await db
      .collection('scans')
      .find({}, { sort: { createdAt: -1 } })
      .map((doc) => ({
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

app.post('/api/scans', upload.single('image'), async (req, res, next) => {
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

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: 'Unexpected server error', details: error instanceof Error ? error.message : String(error) });
});

app.listen(config.port, () => {
  console.log(`Leftys API listening on http://localhost:${config.port}`);
});
