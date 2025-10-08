import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

const workspaceRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(workspaceRoot, '..');

const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.join(projectRoot, envFile);
  try {
    await fs.access(envPath);
    dotenv.config({ path: envPath, override: false });
  } catch {
    // ignore missing env file
  }
}

const requiredEnvVars = ['PINECONE_API_KEY', 'OPENAI_API_KEY', 'GOOGLE_API_KEY'];
const missingEnv = requiredEnvVars.filter((name) => !process.env[name]);
if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const INDEX_NAME = process.env.PINECONE_INDEX_NAME ?? process.env.PINECONE_INDEX ?? 'sovereign-isle';
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small';
const DATAVAULT_DIR = process.env.SOVEREIGN_DATAVAULT ?? path.join(projectRoot, 'sovereign-datavault');

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index(INDEX_NAME);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_CHUNK_SIZE = Number(process.env.CHUNK_SIZE ?? 1000);
const CHUNK_OVERLAP = Number(process.env.CHUNK_OVERLAP ?? 200);

function chunkText(text) {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  if (!cleanText) return [];

  const chunks = [];
  let start = 0;
  while (start < cleanText.length) {
    const end = Math.min(start + MAX_CHUNK_SIZE, cleanText.length);
    const slice = cleanText.slice(start, end);
    chunks.push(slice);
    start += MAX_CHUNK_SIZE - CHUNK_OVERLAP;
    if (start < 0 || start >= cleanText.length) break;
  }
  return chunks;
}

async function collectMarkdownFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectMarkdownFiles(fullPath);
      files.push(...nested);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function enrichLocationWithPlaces(locationString, fileName) {
  // Default return object for consistent schema
  const defaultLocationData = {
    location_name: locationString || '',
    location_address: '',
    location_place_id: '',  // CRITICAL: Empty string, not null
    location_lat: 0,
    location_lng: 0,
  };

  if (!locationString || !locationString.trim()) {
    console.warn(`No location string provided for ${fileName}`);
    return defaultLocationData;
  }

  const googleApiKey = process.env.GOOGLE_API_KEY;
  if (!googleApiKey) {
    console.warn(`Google API key not configured, using default location data for ${fileName}`);
    return defaultLocationData;
  }

  try {
    const searchQuery = `${locationString}, Isle of Wight`;
    const placesUrl = `https://places.googleapis.com/v1/places:searchText`;

    const response = await fetch(placesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleApiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        locationBias: {
          circle: {
            center: {
              latitude: 50.693,
              longitude: -1.304,
            },
            radius: 50000,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Google Places API error ${response.status} for ${fileName}`);
      console.warn(`Response: ${errorText}`);
      return defaultLocationData;
    }

    const data = await response.json();
    const places = data.places || [];

    if (places.length === 0) {
      console.warn(`No Places results found for "${searchQuery}" in ${fileName}`);
      return defaultLocationData;
    }

    const bestMatch = places[0];
    
    // Null-safe data extraction with fallback defaults
    return {
      location_name: bestMatch.displayName?.text ?? locationString,
      location_address: bestMatch.formattedAddress ?? '',
      location_place_id: bestMatch.id ?? '',
      location_lat: bestMatch.location?.latitude ?? 0,
      location_lng: bestMatch.location?.longitude ?? 0,
    };
  } catch (error) {
    console.error(`ERROR: Could not resolve location for ${fileName}:`, error.message);
    return defaultLocationData;
  }
}

async function embedFile(filePath) {
  const fileName = path.basename(filePath);
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const { data, content } = matter(fileContent);
  
  const baseMetadata = {
    title: data.title ?? path.basename(filePath, path.extname(filePath)),
    url: data.url ?? null,
    type: data.type ?? null,
    location: data.location ?? null,
    tags: Array.isArray(data.tags) ? data.tags : [],
    summary: data.summary ?? null,
  };

  const enrichedLocation = await enrichLocationWithPlaces(data.location, fileName);
  
  const metadata = {
    ...baseMetadata,
    ...(enrichedLocation || {}),
  };

  const baseId = data.id ?? path.basename(filePath, path.extname(filePath));
  const chunks = chunkText(content);
  if (chunks.length === 0) {
    console.warn(`Skipping ${filePath}: no textual content after cleaning.`);
    return [];
  }

  const vectors = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const embeddingResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: chunk,
    });

    const embedding = embeddingResponse.data?.[0]?.embedding;
    if (!embedding) {
      console.warn(`Failed to generate embedding for chunk ${i} of ${filePath}`);
      continue;
    }

    vectors.push({
      id: `${baseId}-chunk-${i}`,
      values: embedding,
      metadata: {
        ...metadata,
        chunk_index: i,
        text: chunk,
        source: path.relative(projectRoot, filePath).replace(/\\/g, '/'),
      },
    });
  }

  return vectors;
}

async function main() {
  console.log(`Loading markdown content from ${DATAVAULT_DIR}`);
  const markdownFiles = await collectMarkdownFiles(DATAVAULT_DIR);
  if (markdownFiles.length === 0) {
    console.warn('No markdown files found.');
    return;
  }

  console.log(`Found ${markdownFiles.length} markdown file(s). Generating embeddings...`);

  const batchSize = Number(process.env.PINECONE_UPSERT_BATCH ?? 20);
  let pending = [];

  for (const filePath of markdownFiles) {
    console.log(`Embedding ${filePath}`);
    const vectors = await embedFile(filePath);
    if (vectors.length === 0) continue;

    pending.push(...vectors);

    while (pending.length >= batchSize) {
      const batch = pending.splice(0, batchSize);
      await index.upsert(batch);
      console.log(`Upserted ${batch.length} vectors to ${INDEX_NAME}`);
    }
  }

  if (pending.length > 0) {
    await index.upsert(pending);
    console.log(`Upserted remaining ${pending.length} vectors to ${INDEX_NAME}`);
  }

  console.log('Embedding complete.');
}

main().catch((error) => {
  console.error('Error populating Pinecone index:', error);
  process.exit(1);
});
