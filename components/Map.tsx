import React, { useEffect, useRef, useState, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { APIProvider, useApiIsLoaded } from '@vis.gl/react-google-maps';
import { fetchCompositeMapLocations, CompositeLocation, LocationEntry } from '../services/isabellaService';
import { fetchPlaceDetails, getPhotoUrl, PlaceDetails, calculateRoute, getNavigationDeepLink, RouteDetails } from '../services/placesService';
import { createSovereignSealMarkerHTML } from './SovereignSealMarker';
import { useTheme } from '../ThemeContext';

declare global {
    interface Window {
        google: typeof google;
    }
}

interface MapProps {
    onMapSelect: (prompt: string) => void;
    itinerary?: Array<{ name: string; lat: number; lng: number; placeId: string }>;
    filterType?: string; // Optional prop for external filter control
}

const DEFAULT_CENTER = { lat: 50.68, lng: -1.3 };
const DEFAULT_SOVEREIGN_NOTE = "A new chapter in your Sovereign Journey, personally mapped by Isabella.";

// Extended location state with selected entry tracking
type SelectedLocationState = CompositeLocation & { 
    isExpanded: boolean;
    selectedEntryId: string | null;
};

// Icon mappings for different entry types
const getIconForType = (type: string | null): string => {
    const iconMap: { [key: string]: string } = {
        'Event': '🎟️',
        'Accommodation': '🛏️',
        'Restaurant': '🍽️',
        'Venue': '🏛️',
        'Experience': '✨',
        'Culinary': '🍷',
        'Story': '📚',
        'Attraction': '🎡'
    };
    return iconMap[type || ''] || '📍';
};

// Create marker HTML with custom icon
const createCustomMarkerHTML = (location: CompositeLocation, size: number = 40): string => {
    const hasMultipleTypes = new Set(location.entries.map(e => e.type)).size > 1;
    
    if (hasMultipleTypes) {
        // Multi-type marker with special styling
        return `
            <div style="
                width: ${size}px;
                height: ${size}px;
                background: linear-gradient(135deg, #FFD700, #D4AF37);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                border: 2px solid #fff;
                position: relative;
            ">
                <div style="
                    font-size: ${size * 0.5}px;
                    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
                ">🏰</div>
                <div style="
                    position: absolute;
                    top: -4px;
                    right: -4px;
                    background: #FF6B6B;
                    color: white;
                    border-radius: 50%;
                    width: 16px;
                    height: 16px;
                    font-size: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    border: 1px solid white;
                ">${location.entries.length}</div>
            </div>
        `;
    } else {
        // Single-type marker
        const type = location.entries[0]?.type;
        const icon = getIconForType(type);
        return `
            <div style="
                width: ${size}px;
                height: ${size}px;
                background: ${type === 'Event' ? '#FF6B6B' : type === 'Accommodation' ? '#4ECDC4' : '#FFD700'};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                border: 2px solid #fff;
            ">
                <div style="
                    font-size: ${size * 0.5}px;
                    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
                ">${icon}</div>
            </div>
        `;
    }
};

const IsabellaSovereignSunCrest: React.FC<{ className?: string }> = ({ className }) => (
    <svg
        className={className}
        width="96"
        height="96"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M12 3.5c-3.2 0-6.5 1.2-6.5 4.5v4.3c0 4.4 3.1 7.8 6.1 9.6a1 1 0 001 0c3-1.8 6.1-5.2 6.1-9.6V8c0-3.3-3.3-4.5-6.5-4.5z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <circle cx="12" cy="8.5" r="2.3" stroke="currentColor" strokeWidth="1.5" />
        <path
            d="M12 10.8v5.2m0 0 2 1.7M12 16l-2 1.7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M10.3 15.6h3.4M9.4 6l-.8-1.2M15.4 6l.8-1.2M8 8.4H6.6M16 8.4h1.4M9 11.3l-1 .6M15 11.3l1 .6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

// Multi-Type InfoWindow Content Component
const CompositeInfoWindowContent: React.FC<{
    location: SelectedLocationState;
    onSelectEntry: (entryId: string) => void;
    onToggleExpanded: () => void;
    onGetDirections: () => void;
    onAskIsabella: (prompt: string) => void;
    placeDetails: PlaceDetails | null;
    isLoadingDetails: boolean;
    routeInfo: RouteDetails | null;
    isLoadingRoute: boolean;
}> = ({
    location,
    onSelectEntry,
    onToggleExpanded,
    onGetDirections,
    onAskIsabella,
    placeDetails,
    isLoadingDetails,
    routeInfo,
    isLoadingRoute,
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const selectedEntry = location.entries.find(e => e.id === location.selectedEntryId) || location.entries[0];

    const scrollPhotos = (direction: 'left' | 'right') => {
        if (!scrollContainerRef.current) return;
        const scrollAmount = 200;
        scrollContainerRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth',
        });
    };

    const displayContent = location.isExpanded
        ? selectedEntry?.narrativeContent || selectedEntry?.summary || DEFAULT_SOVEREIGN_NOTE
        : selectedEntry?.summary || selectedEntry?.narrativeContent || DEFAULT_SOVEREIGN_NOTE;

    return (
        <div
            className="w-full max-w-md bg-gradient-to-b from-black/95 to-black/90 text-white"
            style={{ maxHeight: '450px', overflowY: 'auto' }}
        >
            {/* Header with location name */}
            <header className="p-3 border-b border-[#D4AF37]/20 bg-black/50 sticky top-0 z-10">
                <h3 className="font-serif-elegant text-base text-[#FFD700]">
                    {location.location_name || 'Sovereign Location'}
                </h3>
                {location.location_address && (
                    <p className="text-xs text-gray-400 mt-1">{location.location_address}</p>
                )}
            </header>

            {/* Entry Tags */}
            {location.entries.length > 1 && (
                <div className="p-3 border-b border-[#D4AF37]/10">
                    <div className="flex flex-wrap gap-2">
                        {location.entries.map((entry) => (
                            <button
                                key={entry.id}
                                onClick={() => onSelectEntry(entry.id)}
                                className={`px-3 py-1 rounded-full text-xs transition-all ${
                                    location.selectedEntryId === entry.id
                                        ? 'bg-[#FFD700] text-black font-semibold'
                                        : 'bg-[#D4AF37]/20 text-[#FFD700] hover:bg-[#D4AF37]/30'
                                } flex items-center gap-1`}
                            >
                                <span>{getIconForType(entry.type)}</span>
                                <span>{entry.type || 'Info'}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Selected Entry Content */}
            <div className="p-3 border-b border-[#D4AF37]/10">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getIconForType(selectedEntry?.type)}</span>
                    <h4 className="font-serif-elegant text-sm text-[#FFD700]">{selectedEntry?.title}</h4>
                </div>
                <p className="text-gray-300 text-xs leading-relaxed italic whitespace-pre-wrap">
                    "{displayContent}"
                </p>
                {selectedEntry?.url && (
                    <a 
                        href={selectedEntry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-xs text-blue-400 hover:text-blue-300"
                    >
                        Learn more →
                    </a>
                )}
            </div>

            {/* Live Google Places Data */}
            {placeDetails && (
                <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <h4 className="font-serif-elegant text-sm text-blue-400">Live Intelligence</h4>
                    </div>

                    {isLoadingDetails && (
                        <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FFD700]" />
                        </div>
                    )}

                    {!isLoadingDetails && placeDetails && (
                        <div className="space-y-3">
                            {placeDetails.photos && placeDetails.photos.length > 0 && (
                                <div className="relative">
                                    <div
                                        ref={scrollContainerRef}
                                        className="flex gap-2 overflow-x-auto scrollbar-hide"
                                        style={{ scrollbarWidth: 'none' }}
                                    >
                                        {placeDetails.photos.slice(0, 5).map((photo, idx) => (
                                            <img
                                                key={idx}
                                                src={getPhotoUrl(photo.name, 300)}
                                                alt={`Photo ${idx + 1}`}
                                                className="h-24 min-w-[150px] object-cover rounded"
                                            />
                                        ))}
                                    </div>
                                    {placeDetails.photos.length > 1 && (
                                        <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-1 pointer-events-none">
                                            <button
                                                onClick={() => scrollPhotos('left')}
                                                className="pointer-events-auto bg-black/60 text-white rounded-full p-1 text-xs"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => scrollPhotos('right')}
                                                className="pointer-events-auto bg-black/60 text-white rounded-full p-1 text-xs"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center gap-3 flex-wrap text-xs">
                                {placeDetails.rating !== undefined && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-yellow-400">★</span>
                                        <span className="font-semibold">{placeDetails.rating.toFixed(1)}</span>
                                        {placeDetails.userRatingsTotal && (
                                            <span className="text-gray-400">({placeDetails.userRatingsTotal.toLocaleString()})</span>
                                        )}
                                    </div>
                                )}
                                {placeDetails.currentOpeningHours?.openNow !== undefined && (
                                    <div
                                        className={`px-2 py-0.5 rounded-full text-xs ${
                                            placeDetails.currentOpeningHours.openNow
                                                ? "bg-green-500/20 text-green-400"
                                                : "bg-red-500/20 text-red-400"
                                        }`}
                                    >
                                        {placeDetails.currentOpeningHours.openNow ? "Open" : "Closed"}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Actions Footer */}
            <footer className="p-3 border-t border-[#D4AF37]/20 bg-black/50 space-y-2">
                <div className="grid grid-cols-3 gap-2 text-xs">
                    <button
                        onClick={onToggleExpanded}
                        className="px-2 py-1.5 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-300 flex items-center justify-center gap-1"
                    >
                        {location.isExpanded ? 'Show Less' : 'Discover'}
                    </button>
                    <button
                        onClick={onGetDirections}
                        className="px-2 py-1.5 bg-[#D4AF37]/20 border border-[#D4AF37]/30 rounded-full text-[#FFD700] flex items-center justify-center gap-1"
                    >
                        {isLoadingRoute ? (
                            <span className="flex items-center gap-1">
                                <span className="animate-spin h-3 w-3 border-b border-[#FFD700] rounded-full" />
                                Loading
                            </span>
                        ) : (
                            'Directions'
                        )}
                    </button>
                    <button
                        onClick={() => onAskIsabella(`Tell me about ${selectedEntry?.title || location.location_name}`)}
                        className="px-2 py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full text-[#FFD700] flex items-center justify-center gap-1"
                    >
                        Ask Isabella
                    </button>
                </div>

                {routeInfo && (
                    <div className="p-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded space-y-1.5">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-300">Distance:</span>
                            <span className="text-[#FFD700] font-semibold">{(routeInfo.distanceMeters / 1000).toFixed(1)} km</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-300">Duration:</span>
                            <span className="text-[#FFD700] font-semibold">{routeInfo.duration.replace('s', ' mins')}</span>
                        </div>
                        <a
                            href={getNavigationDeepLink(
                                location.location_lat,
                                location.location_lng,
                                location.location_name || 'Location',
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full px-3 py-1.5 bg-green-500/20 border border-green-400/30 rounded-full text-green-300 text-xs text-center"
                        >
                            Start Navigation
                        </a>
                    </div>
                )}
            </footer>
        </div>
    );
};

// Filter Dropdown Component
const FilterDropdown: React.FC<{
    activeFilter: string;
    onFilterChange: (filter: string) => void;
    availableTypes: string[];
}> = ({ activeFilter, onFilterChange, availableTypes }) => {
    return (
        <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur-md rounded-lg p-2">
            <select
                value={activeFilter}
                onChange={(e) => onFilterChange(e.target.value)}
                className="bg-black/50 text-[#FFD700] border border-[#D4AF37]/30 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#FFD700]"
            >
                <option value="All">All Locations</option>
                {availableTypes.map((type) => (
                    <option key={type} value={type}>
                        {getIconForType(type)} {type}
                    </option>
                ))}
            </select>
        </div>
    );
};

// Loading Status Checker Component
const ApiLoadingGuard: React.FC<MapProps> = (props) => {
    const apiLoaded = useApiIsLoaded();

    if (!apiLoaded) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center text-center text-gray-200">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#FFD700] mb-4"></div>
                    <p className="font-serif-elegant text-lg text-[#FFD700]">
                        Charting the Enchanted Atlas...
                    </p>
                </div>
            </div>
        );
    }

    return <MapContent {...props} />;
};

// Main Map Component
const MapContent: React.FC<MapProps> = ({ onMapSelect, itinerary, filterType }) => {
    const { theme } = useTheme();
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const [mapInitialized, setMapInitialized] = useState(false);
    
    // State for filtering
    const [activeFilter, setActiveFilter] = useState<string>(filterType || 'All');
    const [compositeLocations, setCompositeLocations] = useState<CompositeLocation[]>([]);
    
    // State for selected location
    const [selectedLocation, setSelectedLocation] = useState<SelectedLocationState | null>(null);
    const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
    const [isLoadingPlaceDetails, setIsLoadingPlaceDetails] = useState(false);
    const [routeInfo, setRouteInfo] = useState<RouteDetails | null>(null);
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);
    const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
    
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
    const routePolylineRef = useRef<google.maps.Polyline | null>(null);
    const markerRefs = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
    const reactRootRef = useRef<ReactDOM.Root | null>(null);

    // Update filter when external prop changes
    useEffect(() => {
        if (filterType) {
            setActiveFilter(filterType);
        }
    }, [filterType]);

    // Get available types from all locations
    const availableTypes = useMemo(() => {
        const types = new Set<string>();
        compositeLocations.forEach(loc => {
            loc.entries.forEach(entry => {
                if (entry.type) types.add(entry.type);
            });
        });
        return Array.from(types).sort();
    }, [compositeLocations]);

    // Filter locations based on active filter
    const filteredLocations = useMemo(() => {
        if (activeFilter === 'All') {
            return compositeLocations;
        }
        return compositeLocations.filter(location =>
            location.entries.some(entry => entry.type === activeFilter)
        );
    }, [compositeLocations, activeFilter]);

    // Initialize map
    useEffect(() => {
        console.log('Map initialization starting with theme:', theme);

        if (!mapContainerRef.current) {
            console.log('No map container ref - skipping initialization');
            return;
        }

        if (mapInstanceRef.current) {
            handleInfoWindowClose();
        }

        markerRefs.current.forEach((marker) => {
            marker.map = null;
        });
        markerRefs.current.clear();

        if (routePolylineRef.current) {
            routePolylineRef.current.setMap(null);
            routePolylineRef.current = null;
        }

        mapInstanceRef.current = null;
        infoWindowRef.current = null;

        setMapInitialized(false);

        const lightMapId = 'e0df9c01f40e23d5b6c6f64a';
        const darkMapId = 'e0df9c01f40e23d598a19585';
        const activeMapId = theme === 'dark' ? darkMapId : lightMapId;

        const mapConfig: google.maps.MapOptions = {
            center: DEFAULT_CENTER,
            zoom: 11,
            mapId: activeMapId,
            disableDefaultUI: true,
            zoomControl: true,
            mapTypeControl: true,
            mapTypeControlOptions: {
                mapTypeIds: ['roadmap', 'satellite'],
                style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU,
                position: window.google.maps.ControlPosition.TOP_RIGHT,
            },
            gestureHandling: 'greedy',
            clickableIcons: true,
        };

        console.log('Creating map with config:', mapConfig);
        const map = new window.google.maps.Map(mapContainerRef.current, mapConfig);
        console.log('Map created successfully with Map ID:', activeMapId);

        mapInstanceRef.current = map;

        const infoWindow = new window.google.maps.InfoWindow({
            maxWidth: 450,
        });
        infoWindowRef.current = infoWindow;

        const infoWindowCloseListener = window.google.maps.event.addListener(infoWindow, 'closeclick', () => {
            handleInfoWindowClose();
        });

        setMapInitialized(true);

        return () => {
            setMapInitialized(false);
            handleInfoWindowClose();

            if (infoWindowCloseListener) {
                window.google.maps.event.removeListener(infoWindowCloseListener);
            }

            if (infoWindowRef.current) {
                infoWindowRef.current.close();
                infoWindowRef.current = null;
            }

            if (reactRootRef.current) {
                reactRootRef.current.unmount();
                reactRootRef.current = null;
            }

            markerRefs.current.forEach((marker) => {
                marker.map = null;
            });
            markerRefs.current.clear();

            if (routePolylineRef.current) {
                routePolylineRef.current.setMap(null);
                routePolylineRef.current = null;
            }

            mapInstanceRef.current = null;
        };
    }, [theme]);

    // Fetch composite locations on mount
    useEffect(() => {
        fetchCompositeMapLocations()
            .then((locations) => setCompositeLocations(locations))
            .catch((error) => console.error('Failed to fetch composite locations:', error));
    }, []);

    // Render markers for filtered locations
    useEffect(() => {
        if (!mapInitialized || !mapInstanceRef.current) return;

        // Clear existing markers
        markerRefs.current.forEach(marker => marker.map = null);
        markerRefs.current.clear();

        // Create markers for filtered locations
        filteredLocations.forEach((location) => {
            if (!mapInstanceRef.current) return;

            const markerContent = document.createElement('div');
            markerContent.innerHTML = createCustomMarkerHTML(location, 40);
            markerContent.style.cursor = 'pointer';

            const marker = new window.google.maps.marker.AdvancedMarkerElement({
                map: mapInstanceRef.current,
                position: { lat: location.location_lat, lng: location.location_lng },
                content: markerContent,
                title: location.location_name || 'Sovereign Location',
            });

            marker.addListener('click', () => {
                handleMarkerClick(location, marker);
            });

            markerRefs.current.set(location.location_id, marker);
        });

    }, [mapInitialized, filteredLocations]);

    const handleInfoWindowClose = () => {
        setSelectedLocation(null);
        setPlaceDetails(null);
        setIsLoadingPlaceDetails(false);
        clearRoute();
        if (reactRootRef.current) {
            reactRootRef.current.unmount();
            reactRootRef.current = null;
        }
    };

    const handleMarkerClick = async (location: CompositeLocation, marker: google.maps.marker.AdvancedMarkerElement) => {
        const initialSelection: SelectedLocationState = { 
            ...location, 
            isExpanded: false,
            selectedEntryId: location.entries[0]?.id || null
        };
        setSelectedLocation(initialSelection);
        setPlaceDetails(null);
        setRouteInfo(null);
        setIsLoadingRoute(false);

        if (infoWindowRef.current && mapInstanceRef.current) {
            const content = document.createElement('div');
            content.id = 'infowindow-content';

            if (reactRootRef.current) {
                reactRootRef.current.unmount();
            }
            reactRootRef.current = ReactDOM.createRoot(content);

            infoWindowRef.current.setContent(content);
            infoWindowRef.current.open({
                map: mapInstanceRef.current,
                anchor: marker,
            });
        }

        if (!location.location_place_id) {
            console.warn('No valid place ID for this location. Skipping API call.');
            setIsLoadingPlaceDetails(false);
            return;
        }

        setIsLoadingPlaceDetails(true);

        try {
            const details = await fetchPlaceDetails(location.location_place_id);
            setPlaceDetails(details);
        } catch (error) {
            console.error('Failed to fetch place details:', error);
            setPlaceDetails(null);
        } finally {
            setIsLoadingPlaceDetails(false);
        }
    };

    const updateInfoWindowContent = () => {
        if (!selectedLocation || !reactRootRef.current) {
            return;
        }

        reactRootRef.current.render(
            <CompositeInfoWindowContent
                location={selectedLocation}
                placeDetails={placeDetails}
                isLoadingDetails={isLoadingPlaceDetails}
                routeInfo={routeInfo}
                isLoadingRoute={isLoadingRoute}
                onSelectEntry={(entryId) => {
                    setSelectedLocation(prev => prev ? { ...prev, selectedEntryId: entryId } : prev);
                }}
                onToggleExpanded={() => {
                    setSelectedLocation(prev => prev ? { ...prev, isExpanded: !prev.isExpanded } : prev);
                }}
                onGetDirections={handleGetDirections}
                onAskIsabella={(prompt) => {
                    onMapSelect(prompt);
                    if (infoWindowRef.current) {
                        infoWindowRef.current.close();
                    }
                    handleInfoWindowClose();
                }}
            />
        );
    };

    // Update info window when state changes
    useEffect(() => {
        if (!selectedLocation) {
            return;
        }
        updateInfoWindowContent();
    }, [selectedLocation, placeDetails, isLoadingPlaceDetails, routeInfo, isLoadingRoute]);

    const handleGetDirections = async () => {
        if (!selectedLocation) {
            console.error('No location selected for directions.');
            return;
        }

        // Open Google Maps with directions from user's current location to the destination
        // Using both place_id and coordinates for better compatibility
        const placeId = selectedLocation.location_place_id;
        const lat = selectedLocation.location_lat;
        const lng = selectedLocation.location_lng;
        
        let directionsUrl: string;
        
        if (placeId) {
            // Use Place ID for more accurate destination (Google will handle the name automatically)
            const encodedPlaceId = encodeURIComponent(placeId);
            // The origin parameter will default to user's current location when not specified
            // This ensures Google Maps uses the user's actual location automatically
            directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodedPlaceId}&travelmode=driving`;
        } else {
            // Fallback to coordinates only if no Place ID is available
            directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
        }

        // Open Google Maps in a new tab
        if (typeof window !== 'undefined') {
            window.open(directionsUrl, '_blank');
        }

        // Also calculate and display the route on our map
        if (!userLocation && 'geolocation' in navigator) {
            try {
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });
                const currentLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
                setUserLocation(currentLocation);
                await calculateAndDrawRoute(currentLocation.lat, currentLocation.lng);
            } catch (error) {
                await calculateAndDrawRoute(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
            }
        } else if (userLocation) {
            await calculateAndDrawRoute(userLocation.lat, userLocation.lng);
        } else {
            await calculateAndDrawRoute(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
        }
    };

    const calculateAndDrawRoute = async (originLat: number, originLng: number) => {
        if (!selectedLocation || !mapInstanceRef.current) return;

        if (!selectedLocation.location_place_id) {
            console.error('Cannot calculate route: missing place ID');
            return;
        }

        setIsLoadingRoute(true);

        try {
            const route = await calculateRoute(originLat, originLng, selectedLocation.location_place_id);
            if (route) {
                setRouteInfo(route);
                drawRoute(route.polyline.encodedPolyline, mapInstanceRef.current);
            } else {
                setRouteInfo(null);
            }
        } catch (error) {
            console.error('Failed to calculate route:', error);
            setRouteInfo(null);
        } finally {
            setIsLoadingRoute(false);
        }
    };

    const drawRoute = (encodedPolyline: string, map: google.maps.Map) => {
        if (routePolylineRef.current) {
            routePolylineRef.current.setMap(null);
        }

        const path = window.google.maps.geometry.encoding.decodePath(encodedPolyline);
        const polyline = new window.google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#FFD700',
            strokeOpacity: 0.8,
            strokeWeight: 5,
            map,
        });

        routePolylineRef.current = polyline;

        const bounds = new window.google.maps.LatLngBounds();
        path.forEach(point => bounds.extend(point));
        map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
    };

    const clearRoute = () => {
        if (routePolylineRef.current) {
            routePolylineRef.current.setMap(null);
            routePolylineRef.current = null;
        }
        setRouteInfo(null);
        setIsLoadingRoute(false);
    };

    return (
        <div className="relative h-full">
            <FilterDropdown
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                availableTypes={availableTypes}
            />
            <div 
                ref={mapContainerRef} 
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
};

// Parent Component: Provides APIProvider and handles loading/error states
export const MapComponent: React.FC<MapProps> = (props) => {
    const mapsApiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;

    if (!mapsApiKey) {
        return (
            <div className="flex flex-col h-full bg-black/50 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl text-white">
                <header className="flex-shrink-0 text-center py-3 border-b border-white/10">
                    <h2 className="font-serif-elegant text-xl tracking-wide">The Enchanted Atlas</h2>
                </header>
                <div className="flex-grow relative bg-black flex items-center justify-center p-6">
                    <div className="flex flex-col items-center text-center text-gray-200">
                        <IsabellaSovereignSunCrest className="w-24 h-24 text-white/80" />
                        <p className="mt-4 font-serif-elegant text-lg">The Enchanted Atlas is currently charting its course.</p>
                        <p className="mt-2 text-sm text-red-400">Missing API Key: VITE_GOOGLE_MAPS_API_KEY not found in environment</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-black/50 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl text-white">
            <header className="flex-shrink-0 text-center py-3 border-b border-white/10">
                <h2 className="font-serif-elegant text-xl tracking-wide">The Enchanted Atlas</h2>
            </header>
            <div className="flex-grow relative bg-black">
                <APIProvider apiKey={mapsApiKey} libraries={['marker', 'geometry']}>
                    <ApiLoadingGuard {...props} />
                </APIProvider>
            </div>
        </div>
    );
};
