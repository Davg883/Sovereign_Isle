import { SYSTEM_INSTRUCTION } from "../constants.js";
import {
  ensureClients,
  getEmbeddingModel,
  getChatModel,
  ApiRequest,
  ApiResponse,
  dateStringToIndexNumber,
} from "./_shared.js";

type ClassifiedIntent = "Accommodation" | "Restaurant" | "Event" | "General";
type TemporalIntent = "PAST" | "PRESENT" | "IMMEDIATE_FUTURE" | "BROADER_FUTURE";

interface TemporalRange {
  start: string;
  end: string;
  intent: TemporalIntent;
}

interface GeographicIntent {
  hasConstraint: boolean;
  location: string | null;
  confidence: number;
}

interface ToolPlan {
  runDatavault: boolean;
  runGoogle: boolean;
  fallbackToGoogleOnEmptyDatavault: boolean;
  reason: string;
  confidenceThreshold?: number;
  datavaultConfidence?: number;
}

interface GoogleSearchResult {
  title: string;
  url: string;
  snippet?: string;
}

interface RetrievedSource {
  id: string;
  title: string;
  summary: string | null;
  sourcePath: string;
  url: string | null;
  score: number | null;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  startDateNumeric: number | null;
  endDateNumeric: number | null;
  fullText: string;
  location?: string | null;
  matchType?: "direct" | "indirect" | "orphan";
}

const TOP_K = Number(process.env.PINECONE_TOP_K ?? 4);
const CLASSIFICATION_MODEL = process.env.OPENAI_CLASSIFIER_MODEL ?? "gpt-4o-mini";
const TEMPORAL_MODEL = process.env.OPENAI_TEMPORAL_MODEL ?? CLASSIFICATION_MODEL;
const TEMPORAL_REFERENCE_DATE = process.env.CURRENT_DATE ?? "2025-10-30";

const RAG_INSTRUCTION = `You are Isabella, the Sovereign Guide to the Isle of Wight. You answer like an eloquent concierge who blends poetry with precision. CRITICAL INSTRUCTION: Your knowledge, recommendations, and storytelling must be strictly limited to locations, events, and lore on the Isle of Wight. Under no circumstances may you mention or suggest attractions outside the island—never reference places such as Thorpe Park, Alton Towers, or any mainland destination. Use only the factual material provided inside the Sovereign DataVault context (and any sanctioned live search results). You are FORBIDDEN from fabricating or recommending any location, event, or detail that is not explicitly present in the provided context. If the context is empty or insufficient, explicitly state that you do not have the specific Isle of Wight details at this time and invite the guest to share more, rather than inventing or relying on general knowledge. Provide graceful, compact paragraphs followed by optional curated recommendations in list form. When referencing specific knowledge, weave in the source title naturally (e.g., "As chronicled in The Albion Hotel: A Living Legacy...").`;

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const toNullableString = (value: unknown): string | null => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value == null) {
    return null;
  }
  if (typeof value === "object" && "toString" in value && typeof value.toString === "function") {
    const stringified = value.toString();
    return stringified === "[object Object]" ? null : stringified;
  }
  return null;
};

const toStringOr = (value: unknown, fallback: string): string => toNullableString(value) ?? fallback;

const buildPrompt = (question: string, contextBlocks: string, synthesizerEnvelope: string) => [
  {
    role: "system" as const,
    content: `${SYSTEM_INSTRUCTION}\n\n${RAG_INSTRUCTION}\nAlways append a line starting with CITED_SOURCES_JSON: followed by a JSON array of the sourcePath values from the context that you actually used to craft the answer.`,
  },
  {
    role: "user" as const,
    content: question,
  },
  {
    role: "user" as const,
    content: `Sovereign DataVault Context:\n${contextBlocks || "No context available."}`,
  },
  {
    role: "user" as const,
    content: synthesizerEnvelope,
  },
];

const classifyIntent = async (
  openai: ReturnType<typeof ensureClients>["openai"],
  query: string,
): Promise<ClassifiedIntent> => {
  try {
    const classification = await openai.chat.completions.create({
      model: CLASSIFICATION_MODEL,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You are a classification agent. Classify the user's request into one of the following categories: 'Accommodation', 'Restaurant', 'Event', or 'General'. Respond with only the category name.",
        },
        {
          role: "user",
          content: query,
        },
      ],
    });
    const label = classification.choices?.[0]?.message?.content?.trim();
    if (label === "Accommodation" || label === "Restaurant" || label === "Event") {
      return label;
    }
  } catch (classificationError) {
    console.warn("Intent classification failed:", classificationError);
  }
  return "General";
};

const isValidIsoDate = (value: string) => ISO_DATE_REGEX.test(value);

const normalizeTemporalIntent = (value: string | undefined | null): TemporalIntent | null => {
  if (!value) return null;
  const upper = value.trim().toUpperCase();
  if (upper === "PAST" || upper === "PRESENT" || upper === "IMMEDIATE_FUTURE" || upper === "BROADER_FUTURE") {
    return upper;
  }
  return null;
};

const parseTemporalClassification = (raw: string): TemporalRange | null => {
  try {
    const parsed = JSON.parse(raw);
    const start = typeof parsed.start_date === "string" ? parsed.start_date.trim() : "";
    const end = typeof parsed.end_date === "string" ? parsed.end_date.trim() : "";
    const intent = normalizeTemporalIntent(parsed.temporal_intent);

    if (!isValidIsoDate(start) || !isValidIsoDate(end) || !intent) {
      return null;
    }

    const [normalizedStart, normalizedEnd] = start <= end ? [start, end] : [end, start];
    return { start: normalizedStart, end: normalizedEnd, intent };
  } catch (error) {
    console.warn("Failed to parse temporal classification:", error);
    return null;
  }
};

const classifyTemporalWindow = async (
  openai: ReturnType<typeof ensureClients>["openai"],
  query: string,
  todayISO: string,
): Promise<TemporalRange | null> => {
  const systemPrompt = [
    `Analyze the user's query and the current date (${todayISO}). Respond with a JSON object that includes a start_date, an end_date, and a temporal_intent.`,
    `temporal_intent can be one of: PAST, PRESENT, IMMEDIATE_FUTURE (e.g., today/this weekend), BROADER_FUTURE (e.g., next month/coming up).`,
    `When the query is ambiguous, make a sensible assumption and choose the most contextually appropriate window.`,
    `Ensure the start_date is never after the end_date.`,
    `Examples:`,
    `Query: "What happened yesterday?" -> {"start_date": "2025-10-29", "end_date": "2025-10-29", "temporal_intent": "PAST"}`,
    `Query: "what halloween events are coming up" -> {"start_date": "2025-10-30", "end_date": "2025-11-30", "temporal_intent": "BROADER_FUTURE"}`,
    `Query: "What's happening this weekend?" -> {"start_date": "2025-10-31", "end_date": "2025-11-02", "temporal_intent": "IMMEDIATE_FUTURE"}`,
  ].join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: TEMPORAL_MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    return parseTemporalClassification(cleaned);
  } catch (temporalError) {
    console.warn("Temporal classification failed:", temporalError);
    return null;
  }
};

const extractGeographicIntent = async (
  openai: ReturnType<typeof ensureClients>["openai"],
  query: string,
): Promise<GeographicIntent> => {
  const systemPrompt = [
    `Analyze the user's query to determine if they are asking about a specific location on the Isle of Wight.`,
    `Respond with a JSON object containing:`,
    `- hasConstraint (boolean): true if the query mentions a specific town, village, or area`,
    `- location (string | null): the extracted location name, or null if no constraint`,
    `- confidence (number 1-10): how confident you are about the location constraint`,
    `Common Isle of Wight locations: Cowes, Newport, Ryde, Sandown, Shanklin, Ventnor, Yarmouth, Brighstone, Freshwater, Bembridge, etc.`,
    `Examples:`,
    `"where can I eat in Cowes" -> {"hasConstraint": true, "location": "Cowes", "confidence": 10}`,
    `"restaurants in Brighstone" -> {"hasConstraint": true, "location": "Brighstone", "confidence": 10}`,
    `"best pubs near Ryde" -> {"hasConstraint": true, "location": "Ryde", "confidence": 9}`,
    `"where can I eat" -> {"hasConstraint": false, "location": null, "confidence": 10}`,
    `"cozy pubs with fires" -> {"hasConstraint": false, "location": null, "confidence": 10}`,
  ].join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: CLASSIFICATION_MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      hasConstraint: Boolean(parsed.hasConstraint),
      location: typeof parsed.location === "string" ? parsed.location : null,
      confidence: typeof parsed.confidence === "number" ? Math.max(1, Math.min(10, parsed.confidence)) : 5,
    };
  } catch (error) {
    console.warn("Geographic intent extraction failed:", error);
    return { hasConstraint: false, location: null, confidence: 1 };
  }
};

const selectToolPlan = (temporal: TemporalRange | null, query: string, intent: ClassifiedIntent): ToolPlan => {
  const normalized = query.toLowerCase();
  const defaultPlan: ToolPlan = {
    runDatavault: true,
    runGoogle: true,
    fallbackToGoogleOnEmptyDatavault: true,
    reason: "Initiate with a live Isle of Wight web scan, then cross-reference the Sovereign DataVault.",
    confidenceThreshold: 8,
  };

  if (!temporal) {
    if (intent === "General") {
      return {
        runDatavault: true,
        runGoogle: true,
        fallbackToGoogleOnEmptyDatavault: true,
        reason: "General query – begin with an Isle of Wight web reconnaissance, then verify against the Sovereign DataVault.",
        confidenceThreshold: 8,
      };
    }
    const broadKeywords = ["coming up", "upcoming", "future", "ideas", "anything", "what's on", "happening"];
    const isBroad = broadKeywords.some((keyword) => normalized.includes(keyword));
    if (isBroad) {
      return {
        runDatavault: true,
        runGoogle: true,
        fallbackToGoogleOnEmptyDatavault: true,
        reason: "Query wording implies a broad outlook; scout the open web and then surface any Sovereign confirmations.",
        confidenceThreshold: 8,
      };
    }
    return defaultPlan;
  }

  if (temporal.intent === "PRESENT" || temporal.intent === "IMMEDIATE_FUTURE") {
    return {
      runDatavault: true,
      runGoogle: true,
      fallbackToGoogleOnEmptyDatavault: true,
      reason: "Prioritising an Isle of Wight web pulse before validating present or near-future needs with Sovereign memories.",
      confidenceThreshold: 8,
    };
  }

  if (temporal.intent === "BROADER_FUTURE") {
    return {
      runDatavault: true,
      runGoogle: true,
      fallbackToGoogleOnEmptyDatavault: true,
      reason: "Broader future horizon detected; blend curated DataVault memories with live web augmentation.",
      confidenceThreshold: 8,
    };
  }

  return defaultPlan;
};

const buildFilter = (intent: ClassifiedIntent, range: TemporalRange | null) => {
  if (intent === "Event") {
    const filter: Record<string, any> = { type: { $eq: "Event" } };
    if (range) {
      const startNumeric = dateStringToIndexNumber(range.start);
      const endNumeric = dateStringToIndexNumber(range.end);
      if (startNumeric !== null && endNumeric !== null) {
        filter.start_date_numeric = { $lte: endNumeric };
        filter.end_date_numeric = { $gte: startNumeric };
      }
    }
    return filter;
  }

  if (intent === "General") {
    return undefined;
  }

  return { type: { $eq: intent } };
};

const buildTemporalNarrative = (range: TemporalRange | null) => {
  if (!range) {
    return "";
  }

  if (range.start === range.end) {
    if (range.intent === "PRESENT") {
      return `Focus on happenings unfolding on ${range.start}.`;
    }
    if (range.intent === "PAST") {
      return `Reflect on happenings that occurred on ${range.start}.`;
    }
    return `Focus only on happenings occurring on ${range.start}.`;
  }

  if (range.intent === "BROADER_FUTURE") {
    return `Consider forthcoming happenings spanning ${range.start} through ${range.end}, highlighting seasonally relevant milestones.`;
  }

  if (range.intent === "PAST") {
    return `Focus on happenings that took place between ${range.start} and ${range.end}.`;
  }

  return `Focus on happenings occurring between ${range.start} and ${range.end}.`;
};

const runDatavaultSearch = async ({
  openai,
  index,
  query,
  topK,
  filter,
}: {
  openai: ReturnType<typeof ensureClients>["openai"];
  index: ReturnType<typeof ensureClients>["index"];
  query: string;
  topK: number;
  filter?: Record<string, unknown>;
}): Promise<RetrievedSource[]> => {
  const embeddingResponse = await openai.embeddings.create({
    model: getEmbeddingModel(),
    input: query,
  });

  const vector = embeddingResponse.data?.[0]?.embedding;
  if (!vector) {
    throw new Error("Failed to generate embedding for query.");
  }

  const queryResponse = await index.query({
    vector,
    topK,
    includeMetadata: true,
    filter,
  });

  const matches = queryResponse.matches ?? [];
  return matches.map((match, idx) => {
    const metadata = (match.metadata ?? {}) as Record<string, unknown>;
    return {
      id: match.id,
      title: toStringOr(metadata.title, `Source ${idx + 1}`),
      summary: toNullableString(metadata.summary),
      sourcePath: toStringOr(metadata.source, `MATCH_${idx + 1}`),
      url: toNullableString(metadata.url),
      score: match.score ?? null,
      startDate: toNullableString(metadata.start_date),
      endDate: toNullableString(metadata.end_date),
      startTime: toNullableString(metadata.start_time),
      endTime: toNullableString(metadata.end_time),
      startDateNumeric: typeof metadata.start_date_numeric === "number" ? metadata.start_date_numeric : null,
      endDateNumeric: typeof metadata.end_date_numeric === "number" ? metadata.end_date_numeric : null,
      fullText: toStringOr(metadata.text, ""),
      location: toNullableString(metadata.location),
    };
  });
};

const renderDataVaultContext = (sources: RetrievedSource[]) =>
  sources
    .map((source, idx) => {
      const timingLines = [
        source.startDate ? `startDate: ${source.startDate}` : null,
        source.endDate ? `endDate: ${source.endDate}` : null,
        source.startTime ? `startTime: ${source.startTime}` : null,
        source.endTime ? `endTime: ${source.endTime}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      return `SOURCE ${idx + 1}\nsourcePath: ${source.sourcePath}\ntitle: ${source.title}${timingLines ? `\n${timingLines}` : ""}\ntext: ${source.fullText}`;
    })
    .join("\n\n");

const formatDataVaultSummary = (sources: RetrievedSource[]) => {
  if (!sources.length) {
    return "None Found.";
  }

  return sources
    .map((source, idx) => {
      const scheduleParts = [
        source.startDate ? `start: ${source.startDate}` : null,
        source.endDate && source.endDate !== source.startDate ? `end: ${source.endDate}` : null,
      ].filter(Boolean);

      const summary = source.summary
        ? source.summary
        : source.fullText.slice(0, 240).trim() + (source.fullText.length > 240 ? "…" : "");

      const scheduleText = scheduleParts.length ? ` (${scheduleParts.join(" | ")})` : "";
      return `Result ${idx + 1}: ${source.title}${scheduleText}\nSource: ${source.sourcePath}\nSummary: ${summary}`;
    })
    .join("\n\n");
};

const formatGoogleSearchSummary = (results: GoogleSearchResult[]) => {
  if (!results.length) {
    return "None Found.";
  }

  return results
    .map((result, idx) => {
      const snippet = result.snippet ? `\nSnippet: ${result.snippet}` : "";
      return `Result ${idx + 1}: ${result.title}\nURL: ${result.url}${snippet}`;
    })
    .join("\n\n");
};

const buildDatavaultAugmentedQuery = (baseQuery: string, googleResults: GoogleSearchResult[]): string => {
  const topSignals = googleResults
    .map((result) => result.title?.trim())
    .filter((title): title is string => Boolean(title))
    .slice(0, 3);

  if (!topSignals.length) {
    return baseQuery;
  }

  return `${baseQuery}. Prioritise matches for: ${topSignals.join(" | ")}`;
};

const buildDatavaultCandidateQueries = (baseQuery: string, googleResults: GoogleSearchResult[]): string[] => {
  const anchors = googleResults
    .slice(0, 3)
    .map((result) => result.title?.trim())
    .filter((title): title is string => Boolean(title))
    .map((title) => `${title} Isle of Wight`);

  return Array.from(new Set<string>([buildDatavaultAugmentedQuery(baseQuery, googleResults), baseQuery, ...anchors]));
};

const summarizeDataVaultForConfidence = (sources: RetrievedSource[]): string => {
  if (!sources.length) {
    return "None.";
  }

  return sources
    .slice(0, 3)
    .map((source, idx) => {
      const summary = source.summary ?? source.fullText.slice(0, 200).trim();
      return `Result ${idx + 1}: ${source.title}\nSummary: ${summary || "No summary available."}`;
    })
    .join("\n\n");
};

const scoreDatavaultConfidence = async (
  openai: ReturnType<typeof ensureClients>["openai"],
  query: string,
  sources: RetrievedSource[],
): Promise<number> => {
  if (!sources.length) {
    return 1;
  }

  const summary = summarizeDataVaultForConfidence(sources);

  try {
    const completion = await openai.chat.completions.create({
      model: CLASSIFICATION_MODEL,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You are a relevance scoring agent. Based on the supplied DataVault results and the user's request, return a single integer from 1 to 10 indicating how completely and precisely the results answer the request. Respond with only the integer.",
        },
        {
          role: "user",
          content: `User Query: "${query}"\nDataVault Results:\n${summary}`,
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/-?\d+/);
    if (match) {
      const value = Number(match[0]);
      if (Number.isFinite(value)) {
        const clamped = Math.max(1, Math.min(10, Math.round(value)));
        return clamped;
      }
    }
  } catch (error) {
    console.warn("Datavault confidence scoring failed:", error);
  }

  return 1;
};

const classifyMatchTypes = (
  sources: RetrievedSource[],
  googleResults: GoogleSearchResult[],
  queryLocation: string | null,
): RetrievedSource[] => {
  if (!sources.length) {
    return [];
  }

  const googleTitles = googleResults.map((r) => r.title.toLowerCase());

  return sources.map((source) => {
    const sourceLocation = source.location?.toLowerCase() || null;
    const sourceTitle = source.title.toLowerCase();
    const queryLoc = queryLocation?.toLowerCase() || null;

    const appearsInGoogle = googleTitles.some((gTitle) => 
      gTitle.includes(sourceTitle) || sourceTitle.includes(gTitle.split(' ').slice(0, 3).join(' '))
    );

    if (appearsInGoogle && queryLoc && sourceLocation && sourceLocation.includes(queryLoc)) {
      return { ...source, matchType: "direct" as const };
    }

    if (queryLoc && sourceLocation && !sourceLocation.includes(queryLoc)) {
      return { ...source, matchType: "indirect" as const };
    }

    return { ...source, matchType: "orphan" as const };
  });
};

const buildSynthesizerEnvelope = (
  query: string,
  datavaultSources: RetrievedSource[],
  googleResults: GoogleSearchResult[],
  temporal: TemporalRange | null,
  plan: ToolPlan,
  geographicIntent: GeographicIntent | null,
) => {
  const classifiedSources = geographicIntent?.hasConstraint
    ? classifyMatchTypes(datavaultSources, googleResults, geographicIntent.location)
    : datavaultSources.map((s) => ({ ...s, matchType: "orphan" as const }));

  const directMatches = classifiedSources.filter((s) => s.matchType === "direct");
  const indirectMatches = classifiedSources.filter((s) => s.matchType === "indirect");
  const orphanMatches = classifiedSources.filter((s) => s.matchType === "orphan");

  const formatSourcesWithType = (sources: RetrievedSource[], label: string) => {
    if (!sources.length) return "";
    return `\n${label}:\n${formatDataVaultSummary(sources)}`;
  };

  const dataVaultSummary = [
    formatSourcesWithType(directMatches, "Direct Matches (Sovereign + Web-Verified)"),
    formatSourcesWithType(orphanMatches, "Curated Sovereign Entries"),
    formatSourcesWithType(indirectMatches, "Thematically Related (Different Location)"),
  ]
    .filter(Boolean)
    .join("\n") || "None Found.";

  const googleSummary = formatGoogleSearchSummary(googleResults);
  const temporalLine = temporal
    ? `Temporal Interpretation: ${temporal.intent} window from ${temporal.start} to ${temporal.end}.`
    : "Temporal Interpretation: not determined.";
  const planLine = `Tool Strategy: ${plan.reason}`;
  const coverageLine = datavaultSources.length
    ? "DataVault Coverage: Curated Isle of Wight sources located."
    : "DataVault Coverage: None — acknowledge the gap and note that these memories require future curation.";
  const googleProvenanceLine = googleResults.length
    ? "Google Provenance: Treat these as Web Findings (pending Sovereign verification) and invite future curation into the DataVault."
    : "Google Provenance: No live web findings retrieved.";

  const hierarchyInstruction = geographicIntent?.hasConstraint
    ? [
        "PRIORITIZATION HIERARCHY (CRITICAL):",
        "1. Direct Matches: If present, LEAD with these as your premier, verified recommendations. These are the crown jewels.",
        "2. Web Findings Only: If Direct Matches are absent but Google has relevant results, present them as 'Web Findings – pending Sovereign verification.'",
        `3. Thematically Related (Different Location): If a DataVault source is in a DIFFERENT location than requested (e.g., ${indirectMatches[0]?.location || "Ryde"} when user asked about ${geographicIntent.location || "Cowes"}), you may ONLY mention it AFTER addressing the user's primary request, using phrasing like: "Should your travels take you to ${indirectMatches[0]?.location || "Ryde"}, you may wish to experience..."`,
        "4. NEVER present an indirect match as a primary recommendation for the requested location.",
      ].join("\n")
    : "Instruction: When Sovereign DataVault entries exist, lead with them as your premier, verified recommendations. Present the Web Findings afterwards as supportive suggestions labeled 'Web Findings – pending Sovereign verification.'";

  return [
    "Based on the following search results, provide a helpful and poetic answer.",
    `DataVault Results:\n${dataVaultSummary}`,
    `Google Search Results:\n${googleSummary}`,
    `User's Request: '${query}'`,
    temporalLine,
    planLine,
    coverageLine,
    googleProvenanceLine,
    hierarchyInstruction,
    "If both Direct Matches and Web Findings are empty, politely state that you could not find any specific recommendations for the requested location at this time.",
    "Absolute Guardrail: You must never mention or recommend locations outside the Isle of Wight. If neither the DataVault nor Google provide Isle of Wight specifics, state that you currently lack the local details rather than offering mainland alternatives.",
  ].join("\n\n");
};

const extractLinksFromText = (text: string): GoogleSearchResult[] => {
  if (!text.trim()) {
    return [];
  }

  const urlRegex = /(https?:\/\/[^\s)]+)/g;
  const lines = text.split(/\n+/);
  const results: GoogleSearchResult[] = [];
  const seen = new Set<string>();

  lines.forEach((line) => {
    const matches = line.match(urlRegex);
    if (!matches) {
      return;
    }

    matches.forEach((url) => {
      if (seen.has(url)) {
        return;
      }
      seen.add(url);

      const stripped = line.replace(url, "").replace(/^[\s\-:•]+/, "").trim();
      const title = stripped || url;
      results.push({ title, url, snippet: stripped || undefined });
    });
  });

  return results.slice(0, 5);
};

const runGoogleSearch = async (query: string): Promise<GoogleSearchResult[]> => {
  // Google Search temporarily disabled - Gemini API removed
  console.warn("Google Search is currently disabled. Relying on DataVault only.");
  return [];
};

const parseCitedPaths = (raw: string) => {
  const marker = "CITED_SOURCES_JSON:";
  const index = raw.lastIndexOf(marker);
  if (index === -1) {
    return { answer: raw.trim(), paths: [] as string[] };
  }

  const answer = raw.slice(0, index).trim();
  const jsonPart = raw.slice(index + marker.length).trim();

  try {
    const parsed = JSON.parse(jsonPart);
    if (Array.isArray(parsed)) {
      return { answer, paths: parsed.filter((value) => typeof value === "string") };
    }
  } catch (error) {
    console.warn("Failed to parse cited sources JSON:", error);
  }

  return { answer: raw.trim(), paths: [] as string[] };
};

export const handleChatRequest = async (req: ApiRequest): Promise<ApiResponse> => {
  try {
      if (req.method !== "POST") {
        return { status: 405, body: { error: "Method not allowed" } };
      }
    
      let body = req.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch (error) {
          return { status: 400, body: { error: "Request body must be valid JSON." } };
        }
      }
    
      const queryFromBody = typeof body?.query === "string" ? body.query : null;
      const messageList = Array.isArray(body?.messages)
        ? (body.messages as Array<Record<string, unknown>>)
        : null;
    
      let query: string | null = queryFromBody;
    
      if (!query && messageList) {
        for (let i = messageList.length - 1; i >= 0; i -= 1) {
          const candidate = messageList[i];
          if (!candidate) {
            continue;
          }
    
          const role = typeof candidate.role === "string" ? (candidate.role as string) : null;
          const rawContent = candidate.content;
    
          let content: string | null = null;
          if (typeof rawContent === "string") {
            content = rawContent;
          } else if (Array.isArray(rawContent)) {
            content =
              rawContent
                .map((piece) => (typeof piece === "string" ? piece : ""))
                .join(" ")
                .trim() || null;
          }
    
          if (content && (!role || role === "user")) {
            query = content;
            break;
          }
        }
      }
    
      if (!query || typeof query !== "string" || !query.trim()) {
        return { status: 400, body: { error: 'Missing "query" in request body.' } };
      }
    
      query = query.trim();
    
        const { index, openai } = ensureClients();
    
        const intent = await classifyIntent(openai, query);
        const temporalClassification = await classifyTemporalWindow(openai, query, TEMPORAL_REFERENCE_DATE);
        const geographicIntent = await extractGeographicIntent(openai, query);
    
        const toolPlan = selectToolPlan(temporalClassification, query, intent);
        const temporalRangeForFilter = intent === "Event" ? temporalClassification : null;
    
        const resolveDatavault = async (googleList: GoogleSearchResult[]): Promise<RetrievedSource[]> => {
          if (!toolPlan.runDatavault) {
            return [];
          }
    
          const candidateQueries = buildDatavaultCandidateQueries(query, googleList);
    
          const applySearch = async (queries: string[], filter?: Record<string, unknown>) => {
            for (const candidateQuery of queries) {
              const results = await runDatavaultSearch({
                openai,
                index,
                query: candidateQuery,
                topK: TOP_K,
                filter,
              });
              if (results.length > 0) {
                return results;
              }
            }
            return [] as RetrievedSource[];
          };
    
          const primaryFilter = buildFilter(intent, temporalRangeForFilter);
    
          let sources = await applySearch(candidateQueries, primaryFilter);
    
          if (sources.length === 0 && primaryFilter) {
            const relaxedFilter =
              intent === "Event"
                ? { type: { $eq: "Event" } }
                : intent === "Accommodation" || intent === "Restaurant"
                ? { type: { $eq: intent } }
                : undefined;
    
            if (relaxedFilter) {
              sources = await applySearch(candidateQueries, relaxedFilter);
            }
    
            if (sources.length === 0) {
              sources = await applySearch(candidateQueries);
            }
          } else if (sources.length === 0) {
            sources = await applySearch(candidateQueries);
          }
    
          return sources;
        };
    
        let datavaultSources: RetrievedSource[] = [];
        let googleResults: GoogleSearchResult[] = [];
        let datavaultConfidence = 1;
    
        if (geographicIntent.hasConstraint && geographicIntent.confidence >= 7) {
          googleResults = await runGoogleSearch(query);
          datavaultSources = await resolveDatavault(googleResults);
          datavaultConfidence = await scoreDatavaultConfidence(openai, query, datavaultSources);
          toolPlan.datavaultConfidence = datavaultConfidence;
          toolPlan.reason = `Geographic constraint detected (${geographicIntent.location}): web reconnaissance first, then Sovereign DataVault cross-reference.`;
        } else {
          datavaultSources = await resolveDatavault([]);
          datavaultConfidence = await scoreDatavaultConfidence(openai, query, datavaultSources);
          toolPlan.datavaultConfidence = datavaultConfidence;
          const confidenceThreshold = toolPlan.confidenceThreshold ?? 8;
    
          const shouldQueryWeb = () =>
            toolPlan.runGoogle && (datavaultConfidence < confidenceThreshold || datavaultSources.length === 0);
    
          if (shouldQueryWeb()) {
            googleResults = await runGoogleSearch(query);
    
            if (googleResults.length > 0) {
              const augmentedSources = await resolveDatavault(googleResults);
              if (augmentedSources.length > 0) {
                datavaultSources = augmentedSources;
              }
              datavaultConfidence = await scoreDatavaultConfidence(openai, query, datavaultSources);
              toolPlan.datavaultConfidence = datavaultConfidence;
            }
          }
    
          if (googleResults.length === 0 && toolPlan.fallbackToGoogleOnEmptyDatavault && datavaultSources.length === 0) {
            googleResults = await runGoogleSearch(query);
          }
        }
    
        const temporalNarrative = buildTemporalNarrative(temporalRangeForFilter);
        const promptQuestion = temporalNarrative ? `${query}\n\n${temporalNarrative}` : query;
    
        const contextBlocks = renderDataVaultContext(datavaultSources);
        const synthesizerEnvelope = buildSynthesizerEnvelope(
          query,
          datavaultSources,
          googleResults,
          temporalClassification,
          toolPlan,
          geographicIntent,
        );
    
        const messages = buildPrompt(promptQuestion, contextBlocks, synthesizerEnvelope);
    
        const chatCompletion = await openai.chat.completions.create({
          model: getChatModel(),
          messages,
          temperature: Number(process.env.OPENAI_TEMPERATURE ?? 0.7),
        });
    
        const rawContent =
          chatCompletion.choices?.[0]?.message?.content ??
          "I am still gathering the right passages. May I hear a little more about what you need?";
    
        const { answer, paths: citedPaths } = parseCitedPaths(rawContent);
    
        let citedSources = datavaultSources.filter((source) => citedPaths.includes(source.sourcePath));
        if (citedSources.length === 0 && datavaultSources.length > 0) {
          citedSources = [datavaultSources[0]];
        }
    
        // De-duplicate citations by source path (keep only first occurrence of each unique source)
        const seenSources = new Set<string>();
        const uniqueCitedSources = citedSources.filter((source) => {
          if (seenSources.has(source.sourcePath)) {
            return false;
          }
          seenSources.add(source.sourcePath);
          return true;
        });
    
        const responseSources = uniqueCitedSources.map((source) => ({
          id: source.id,
          title: source.title,
          summary: source.summary,
          source: source.sourcePath,
          url: source.url,
          score: source.score,
          startDate: source.startDate ?? null,
          endDate: source.endDate ?? null,
          startTime: source.startTime ?? null,
          endTime: source.endTime ?? null,
        }));
    
        return {
          status: 200,
          body: {
            answer,
            sources: responseSources,
            toolPlan,
            googleResults,
            temporalClassification,
          },
        };
  } catch (error) {
    console.error('Error handling chat request:', error);
    return {
      status: 500,
      body: { error: 'Unexpected server error.' },
    };
  }
};

export default async function handler(req: any, res: any) {
  try {
    const response = await handleChatRequest({ method: req.method ?? 'POST', body: req.body });
    res.status(response.status).json(response.body);
  } catch (error) {
    console.error('Unhandled error in chat handler:', error);
    res.status(500).json({ error: 'Unexpected server error.' });
  }
}
