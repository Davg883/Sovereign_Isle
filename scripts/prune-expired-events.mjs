import path from "path";
import dotenv from "dotenv";
import { Pinecone } from "@pinecone-database/pinecone";

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const full = path.join(projectRoot, file);
  dotenv.config({ path: full, override: false });
}

const apiKey = process.env.PINECONE_API_KEY;
const indexName = process.env.PINECONE_INDEX_NAME ?? process.env.PINECONE_INDEX;

if (!apiKey) {
  console.error("PINECONE_API_KEY is not set.");
  process.exit(1);
}

if (!indexName) {
  console.error("PINECONE_INDEX_NAME (or PINECONE_INDEX) is not set.");
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const todayNumeric = Number(today.replace(/[^0-9]/g, "").slice(0, 8));

const pc = new Pinecone({ apiKey });

async function prune() {
  const index = pc.index(indexName);
  const filter = {
    type: { $eq: "Event" },
    end_date_numeric: { $lt: todayNumeric },
  };

  console.log(`Deleting events in ${indexName} where end_date_numeric < ${todayNumeric}`);
  await index.deleteMany({ filter });
  console.log("Expired events removed.");
}

prune().catch((error) => {
  console.error("Failed to prune events:", error);
  process.exit(1);
});