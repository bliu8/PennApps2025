import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

type ServerConfig = {
  port: number;
  mongoUri: string;
  mongoDbName: string;
  googleVisionApiKey?: string;
  googleGeminiApiKey?: string;
  googleGeminiModel: string;
  seedDatabase: boolean;
};

const port = Number(process.env.PORT ?? '4000');
const mongoUri = process.env.MONGODB_URI ?? '';

const mongoDbName = process.env.MONGODB_DB_NAME ?? '';
const googleGeminiModel = process.env.GOOGLE_GEMINI_MODEL ?? 'gemini-2.5-flash-image-preview';

if (!mongoUri || !mongoDbName) {
  throw new Error('MONGODB_URI is required. Set it in server/.env or your environment before starting the API.');
}

export const config: ServerConfig = {
  port,
  mongoUri,
  mongoDbName,
  googleVisionApiKey: process.env.GOOGLE_VISION_API_KEY,
  googleGeminiApiKey: process.env.GOOGLE_GEMINI_API_KEY,
  googleGeminiModel,
  seedDatabase: process.env.SEED_DATABASE === 'true',
};
