import { ApiRequest, ApiResponse } from './_shared.js';

interface PlacesRequest {
  placeId?: string;
}

interface GooglePlacesError {
  error: {
    code: number;
    message: string;
    status: string;
    details?: any[];
  };
}

/**
 * Retry configuration for exponential backoff
 */
const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 500,
  maxDelayMs: 4000,
  backoffMultiplier: 2,
};

/**
 * Request timeout in milliseconds
 */
const REQUEST_TIMEOUT_MS = 10000;

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with timeout wrapper
 */
const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
};

/**
 * Fetch place details from Google Places API (New) with retry logic
 */
const fetchPlaceDetailsWithRetry = async (
  placeId: string,
  apiKey: string,
  attempt: number = 1
): Promise<Response> => {
  // Cost-optimized field mask - only essential fields
  // Reference: https://developers.google.com/maps/documentation/places/web-service/place-details
  const fieldMask = [
    'id',
    'displayName',
    'formattedAddress',
    'rating',
    'userRatingCount',
    'currentOpeningHours.openNow',
    'currentOpeningHours.weekdayDescriptions',
    'photos',
  ].join(',');

  // Construct URL for Places API (New)
  const url = `https://places.googleapis.com/v1/places/${placeId}`;
  
  console.log(`[Places API] Attempt ${attempt}/${RETRY_CONFIG.maxAttempts} - Fetching place: ${placeId}`);

  try {
    // Use header-based authentication (NEW API requirement)
    const response = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': fieldMask,
        },
      },
      REQUEST_TIMEOUT_MS
    );

    // Success case
    if (response.ok) {
      console.log(`[Places API] Success on attempt ${attempt}`);
      return response;
    }

    // Handle non-retryable errors (4xx client errors except 429)
    if (response.status >= 400 && response.status < 500 && response.status !== 429) {
      console.error(`[Places API] Non-retryable error: ${response.status}`);
      return response; // Don't retry client errors (except rate limit)
    }

    // Handle retryable errors (5xx server errors, 429 rate limit)
    if (attempt < RETRY_CONFIG.maxAttempts) {
      const delay = Math.min(
        RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
        RETRY_CONFIG.maxDelayMs
      );
      
      console.warn(
        `[Places API] Retryable error ${response.status}. Retrying in ${delay}ms (attempt ${attempt}/${RETRY_CONFIG.maxAttempts})`
      );
      
      await sleep(delay);
      return fetchPlaceDetailsWithRetry(placeId, apiKey, attempt + 1);
    }

    // Max retries reached
    console.error(`[Places API] Max retries reached. Final status: ${response.status}`);
    return response;

  } catch (error: any) {
    // Handle network errors and timeouts
    if (attempt < RETRY_CONFIG.maxAttempts) {
      const delay = Math.min(
        RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
        RETRY_CONFIG.maxDelayMs
      );
      
      console.warn(
        `[Places API] Network error: ${error.message}. Retrying in ${delay}ms (attempt ${attempt}/${RETRY_CONFIG.maxAttempts})`
      );
      
      await sleep(delay);
      return fetchPlaceDetailsWithRetry(placeId, apiKey, attempt + 1);
    }

    // Max retries reached for network errors
    console.error(`[Places API] Max retries reached after network error: ${error.message}`);
    throw error;
  }
};

/**
 * Backend proxy for Google Places API (New)
 * Handles Place Details requests with robust error handling and retry logic
 * 
 * Best Practices Implemented:
 * - Header-based authentication (X-Goog-Api-Key)
 * - Proper field mask header (X-Goog-FieldMask)
 * - Exponential backoff retry logic for transient failures
 * - Request timeout handling
 * - Comprehensive error logging
 * - Cost-optimized field selection
 */
export const handlePlacesRequest = async (req: ApiRequest): Promise<ApiResponse> => {
  // Method validation
  if (req.method !== 'POST') {
    return { status: 405, body: { error: 'Method not allowed' } };
  }

  try {
    // Parse request body
    console.log('[Places API] Processing request');
    const body: PlacesRequest = typeof req.body === 'string' 
      ? JSON.parse(req.body) 
      : req.body ?? {};
    
    // Validate placeId
    const placeId = body.placeId?.trim();
    if (!placeId || placeId === '') {
      console.error('[Places API] Invalid placeId:', body.placeId);
      return { 
        status: 400, 
        body: { 
          error: 'Missing or invalid placeId in request body',
          details: 'placeId must be a non-empty string'
        } 
      };
    }

    // Validate API key configuration
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error('[Places API] GOOGLE_API_KEY environment variable not configured');
      return { 
        status: 500, 
        body: { 
          error: 'Server configuration error',
          details: 'API key not configured'
        } 
      };
    }

    console.log('[Places API] Valid placeId received:', placeId);

    // Fetch place details with retry logic
    const response = await fetchPlaceDetailsWithRetry(placeId, apiKey);

    // Handle error responses
    if (!response.ok) {
      let errorDetails = '';
      
      try {
        const errorData: GooglePlacesError = await response.json();
        errorDetails = errorData.error?.message || response.statusText;
        
        console.error('[Places API] Google API error:', {
          status: response.status,
          code: errorData.error?.code,
          message: errorData.error?.message,
          apiStatus: errorData.error?.status,
        });
      } catch {
        // If error response isn't JSON, use status text
        errorDetails = response.statusText;
        console.error('[Places API] Google API error:', response.status, errorDetails);
      }

      return {
        status: response.status,
        body: { 
          error: `Google Places API error: ${errorDetails}`,
          statusCode: response.status,
          placeId: placeId,
        }
      };
    }

    // Parse successful response
    const data = await response.json();
    console.log('[Places API] Successfully fetched place details for:', placeId);

    // Return normalized response
    return {
      status: 200,
      body: {
        id: data.id,
        rating: data.rating,
        userRatingsTotal: data.userRatingCount,
        currentOpeningHours: data.currentOpeningHours,
        photos: data.photos,
        displayName: data.displayName,
        formattedAddress: data.formattedAddress,
      }
    };

  } catch (error: any) {
    // Handle unexpected errors
    console.error('[Places API] Unexpected error:', {
      message: error.message,
      stack: error.stack,
    });
    
    return {
      status: 500,
      body: { 
        error: 'Failed to fetch place details',
        details: error.message,
      }
    };
  }
};

/**
 * Vercel serverless function handler
 */
export default async function handler(req: any, res: any) {
  const response = await handlePlacesRequest({ 
    method: req.method ?? 'GET', 
    body: req.body 
  });
  
  res.status(response.status).json(response.body);
}
