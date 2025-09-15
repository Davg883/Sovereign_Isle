import React, { useEffect, useRef, useState } from 'react';
import { POIs, PointOfInterest } from './MapPois';

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
}

// Custom dark theme for Google Maps to match the app's aesthetic.
const mapStyles = [
    {"featureType":"all","elementType":"labels.text.fill","stylers":[{"saturation":36},{"color":"#ffffff"},{"lightness":40}]},
    {"featureType":"all","elementType":"labels.text.stroke","stylers":[{"visibility":"on"},{"color":"#000000"},{"lightness":16}]},
    {"featureType":"all","elementType":"labels.icon","stylers":[{"visibility":"off"}]},
    {"featureType":"administrative","elementType":"geometry.fill","stylers":[{"color":"#000000"},{"lightness":20}]},
    {"featureType":"administrative","elementType":"geometry.stroke","stylers":[{"color":"#000000"},{"lightness":17},{"weight":1.2}]},
    {"featureType":"landscape","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":20}]},
    {"featureType":"poi","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":21}]},
    {"featureType":"road.highway","elementType":"geometry.fill","stylers":[{"color":"#000000"},{"lightness":17}]},
    {"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"color":"#000000"},{"lightness":29},{"weight":0.2}]},
    {"featureType":"road.arterial","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":18}]},
    {"featureType":"road.local","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":16}]},
    {"featureType":"transit","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":19}]},
    {"featureType":"water","elementType":"geometry","stylers":[{"color":"#1a1a1a"},{"lightness":17}]}
];


const PlaceDetailModal: React.FC<{
    poi: PointOfInterest | null;
    onClose: () => void;
    onAskIsabella: (prompt: string) => void;
}> = ({ poi, onClose, onAskIsabella }) => {
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


export const MapComponent: React.FC<MapProps> = ({ onMapSelect }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [mapState, setMapState] = useState<'loading' | 'loaded' | 'error'>('loading');
    const [selectedPoi, setSelectedPoi] = useState<PointOfInterest | null>(null);
    
    // The API key must be configured for both Gemini and the Maps JavaScript API.
    const API_KEY = process.env.API_KEY;

    useEffect(() => {
        if (!API_KEY) {
            console.error("API key is missing. Please set the API_KEY environment variable.");
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
        // v=beta and libraries=places are required for the Places UI Kit
        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&v=beta`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
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
    }, [API_KEY, mapState]);

    useEffect(() => {
        if (mapState === 'loaded' && mapRef.current && window.google && window.google.maps) {
            const isleOfWightCenter = { lat: 50.68, lng: -1.30 };
            const map = new window.google.maps.Map(mapRef.current, {
                center: isleOfWightCenter,
                zoom: 11,
                styles: mapStyles,
                disableDefaultUI: true,
                zoomControl: true,
                backgroundColor: '#000',
            });

            POIs.forEach(poi => {
                const marker = new window.google.maps.Marker({
                    position: { lat: poi.lat, lng: poi.lng },
                    map: map,
                    title: poi.name,
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 7,
                        fillColor: "white",
                        fillOpacity: 1,
                        strokeWeight: 4,
                        strokeColor: 'rgba(255, 255, 255, 0.3)'
                    }
                });

                marker.addListener('click', () => {
                    setSelectedPoi(poi);
                });
            });
        }
    }, [mapState]);

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
                return <div ref={mapRef} className="h-full w-full" aria-label="Interactive map of the Isle of Wight" />;
        }
    }

    return (
        <div className="flex flex-col h-full bg-black/50 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl text-white animate-fade-in">
            <header className="flex-shrink-0 text-center py-3 border-b border-white/10">
                <h2 className="font-serif-elegant text-xl tracking-wide">
                    Explore the Sovereign Isle
                </h2>
            </header>
            <div className="flex-grow relative bg-black">
                {renderMapContent()}
                <PlaceDetailModal 
                    poi={selectedPoi}
                    onClose={() => setSelectedPoi(null)}
                    onAskIsabella={(prompt) => {
                        onMapSelect(prompt);
                        setSelectedPoi(null);
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