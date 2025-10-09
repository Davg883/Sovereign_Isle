import { ApiRequest, ApiResponse } from './_shared.js';

interface RoutesRequest {
  origin?: {
    lat: number;
    lng: number;
  };
  destinationPlaceId?: string;
}

/**
 * Backend proxy for Google Routes API
 * Calculates routes to avoid CORS issues
 */
export const handleRoutesRequest = async (req: ApiRequest): Promise<ApiResponse> => {
  if (req.method !== 'POST') {
    return { status: 405, body: { error: 'Method not allowed' } };
  }

  try {
    const body: RoutesRequest = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
    const { origin, destinationPlaceId } = body;

    if (!origin || !origin.lat || !origin.lng) {
      return { status: 400, body: { error: 'Missing origin coordinates in request body' } };
    }

    if (!destinationPlaceId) {
      return { status: 400, body: { error: 'Missing destinationPlaceId in request body' } };
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_API_KEY not configured');
      return { status: 500, body: { error: 'Server configuration error' } };
    }

    // Minimal field mask for cost control
    const fieldMask = [
      'routes.polyline.encodedPolyline',
      'routes.distanceMeters',
      'routes.duration',
      'routes.legs'
    ].join(',');

    const response = await fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': fieldMask,
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude: origin.lat,
                longitude: origin.lng,
              },
            },
          },
          destination: {
            placeId: destinationPlaceId,
          },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          computeAlternativeRoutes: false,
          languageCode: 'en-GB',
          units: 'METRIC',
        }),
      }
    );

    if (!response.ok) {
      console.error('Google Routes API error:', response.status, response.statusText);
      return {
        status: response.status,
        body: { error: `Google Routes API error: ${response.statusText}` }
      };
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      return {
        status: 404,
        body: { error: 'No route found' }
      };
    }

    const route = data.routes[0];

    return {
      status: 200,
      body: {
        polyline: route.polyline,
        distanceMeters: route.distanceMeters,
        duration: route.duration,
        legs: route.legs,
      }
    };
  } catch (error: any) {
    console.error('Routes API proxy error:', error);
    return {
      status: 500,
      body: { error: 'Failed to calculate route' }
    };
  }
};

export default async function handler(req: any, res: any) {
  const response = await handleRoutesRequest({ method: req.method ?? 'GET', body: req.body });
  res.status(response.status).json(response.body);
}
