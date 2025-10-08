import React, { useState, useEffect } from 'react';
import { Chat } from './components/Chat';
import { FutureMemberPage } from './components/FutureMemberPage';
import { MapComponent } from './components/Map';
import { VisionaryFolio } from './components/VisionaryFolio';
import { AdminPanel } from './components/AdminPanel';
import { ThemeProvider } from './ThemeContext';

const backgroundImages = [
  'https://res.cloudinary.com/dptqxjhb8/image/upload/v1759323096/Isabella_Castle_shadow.057Z_ovvtdo.png',
  'https://res.cloudinary.com/dptqxjhb8/image/upload/v1759322677/Misty_Coast_Walk_with_Dickens_Ghosts_lp2ixk.png',
  'https://res.cloudinary.com/dptqxjhb8/image/upload/v1759322586/St_Catherines_Oratory_u2ce67.png',
  'https://res.cloudinary.com/dptqxjhb8/image/upload/v1759322574/Firestone_Autumn_Sun_edcspp.png',
];

type View = 'chat' | 'member' | 'map' | 'folio' | 'admin';

const validViews: ReadonlyArray<View> = ['chat', 'member', 'map', 'folio', 'admin'];

const isAdminEnabled = (import.meta as any).env?.VITE_ENABLE_ADMIN === 'true';

const getInitialView = (): View => {
  if (typeof window === 'undefined') {
    return 'chat';
  }

  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get('view');

  if (viewParam && validViews.includes(viewParam as View)) {
    if (viewParam === 'admin' && !isAdminEnabled) {
      return 'chat';
    }
    return viewParam as View;
  }

  return 'chat';
};

const App: React.FC = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [view, setView] = useState<View>(getInitialView());
  const [mapPrompt, setMapPrompt] = useState<string | null>(null);
  const [mapItinerary, setMapItinerary] = useState<any>(null);
  const [isLegendVisible, setIsLegendVisible] = useState(false);

  // Debug logging
  console.log('App rendered with view:', view);
  console.log('mapItinerary:', mapItinerary);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
    }, 7000); // Change image every 7 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);

    if (view === 'chat') {
      params.delete('view');
    } else {
      if (view === 'admin' && !isAdminEnabled) {
        params.delete('view');
      } else {
        params.set('view', view);
      }
    }

    const search = params.toString();
    const newUrl = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', newUrl);
  }, [view]);

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

  const handleEnterFolio = () => {
    setView('folio');
  };

  const renderAdminButton = view === 'admin'
    ? (
        <button
          onClick={() => setView('chat')}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-white font-medium hover:bg-white/20 transition-colors duration-200 backdrop-blur-sm text-sm"
          aria-label="Return to Chat"
        >
          Return to Chat
        </button>
      )
    : (
        <button
          onClick={() => setView('admin')}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-white font-medium hover:bg-white/20 transition-colors duration-200 backdrop-blur-sm text-sm"
          aria-label="Open Isabella Admin"
        >
          Isabella Admin
        </button>
      );

  return (
    <ThemeProvider>
      <main className="relative w-screen min-h-screen overflow-y-auto bg-black">
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
        {view !== 'chat' && view !== 'admin' && (
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
        {isAdminEnabled && renderAdminButton}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-start flex-col p-4">
        <div className="flex min-h-screen w-full max-w-6xl flex-col transition-filter duration-300">
          {view === 'chat' && (
            <>
              <header className="py-8 text-center text-white flex-shrink-0">
                <div className="relative mx-auto flex max-w-3xl items-center justify-center gap-3 text-center">
                  <h1 className="font-serif-elegant text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight tracking-wide">
                    I am Isabella. The last true Sovereign of this Isle.
                  </h1>
                  <button
                    type="button"
                    onMouseEnter={() => setIsLegendVisible(true)}
                    onMouseLeave={() => setIsLegendVisible(false)}
                    onFocus={() => setIsLegendVisible(true)}
                    onBlur={() => setIsLegendVisible(false)}
                    onClick={() => setIsLegendVisible((prev) => !prev)}
                    className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/10 text-sm font-semibold text-white/80 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    aria-label="Who is Isabella?"
                    aria-expanded={isLegendVisible}
                  >
                    i
                  </button>
                  {isLegendVisible && (
                    <div
                      className="absolute top-full left-1/2 z-20 mt-4 w-full max-w-md -translate-x-1/2 rounded-2xl border border-white/15 bg-black/85 p-4 text-left text-sm leading-relaxed text-gray-200 shadow-2xl backdrop-blur"
                      onMouseEnter={() => setIsLegendVisible(true)}
                      onMouseLeave={() => setIsLegendVisible(false)}
                    >
                      <p className="font-serif-elegant text-lg text-white">The Legend of Isabella</p>
                      <p className="mt-2">
                        Isabella de Fortibus was the last feudal Queen of the Isle of Wight in the 13th century - a ruler renowned for her wisdom and vision. Today her sovereign spirit animates this guide, an AI trained on centuries of stories, secrets, and local lore to help you begin your own unforgettable chapter.
                      </p>
                    </div>
                  )}
                </div>
                <p className="font-serif-elegant text-2xl md:text-3xl lg:text-4xl mt-4">
                  How can I help you begin your story?
                </p>
                <button
                  type="button"
                  onClick={() => setIsLegendVisible((prev) => !prev)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.35em] text-white/80 transition hover:bg-white/20 md:hidden"
                  aria-expanded={isLegendVisible}
                >
                  Who is Isabella?
                </button>
                {isLegendVisible && (
                  <div
                    className="mt-3 w-full rounded-2xl border border-white/15 bg-black/80 p-4 text-left text-sm leading-relaxed text-gray-200 shadow-xl backdrop-blur md:hidden"
                    onMouseEnter={() => setIsLegendVisible(true)}
                    onMouseLeave={() => setIsLegendVisible(false)}
                  >
                    <p className="font-serif-elegant text-lg text-white">The Legend of Isabella</p>
                    <p className="mt-2">
                      Isabella de Fortibus was the last feudal Queen of the Isle of Wight in the 13th century - a ruler renowned for her wisdom and vision. Today her sovereign spirit animates this guide, an AI trained on centuries of stories, secrets, and local lore to help you begin your own unforgettable chapter.
                    </p>
                  </div>
                )}
              </header>
              <div className="flex-grow overflow-hidden">
                <Chat mapPrompt={mapPrompt} onPromptSent={() => setMapPrompt(null)} onOpenMap={handleOpenMap} />
              </div>
            </>
          )}
          {view === 'member' && (
            <div className="w-full">
              <FutureMemberPage onBack={() => setView('chat')} onEnterFolio={handleEnterFolio} />
            </div>
          )}
          {view === 'map' && (
            <div className="w-full h-[calc(100vh-2rem)] min-h-[600px]">
              <MapComponent onMapSelect={handleMapSelect} itinerary={mapItinerary} />
            </div>
          )}
          {view === 'folio' && <VisionaryFolio onBack={() => setView('member')} />}
          {view === 'admin' && isAdminEnabled && (
            <div className="flex-grow py-12">
              <AdminPanel />
            </div>
          )}
        </div>
      </div>
      </main>
    </ThemeProvider>
  );
};

export default App;
