import { ensureClients, ApiRequest, ApiResponse } from './_shared';

// Individual entry within a location
export interface LocationEntry {
  id: string;
  type: string | null;
  title: string;
  summary: string | null;
  narrativeContent: string | null;
  url: string | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

// Composite location with multiple entries
export interface CompositeLocation {
  location_id: string; // Primary identifier (Google Place ID if available, otherwise first entry ID)
  location_name: string | null;
  location_address: string | null;
  location_place_id: string | null;
  location_lat: number;
  location_lng: number;
  entries: LocationEntry[];
}

export const handleMapLocationsRequest = async (req: ApiRequest): Promise<ApiResponse> => {
  try {
    if (req.method !== 'GET') {
      return { status: 405, body: { error: 'Method not allowed' } };
    }

    // Check for required environment variables
    if (!process.env.PINECONE_API_KEY) {
      console.error('Missing PINECONE_API_KEY environment variable');
      return { status: 500, body: { error: 'Server configuration error: Missing Pinecone API key' } };
    }
    if (!process.env.PINECONE_INDEX_NAME) {
      console.error('Missing PINECONE_INDEX_NAME environment variable');
      return { status: 500, body: { error: 'Server configuration error: Missing Pinecone index name' } };
    }

    const { index } = ensureClients();

    // Query Pinecone for all records with location coordinates
    const queryResponse = await index.query({
      vector: new Array(1536).fill(0), // Dummy vector for metadata-only query
      topK: 1000,
      includeMetadata: true,
      filter: {
        location_lat: { $exists: true },
        location_lng: { $exists: true },
      },
    });

    const matches = queryResponse.matches || [];

    // Group by location (using Google Place ID as primary key, fallback to coordinates)
    const locationsMap = new Map<string, CompositeLocation>();
    const processedChunks = new Set<string>();

    for (const match of matches) {
      const metadata = match.metadata || {};

      // Skip if coordinates are missing
      if (typeof metadata.location_lat !== 'number' || typeof metadata.location_lng !== 'number') continue;

      // Extract base ID (remove chunk suffix)
      const baseId = match.id.replace(/-chunk-\d+$/, '');

      // Skip if we've already processed this base ID (avoid duplicate chunks)
      if (processedChunks.has(baseId)) continue;
      processedChunks.add(baseId);

      // Determine the location key (prefer Google Place ID, fallback to coordinates)
      const locationKey = metadata.location_place_id
        ? String(metadata.location_place_id)
        : `${metadata.location_lat}_${metadata.location_lng}`;

      // Create the entry for this record
      const entry: LocationEntry = {
        id: baseId,
        type: metadata.type ? String(metadata.type) : null,
        title: String(metadata.title || 'Untitled'),
        summary: metadata.summary ? String(metadata.summary) : null,
        narrativeContent: metadata.narrativeContent ? String(metadata.narrativeContent) : null,
        url: metadata.url ? String(metadata.url) : null,
        startDate: metadata.startDate ? String(metadata.startDate) : undefined,
        endDate: metadata.endDate ? String(metadata.endDate) : undefined,
        startTime: metadata.startTime ? String(metadata.startTime) : undefined,
        endTime: metadata.endTime ? String(metadata.endTime) : undefined,
      };

      // Check if we already have a composite location for this key
      if (locationsMap.has(locationKey)) {
        const existingLocation = locationsMap.get(locationKey)!;
        existingLocation.entries.push(entry);
      } else {
        const compositeLocation: CompositeLocation = {
          location_id: locationKey,
          location_name: metadata.location_name ? String(metadata.location_name) : null,
          location_address: metadata.location_address ? String(metadata.location_address) : null,
          location_place_id: metadata.location_place_id ? String(metadata.location_place_id) : null,
          location_lat: Number(metadata.location_lat),
          location_lng: Number(metadata.location_lng),
          entries: [entry],
        };
        locationsMap.set(locationKey, compositeLocation);
      }
    }

    // Convert map to array and sort entries within each location
    const locations = Array.from(locationsMap.values()).map((location) => {
      const typePriority: Record<string, number> = {
        Event: 1,
        Accommodation: 2,
        Restaurant: 3,
        Attraction: 4,
      };

      location.entries.sort((a, b) => {
        const aPriority = typePriority[a.type || ''] || 999;
        const bPriority = typePriority[b.type || ''] || 999;
        return aPriority - bPriority;
      });

      return location;
    });

    return {
      status: 200,
      body: { locations },
    };
  } catch (error) {
    console.error('Error fetching map locations:', error);
    return {
      status: 500,
      body: { error: 'Unexpected server error.' },
    };
  }
};

export default async function handler(req: any, res: any) {
  try {
    const response = await handleMapLocationsRequest({ method: req.method ?? 'GET' });
    res.status(response.status).json(response.body);
  } catch (error) {
    console.error('Unhandled error in map locations handler:', error);
    res.status(500).json({ error: 'Unexpected server error.' });
  }
}
