import React, { useMemo, useState } from 'react';

type FolioPiece = {
  title: string;
  imageUrl: string;
  downloadUrl?: string;
  aspect?: 'portrait' | 'landscape';
};

interface VisionaryFolioProps {
  onBack: () => void;
}

const folioPieces: FolioPiece[] = [
  {
    title: "The Sovereign's Vigil",
    imageUrl: 'https://res.cloudinary.com/dptqxjhb8/image/upload/v1759323096/Isabella_Castle_shadow.057Z_ovvtdo.png',
    downloadUrl: 'https://res.cloudinary.com/dptqxjhb8/image/upload/v1759323096/Isabella_Castle_shadow.057Z_ovvtdo.png',
    aspect: 'landscape',
  },
  {
    title: 'The Ethereal Visionary',
    imageUrl: 'https://res.cloudinary.com/dptqxjhb8/image/upload/v1759322760/Tennison_dark_vs2.193Z_ulaofv.png',
    downloadUrl: 'https://res.cloudinary.com/dptqxjhb8/image/upload/v1759322760/Tennison_dark_vs2.193Z_ulaofv.png',
    aspect: 'portrait',
  },
  {
    title: "Isabella's Sentinel",
    imageUrl: 'https://res.cloudinary.com/dptqxjhb8/image/upload/v1759322756/festival_1970_tcfx6p.png',
    downloadUrl: 'https://res.cloudinary.com/dptqxjhb8/image/upload/v1759322756/festival_1970_tcfx6p.png',
    aspect: 'landscape',
  },
  {
    title: 'Mercy of the Tides',
    imageUrl: 'https://res.cloudinary.com/dptqxjhb8/image/upload/v1759322677/Misty_Coast_Walk_with_Dickens_Ghosts_lp2ixk.png',
    downloadUrl: 'https://res.cloudinary.com/dptqxjhb8/image/upload/v1759322677/Misty_Coast_Walk_with_Dickens_Ghosts_lp2ixk.png',
    aspect: 'landscape',
  },
  {
    title: 'The Horizon Testament',
    imageUrl: 'https://res.cloudinary.com/dptqxjhb8/image/upload/v1759322590/Tenneyson_Monument_qc68on.png',
    downloadUrl: 'https://res.cloudinary.com/dptqxjhb8/image/upload/v1759322590/Tenneyson_Monument_qc68on.png',
    aspect: 'portrait',
  },
];

export const VisionaryFolio: React.FC<VisionaryFolioProps> = ({ onBack }) => {
  const [selectedPiece, setSelectedPiece] = useState<FolioPiece | null>(null);

  const pieces = useMemo(() => folioPieces, []);

  return (
    <div className="flex h-full flex-col bg-black text-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 backdrop-blur-md bg-black/60">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-widest text-gray-200 hover:bg-white/15 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to the Sanctuary
          </button>
          <div>
            <p className="uppercase text-[11px] tracking-[0.4em] text-white/60">The Visionary's Folio</p>
            <h1 className="font-serif-elegant text-2xl md:text-3xl">A Private Atlas of Enchanted Realism</h1>
          </div>
        </div>
        <p className="hidden md:block text-sm text-white/60 max-w-sm text-right">
          These works are an offering to our Sovereign Circle�guard them well, and let their light guide your own creations.
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="columns-1 sm:columns-2 xl:columns-3 gap-6 space-y-6">
          {pieces.map((piece, index) => (
            <figure
              key={piece.title + index}
              className="relative break-inside-avoid cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:border-white/20 group"
              onClick={() => setSelectedPiece(piece)}
            >
              <img
                src={piece.imageUrl}
                alt={piece.title}
                className="w-full object-cover transition duration-700 ease-out group-hover:scale-[1.03]"
              />
              <figcaption className="absolute inset-0 flex items-end bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-5">
                <span className="font-serif-elegant text-lg">{piece.title}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </main>

            {selectedPiece && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm px-4 py-8">
          <button
            onClick={() => {
              setSelectedPiece(null);
              onBack();
            }}
            className="absolute top-6 left-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.35em] text-white/80 hover:bg-white/20 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to the Sanctuary
          </button>
          <button
            onClick={() => setSelectedPiece(null)}
            aria-label="Close Folio detail"
            className="absolute top-6 right-6 text-white hover:text-blue-200 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="max-h-full w-full max-w-5xl">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl">
              <img
                src={selectedPiece.imageUrl}
                alt={selectedPiece.title}
                className="w-full max-h-[70vh] object-contain"
              />
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-black/60">
                <div>
                  <p className="font-serif-elegant text-xl">{selectedPiece.title}</p>
                  <p className="text-xs tracking-[0.35em] uppercase text-white/50">Enchanted Realism Series</p>
                </div>
                <a
                  href={selectedPiece.downloadUrl ?? selectedPiece.imageUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                  </svg>
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

