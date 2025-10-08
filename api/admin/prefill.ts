import { ensureClients, ApiRequest, ApiResponse } from '../_shared';

interface PrefillPayload {
  url?: string;
  type?: 'venue' | 'event' | 'story';
}

interface StructuredLocation {
  name: string;
  formatted_address: string;
  place_id: string;
  lat: number;
  lng: number;
}

interface RawPrefillEntry {
  title?: string;
  summary?: string;
  type?: string;
  location?: string;
  tags?: string[] | string;
  narrative?: string;
  id?: string;
  suggested_id?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
}

interface PageDataResponse {
  result?: {
    data?: Record<string, any>;
  };
}

interface NormalisedEntry {
  title: string;
  summary: string;
  type: string;
  location: string;
  tags: string[];
  narrative: string;
  id: string;
  url?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  structuredLocation?: StructuredLocation | null;
}

const MAX_PAGE_BYTES = 200_000;
const MAX_CONTEXT_CHARS = 16_000;

const extractMetaContent = (html: string, name: string) => {
  const regex = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i');
  const match = html.match(regex);
  return match?.[1] ?? null;
};

const stripHtml = (html: string) =>
  html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--.*?-->/gs, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normaliseTags = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const splitDateTime = (value?: string | null) => {
  if (!value) {
    return { date: null as string | null, time: null as string | null };
  }
  const [datePart, timePart] = value.trim().split(/\s+/);
  return {
    date: datePart ?? null,
    time: timePart ?? null,
  };
};

const defaultTypeFor = (preFillType: PrefillPayload['type']) => {
  if (preFillType === 'event') return 'Event';
  if (preFillType === 'story') return 'Story';
  return 'Venue';
};

const enrichWithGooglePlace = async (
  title: string,
  narrative: string,
  locationHint: string
): Promise<StructuredLocation | null> => {
  const googleApiKey = process.env.GOOGLE_API_KEY;
  if (!googleApiKey) {
    console.warn('Google API key not configured, skipping location enrichment');
    return null;
  }

  try {
    const { openai } = ensureClients();

    const enrichmentPrompt = `You are an expert data analyst. Analyze the following text and identify the single most likely physical location it describes on the Isle of Wight, UK.

Title: ${title}
Location Hint: ${locationHint}
Narrative: ${narrative.slice(0, 1000)}

Your task:
1. From this text, formulate the best possible search query to find this place on Google Maps
2. The query should include the name and "Isle of Wight" for precision
3. Respond with ONLY a JSON object containing a single "searchQuery" field

Example: {"searchQuery": "Osborne House, East Cowes, Isle of Wight"}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        { role: 'system', content: 'You are a location identification expert. Respond only with valid JSON.' },
        { role: 'user', content: enrichmentPrompt },
      ],
    });

    const rawResponse = completion.choices?.[0]?.message?.content ?? '';
    const cleaned = rawResponse.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    const searchQuery = parsed.searchQuery;

    if (!searchQuery) {
      return null;
    }

    const placesUrl = `https://places.googleapis.com/v1/places:searchText`;

    const placesResponse = await fetch(placesUrl, {
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

    if (!placesResponse.ok) {
      console.warn('Google Places API returned error:', placesResponse.status);
      return null;
    }

    const placesData = await placesResponse.json();
    const places = placesData.places || [];

    if (places.length === 0) {
      return null;
    }

    const bestMatch = places[0];
    
    return {
      name: bestMatch.displayName?.text || '',
      formatted_address: bestMatch.formattedAddress || '',
      place_id: bestMatch.id || '',
      lat: bestMatch.location?.latitude || 0,
      lng: bestMatch.location?.longitude || 0,
    };
  } catch (error) {
    console.warn('Location enrichment failed:', error);
    return null;
  }
};

const buildSystemPrompt = (prefillType: PrefillPayload['type']) => {
  switch (prefillType) {
    case 'event':
      return `You analyse event listings and output structured JSON. Respond with a JSON array where each element represents a single event described on the page. Each event object MUST include the keys: title, summary, narrative, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), start_time (HH:MM, optional), end_time (HH:MM, optional), location, tags (array of strings), suggested_id, and url (if available). Do not output any text before or after the JSON array.`;
    case 'story':
      return `You analyse narrative articles and output structured JSON. Respond with a JSON object containing keys: title, summary, narrative, location, tags (array of strings), suggested_id, and url (if available). Do not output any text before or after the JSON.`;
    case 'venue':
    default:
      return `You analyse venue or destination pages and output structured JSON. Respond with a JSON object containing keys: title, summary, narrative, location, tags (array of strings), suggested_id, type, and url (if available). Do not output any text before or after the JSON.`;
  }
};

const cleanJson = (raw: string) => raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();

const ensureArray = (value: unknown): RawPrefillEntry[] => {
  if (Array.isArray(value)) {
    return value as RawPrefillEntry[];
  }
  if (value && typeof value === 'object') {
    return [value as RawPrefillEntry];
  }
  return [];
};

const toAbsoluteUrl = (base: string, relative?: string | null) => {
  if (!relative) return null;
  try {
    return new URL(relative, base).toString();
  } catch {
    return relative;
  }
};

const summarise = (text: string, fallback: string) => {
  if (text.trim().length > 0) {
    return text.trim();
  }
  const plain = stripHtml(fallback);
  return plain.slice(0, 200).trim();
};

const tryExtractFromPageData = async (
  targetUrl: string,
  requestedType: PrefillPayload['type']
): Promise<NormalisedEntry[]> => {
  try {
    const urlObj = new URL(targetUrl);
    let pathname = urlObj.pathname;
    if (!pathname.endsWith('/')) {
      pathname += '/';
    }
    const pageDataUrl = `${urlObj.origin}/page-data${pathname}page-data.json`;
    const response = await fetch(pageDataUrl);
    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as PageDataResponse;
    const resultData = payload.result?.data ?? {};

    if (requestedType === 'event') {
      const nodes: any[] = resultData.allWpEvent?.nodes ?? [];
      const mapped = nodes
        .map((node) => {
          const { date: startDate, time: startTime } = splitDateTime(node?.eventMeta?.startDate ?? null);
          const { date: endDate, time: endTime } = splitDateTime(node?.eventMeta?.endDate ?? node?.eventMeta?.startDate ?? null);
          return {
            title: node?.title ?? '',
            summary: summarise(stripHtml(node?.seo?.metaDesc ?? ''), node?.content ?? ''),
            type: 'Event',
            location: stripHtml(node?.location ?? ''),
            tags: normaliseTags(node?.tags),
            narrative: stripHtml(node?.content ?? ''),
            id: node?.slug ?? node?.id ?? '',
            url: toAbsoluteUrl(targetUrl, node?.uri ?? ''),
            startDate,
            endDate,
            startTime,
            endTime,
          };
        })
        .filter((entry) => entry.title.trim().length > 0);

      if (mapped.length > 0) {
        return mapped;
      }

      const single = resultData.wpEvent;
      if (single) {
        const { date: startDate, time: startTime } = splitDateTime(single?.eventMeta?.startDate ?? null);
        const { date: endDate, time: endTime } = splitDateTime(single?.eventMeta?.endDate ?? single?.eventMeta?.startDate ?? null);
        return [
          {
            title: single.title ?? '',
            summary: summarise(stripHtml(single?.seo?.metaDesc ?? ''), single.content ?? ''),
            type: 'Event',
            location: stripHtml(single?.location ?? ''),
            tags: normaliseTags(single?.tags),
            narrative: stripHtml(single?.content ?? ''),
            id: single?.slug ?? single?.id ?? '',
            url: toAbsoluteUrl(targetUrl, single?.uri ?? targetUrl),
            startDate,
            endDate,
            startTime,
            endTime,
          },
        ].filter((entry) => entry.title.trim().length > 0);
      }
    }

    if (requestedType === 'story' && resultData.wpPost) {
      const post = resultData.wpPost;
      return [
        {
          title: post.title ?? '',
          summary: summarise(stripHtml(post?.seo?.metaDesc ?? ''), post.content ?? ''),
          type: 'Story',
          location: stripHtml(post?.location ?? ''),
          tags: normaliseTags(post?.tags),
          narrative: stripHtml(post?.content ?? ''),
          id: post?.slug ?? post?.id ?? '',
          url: toAbsoluteUrl(targetUrl, post?.uri ?? targetUrl),
        },
      ].filter((entry) => entry.title.trim().length > 0);
    }

    if (requestedType === 'venue' && resultData.wpVenue) {
      const venue = resultData.wpVenue;
      return [
        {
          title: venue.title ?? '',
          summary: summarise(stripHtml(venue?.seo?.metaDesc ?? ''), venue.content ?? ''),
          type: venue.type ?? 'Venue',
          location: stripHtml(venue?.location ?? ''),
          tags: normaliseTags(venue?.tags),
          narrative: stripHtml(venue?.content ?? ''),
          id: venue?.slug ?? venue?.id ?? '',
          url: toAbsoluteUrl(targetUrl, venue?.uri ?? targetUrl),
        },
      ].filter((entry) => entry.title.trim().length > 0);
    }
  } catch (pageDataError) {
    console.warn('Page data extraction failed:', pageDataError);
  }

  return [];
};

export const handleAdminPrefillRequest = async (req: ApiRequest): Promise<ApiResponse> => {
  if (req.method !== 'POST') {
    return { status: 405, body: { error: 'Method not allowed' } };
  }

  try {
    const payload: PrefillPayload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
    const targetUrl = payload.url?.trim();
    const requestedType = payload.type ?? 'venue';

    if (!targetUrl) {
      return { status: 400, body: { error: 'Missing "url" in request body.' } };
    }

    let validatedUrl: URL;
    try {
      validatedUrl = new URL(targetUrl);
      if (validatedUrl.protocol !== 'http:' && validatedUrl.protocol !== 'https:') {
        return { status: 400, body: { error: 'URL must use http:// or https:// protocol.' } };
      }
    } catch (urlError) {
      return { status: 400, body: { error: 'Invalid URL format provided.' } };
    }

    let pageDataEntries: NormalisedEntry[] = [];
    try {
      pageDataEntries = await tryExtractFromPageData(validatedUrl.toString(), requestedType);
    } catch (pageDataError) {
      console.warn('Page data extraction failed:', pageDataError);
    }

    if (pageDataEntries.length > 0) {
      for (const entry of pageDataEntries) {
        try {
          const structuredLocation = await enrichWithGooglePlace(entry.title, entry.narrative, entry.location);
          if (structuredLocation) {
            entry.structuredLocation = structuredLocation;
            entry.location = structuredLocation.name || structuredLocation.formatted_address;
          }
        } catch (enrichError) {
          console.warn('Location enrichment failed for entry:', entry.title, enrichError);
        }
      }
      return { status: 200, body: { entries: pageDataEntries } };
    }

    const response = await fetch(validatedUrl.toString(), {
      headers: {
        'User-Agent': 'IsabellaPrefillBot/1.0 (+https://visitwight.ai)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(`Fetch failed for ${validatedUrl.toString()}: HTTP ${response.status}`);
      return {
        status: 502,
        body: {
          error: 'Isabella could not interpret that website. The server may be blocking her, or the page may not contain readable content.',
        },
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const limitedBuffer = arrayBuffer.byteLength > MAX_PAGE_BYTES ? arrayBuffer.slice(0, MAX_PAGE_BYTES) : arrayBuffer;
    const decoder = new TextDecoder('utf-8');
    const html = decoder.decode(limitedBuffer);

    const titleTag = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;
    const metaDescription = extractMetaContent(html, 'description');
    const ogTitle = extractMetaContent(html, 'og:title');
    const ogDescription = extractMetaContent(html, 'og:description');

    const stripped = stripHtml(html);
    const context = stripped.slice(0, MAX_CONTEXT_CHARS);

    if (!context || context.trim().length < 50) {
      console.error('Insufficient content extracted from page:', validatedUrl.toString());
      return {
        status: 500,
        body: {
          error: 'Isabella could not interpret that website. The server may be blocking her, or the page may not contain readable content.',
        },
      };
    }

    const { openai } = ensureClients();

    const systemPrompt = buildSystemPrompt(requestedType);

    const userPrompt = `SOURCE URL: ${validatedUrl.toString()}\n\nTITLE TAG: ${titleTag ?? 'N/A'}\nMETA DESCRIPTION: ${metaDescription ?? 'N/A'}\nOG TITLE: ${ogTitle ?? 'N/A'}\nOG DESCRIPTION: ${ogDescription ?? 'N/A'}\n\nPAGE TEXT:\n${context}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const rawContent = completion.choices?.[0]?.message?.content ?? '';
    const cleaned = cleanJson(rawContent);

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('JSON parse error for prefill response:', parseError);
      console.debug('Raw AI response:', rawContent);
      return {
        status: 500,
        body: {
          error: 'Isabella could not interpret that website. The server may be blocking her, or the page may not contain readable content.',
        },
      };
    }

    const fallbackType = defaultTypeFor(requestedType);

    const entries: NormalisedEntry[] = ensureArray(parsed)
      .map((entry) => {
        const startDate = entry.startDate ?? entry.start_date ?? null;
        const endDate = entry.endDate ?? entry.end_date ?? null;
        const startTime = entry.startTime ?? entry.start_time ?? null;
        const endTime = entry.endTime ?? entry.end_time ?? null;

        return {
          title: entry.title ?? titleTag ?? ogTitle ?? 'Untitled Entry',
          summary: entry.summary ?? metaDescription ?? ogDescription ?? '',
          type: entry.type ?? fallbackType,
          location: entry.location ?? '',
          tags: normaliseTags(entry.tags),
          narrative: entry.narrative ?? entry.summary ?? '',
          id: entry.suggested_id ?? entry.id ?? '',
          url: entry.url ?? validatedUrl.toString(),
          startDate,
          endDate,
          startTime,
          endTime,
          structuredLocation: null,
        };
      })
      .filter((entry) => entry.title && entry.title.trim().length > 0);

    if (entries.length === 0) {
      console.warn('No entries extracted from page:', validatedUrl.toString());
      return {
        status: 500,
        body: {
          error: 'Isabella could not interpret that website. The server may be blocking her, or the page may not contain readable content.',
        },
      };
    }

    for (const entry of entries) {
      try {
        const structuredLocation = await enrichWithGooglePlace(entry.title, entry.narrative, entry.location);
        if (structuredLocation) {
          entry.structuredLocation = structuredLocation;
          entry.location = structuredLocation.name || structuredLocation.formatted_address;
        }
      } catch (enrichError) {
        console.warn('Location enrichment failed for entry:', entry.title, enrichError);
      }
    }

    return { status: 200, body: { entries } };
  } catch (error: any) {
    console.error('Admin prefill critical error:', error);
    console.error('Error stack:', error?.stack);
    return {
      status: 500,
      body: {
        error: 'Isabella could not interpret that website. The server may be blocking her, or the page may not contain readable content.',
      },
    };
  }
};

export default async function handler(req: any, res: any) {
  const response = await handleAdminPrefillRequest({ method: req.method ?? 'GET', body: req.body });
  res.status(response.status).json(response.body);
}
