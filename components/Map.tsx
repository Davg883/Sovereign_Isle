import React, { useEffect, useRef, useState } from 'react';
import { POIs, PointOfInterest } from './MapPois';
import { poiCategoryIcons } from './MapIcons';

declare global {
    interface Window {
        google: any;
        gm_authFailure?: () => void;
    }
    namespace JSX {
        interface IntrinsicElements {
            'gmp-place-overview': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { place: string };
        }
    }
}

interface MapProps {
    onMapSelect: (prompt: string) => void;
    itinerary?: Array<{ name: string; lat: number; lng: number; placeId: string }>;
}

const DEFAULT_CENTER = { lat: 50.68, lng: -1.3 };
const DEFAULT_SOVEREIGN_NOTE = "A new chapter in your Sovereign Journey, personally mapped by Isabella.";

const sovereignMapStyles = [
    {
        featureType: 'all',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#e0e0e0' }],
    },
    {
        featureType: 'all',
        elementType: 'labels.text.stroke',
        stylers: [{ color: '#000000' }, { lightness: 13 }],
    },
    {
        featureType: 'administrative',
        elementType: 'geometry.fill',
        stylers: [{ color: '#000000' }],
    },
    {
        featureType: 'administrative',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#1a1a1a' }, { weight: 1.2 }],
    },
    {
        featureType: 'landscape',
        elementType: 'geometry',
        stylers: [{ color: '#1a1a1a' }],
    },
    {
        featureType: 'poi',
        elementType: 'geometry',
        stylers: [{ color: '#1f1f1f' }],
    },
    {
        featureType: 'poi.park',
        elementType: 'geometry',
        stylers: [{ color: '#1c2e24' }],
    },
    {
        featureType: 'road.highway',
        elementType: 'geometry.fill',
        stylers: [{ color: '#2c3e50' }],
    },
    {
        featureType: 'road.highway',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#3498db' }, { weight: 1 }],
    },
    {
        featureType: 'road.arterial',
        elementType: 'geometry',
        stylers: [{ color: '#2c3e50' }],
    },
    {
        featureType: 'road.arterial',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#3498db' }, { weight: 0.5 }],
    },
    {
        featureType: 'road.local',
        elementType: 'geometry',
        stylers: [{ color: '#2c3e50' }],
    },
    {
        featureType: 'road.local',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#3498db' }, { weight: 0.3 }],
    },
    {
        featureType: 'transit',
        elementType: 'geometry',
        stylers: [{ color: '#1a1a1a' }],
    },
    {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#0f1e33' }],
    },
];

const sovereignNotes: Record<string, string> = {
    needles: 'A sentinel standing guard over the western edge, where chalk meets the endless sky in a dance of light and shadow.',
    osborne: "A sanctuary built from a wife's profound love and loss, a grief that shaped the very earth.",
    carisbrooke: 'Where kings were held and legends were born, these ancient stones whisper tales of power and captivity.',
    shanklin: 'A chasm carved by time itself, where water and wind have sculpted a cathedral of natural wonder.',
    ventnor: "A hidden Eden where the subtropical breath of distant lands finds sanctuary in our island's embrace.",
};

const poiCategories: Record<string, string> = {
    needles: 'outdoor',
    osborne: 'historical',
    carisbrooke: 'castle',
    shanklin: 'outdoor',
    ventnor: 'garden',
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

const PlaceDetailModal: React.FC<{
    poi: PointOfInterest | null;
    onClose: () => void;
    onAskIsabella: (prompt: string) => void;
    placeDetails: any;
}> = ({ poi, onClose, onAskIsabella, placeDetails }) => {
    if (!poi) return null;

    const note = sovereignNotes[poi.id] ?? DEFAULT_SOVEREIGN_NOTE;

    return (
        <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-md h-full max-h-[70vh] bg-black/80 border border-white/10 rounded-xl shadow-2xl text-white flex flex-col animate-slide-in"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                    <h3 className="font-serif-elegant text-lg">{poi.name}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10" aria-label="Close detail view">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>

                <div className="flex-grow overflow-y-auto">
                    {placeDetails && (
                        <div className="p-3 space-y-3">
                            {placeDetails.photos && placeDetails.photos.length > 0 && (
                                <img
                                    src={placeDetails.photos[0].getUrl({ maxWidth: 400, maxHeight: 200 })}
                                    alt={poi.name}
                                    className="w-full h-40 object-cover rounded-lg"
                                />
                            )}
                            {placeDetails.rating && (
                                <div className="flex items-center text-sm text-gray-200">
                                    <span className="text-yellow-400 mr-2" aria-hidden="true">?</span>
                                    <span>
                                        {placeDetails.rating} ({placeDetails.user_ratings_total} reviews)
                                    </span>
                                </div>
                            )}
                            {placeDetails.formatted_address && (
                                <p className="text-gray-300 text-sm">{placeDetails.formatted_address}</p>
                            )}
                        </div>
                    )}

                    <div className="p-3 bg-white/5 border border-white/10 rounded-lg mx-3 mb-3">
                        <h4 className="font-serif-elegant text-md mb-1">Isabella's Sovereign Note</h4>
                        <p className="text-sm italic text-gray-300">"{note}"</p>
                    </div>

                    <gmp-place-overview
                        place={`places/${poi.placeId}`}
                        style={{
                            '--gm-places-surface-color': 'transparent',
                            '--gm-places-text-color-primary': '#FFFFFF',
                            '--gm-places-text-color-secondary': '#A0AEC0',
                        } as React.CSSProperties}
                    />
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

type MapLifecycleState = 'loading' | 'loaded' | 'error' | 'missing-key' | 'under-construction';

export const MapComponent: React.FC<MapProps> = ({ onMapSelect, itinerary }) => {
    const mapsApiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY;
    const [mapState, setMapState] = useState<MapLifecycleState>('under-construction');
    const [selectedPoi, setSelectedPoi] = useState<PointOfInterest | null>(null);
    const [placeDetails, setPlaceDetails] = useState<any>(null);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const placesServiceRef = useRef<any>(null);
    const directionsServiceRef = useRef<any>(null);
    const directionsRendererRef = useRef<any>(null);
    const itineraryMarkersRef = useRef<any[]>([]);
    const poiMarkersRef = useRef<any[]>([]);
    const autocompleteRef = useRef<any>(null);
    const controlsAddedRef = useRef(false);
    const mapInitializedRef = useRef(false);

    const clearMarkers = (ref: React.MutableRefObject<any[]>) => {
        ref.current.forEach((marker) => marker.setMap(null));
        ref.current = [];
    };

    const fetchPlaceDetails = (placeId: string) => {
        const service = placesServiceRef.current;
        if (!service || !window.google?.maps?.places) {
            return;
        }
        service.getDetails(
            {
                placeId,
                fields: ['name', 'rating', 'user_ratings_total', 'photos', 'formatted_address'],
            },
            (place: any, status: string) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                    setPlaceDetails(place);
                } else {
                    setPlaceDetails(null);
                }
            }
        );
    };

    const calculateAndDisplayRoute = () => {
        if (!window.google?.maps) return;
        if (!directionsServiceRef.current || !directionsRendererRef.current) return;
        if (POIs.length < 2) return;

        const waypoints = POIs.slice(1, -1).map((poi) => ({
            location: new window.google.maps.LatLng(poi.lat, poi.lng),
            stopover: true,
        }));

        directionsServiceRef.current.route(
            {
                origin: new window.google.maps.LatLng(POIs[0].lat, POIs[0].lng),
                destination: new window.google.maps.LatLng(POIs[POIs.length - 1].lat, POIs[POIs.length - 1].lng),
                waypoints,
                travelMode: window.google.maps.TravelMode.DRIVING,
                optimizeWaypoints: true,
            },
            (response: any, status: string) => {
                if (status === 'OK' && response) {
                    directionsRendererRef.current.setDirections(response);
                } else {
                    console.error('Directions request failed due to ' + status);
                }
            }
        );
    };

    const createResetControl = (map: any) => {
        const controlButton = document.createElement('button');
        controlButton.className =
            'bg-black/80 border border-white/10 rounded-full p-2 text-white hover:bg-white/20 transition-colors duration-200 shadow-lg';
        controlButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
        `;
        controlButton.title = 'Reset map view';
        controlButton.type = 'button';
        controlButton.addEventListener('click', () => {
            map.setCenter(DEFAULT_CENTER);
            map.setZoom(11);
            if (directionsRendererRef.current) {
                directionsRendererRef.current.setDirections({ routes: [] });
            }
        });
        return controlButton;
    };

    const createRouteControl = () => {
        const controlButton = document.createElement('button');
        controlButton.className =
            'bg-black/80 border border-white/10 rounded-full px-4 py-2 text-white hover:bg-white/20 transition-colors duration-200 shadow-lg mb-4 flex items-center';
        controlButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Begin Your Sovereign Journey
        `;
        controlButton.title = "Create a route through Isabella's recommended places";
        controlButton.type = 'button';
        controlButton.addEventListener('click', () => {
            calculateAndDisplayRoute();
        });
        return controlButton;
    };

    const renderDefaultPois = () => {
        if (!window.google?.maps) return;
        const map = mapInstanceRef.current;
        if (!map) return;

        clearMarkers(itineraryMarkersRef);
        clearMarkers(poiMarkersRef);
        if (directionsRendererRef.current) {
            directionsRendererRef.current.setDirections({ routes: [] });
        }

        POIs.forEach((poi) => {
            const category = poiCategories[poi.id] || 'historical';
            const iconUrl = poiCategoryIcons[category] || poiCategoryIcons['historical'];
            const marker = new window.google.maps.Marker({
                position: { lat: poi.lat, lng: poi.lng },
                map,
                title: poi.name,
                icon: {
                    url: iconUrl,
                    scaledSize: new window.google.maps.Size(32, 32),
                    anchor: new window.google.maps.Point(16, 16),
                },
            });

            marker.addListener('click', () => {
                setSelectedPoi(poi);
                fetchPlaceDetails(poi.placeId);
            });

            poiMarkersRef.current.push(marker);
        });
    };

    const renderItinerary = () => {
        if (!window.google?.maps) return;
        const map = mapInstanceRef.current;
        if (!map || !itinerary || itinerary.length === 0) return;

        clearMarkers(poiMarkersRef);
        clearMarkers(itineraryMarkersRef);

        itinerary.forEach((location, index) => {
            const marker = new window.google.maps.Marker({
                position: { lat: location.lat, lng: location.lng },
                map,
                title: location.name,
                icon: {
                    url: poiCategoryIcons['historical'],
                    scaledSize: new window.google.maps.Size(32, 32),
                    anchor: new window.google.maps.Point(16, 16),
                },
                label: {
                    text: (index + 1).toString(),
                    color: 'white',
                    fontWeight: 'bold',
                },
            });

            marker.addListener('click', () => {
                const tempPoi: PointOfInterest = {
                    id: `itinerary-${index}`,
                    name: location.name,
                    lat: location.lat,
                    lng: location.lng,
                    prompt: `Tell me more about ${location.name}`,
                    placeId: location.placeId,
                };
                setSelectedPoi(tempPoi);
                fetchPlaceDetails(location.placeId);
            });

            itineraryMarkersRef.current.push(marker);
        });

        if (itinerary.length === 1) {
            map.setCenter(new window.google.maps.LatLng(itinerary[0].lat, itinerary[0].lng));
            map.setZoom(13);
            if (directionsRendererRef.current) {
                directionsRendererRef.current.setDirections({ routes: [] });
            }
            return;
        }

        const bounds = new window.google.maps.LatLngBounds();
        itinerary.forEach((location) => {
            bounds.extend(new window.google.maps.LatLng(location.lat, location.lng));
        });
        map.fitBounds(bounds);

        if (directionsServiceRef.current && directionsRendererRef.current) {
            const waypoints = itinerary.slice(1, -1).map((location) => ({
                location: new window.google.maps.LatLng(location.lat, location.lng),
                stopover: true,
            }));

            directionsServiceRef.current.route(
                {
                    origin: new window.google.maps.LatLng(itinerary[0].lat, itinerary[0].lng),
                    destination: new window.google.maps.LatLng(itinerary[itinerary.length - 1].lat, itinerary[itinerary.length - 1].lng),
                    waypoints,
                    travelMode: window.google.maps.TravelMode.DRIVING,
                    optimizeWaypoints: true,
                },
                (response: any, status: string) => {
                    if (status === 'OK' && response) {
                        directionsRendererRef.current.setDirections(response);
                    } else {
                        console.error('Directions request failed due to ' + status);
                    }
                }
            );
        }
    };

    useEffect(() => {
        if (mapState === 'under-construction') {
            return;
        }

        if (!mapsApiKey) {
            setMapState('missing-key');
            return;
        }

        let isCancelled = false;

        const ensurePlacesUiLibrary = () =>
            new Promise<void>((resolve, reject) => {
                const existing = document.getElementById('gmpPlacesUiLibrary') as HTMLScriptElement | null;
                if (existing) {
                    const markLoaded = () => resolve();
                    const markError = () => reject();
                    if (existing.dataset.loaded === 'true') {
                        resolve();
                        return;
                    }
                    existing.addEventListener('load', markLoaded, { once: true });
                    existing.addEventListener('error', markError, { once: true });
                    return;
                }

                const script = document.createElement('script');
                script.id = 'gmpPlacesUiLibrary';
                script.type = 'module';
                script.src = 'https://maps.googleapis.com/maps/api/js/gmp-places-ui-library.mjs';
                script.dataset.loaded = 'false';
                script.addEventListener(
                    'load',
                    () => {
                        script.dataset.loaded = 'true';
                        resolve();
                    },
                    { once: true }
                );
                script.addEventListener('error', () => reject(), { once: true });
                document.head.appendChild(script);
            });
const initializeMap = () => {
            if (isCancelled || mapInitializedRef.current) return;
            if (!mapContainerRef.current || !window.google?.maps) return;

            const map = new window.google.maps.Map(mapContainerRef.current, {
                center: DEFAULT_CENTER,
                zoom: 11,
                styles: sovereignMapStyles,
                disableDefaultUI: true,
                zoomControl: true,
                backgroundColor: '#000',
                region: 'GB',
                language: 'en-GB',
            });

            mapInstanceRef.current = map;
            mapInitializedRef.current = true;

            placesServiceRef.current = new window.google.maps.places.PlacesService(map);
            directionsServiceRef.current = new window.google.maps.DirectionsService();
            directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
                map,
                suppressMarkers: true,
                polylineOptions: {
                    strokeColor: '#3498db',
                    strokeOpacity: 0.8,
                    strokeWeight: 5,
                },
            });

            if (searchInputRef.current && !autocompleteRef.current) {
                const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
                    bounds: new window.google.maps.LatLngBounds(
                        new window.google.maps.LatLng(50.55, -1.55),
                        new window.google.maps.LatLng(50.8, -1.05)
                    ),
                    strictBounds: true,
                    types: ['establishment', 'point_of_interest'],
                    componentRestrictions: { country: 'GB' },
                });

                autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    if (!place.geometry || !place.geometry.location) {
                        return;
                    }

                    map.setCenter(place.geometry.location);
                    map.setZoom(15);

                    new window.google.maps.Marker({
                        map,
                        position: place.geometry.location,
                        title: place.name,
                        icon: {
                            path: window.google.maps.SymbolPath.CIRCLE,
                            scale: 8,
                            fillColor: '#3498db',
                            fillOpacity: 1,
                            strokeWeight: 2,
                            strokeColor: '#FFFFFF',
                        },
                    });
                });

                autocompleteRef.current = autocomplete;
            }

            if (!controlsAddedRef.current) {
                const resetControlDiv = document.createElement('div');
                resetControlDiv.appendChild(createResetControl(map));
                map.controls[window.google.maps.ControlPosition.TOP_RIGHT].push(resetControlDiv);

                const routeControlDiv = document.createElement('div');
                routeControlDiv.appendChild(createRouteControl());
                map.controls[window.google.maps.ControlPosition.BOTTOM_LEFT].push(routeControlDiv);

                controlsAddedRef.current = true;
            }

            setMapState('loaded');
        };

        const handleScriptLoad = () => {
            ensurePlacesUiLibrary()
                .then(() => {
                    if (!isCancelled) {
                        initializeMap();
                    }
                })
                .catch(() => {
                    if (!isCancelled) {
                        setMapState('error');
                    }
                });
        };

        if (window.google?.maps && mapContainerRef.current) {
            initializeMap();
        } else {
            const existingScript = document.getElementById('googleMapsScript') as HTMLScriptElement | null;

            if (existingScript) {
                existingScript.addEventListener('load', handleScriptLoad);
            } else {
                const script = document.createElement('script');
                script.id = 'googleMapsScript';
                script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&libraries=places,routes&region=GB`;
                script.async = true;
                script.defer = true;
                script.addEventListener('load', handleScriptLoad);
                script.addEventListener('error', () => {
                    if (!isCancelled) {
                        setMapState('error');
                    }
                });
                document.head.appendChild(script);
            }
        }

        window.gm_authFailure = () => {
            if (!isCancelled) {
                setMapState('error');
            }
        };

        return () => {
            isCancelled = true;
            const script = document.getElementById('googleMapsScript');
            if (script) {
                script.removeEventListener('load', handleScriptLoad);
            }
            window.gm_authFailure = undefined;
        };
    }, [mapsApiKey, mapState]);

    useEffect(() => {
        if (mapState !== 'loaded' || !mapInstanceRef.current) {
            return;
        }

        setSelectedPoi(null);
        setPlaceDetails(null);

        if (itinerary && itinerary.length > 0) {
            renderItinerary();
        } else {
            mapInstanceRef.current.setCenter(DEFAULT_CENTER);
            mapInstanceRef.current.setZoom(11);
            renderDefaultPois();
        }
    }, [itinerary, mapState]);

    const renderMapContent = () => {
        if (mapState === 'under-construction') {
            return (
                <div
                    className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black"
                    role="status"
                >
                    <img
                        src="/Assets/Futuristic Island in Ancient Chamber.png"
                        alt="Holographic map of the Isle of Wight appearing above an ancient stone table"
                        className="absolute inset-0 h-full w-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/80" aria-hidden="true" />
                    <div className="relative z-10 max-w-2xl px-6 text-center text-gray-200 space-y-6">
                        <h3 className="font-serif-elegant text-3xl md:text-4xl lg:text-5xl text-white">We are charting a new world.</h3>
                        <p className="text-base md:text-lg leading-relaxed text-gray-200/90">
                            Our Enchanted Atlas is currently under construction. We are building a beautiful, intelligent, and deeply interactive interface to bring the island's stories to life in a way you have never seen before.
                        </p>
                        <p className="text-sm uppercase tracking-[0.35em] text-white/60">A new chapter is coming soon.</p>
                    </div>
                </div>
            );
        }
        if (mapState === 'missing-key') {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-200 p-6">
                    <IsabellaSovereignSunCrest className="w-24 h-24 text-white/80" />
                    <p className="mt-4 font-serif-elegant text-lg">
                        The Enchanted Atlas is currently charting its course. Please try again shortly.
                    </p>
                </div>
            );
        }

        switch (mapState) {
            case 'loading':
                return <div className="flex items-center justify-center h-full text-gray-400">Loading Map...</div>;
            case 'error':
                return (
                    <div className="flex flex-col items-center justify-center h-full text-red-400 p-6 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="font-serif-elegant text-xl text-white">The Enchanted Atlas is charting its course.</p>
                        <div className="text-sm mt-2 text-gray-300 max-w-md text-left space-y-2">
                            <p>We encountered a technical issue while authenticating the Atlas. Please verify the following and try again:</p>
                            <ul className="list-disc list-inside text-xs pl-2 space-y-1">
                                <li>Confirm the <code>NEXT_PUBLIC_MAPS_API_KEY</code> environment variable is configured.</li>
                                <li>Ensure the 'Maps JavaScript API' is enabled for this key in Google Cloud Console.</li>
                                <li>Verify billing is enabled for your Google Cloud project.</li>
                                <li>Check any HTTP referrer restrictions applied to the key.</li>
                            </ul>
                        </div>
                    </div>
                );
            case 'loaded':
                return (
                    <div ref={mapContainerRef} className="h-full w-full" aria-label="Interactive map of the Isle of Wight">
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search places on the Isle of Wight..."
                            className="absolute top-4 left-4 z-10 w-64 px-4 py-2 bg-black/80 border border-white/10 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full bg-black/50 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl text-white animate-fade-in">
            <header className="flex-shrink-0 text-center py-3 border-b border-white/10">
                <h2 className="font-serif-elegant text-xl tracking-wide">The Enchanted Atlas</h2>
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
