export interface IsabellaSource {
  id: string;
  title: string;
  url: string | null;
  summary: string | null;
  source: string | null;
  score: number | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

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
  location_id: string;
  location_name: string | null;
  location_address: string | null;
  location_place_id: string | null;
  location_lat: number;
  location_lng: number;
  entries: LocationEntry[];
}

// Legacy MapLocation interface for backward compatibility
export interface MapLocation {
  id: string;
  title: string;
  summary: string | null;
  narrativeContent?: string | null;
  type: string | null;
  location_name: string | null;
  location_address: string | null;
  location_place_id: string | null;
  location_lat: number;
  location_lng: number;
  url: string | null;
}

export interface IsabellaResponse {
  text: string;
  sources: IsabellaSource[];
}

export interface ChatMessagePayload {
  role: 'user' | 'assistant';
  content: string;
}

const parseErrorMessage = (status: number): string => {
  if (status === 401 || status === 403) {
    return 'Isabella could not authenticate with her memory palace. Please confirm the API keys.';
  }
  if (status === 429) {
    return 'The memory palace is quite busy. Let us try again in a moment.';
  }
  return 'I am struggling to reach the Sovereign DataVault right now. Please try again shortly.';
};

export const askIsabella = async (messages: ChatMessagePayload[]): Promise<IsabellaResponse> => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const fallback = parseErrorMessage(response.status);
      return { text: fallback, sources: [] };
    }

    const data = await response.json();
    return {
      text: data.answer ?? 'Isabella is reflecting in silence. Please try again.',
      sources: Array.isArray(data.sources) ? data.sources : [],
    };
  } catch (error) {
    console.error('askIsabella error:', error);
    return {
      text: 'A storm disrupted our connection to the Sovereign DataVault. Shall we try again?',
      sources: [],
    };
  }
};

// Updated function that returns composite locations
export const fetchCompositeMapLocations = async (): Promise<CompositeLocation[]> => {
  try {
    const response = await fetch('/api/map-locations', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch map locations:', response.status);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data.locations) ? data.locations : [];
  } catch (error) {
    console.error('fetchCompositeMapLocations error:', error);
    return [];
  }
};

// Backward compatibility function that flattens composite locations to individual MapLocation items
export const fetchMapLocations = async (): Promise<MapLocation[]> => {
  try {
    const compositeLocations = await fetchCompositeMapLocations();
    const flattenedLocations: MapLocation[] = [];

    // Convert each composite location to individual MapLocation items
    for (const compLoc of compositeLocations) {
      // Create a MapLocation for each entry
      for (const entry of compLoc.entries) {
        flattenedLocations.push({
          id: entry.id,
          title: entry.title,
          summary: entry.summary,
          narrativeContent: entry.narrativeContent,
          type: entry.type,
          location_name: compLoc.location_name,
          location_address: compLoc.location_address,
          location_place_id: compLoc.location_place_id,
          location_lat: compLoc.location_lat,
          location_lng: compLoc.location_lng,
          url: entry.url,
        });
      }
    }

    return flattenedLocations;
  } catch (error) {
    console.error('fetchMapLocations error:', error);
    return [];
  }
};
