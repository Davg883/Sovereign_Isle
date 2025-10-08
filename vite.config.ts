import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { handleHealthCheck } from './api/health';
import { handleChatRequest } from './api/chat';
import { handleAdminUpsertRequest } from './api/admin/upsert';
import { handleAdminPrefillRequest } from './api/admin/prefill';
import { handleMapLocationsRequest } from './api/map-locations';
import { handlePlacesRequest } from './api/places';
import { handleRoutesRequest } from './api/routes';
import type { ApiResponse } from './api/_shared';

/**
 * Read request body from incoming POST requests
 */
const readRequestBody = async (req: IncomingMessage): Promise<any> => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return undefined;
  }

  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk.toString();
    });
    req.on('end', () => {
      resolve(data.length > 0 ? data : undefined);
    });
    req.on('error', (error) => reject(error));
  });
};

/**
 * Send API response and end the connection
 */
const sendApiResponse = (res: ServerResponse, response: ApiResponse) => {
  // Set headers
  const headers = response.headers ?? {};
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
  
  // Always set Content-Type for JSON
  if (!res.getHeader('Content-Type')) {
    res.setHeader('Content-Type', 'application/json');
  }
  
  // Set status code
  res.statusCode = response.status;
  
  // Write response body and END the response
  res.end(JSON.stringify(response.body));
};

/**
 * Custom Vite plugin for API routing
 */
const apiRouterPlugin = () => ({
  name: 'api-router-plugin',
  configureServer(server: any) {
    server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const url = req.url || '';
      
      // Helper to handle API requests
      const handleApiRequest = async (handler: Function) => {
        try {
          const body = await readRequestBody(req);
          const result = await handler({ 
            method: req.method ?? 'GET', 
            body 
          });
          sendApiResponse(res, result);
        } catch (error) {
          console.error('API route error:', error);
          sendApiResponse(res, {
            status: 500,
            body: { error: 'Internal server error' },
          });
        }
      };

      // ** HEALTH CHECK ROUTE - MUST BE FIRST **
      if (url === '/api/health') {
        handleHealthCheck(req, res);
        return; // Stop here - don't call next()
      }

      // API Route Handlers
      if (url === '/api/chat' || url.startsWith('/api/chat?')) {
        await handleApiRequest(handleChatRequest);
        return; // Stop - don't call next()
      }
      
      if (url === '/api/admin/upsert' || url.startsWith('/api/admin/upsert?')) {
        await handleApiRequest(handleAdminUpsertRequest);
        return;
      }
      
      if (url === '/api/admin/prefill' || url.startsWith('/api/admin/prefill?')) {
        await handleApiRequest(handleAdminPrefillRequest);
        return;
      }
      
      if (url === '/api/map-locations' || url.startsWith('/api/map-locations?')) {
        await handleApiRequest(handleMapLocationsRequest);
        return;
      }
      
      if (url === '/api/places' || url.startsWith('/api/places?')) {
        await handleApiRequest(handlePlacesRequest);
        return;
      }
      
      if (url === '/api/routes' || url.startsWith('/api/routes?')) {
        await handleApiRequest(handleRoutesRequest);
        return;
      }

      // Not an API route - pass to Vite
      next();
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [apiRouterPlugin()],
    define: {
      'process.env.GOOGLE_API_KEY': JSON.stringify(env.GOOGLE_API_KEY),
      'process.env.ELEVENLABS_API_KEY': JSON.stringify(env.ELEVENLABS_API_KEY),
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(env.VITE_GOOGLE_MAPS_API_KEY),
      'import.meta.env.VITE_GOOGLE_MAP_ID': JSON.stringify(env.VITE_GOOGLE_MAP_ID),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
