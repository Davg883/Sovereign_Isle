// Custom SVG icons for different types of points of interest
// Simplified version with base64 encoding for better compatibility

// Wine glass icon for restaurants/bars
export const restaurantIcon = "data:image/svg+xml;base64," + btoa(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
    <path fill="#3498db" d="M12 2C9.79 2 8 3.79 8 6v2c0 2.86 1.79 5.28 4 6.25 2.21-.97 4-3.39 4-6.25V6c0-2.21-1.79-4-4-4zm-5 8v10h10V10H7z"/>
  </svg>
`);

// Book icon for historical sites/museums
export const historicalIcon = "data:image/svg+xml;base64," + btoa(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
    <path fill="#3498db" d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/>
  </svg>
`);

// Hiking boot icon for trails/outdoor activities
export const outdoorIcon = "data:image/svg+xml;base64," + btoa(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
    <path fill="#3498db" d="M19 8c-.55 0-1 .45-1 1v1.78l-4.5-2.25c-.31-.16-.69-.16-1 0L7 12.27V19c0 .55.45 1 1 1s1-.45 1-1v-5.27l4.5-3 5.5 2.75V15c0 .55.45 1 1 1s1-.45 1-1V9c0-.55-.45-1-1-1zm-7.5 8c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
  </svg>
`);

// Castle icon for castles/fortresses
export const castleIcon = "data:image/svg+xml;base64," + btoa(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
    <path fill="#3498db" d="M12 2l1.5 3h5.5l-2 4h2l-1.5 3h-5.5l2-4h-2l1.5-3h-5.5l-2 4h2l1.5-3h5.5l-2-4h-2l-1.5 3h-5.5l2-4h2l1.5 3h5.5l2-4h-2l-1.5 3z"/>
    <path fill="#3498db" d="M22 11v2h-2v-2h-2v2h-2v-2h-2v2h-2v-2h-2v2h-2v-2h-2v2h-2v-2h-2v2h-2v-2H2v11h20v-11z"/>
  </svg>
`);

// Garden icon for gardens/parks
export const gardenIcon = "data:image/svg+xml;base64," + btoa(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
    <path fill="#3498db" d="M17 12c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm-8 6c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm-4-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm8 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
  </svg>
`);

// POI categories mapping
export const poiCategoryIcons: Record<string, string> = {
  'restaurant': restaurantIcon,
  'historical': historicalIcon,
  'outdoor': outdoorIcon,
  'castle': castleIcon,
  'garden': gardenIcon
};