export interface PlaceDetails {
  id?: string;
  rating?: number;
  userRatingsTotal?: number;
  currentOpeningHours?: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
  };
  photos?: Array<{
    name: string;
    widthPx: number;
    heightPx: number;
    authorAttributions: Array<{
      displayName: string;
      uri: string;
      photoUri: string;
    }>;
  }>;
  displayName?: {
    text: string;
    languageCode: string;
  };
  formattedAddress?: string;
}

/**
 * Retry configuration for exponential backoff
 */
const RETRY_CONFIG = {
  maxAttempts: 2, // Fewer retries on client-side (backend already retries)
  initialDelayMs: 300,
  maxDelayMs: 2000,
  backoffMultiplier: 2,
};

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch place details via backend proxy with retry logic
 * Avoids CORS issues by routing through our API
 * 
 * @param placeId - Google Place ID to fetch details for
 * @returns Place details or null on error
 */
export const fetchPlaceDetails = async (placeId: string): Promise<PlaceDetails | null> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      console.log(`[Places Service] Attempt ${attempt}/${RETRY_CONFIG.maxAttempts} for placeId: ${placeId}`);

      const response = await fetch('/api/places', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ placeId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || response.statusText;
        
        console.error(`[Places Service] API error (${response.status}):`, errorMessage);

        // Don't retry client errors (400-499) except rate limiting (429)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          console.error('[Places Service] Non-retryable client error, returning null');
          return null;
        }

        // For server errors or rate limiting, retry if we have attempts left
        if (attempt < RETRY_CONFIG.maxAttempts) {
          const delay = Math.min(
            RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
            RETRY_CONFIG.maxDelayMs
          );
          console.warn(`[Places Service] Retrying in ${delay}ms...`);
          await sleep(delay);
          continue;
        }

        return null;
      }

      const data = await response.json();
      console.log('[Places Service] Successfully fetched place details');
      
      return {
        id: data.id,
        rating: data.rating,
        userRatingsTotal: data.userRatingsTotal,
        currentOpeningHours: data.currentOpeningHours,
        photos: data.photos,
        displayName: data.displayName,
        formattedAddress: data.formattedAddress,
      };

    } catch (error: any) {
      lastError = error;
      console.error(`[Places Service] Network error on attempt ${attempt}:`, error.message);

      // Retry on network errors
      if (attempt < RETRY_CONFIG.maxAttempts) {
        const delay = Math.min(
          RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
          RETRY_CONFIG.maxDelayMs
        );
        console.warn(`[Places Service] Retrying after network error in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
    }
  }

  console.error('[Places Service] All retry attempts exhausted');
  return null;
};

/**
 * Get photo URL from Places API (New)
 * 
 * @param photoName - The photo resource name from Places API
 * @param maxWidth - Maximum width in pixels (default: 400)
 * @returns Fully formed photo URL
 */
export const getPhotoUrl = (photoName: string, maxWidth: number = 400): string => {
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.error('[Places Service] VITE_GOOGLE_MAPS_API_KEY not found');
    return '';
  }

  // Validate photoName format
  if (!photoName || !photoName.startsWith('places/')) {
    console.error('[Places Service] Invalid photoName format:', photoName);
    return '';
  }

  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${apiKey}`;
};

export interface NearbyPlace {
  id: string;
  displayName: string;
  location: {
    latitude: number;
    longitude: number;
  };
  types: string[];
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
  formattedAddress?: string;
}

export interface RouteDetails {
  polyline: {
    encodedPolyline: string;
  };
  distanceMeters: number;
  duration: string;
  legs: Array<{
    distanceMeters: number;
    duration: string;
    startLocation: {
      latLng: {
        latitude: number;
        longitude: number;
      };
    };
    endLocation: {
      latLng: {
        latitude: number;
        longitude: number;
      };
    };
  }>;
}

/**
 * Calculate route via backend proxy with retry logic
 * Avoids CORS issues by routing through our API
 * 
 * @param originLat - Origin latitude
 * @param originLng - Origin longitude
 * @param destinationPlaceId - Destination Google Place ID
 * @returns Route details or null on error
 */
export const calculateRoute = async (
  originLat: number,
  originLng: number,
  destinationPlaceId: string
): Promise<RouteDetails | null> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      console.log(`[Routes Service] Attempt ${attempt}/${RETRY_CONFIG.maxAttempts}`);

      const response = await fetch('/api/routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin: {
            lat: originLat,
            lng: originLng,
          },
          destinationPlaceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[Routes Service] API error (${response.status}):`, errorData.error || response.statusText);

        // Don't retry client errors except rate limiting
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          return null;
        }

        if (attempt < RETRY_CONFIG.maxAttempts) {
          const delay = Math.min(
            RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
            RETRY_CONFIG.maxDelayMs
          );
          await sleep(delay);
          continue;
        }

        return null;
      }

      const data = await response.json();
      console.log('[Routes Service] Successfully calculated route');
      
      return {
        polyline: data.polyline,
        distanceMeters: data.distanceMeters,
        duration: data.duration,
        legs: data.legs,
      };

    } catch (error: any) {
      lastError = error;
      console.error(`[Routes Service] Network error:`, error.message);

      if (attempt < RETRY_CONFIG.maxAttempts) {
        const delay = Math.min(
          RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
          RETRY_CONFIG.maxDelayMs
        );
        await sleep(delay);
        continue;
      }
    }
  }

  console.error('[Routes Service] All retry attempts exhausted');
  return null;
};

/**
 * Generate Google Maps deep link for navigation
 * 
 * @param destLat - Destination latitude
 * @param destLng - Destination longitude
 * @param destName - Optional destination name
 * @returns Google Maps URL for navigation
 */
export const getNavigationDeepLink = (destLat: number, destLng: number, destName?: string): string => {
  const query = destName 
    ? encodeURIComponent(destName)
    : `${destLat},${destLng}`;
  
  return `https://www.google.com/maps/dir/?api=1&destination=${query}&travelmode=driving`;
};

/**
 * Search for nearby places using the Places API (New) with retry logic
 * Uses minimal field mask to control costs
 * 
 * IMPORTANT: Uses direct API call with proper headers (X-Goog-Api-Key, X-Goog-FieldMask)
 * 
 * @param lat - Search center latitude
 * @param lng - Search center longitude
 * @param categories - Array of place types to search for
 * @returns Array of nearby places
 */
export const searchNearbyPlaces = async (
  lat: number,
  lng: number,
  categories: string[] = ['cafe', 'restaurant', 'pub', 'parking', 'tourist_attraction']
): Promise<NearbyPlace[]> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        console.error('[Nearby Search] Google Maps API key not found');
        return [];
      }

      // Minimal field mask for cost control
      // Reference: https://developers.google.com/maps/documentation/places/web-service/search-nearby
      const fieldMask = [
        'places.id',
        'places.displayName',
        'places.location',
        'places.types',
        'places.rating',
        'places.userRatingCount',
        'places.primaryType',
        'places.formattedAddress'
      ].join(',');

      console.log(`[Nearby Search] Attempt ${attempt}/${RETRY_CONFIG.maxAttempts} at (${lat}, ${lng})`);

      const response = await fetch(
        'https://places.googleapis.com/v1/places:searchNearby',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': fieldMask,
          },
          body: JSON.stringify({
            includedTypes: categories,
            maxResultCount: 20,
            locationRestriction: {
              circle: {
                center: {
                  latitude: lat,
                  longitude: lng,
                },
                radius: 1000.0, // 1km radius
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Nearby Search] API error (${response.status}):`, errorText);

        // Don't retry client errors except rate limiting
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          return [];
        }

        if (attempt < RETRY_CONFIG.maxAttempts) {
          const delay = Math.min(
            RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
            RETRY_CONFIG.maxDelayMs
          );
          console.warn(`[Nearby Search] Retrying in ${delay}ms...`);
          await sleep(delay);
          continue;
        }

        return [];
      }

      const data = await response.json();
      
      if (!data.places || data.places.length === 0) {
        console.log('[Nearby Search] No places found');
        return [];
      }

      console.log(`[Nearby Search] Found ${data.places.length} places`);

      return data.places.map((place: any) => ({
        id: place.id,
        displayName: place.displayName?.text || 'Unknown',
        location: place.location,
        types: place.types || [],
        rating: place.rating,
        userRatingCount: place.userRatingCount,
        primaryType: place.primaryType,
        formattedAddress: place.formattedAddress,
      }));

    } catch (error: any) {
      lastError = error;
      console.error(`[Nearby Search] Network error:`, error.message);

      if (attempt < RETRY_CONFIG.maxAttempts) {
        const delay = Math.min(
          RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
          RETRY_CONFIG.maxDelayMs
        );
        await sleep(delay);
        continue;
      }
    }
  }

  console.error('[Nearby Search] All retry attempts exhausted');
  return [];
};
