import React, { useState, useEffect } from 'react';
import { Chat } from './components/Chat';
import { FutureMemberPage } from './components/FutureMemberPage';
import { MapComponent } from './components/Map';

const backgroundImages = [
  'https://i.imgur.com/66V4nde.png',
  'https://i.imgur.com/31B89wc.png',
  'https://i.imgur.com/B7xdeX9.png',
  'https://i.imgur.com/4sIFdCz.png',
];

type View = 'chat' | 'member' | 'map';

const App: React.FC = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [view, setView] = useState<View>('chat');
  const [mapPrompt, setMapPrompt] = useState<string | null>(null);
  const [mapItinerary, setMapItinerary] = useState<any>(null);

  // Debug logging
  console.log('App rendered with view:', view);
  console.log('mapItinerary:', mapItinerary);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
    }, 7000); // Change image every 7 seconds

    return () => clearInterval(interval);
  }, []);

  const handleMapSelect = (prompt: string) => {
    setMapPrompt(prompt);
    setView('chat');
  };

  const handleOpenMap = (itinerary?: any) => {
    console.log('handleOpenMap called with itinerary:', itinerary);
    setMapItinerary(itinerary);
    setView('map');
    console.log('View set to map');
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        {backgroundImages.map((src, index) => (
            <img
                key={index}
                src={src}
                alt="Scenic view of the Isle of Wight"
                className={`
                  absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out
                  ${currentImageIndex === index ? 'opacity-60' : 'opacity-0'}
                `}
                aria-hidden={currentImageIndex !== index}
            />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20"></div>
      </div>

      {/* Header Buttons */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        {view !== 'chat' && (
          <button
            onClick={() => setView('chat')}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-white font-medium hover:bg-white/20 transition-colors duration-200 backdrop-blur-sm text-sm"
            aria-label="Return to Chat"
          >
              Return to Chat
          </button>
        )}
         {view === 'chat' && (
          <>
            <button
                onClick={() => setView('map')}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-white font-medium hover:bg-white/20 transition-colors duration-200 backdrop-blur-sm text-sm"
                aria-label="Explore the map"
            >
                Explore the Map
            </button>
            <button
                onClick={() => setView('member')}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-white font-medium hover:bg-white/20 transition-colors duration-200 backdrop-blur-sm text-sm"
                aria-label="View Sovereign Membership details"
            >
                Sovereign Membership
            </button>
          </>
      )}
      </div>


      {/* Main Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center p-4">
        <div
          className="flex h-full w-full max-w-6xl flex-col transition-filter duration-300"
        >
          {view === 'chat' && (
            <>
              <header className="py-8 text-center text-white flex-shrink-0">
                <h1 className="font-serif-elegant text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight tracking-wide">
                  I am the Sovereign of this Island.
                </h1>
                <p className="font-serif-elegant text-2xl md:text-3xl lg:text-4xl mt-2">
                  How can I help you begin your story?
                </p>
              </header>
              <div className="flex-grow overflow-hidden">
                <Chat mapPrompt={mapPrompt} onPromptSent={() => setMapPrompt(null)} onOpenMap={handleOpenMap} />
              </div>
            </>
          )}
          {view === 'member' && <FutureMemberPage onBack={() => setView('chat')} /> }
          {view === 'map' && (
            <div className="h-full w-full">
              <MapComponent onMapSelect={handleMapSelect} itinerary={mapItinerary} />
            </div>
          )}

        </div>
      </div>
    </main>
  );
};

export default App;