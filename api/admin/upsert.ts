import { ensureClients, getEmbeddingModel, ApiRequest, ApiResponse } from '../_shared';
import { parseTags, sanitizeId, chunkText } from '../_shared';

interface StructuredLocation {
  name: string;
  formatted_address: string;
  place_id: string;
  lat: number;
  lng: number;
}

interface AdminPayload {
  id?: string;
  title: string;
  summary?: string;
  type?: string;
  location?: string;
  url?: string;
  tags?: string[] | string;
  content: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  structuredLocation?: StructuredLocation;
}

export const handleAdminUpsertRequest = async (req: ApiRequest): Promise<ApiResponse> => {
  if (req.method !== 'POST') {
    return { status: 405, body: { error: 'Method not allowed' } };
  }

  try {
    const payload: AdminPayload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};

    if (!payload.title || !payload.content) {
      return { status: 400, body: { error: 'Title and content are required.' } };
    }

    const { index, openai } = ensureClients();

    const tags = parseTags(payload.tags ?? []);
    const baseId = sanitizeId(payload.id || payload.title || `entry-${Date.now()}`) || `entry-${Date.now()}`;

    const chunks = chunkText(payload.content);
    if (chunks.length === 0) {
      return { status: 400, body: { error: 'Content cannot be empty after formatting.' } };
    }

    const embeddingResponse = await openai.embeddings.create({
      model: getEmbeddingModel(),
      input: chunks,
    });

    const vectors = embeddingResponse.data
      .map((item, idx) => {
        const metadata: Record<string, any> = {
          title: payload.title,
          summary: payload.summary ?? null,
          type: payload.type ?? null,
          location: payload.location ?? null,
          url: payload.url ?? null,
          tags,
          start_date: payload.startDate ?? null,
          end_date: payload.endDate ?? null,
          start_time: payload.startTime ?? null,
          end_time: payload.endTime ?? null,
          chunk_index: idx,
          text: chunks[idx],
          source: `admin/${baseId}`,
        };

        if (payload.structuredLocation) {
          metadata.location_name = payload.structuredLocation.name || null;
          metadata.location_address = payload.structuredLocation.formatted_address || null;
          metadata.location_place_id = payload.structuredLocation.place_id || null;
          metadata.location_lat = payload.structuredLocation.lat;
          metadata.location_lng = payload.structuredLocation.lng;
        }

        return {
          id: `${baseId}-chunk-${idx}`,
          values: item.embedding,
          metadata,
        };
      })
      .filter((vector) => Array.isArray(vector.values) && vector.values.length > 0);

    if (vectors.length === 0) {
      return { status: 500, body: { error: 'Failed to create embeddings for provided content.' } };
    }

    await index.upsert(vectors);

    return {
      status: 200,
      body: {
        message: "Entry stored in Isabella's memory palace.",
        id: baseId,
        chunks: vectors.length,
      },
    };
  } catch (error: any) {
    console.error('Admin upsert error:', error);
    return {
      status: 500,
      body: {
        error:
          error instanceof Error
            ? error.message
            : 'Isabella could not preserve this memory. Please try again shortly.',
      },
    };
  }
};

export default async function handler(req: any, res: any) {
  const response = await handleAdminUpsertRequest({ method: req.method ?? 'GET', body: req.body });
  res.status(response.status).json(response.body);
}
