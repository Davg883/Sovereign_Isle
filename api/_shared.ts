import path from 'path';
import { config as loadEnv } from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

export interface ApiRequest {
  method: string;
  body?: any;
}

export interface ApiResponse {
  status: number;
  body: any;
  headers?: Record<string, string>;
}

const projectRoot = process.cwd();

let envLoaded = false;

const sanitizeEnv = (value?: string | null) => {
  if (typeof value !== 'string') return undefined;
  return value.trim().replace(/^['"]+|['"]+$/g, '');
};

const loadEnvironment = () => {
  if (envLoaded) return;
  if (!process.env.VERCEL) {
    loadEnv({ path: path.join(projectRoot, '.env') });
    loadEnv({ path: path.join(projectRoot, '.env.local'), override: true });
  }
  envLoaded = true;
};

const resolveIndexName = () => {
  const candidates = [
    sanitizeEnv(process.env.PINECONE_INDEX_NAME),
    sanitizeEnv(process.env.PINECONE_INDEX),
  ];

  const name = candidates.find((value) => typeof value === 'string' && value.length > 0);
  if (!name) {
    throw new Error('Pinecone index name not configured. Set PINECONE_INDEX_NAME (or PINECONE_INDEX) in your environment.');
  }
  return name;
};

export const getIndexName = () => resolveIndexName();
export const getEmbeddingModel = () => process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small';
export const getChatModel = () => process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini';

let pineconeClient: Pinecone | null = null;
let pineconeIndex: ReturnType<Pinecone['index']> | null = null;
let openaiClient: OpenAI | null = null;

export const ensureOpenAI = () => {
  loadEnvironment();

  if (!openaiClient) {
    const apiKey = sanitizeEnv(process.env.OPENAI_API_KEY);
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set.');
    }
    console.log('[OpenAI] Initializing client (key length %d)', apiKey.length);
    openaiClient = new OpenAI({ apiKey });
  }

  return openaiClient;
};

export const ensurePineconeClient = () => {
  loadEnvironment();

  if (!pineconeClient) {
    const apiKey = sanitizeEnv(process.env.PINECONE_API_KEY);
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY is not set.');
    }
    console.log('[Pinecone] Initializing client (key length %d)', apiKey.length);
    pineconeClient = new Pinecone({ apiKey });
  }

  return pineconeClient;
};

export const ensurePineconeIndex = () => {
  const client = ensurePineconeClient();

  if (!pineconeIndex) {
    const indexName = resolveIndexName();
    console.log('[Pinecone] Using index "%s"', indexName);
    pineconeIndex = client.index(indexName);
  }

  return pineconeIndex;
};

export const ensureClients = () => {
  const openai = ensureOpenAI();
  const index = ensurePineconeIndex();

  return { openai, index };
};

export const chunkText = (
  text: string,
  maxChunkSize = Number(process.env.CHUNK_SIZE ?? 1000),
  overlap = Number(process.env.CHUNK_OVERLAP ?? 200)
) => {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  if (!cleanText) return [] as string[];

  const chunks: string[] = [];
  let start = 0;
  const step = Math.max(1, maxChunkSize - overlap);

  while (start < cleanText.length) {
    const end = Math.min(start + maxChunkSize, cleanText.length);
    chunks.push(cleanText.slice(start, end));
    if (end === cleanText.length) break;
    start += step;
  }

  return chunks;
};

export const parseTags = (input: unknown): string[] => {
  if (Array.isArray(input)) {
    return input.map((value) => String(value).trim()).filter(Boolean);
  }
  if (typeof input === "string") {
    return input
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
};

export const sanitizeId = (input: string) =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export const dateStringToIndexNumber = (value?: string | null): number | null => {
  if (!value) {
    return null;
  }
  const normalized = value.replace(/[^0-9]/g, "");
  if (normalized.length < 8) {
    return null;
  }
  const numeric = Number(normalized.slice(0, 8));
  return Number.isFinite(numeric) ? numeric : null;
};
