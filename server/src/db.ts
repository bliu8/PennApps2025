import { MongoClient, Db } from 'mongodb';

import { config } from './config.js';

let cachedDb: Db | null = null;
let client: MongoClient | null = null;

export async function getDatabase(): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }

  client = new MongoClient(config.mongoUri);
  await client.connect();
  cachedDb = client.db(config.mongoDbName);
  return cachedDb;
}

export async function closeDatabase() {
  if (client) {
    await client.close();
    client = null;
    cachedDb = null;
  }
}
