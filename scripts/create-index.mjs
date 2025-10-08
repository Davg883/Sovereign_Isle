import dotenv from 'dotenv';
import path from 'path';
import { Pinecone } from '@pinecone-database/pinecone';

const projectRoot = process.cwd();
const envFiles = ['.env.local', '.env'];
for (const file of envFiles) {
  const fullPath = path.join(projectRoot, file);
  dotenv.config({ path: fullPath, override: false });
}

const apiKey = process.env.PINECONE_API_KEY;
const indexName = process.env.PINECONE_INDEX ?? 'sovereign-isle';
const dimension = Number(process.env.PINECONE_DIMENSION ?? 1536);
const metric = process.env.PINECONE_METRIC ?? 'cosine';
const cloud = process.env.PINECONE_CLOUD ?? 'aws';
const region = process.env.PINECONE_REGION ?? 'us-east-1';

if (!apiKey) {
  console.error('PINECONE_API_KEY is not set.');
  process.exit(1);
}

const pc = new Pinecone({ apiKey });

async function ensureIndex() {
  const indexes = await pc.listIndexes();
  if (indexes.indexes?.some((idx) => idx.name === indexName)) {
    console.log(`Index "${indexName}" already exists.`);
    return;
  }

  console.log(`Creating index "${indexName}" (${dimension} dims, ${metric})...`);
  await pc.createIndex({
    name: indexName,
    dimension,
    metric,
    spec: {
      serverless: {
        cloud,
        region,
      },
    },
    waitUntilReady: true,
  });

  console.log(`Index "${indexName}" ready.`);
}

ensureIndex().catch((error) => {
  console.error('Failed to create Pinecone index:', error);
  process.exit(1);
});
