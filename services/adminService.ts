export interface AdminEntryPayload {
  title: string;
  summary?: string;
  type?: string;
  location?: string;
  url?: string;
  tags?: string;
  content: string;
  id?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
}

export interface AdminEntryResponse {
  message: string;
  id: string;
  chunks: number;
}

interface StructuredLocation {
  name: string;
  formatted_address: string;
  place_id: string;
  lat: number;
  lng: number;
}

export interface AdminPrefillEntry {
  title: string;
  summary: string;
  type: string;
  location: string;
  tags: string[];
  narrative: string;
  id: string;
  url?: string | null;
  dates?: string | null;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  structuredLocation?: StructuredLocation | null;
}

export interface AdminPrefillResponse {
  entries: AdminPrefillEntry[];
}

export const submitAdminEntry = async (payload: AdminEntryPayload): Promise<AdminEntryResponse> => {
  const response = await fetch('/api/admin/upsert', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.error ?? 'Isabella could not store this memory.';
    throw new Error(message);
  }

  const data = await response.json();
  return data as AdminEntryResponse;
};

export const fetchAdminPrefill = async (
  url: string,
  entryType: 'venue' | 'event' | 'story' = 'venue'
): Promise<AdminPrefillResponse> => {
  const response = await fetch('/api/admin/prefill', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, type: entryType }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.error ?? 'Isabella could not interpret that website.';
    throw new Error(message);
  }

  const data = await response.json();
  return data as AdminPrefillResponse;
};
