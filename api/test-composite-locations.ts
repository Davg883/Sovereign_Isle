import { handleMapLocationsRequest } from './map-locations';

export default async function handler(req: any, res: any) {
  // Get the composite locations
  const response = await handleMapLocationsRequest({ method: 'GET' });
  
  if (response.status !== 200) {
    return res.status(response.status).json(response.body);
  }
  
  // Format the response to show the composite structure clearly
  const locations = response.body.locations || [];
  
  // Find locations with multiple entries for demonstration
  const multiEntryLocations = locations.filter((loc: any) => loc.entries && loc.entries.length > 1);
  const singleEntryLocations = locations.filter((loc: any) => loc.entries && loc.entries.length === 1);
  
  const summary = {
    total_composite_locations: locations.length,
    locations_with_multiple_entries: multiEntryLocations.length,
    locations_with_single_entry: singleEntryLocations.length,
    sample_composite_locations: locations.slice(0, 3).map((loc: any) => ({
      location_id: loc.location_id,
      location_name: loc.location_name,
      google_place_id: loc.location_place_id,
      coordinates: { lat: loc.location_lat, lng: loc.location_lng },
      number_of_entries: loc.entries.length,
      entries: loc.entries.map((entry: any) => ({
        id: entry.id,
        type: entry.type,
        title: entry.title,
        summary: entry.summary ? entry.summary.substring(0, 100) + '...' : null
      }))
    })),
    locations_with_multiple_entries_details: multiEntryLocations.map((loc: any) => ({
      location_id: loc.location_id,
      location_name: loc.location_name,
      entry_types: loc.entries.map((e: any) => e.type).filter(Boolean),
      entry_titles: loc.entries.map((e: any) => e.title)
    }))
  };
  
  res.status(200).json(summary);
}
