import React, { useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  submitAdminEntry,
  AdminEntryPayload,
  fetchAdminPrefill,
  AdminPrefillEntry,
} from '../services/adminService';

interface StructuredLocation {
  name: string;
  formatted_address: string;
  place_id: string;
  lat: number;
  lng: number;
}

const defaultState: AdminEntryPayload = {
  title: '',
  type: '',
  location: '',
  url: '',
  tags: '',
  summary: '',
  content: '',
  id: '',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
};

const suggestionDefaults: Record<keyof AdminEntryPayload, string> = {
  title: 'The Albion Hotel: A Living Legacy',
  id: 'albion-hotel',
  type: 'Accommodation',
  location: 'Freshwater Bay',
  url: '/venues/the-albion',
  tags: 'heritage, luxury, smuggling',
  summary: 'A storied clifftop haven where smugglers, poets, and modern seekers meet.',
  content:
    "The Albion Hotel stands with a quiet gravitas at the lip of Freshwater Bay. Once two humble inns that served smugglers moving their contraband beneath the moonlight, it evolved with the arrival of Alfred Lord Tennyson and the Victorian elite. Today it is a retreat for travellers who crave heritage without giving up indulgence. Pair a stay with dawn walks across Tennyson Down and twilight storytelling in the Smugglers' Parlour.",
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
};

interface AdminPanelProps {
  onComplete?: () => void;
}

type PrefillType = 'venue' | 'event' | 'story';

const PREFILL_LABELS: Record<PrefillType, string> = {
  venue: 'Venue',
  event: 'Event',
  story: 'Story',
};

const stringifyTags = (tags: string[] | string | undefined | null) => {
  if (Array.isArray(tags)) {
    return tags.join(', ');
  }
  if (typeof tags === 'string') {
    return tags;
  }
  return '';
};

const PlaceAutocompleteInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (location: StructuredLocation) => void;
  placeholder?: string;
}> = ({ value, onChange, onPlaceSelect, placeholder }) => {
  const places = useMapsLibrary('places');
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!places || !inputRef.current) return;

    const autocompleteInstance = new places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'gb' },
      fields: ['place_id', 'name', 'formatted_address', 'geometry'],
    });

    autocompleteInstance.addListener('place_changed', () => {
      const place = autocompleteInstance.getPlace();
      
      if (place.geometry?.location && place.place_id) {
        const locationData: StructuredLocation = {
          name: place.name || '',
          formatted_address: place.formatted_address || '',
          place_id: place.place_id,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        
        onPlaceSelect(locationData);
      }
    });

    setAutocomplete(autocompleteInstance);

    return () => {
      if (autocompleteInstance) {
        google.maps.event.clearInstanceListeners(autocompleteInstance);
      }
    };
  }, [places, onPlaceSelect]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/40"
      placeholder={placeholder}
    />
  );
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ onComplete }) => {
  const [form, setForm] = useState<AdminEntryPayload>({ ...defaultState });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [prefillType, setPrefillType] = useState<PrefillType>('venue');
  const [prefillCandidates, setPrefillCandidates] = useState<AdminPrefillEntry[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [structuredLocation, setStructuredLocation] = useState<StructuredLocation | null>(null);
  const [urlValidationError, setUrlValidationError] = useState<string | null>(null);

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) {
      setUrlValidationError(null);
      return false;
    }

    try {
      const urlObj = new URL(url);
      if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
        setUrlValidationError(null);
        return true;
      } else {
        setUrlValidationError('Please enter a valid website URL.');
        return false;
      }
    } catch {
      setUrlValidationError('Please enter a valid website URL.');
      return false;
    }
  };

  const handleChange = (field: keyof AdminEntryPayload) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));

    if (field === 'url') {
      validateUrl(value);
    }
  };

  const handleSuggestionKey = (field: keyof AdminEntryPayload) => (
    event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (event.key !== 'Tab' || event.shiftKey) {
      return;
    }

    const target = event.currentTarget;
    if (target.value.trim().length > 0) {
      return;
    }

    const explicitSuggestion = target.getAttribute('data-suggest');
    const suggestion = explicitSuggestion ?? target.placeholder ?? suggestionDefaults[field] ?? '';
    if (!suggestion) {
      return;
    }

    target.value = suggestion;
    setForm((prev) => ({ ...prev, [field]: suggestion }));
  };

  const resetForm = () => {
    setForm({ ...defaultState });
    setError(null);
    setStatus(null);
    setPrefillCandidates([]);
    setStructuredLocation(null);
  };

  const handlePlaceSelect = (locationData: StructuredLocation) => {
    setStructuredLocation(locationData);
    setForm((prev) => ({
      ...prev,
      location: locationData.name || locationData.formatted_address,
    }));
  };

  const applyPrefillEntry = (entry: AdminPrefillEntry) => {
    setForm((prev) => ({
      ...prev,
      title: entry.title || prev.title,
      id: prev.id || entry.id || '',
      type: prev.type || entry.type || PREFILL_LABELS[prefillType],
      location: prev.location || entry.location || '',
      url: prev.url || entry.url || form.url,
      tags: prev.tags || stringifyTags(entry.tags),
      summary: prev.summary || entry.summary || '',
      content: prev.content || entry.narrative || '',
      startDate: prev.startDate || entry.startDate || '',
      endDate: prev.endDate || entry.endDate || '',
      startTime: prev.startTime || entry.startTime || '',
      endTime: prev.endTime || entry.endTime || '',
    }));
    
    if (entry.structuredLocation) {
      setStructuredLocation(entry.structuredLocation);
    }
    
    setPrefillCandidates([]);
  };

  const handlePrefill = async () => {
    if (!validateUrl(form.url || '')) {
      return;
    }

    setIsPrefilling(true);
    setError(null);
    setStatus(null);
    setPrefillCandidates([]);

    try {
      const data = await fetchAdminPrefill(form.url.trim(), prefillType);
      if (data.entries.length === 0) {
        setError('Isabella could not extract entries from that page.');
        return;
      }

      if (data.entries.length === 1) {
        applyPrefillEntry(data.entries[0]);
        setStatus('Prefill applied from website. Review and adjust before storing.');
      } else {
        setPrefillCandidates(data.entries);
        setStatus(`Isabella discovered ${data.entries.length} ${prefillType === 'event' ? 'events' : 'entries'}. Choose one to apply.`);
      }
    } catch (prefillError: any) {
      const message = prefillError instanceof Error ? prefillError.message : 'Unable to prefill from that website.';
      setError(message);
    } finally {
      setIsPrefilling(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setStatus(null);

    try {
      const payload: AdminEntryPayload & { structuredLocation?: StructuredLocation } = {
        ...form,
        tags: form.tags ?? '',
      };

      if (structuredLocation) {
        payload.structuredLocation = structuredLocation;
      }

      const response = await submitAdminEntry(payload);
      setStatus(`${response.message} (ID: ${response.id}, Chunks: ${response.chunks})`);
      if (typeof onComplete === 'function') {
        onComplete();
      }
      resetForm();
    } catch (submissionError: any) {
      const message = submissionError instanceof Error ? submissionError.message : 'Failed to store memory.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';

  return (
    <APIProvider apiKey={apiKey}>
      <div className="w-full max-w-4xl mx-auto text-white">
      <div className="mb-6">
        <h1 className="font-serif-elegant text-4xl">Isabella&apos;s Memory Scriptorium</h1>
        <p className="mt-2 text-white/70">
          Capture new lore, experiences, and sovereign secrets. Entries are embedded immediately into the DataVault.
        </p>
        <p className="mt-1 text-sm text-white/60">
          Tip: create or update the matching markdown file in <code>sovereign-datavault/</code> for long-term version
          control.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" aria-label="Isabella admin form">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm uppercase tracking-[0.3em] text-white/60 mb-2">Title *</span>
            <input
              required
              type="text"
              value={form.title}
              onChange={handleChange('title')}
              onKeyDown={handleSuggestionKey('title')}
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/40"
              placeholder={suggestionDefaults.title}
              data-suggest={suggestionDefaults.title}
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm uppercase tracking-[0.3em] text-white/60 mb-2">Custom ID</span>
            <input
              type="text"
              value={form.id}
              onChange={handleChange('id')}
              onKeyDown={handleSuggestionKey('id')}
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/40"
              placeholder={suggestionDefaults.id}
              data-suggest={suggestionDefaults.id}
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm uppercase tracking-[0.3em] text-white/60 mb-2">Type *</span>
            <select
              required
              value={form.type}
              onChange={handleChange('type')}
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              <option value="">Select Type...</option>
              <option value="Venue">Venue</option>
              <option value="Event">Event</option>
              <option value="Story">Story</option>
              <option value="Accommodation">Accommodation</option>
              <option value="Restaurant">Restaurant</option>
            </select>
          </label>
          <label className="flex flex-col">
            <span className="text-sm uppercase tracking-[0.3em] text-white/60 mb-2">Location</span>
            <PlaceAutocompleteInput
              value={form.location}
              onChange={(value) => setForm((prev) => ({ ...prev, location: value }))}
              onPlaceSelect={handlePlaceSelect}
              placeholder={suggestionDefaults.location}
            />
            {structuredLocation && (
              <div className="mt-2 text-xs text-white/50 space-y-1">
                <div>Place ID: {structuredLocation.place_id}</div>
                <div>Coordinates: {structuredLocation.lat.toFixed(6)}, {structuredLocation.lng.toFixed(6)}</div>
              </div>
            )}
          </label>
          {form.type === 'Event' && (
            <>
              <label className="flex flex-col">
                <span className="text-sm uppercase tracking-[0.3em] text-white/60 mb-2">Start Date *</span>
                <input
                  required
                  type="date"
                  value={form.startDate}
                  onChange={handleChange('startDate')}
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm uppercase tracking-[0.3em] text-white/60 mb-2">End Date</span>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={handleChange('endDate')}
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm uppercase tracking-[0.3em] text-white/60 mb-2">Start Time</span>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={handleChange('startTime')}
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm uppercase tracking-[0.3em] text-white/60 mb-2">End Time</span>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={handleChange('endTime')}
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
              </label>
            </>
          )}
          <label className="flex flex-col">
            <span className="text-sm uppercase tracking-[0.3em] text-white/60 mb-2">Tags (comma separated)</span>
            <input
              type="text"
              value={form.tags}
              onChange={handleChange('tags')}
              onKeyDown={handleSuggestionKey('tags')}
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/40"
              placeholder={suggestionDefaults.tags}
              data-suggest={suggestionDefaults.tags}
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm uppercase tracking-[0.3em] text-white/60 mb-2">URL & Prefill Type</span>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col md:flex-row md:items-center md:gap-2">
                <input
                  type="text"
                  value={form.url}
                  onChange={handleChange('url')}
                  onKeyDown={handleSuggestionKey('url')}
                  className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/40"
                  placeholder={suggestionDefaults.url}
                  data-suggest={suggestionDefaults.url}
                />
                <select
                  value={prefillType}
                  onChange={(event) => setPrefillType(event.target.value as PrefillType)}
                  className="mt-2 md:mt-0 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm uppercase tracking-[0.25em] focus:outline-none focus:ring-2 focus:ring-white/40"
                  aria-label="Select prefill type"
                >
                  <option value="venue">Venue</option>
                  <option value="event">Event</option>
                  <option value="story">Story</option>
                </select>
                <button
                  type="button"
                  onClick={handlePrefill}
                  disabled={isPrefilling || !!urlValidationError || !form.url?.trim()}
                  className="mt-2 md:mt-0 whitespace-nowrap rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPrefilling ? 'Prefilling...' : 'Prefill'}
                </button>
              </div>
              {urlValidationError && (
                <div className="mt-2 text-xs text-rose-400">
                  {urlValidationError}
                </div>
              )}
            </div>
          </label>
        </div>

        <label className="flex flex-col">
          <span className="text-sm uppercase tracking-[0.3em] text-white/60 mb-2">Summary</span>
          <textarea
            value={form.summary}
            onChange={handleChange('summary')}
            onKeyDown={handleSuggestionKey('summary')}
            className="min-h-[80px] rounded-lg border border-white/10 bg-black/40 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/40"
            placeholder={suggestionDefaults.summary}
            data-suggest={suggestionDefaults.summary}
          />
        </label>

        <label className="flex flex-col">
          <span className="text-sm uppercase tracking-[0.3em] text-white/60 mb-2">Narrative Content *</span>
          <textarea
            required
            value={form.content}
            onChange={handleChange('content')}
            onKeyDown={handleSuggestionKey('content')}
            className="min-h-[240px] rounded-lg border border-white/10 bg-black/40 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/40"
            placeholder="The Albion Hotel stands with a quiet gravitas..."
            data-suggest={suggestionDefaults.content}
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-white/10 px-6 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Embedding...' : 'Store Memory'}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-full border border-white/10 px-6 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white/70 hover:text-white hover:border-white/40 transition"
          >
            Reset
          </button>
        </div>
      </form>

      {prefillCandidates.length > 1 && (
        <div className="mt-6 rounded-xl border border-white/15 bg-black/30 p-4 space-y-4">
          <div>
            <h2 className="text-sm uppercase tracking-[0.3em] text-white/60">Select Prefill Entry</h2>
            <p className="mt-1 text-white/60 text-sm">
              Isabella found multiple {prefillType === 'event' ? 'events' : 'entries'} on this page. Apply the one you want to store.
            </p>
          </div>
          <div className="space-y-3">
            {prefillCandidates.map((candidate, index) => (
              <div key={`${candidate.id}-${index}`} className="rounded-lg border border-white/10 bg-black/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-white/60">{candidate.type}</p>
                    <h3 className="text-lg font-serif-elegant text-white">{candidate.title}</h3>
                    {(candidate.startDate || candidate.endDate) && (
                      <p className="text-sm text-white/70 mt-1">
                        {candidate.startDate}
                        {candidate.startTime ? ` \u00b7 ${candidate.startTime}` : ''}
                        {candidate.endDate ? ` — ${candidate.endDate}${candidate.endTime ? ` \u00b7 ${candidate.endTime}` : ''}` : ''}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      applyPrefillEntry(candidate);
                      setStatus(`Prefill applied: ${candidate.title}`);
                    }}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:bg-white/20"
                  >
                    Apply
                  </button>
                </div>
                {candidate.summary && (
                  <p className="mt-2 text-sm text-white/70">{candidate.summary}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {status && (
        <div className="mt-6 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-200">
          {status}
        </div>
      )}
      {error && (
        <div className="mt-6 rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200">
          {error}
        </div>
      )}
      </div>
    </APIProvider>
  );
};
