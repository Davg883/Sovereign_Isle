import React, { useEffect, useRef, useState } from 'react';
import { POIs, PointOfInterest } from './MapPois';
import { poiCategoryIcons } from './MapIcons';

// Add google, gm_authFailure, and the new web component to the window object for TypeScript
declare global {
    interface Window {
        google: any;
        gm_authFailure?: () => void;
    }
    namespace JSX {
      // Define the types for the custom Google Maps web component to make it compatible with TypeScript/JSX.
      interface IntrinsicElements {
        // FIX: Use a more explicit type with React.DetailedHTMLProps to resolve the TypeScript error.
        'gmp-place-overview': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { place: string };
      }
    }
}

interface MapProps {
    onMapSelect: (prompt: string) => void;
    itinerary?: Array<{name: string, lat: number, lng: number, placeId: string}>;
}

// Custom "Sovereign" map style as per the creative director's vision
// Deep charcoal land, dark navy blue water, subtle glowing roads, faint dark green parks
const sovereignMapStyles = [
    {
        "featureType": "all",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#e0e0e0"}]
    },
    {
        "featureType": "all",
        "elementType": "labels.text.stroke",
        "stylers": [{"color": "#000000"}, {"lightness": 13}]
    },
    {
        "featureType": "administrative",
        "elementType": "geometry.fill",
        "stylers": [{"color": "#000000"}]
    },
    {
        "featureType": "administrative",
        "elementType": "geometry.stroke",
        "stylers": [{"color": "#1a1a1a"}, {"weight": 1.2}]
    },
    {
        "featureType": "landscape",
        "elementType": "geometry",
        "stylers": [{"color": "#1a1a1a"}] // Deep charcoal land
    },
    {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [{"color": "#1f1f1f"}]
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [{"color": "#1c2e24"}] // Faint dark green for parks
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.fill",
        "stylers": [{"color": "#2c3e50"}] // Darker road base
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.stroke",
        "stylers": [{"color": "#3498db"}, {"weight": 1}] // Glowing blue-white accent
    },
    {
        "featureType": "road.arterial",
        "elementType": "geometry",
        "stylers": [{"color": "#2c3e50"}]
    },
    {
        "featureType": "road.arterial",
        "elementType": "geometry.stroke",
        "stylers": [{"color": "#3498db"}, {"weight": 0.5}] // Subtle glowing lines
    },
    {
        "featureType": "road.local",
        "elementType": "geometry",
        "stylers": [{"color": "#2c3e50"}]
    },
    {
        "featureType": "road.local",
        "elementType": "geometry.stroke",
        "stylers": [{"color": "#3498db"}, {"weight": 0.3}] // Very subtle glowing lines
    },
    {
        "featureType": "transit",
        "elementType": "geometry",
        "stylers": [{"color": "#1a1a1a"}]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{"color": "#0f1e33"}] // Dark navy blue water
    }
];

// Sovereign notes for each POI (in-character quotes from Isabella)
const sovereignNotes: Record<string, string> = {
    'needles': "A sentinel standing guard over the western edge, where chalk meets the endless sky in a dance of light and shadow.",
    'osborne': "A sanctuary built from a wife's profound love and loss, a grief that shaped the very earth.",
    'carisbrooke': "Where kings were held and legends were born, these ancient stones whisper tales of power and captivity.",
    'shanklin': "A chasm carved by time itself, where water and wind have sculpted a cathedral of natural wonder.",
    'ventnor': "A hidden Eden where the subtropical breath of distant lands finds sanctuary in our island's embrace."
};

// POI categories for custom icons
const poiCategories: Record<string, string> = {
    'needles': 'outdoor',
    'osborne': 'historical',
    'carisbrooke': 'castle',
    'shanklin': 'outdoor',
    'ventnor': 'garden'
};

const PlaceDetailModal: React.FC<{
    poi: PointOfInterest | null;
    onClose: () => void;
    onAskIsabella: (prompt: string) => void;
    placeDetails: any;
}> = ({ poi, onClose, onAskIsabella, placeDetails }) => {
    if (!poi) return null;

    return (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="relative w-full max-w-md h-full max-h-[70vh] bg-black/80 border border-white/10 rounded-xl shadow-2xl text-white flex flex-col animate-slide-in"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                     <h3 className="font-serif-elegant text-lg">{poi.name}</h3>
                     <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10" aria-label="Close detail view">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                     </button>
                </header>

                <div className="flex-grow overflow-y-auto">
                    {/* Display place details if available */}
                    {placeDetails && (
                        <div className="p-3">
                            {placeDetails.photos && placeDetails.photos.length > 0 && (
                                <img 
                                    src={placeDetails.photos[0].getUrl({maxWidth: 400, maxHeight: 200})} 
                                    alt={poi.name} 
                                    className="w-full h-40 object-cover rounded-lg mb-3"
                                />
                            )}
                            {placeDetails.rating && (
                                <div className="flex items-center mb-2">
                                    <span className="text-yellow-400 mr-2">★</span>
                                    <span className="text-sm">{placeDetails.rating} ({placeDetails.user_ratings_total} reviews)</span>
                                </div>
                            )}
                            {placeDetails.formatted_address && (
                                <p className="text-gray-300 text-sm mb-3">{placeDetails.formatted_address}</p>
                            )}
                        </div>
                    )}
                    
                    {/* Sovereign Note from Isabella */}
                    <div className="p-3 bg-white/5 border border-white/10 rounded-lg mx-3 mb-3">
                        <h4 className="font-serif-elegant text-md mb-1">Isabella's Sovereign Note</h4>
                        <p className="text-sm italic text-gray-300">"{sovereignNotes[poi.id]}"</p>
                    </div>
                    
                    {/* FIX: Prefix the place ID with "places/" as required by the gmp-place-overview component. */}
                    <gmp-place-overview place={`places/${poi.placeId}`} style={{'--gm-places-surface-color': 'transparent', '--gm-places-text-color-primary': '#FFFFFF', '--gm-places-text-color-secondary': '#A0AEC0'} as React.CSSProperties} />
                </div>

                <footer className="p-3 border-t border-white/10 flex-shrink-0">
                    <button 
                        onClick={() => onAskIsabella(poi.prompt)} 
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-full text-white font-medium hover:bg-white/20 transition-colors duration-200 text-sm"
                    >
                        Ask Isabella about this place
                    </button>
                </footer>
            </div>
        </div>
    );
};


export const MapComponent: React.FC<MapProps> = ({ onMapSelect, itinerary }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const directionsRendererRef = useRef<any>(null);
    const [mapState, setMapState] = useState<'loading' | 'loaded' | 'error'>('loading');
    const [selectedPoi, setSelectedPoi] = useState<PointOfInterest | null>(null);
    const [placeDetails, setPlaceDetails] = useState<any>(null);
    const [mapInstance, setMapInstance] = useState<any>(null);
    const [placesService, setPlacesService] = useState<any>(null);
    const [directionsService, setDirectionsService] = useState<any>(null);
    
    // The API key must be configured for both Gemini and the Maps JavaScript API.
    const API_KEY = process.env.API_KEY;
    const MAPS_API_KEY = process.env.MAPS_API_KEY || API_KEY; // Fallback to API_KEY if MAPS_API_KEY is not set

    useEffect(() => {
        console.log('Map component mounted with itinerary:', itinerary);
        if (!MAPS_API_KEY) {
            console.error("Maps API key is missing. Please set the MAPS_API_KEY environment variable.");
            setMapState('error');
            return;
        }

        window.gm_authFailure = () => {
            console.error("Google Maps authentication failed. The API key is likely invalid, expired, has billing issues, or has incorrect restrictions.");
            setMapState('error');
        };
        
        if (document.getElementById('googleMapsScript')) {
            if (window.google && window.google.maps) setMapState('loaded');
            return;
        }

        const script = document.createElement('script');
        script.id = 'googleMapsScript';
        // Using the latest Places SDK for JavaScript with enhanced UK places support
        script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places,routes&region=GB`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
            // Load the Places UI Library for enhanced place details
            const uiKitScript = document.createElement('script');
            uiKitScript.id = 'gmpPlacesUiLibrary';
            uiKitScript.type = 'module';
            uiKitScript.src = 'https://maps.googleapis.com/maps/api/js/gmp-places-ui-library.mjs';
            uiKitScript.onload = () => {
                if (mapState === 'loading') {
                    setMapState('loaded');
                }
            };
            uiKitScript.onerror = () => {
                 console.error("Places UI Kit script failed to load.");
                 setMapState('error');
            }
            document.head.appendChild(uiKitScript);
        };
        script.onerror = () => {
            console.error("Google Maps script tag failed to load. Check network or script URL.");
            setMapState('error');
        };
        document.head.appendChild(script);

        return () => {
            if (window.gm_authFailure) {
                delete window.gm_authFailure;
            }
        };
    }, [MAPS_API_KEY, mapState]);

    useEffect(() => {
        if (mapState === 'loaded' && mapRef.current && window.google && window.google.maps) {
            const isleOfWightCenter = { lat: 50.68, lng: -1.30 };
            const map = new window.google.maps.Map(mapRef.current, {
                center: isleOfWightCenter,
                zoom: 11,
                styles: sovereignMapStyles, // Using the new Sovereign map style
                disableDefaultUI: true,
                zoomControl: true,
                backgroundColor: '#000',
                // Enable UK-specific features
                region: 'GB',
                language: 'en-GB'
            });
            
            setMapInstance(map);
            
            // Initialize Places Service for UK-specific place searches
            const service = new window.google.maps.places.PlacesService(map);
            setPlacesService(service);
            
            // Initialize Directions Service for routing
            const directionsService = new window.google.maps.DirectionsService();
            const directionsRenderer = new window.google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: true, // We'll use our custom markers
                polylineOptions: {
                    strokeColor: '#3498db', // Branded blue-white color
                    strokeOpacity: 0.8,
                    strokeWeight: 5
                }
            });
            directionsRendererRef.current = directionsRenderer;
            setDirectionsService(directionsService);
            
            // Add UK-specific autocomplete for search functionality
            if (searchInputRef.current) {
                const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
                    bounds: new window.google.maps.LatLngBounds(
                        new window.google.maps.LatLng(50.55, -1.55), // Southwest corner of Isle of Wight
                        new window.google.maps.LatLng(50.8, -1.05)   // Northeast corner of Isle of Wight
                    ),
                    strictBounds: true,
                    types: ['establishment', 'point_of_interest'],
                    componentRestrictions: { country: 'GB' }
                });

                autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    if (!place.geometry || !place.geometry.location) {
                        console.log("Returned place contains no geometry");
                        return;
                    }
                    
                    // Center the map on the selected place
                    map.setCenter(place.geometry.location);
                    map.setZoom(15);
                    
                    // Create a marker for the selected place with a custom icon
                    new window.google.maps.Marker({
                        map: map,
                        position: place.geometry.location,
                        title: place.name,
                        icon: {
                            path: window.google.maps.SymbolPath.CIRCLE,
                            scale: 8,
                            fillColor: "#3498db", // Branded blue-white color
                            fillOpacity: 1,
                            strokeWeight: 2,
                            strokeColor: '#FFFFFF'
                        }
                    });
                });
            }

            // If we have an itinerary, display those locations
            if (itinerary && itinerary.length > 0) {
                console.log('Displaying itinerary on map:', itinerary);
                // Create markers for itinerary locations
                itinerary.forEach((location, index) => {
                    const marker = new window.google.maps.Marker({
                        position: { lat: location.lat, lng: location.lng },
                        map: map,
                        title: location.name,
                        icon: {
                            url: poiCategoryIcons['historical'], // Default to historical icon
                            scaledSize: new window.google.maps.Size(32, 32),
                            anchor: new window.google.maps.Point(16, 16)
                        },
                        label: {
                            text: (index + 1).toString(),
                            color: 'white',
                            fontWeight: 'bold'
                        }
                    });

                    marker.addListener('click', () => {
                        // For itinerary locations, we'll create a temporary POI object
                        const tempPoi: PointOfInterest = {
                            id: `itinerary-${index}`,
                            name: location.name,
                            lat: location.lat,
                            lng: location.lng,
                            prompt: `Tell me more about ${location.name}`,
                            placeId: location.placeId
                        };
                        setSelectedPoi(tempPoi);
                        
                        // Fetch place details when marker is clicked
                        if (service) {
                            service.getDetails({
                                placeId: location.placeId,
                                fields: ['name', 'rating', 'user_ratings_total', 'photos', 'formatted_address']
                            }, (place: any, status: string) => {
                                if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                                    setPlaceDetails(place);
                                }
                            });
                        }
                    });
                });
                
                // Zoom to fit all itinerary locations
                const bounds = new window.google.maps.LatLngBounds();
                itinerary.forEach(location => {
                    bounds.extend(new window.google.maps.LatLng(location.lat, location.lng));
                });
                map.fitBounds(bounds);
                
                // Draw route if more than one location
                if (itinerary.length > 1 && directionsService && directionsRendererRef.current) {
                    const waypoints = itinerary.slice(1, -1).map(location => ({
                        location: new window.google.maps.LatLng(location.lat, location.lng),
                        stopover: true
                    }));
                    
                    directionsService.route({
                        origin: new window.google.maps.LatLng(itinerary[0].lat, itinerary[0].lng),
                        destination: new window.google.maps.LatLng(itinerary[itinerary.length - 1].lat, itinerary[itinerary.length - 1].lng),
                        waypoints: waypoints,
                        travelMode: window.google.maps.TravelMode.DRIVING,
                        optimizeWaypoints: true
                    }, (response: any, status: string) => {
                        if (status === 'OK') {
                            directionsRendererRef.current.setDirections(response);
                        } else {
                            console.error('Directions request failed due to ' + status);
                        }
                    });
                }
            } else {
                // Add custom markers for Isle of Wight points of interest with category-specific icons
                POIs.forEach(poi => {
                    const category = poiCategories[poi.id] || 'historical';
                    const iconUrl = poiCategoryIcons[category] || poiCategoryIcons['historical'];
                    
                    const marker = new window.google.maps.Marker({
                        position: { lat: poi.lat, lng: poi.lng },
                        map: map,
                        title: poi.name,
                        icon: {
                            url: iconUrl,
                            scaledSize: new window.google.maps.Size(32, 32),
                            anchor: new window.google.maps.Point(16, 16)
                        }
                    });

                    marker.addListener('click', () => {
                        setSelectedPoi(poi);
                        // Fetch place details when marker is clicked
                        if (service) {
                            service.getDetails({
                                placeId: poi.placeId,
                                fields: ['name', 'rating', 'user_ratings_total', 'photos', 'formatted_address']
                            }, (place: any, status: string) => {
                                if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                                    setPlaceDetails(place);
                                }
                            });
                        }
                    });
                });
            }
            
            // Add a custom control for resetting the map view
            const resetControlDiv = document.createElement('div');
            const resetControl = createResetControl(map, isleOfWightCenter);
            resetControlDiv.appendChild(resetControl);
            map.controls[window.google.maps.ControlPosition.TOP_RIGHT].push(resetControlDiv);
            
            // Add a custom control for routing
            const routeControlDiv = document.createElement('div');
            const routeControl = createRouteControl();
            routeControlDiv.appendChild(routeControl);
            map.controls[window.google.maps.ControlPosition.BOTTOM_LEFT].push(routeControlDiv);
        }
    }, [mapState, itinerary]);

    // Create a custom control for resetting the map view
    const createResetControl = (map: any, center: { lat: number; lng: number }) => {
        const controlButton = document.createElement('button');
        controlButton.className = 'bg-black/80 border border-white/10 rounded-full p-2 text-white hover:bg-white/20 transition-colors duration-200 shadow-lg';
        controlButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
        `;
        controlButton.title = 'Reset map view';
        controlButton.type = 'button';
        controlButton.addEventListener('click', () => {
            map.setCenter(center);
            map.setZoom(11);
            // Clear any directions if they exist
            if (directionsRendererRef.current) {
                directionsRendererRef.current.setDirections({routes: []});
            }
        });
        return controlButton;
    };
    
    // Create a custom control for routing
    const createRouteControl = () => {
        const controlButton = document.createElement('button');
        controlButton.className = 'bg-black/80 border border-white/10 rounded-full px-4 py-2 text-white hover:bg-white/20 transition-colors duration-200 shadow-lg mb-4 flex items-center';
        controlButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Begin Your Sovereign Journey
        `;
        controlButton.title = 'Create a route through Isabella\'s recommended places';
        controlButton.type = 'button';
        controlButton.addEventListener('click', () => {
            calculateAndDisplayRoute();
        });
        return controlButton;
    };
    
    // Calculate and display route through all POIs
    const calculateAndDisplayRoute = () => {
        if (!directionsService || !directionsRendererRef.current || POIs.length < 2) return;
        
        // Create waypoints from POIs
        const waypoints = POIs.slice(1, -1).map(poi => ({
            location: new window.google.maps.LatLng(poi.lat, poi.lng),
            stopover: true
        }));
        
        // Calculate route
        directionsService.route({
            origin: new window.google.maps.LatLng(POIs[0].lat, POIs[0].lng),
            destination: new window.google.maps.LatLng(POIs[POIs.length - 1].lat, POIs[POIs.length - 1].lng),
            waypoints: waypoints,
            travelMode: window.google.maps.TravelMode.DRIVING, // Default to driving
            optimizeWaypoints: true
        }, (response: any, status: string) => {
            if (status === 'OK') {
                directionsRendererRef.current.setDirections(response);
            } else {
                console.error('Directions request failed due to ' + status);
            }
        });
    };

    const renderMapContent = () => {
        switch (mapState) {
            case 'loading':
                return <div className="flex items-center justify-center h-full text-gray-400">Loading Map...</div>;
            case 'error':
                return (
                    <div className="flex flex-col items-center justify-center h-full text-red-400 p-6 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="font-semibold text-lg">Map Unavailable</p>
                        <div className="text-sm mt-2 text-gray-300 max-w-md text-left space-y-2">
                            <p>The map could not be loaded due to an authentication error. Please check the following:</p>
                            <ul className="list-disc list-inside text-xs pl-2 space-y-1">
                                <li>The <strong>`API_KEY`</strong> environment variable is set correctly.</li>
                                <li>The <strong>'Maps JavaScript API'</strong> is enabled for this key in your Google Cloud Console.</li>
                                <li>Your Google Cloud project has <strong>billing enabled</strong>.</li>
                                <li><strong>Check Key Restrictions:</strong> In the Google Cloud Console, verify that your key's restrictions are correctly configured to allow requests from this website's domain.</li>
                            </ul>
                        </div>
                    </div>
                );
            case 'loaded':
                return (
                    <div ref={mapRef} className="h-full w-full" aria-label="Interactive map of the Isle of Wight">
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search places on the Isle of Wight..."
                            className="absolute top-4 left-4 z-10 w-64 px-4 py-2 bg-black/80 border border-white/10 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
                        />
                    </div>
                );
        }
    }

    return (
        <div className="flex flex-col h-full bg-black/50 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl text-white animate-fade-in">
            <header className="flex-shrink-0 text-center py-3 border-b border-white/10">
                <h2 className="font-serif-elegant text-xl tracking-wide">
                    The Enchanted Atlas
                </h2>
            </header>
            <div className="flex-grow relative bg-black">
                {renderMapContent()}
                <PlaceDetailModal 
                    poi={selectedPoi}
                    placeDetails={placeDetails}
                    onClose={() => {
                        setSelectedPoi(null);
                        setPlaceDetails(null);
                    }}
                    onAskIsabella={(prompt) => {
                        onMapSelect(prompt);
                        setSelectedPoi(null);
                        setPlaceDetails(null);
                    }}
                />
            </div>
             <style>{`
              @keyframes fade-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }

              @keyframes slide-in {
                from { opacity: 0; transform: translateY(20px) scale(0.98); }
                to { opacity: 1; transform: translateY(0) scale(1); }
              }
              .animate-slide-in { animation: slide-in 0.3s ease-out forwards; }
           `}</style>
        </div>
    );
};