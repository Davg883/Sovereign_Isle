import React from 'react';

interface FutureMemberPageProps {
  onBack: () => void;
  onEnterFolio: () => void;
}

const pillarCards = [
  {
    title: 'My Sovereign Itineraries',
    description: "Allow me to personally craft your journey, revealing the pathways to my island's most guarded secrets.",
  },
  {
    title: 'A Sovereign Summons',
    description: 'You shall be granted priority passage to the most exclusive wellness retreats and intimate cultural gatherings upon my island.',
  },
  {
    title: "The Sovereign's Counsel",
    description: 'A dedicated correspondence with me, your Sovereign Guide, for seamless service and personal recommendations.',
  },
];

export const FutureMemberPage: React.FC<FutureMemberPageProps> = ({ onBack, onEnterFolio }) => {
  return (
    <div className="flex h-full flex-col bg-gradient-to-br from-black/85 via-black/70 to-black/85 text-white animate-fade-in">
      <div className="relative flex-1 overflow-y-auto">
        <div className="absolute inset-0 bg-[url('https://i.imgur.com/B7xdeX9.png')] bg-cover bg-center opacity-20"></div>
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-10 md:px-10 lg:py-16">
          {/* Section 1: Welcome */}
          <section className="flex flex-col gap-10 rounded-[32px] border border-white/10 bg-black/45 p-8 shadow-[0_35px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:flex-row md:items-center md:gap-12 md:p-12">
            <div className="mx-auto w-full max-w-xl md:w-1/2">
              <img
                src="https://i.imgur.com/zsmMfIu.png"
                alt="Portrait of Isabella de Fortibus in her study"
                className="w-full rounded-[28px] object-cover shadow-[0_25px_70px_rgba(0,0,0,0.55)]"
              />
            </div>
            <div className="flex w-full flex-col items-center text-center md:w-1/2 md:items-start md:text-left">
              <h1 className="font-serif-elegant text-3xl md:text-4xl lg:text-5xl">The Sovereign Key</h1>
              <p className="mt-6 text-base leading-relaxed text-gray-200 md:text-lg lg:text-xl">
                With this Key, you unlock the deeper story of my island. Become a Founding Member of my Sovereign Circle, and be the first to access curated journeys, private events, and unique privileges reserved for the few.
              </p>
            </div>
          </section>

          {/* Section 2: Pillars of Value */}
          <section className="grid gap-6 rounded-[32px] border border-white/10 bg-black/40 p-8 backdrop-blur-2xl shadow-[0_25px_90px_rgba(0,0,0,0.4)] sm:grid-cols-2 lg:grid-cols-3">
            {pillarCards.map((card) => (
              <article
                key={card.title}
                className="group flex flex-col rounded-[24px] border border-white/10 bg-white/[0.05] p-6 transition duration-300 hover:border-white/30 hover:bg-white/[0.08] hover:shadow-[0_0_25px_rgba(255,255,255,0.25)]"
              >
                <h3 className="font-serif-elegant text-xl">{card.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-300">{card.description}</p>
              </article>
            ))}
          </section>

          {/* Section 3: Content Destinations */}
          <section className="grid gap-6 rounded-[32px] border border-white/10 bg-black/45 p-8 backdrop-blur-2xl shadow-[0_35px_110px_rgba(0,0,0,0.45)] lg:grid-cols-2">
            <article className="group relative flex h-full flex-col gap-6 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] p-8 transition duration-300 hover:border-white/30 hover:bg-white/[0.1] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              <div className="space-y-3">
                <h3 className="font-serif-elegant text-2xl">Sovereign Dispatches</h3>
                <p className="text-sm uppercase tracking-[0.35em] text-white/60">Stories from the Inner Circle</p>
                <p className="text-sm leading-relaxed text-gray-200 md:text-base">
                  Journey deeper through my newly unveiled chronicles�curated essays, field notes, and whispered futures from the Isle of Wight. Every dispatch is an invitation to stand at the edge of what comes next.
                </p>
              </div>
              <div className="mt-auto">
                <button
                  type="button"
                  onClick={() => window.open('/dispatches/index.html', '_blank', 'noopener')}
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-2 text-sm font-semibold tracking-wide text-white transition hover:bg-white/20"
                >
                  Enter the Dispatches
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </div>
            </article>

            <article className="group relative flex h-full flex-col gap-6 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] p-8 transition duration-300 hover:border-white/30 hover:bg-white/[0.1] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              <div className="space-y-3">
                <h3 className="font-serif-elegant text-2xl">The Visionary's Folio</h3>
                <p className="text-sm uppercase tracking-[0.35em] text-white/60">The Art of Enchanted Realism</p>
                <p className="text-sm leading-relaxed text-gray-200 md:text-base">
                  Unveil the complete collection of our "Enchanted Realism" art. Every cinematic background, every soulful render, presented in a private, high-resolution gallery for your personal inspiration.
                </p>
              </div>
              <div className="mt-auto">
                <button
                  type="button"
                  onClick={onEnterFolio}
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-2 text-sm font-semibold tracking-wide text-white transition hover:bg-white/20"
                >
                  Enter the Folio
                  <span aria-hidden className="text-base">&rarr;</span>
                </button>
              </div>
            </article>
          </section>
        </div>
      </div>
      <div className="flex-shrink-0 border-t border-white/10 bg-black/70 py-5 text-center">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Return to Isabella
        </button>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
