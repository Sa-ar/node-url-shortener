import mongoose from "mongoose";
import { ensureUserRoles } from "@/lib/roles";
import { ShortUrl } from "@/lib/models/short-url";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalWithMongoose = globalThis as typeof globalThis & {
  mongoose?: MongooseCache;
};

const cached: MongooseCache = globalWithMongoose.mongoose ?? {
  conn: null,
  promise: null,
};

if (!globalWithMongoose.mongoose) {
  globalWithMongoose.mongoose = cached;
}

export const MONGODB_DB_NAME = "url-shortener";

/** Drop legacy global unique index on `short` so path and subdomain can share labels. */
async function ensureShortUrlIndexes() {
  try {
    await ShortUrl.collection.dropIndex("short_1");
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code: unknown }).code
        : undefined;
    // 27 = IndexNotFound
    if (code !== 27) {
      console.warn("[db] dropIndex short_1:", error);
    }
  }
  await ShortUrl.syncIndexes();
}

export async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("Please define the MONGODB_URI environment variable");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoUri, {
      bufferCommands: false,
      dbName: MONGODB_DB_NAME,
    });
  }

  try {
    cached.conn = await cached.promise;
    await ensureShortUrlIndexes();
    await ensureUserRoles();
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    await mongoose.disconnect().catch(() => undefined);
    throw error;
  }
}
