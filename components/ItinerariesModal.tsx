
import React from 'react';

interface ItinerariesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ItineraryCard: React.FC<{ imgSrc: string; title: string; description: string }> = ({ imgSrc, title, description }) => (
    <div className="bg-white/5 rounded-lg overflow-hidden backdrop-blur-md border border-white/10">
        <img src={imgSrc} alt={title} className="w-full h-48 object-cover" />
        <div className="p-4">
            <h3 className="font-serif-elegant text-2xl font-semibold text-white">{title}</h3>
            <p className="text-gray-300 mt-2 text-sm">{description}</p>
        </div>
    </div>
);


export const ItinerariesModal: React.FC<ItinerariesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] p-8 bg-black/50 border border-white/20 rounded-xl shadow-2xl text-white overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="font-serif-elegant text-4xl mb-6 text-center">Augmented Itineraries</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ItineraryCard 
                imgSrc="https://picsum.photos/seed/dinosaur/800/600"
                title="The Dinosaur Island Adventure"
                description="Witness the colossal shadows of the past. Our AI visuals bring dinosaurs back to life at Compton Bay, creating a breathtaking journey through time."
            />
            <ItineraryCard 
                imgSrc="https://picsum.photos/seed/mythical/800/600"
                title="The Mythical Isle Quest"
                description="Discover the legends woven into our landscape. See epic griffins soar over The Needles in this mythical quest for the ages."
            />
            <ItineraryCard 
                imgSrc="https://picsum.photos/seed/poet/800/600"
                title="A Poet's Sanctuary"
                description="Find inspiration in tranquility. Experience the contemplative beauty that moved Tennyson, reimagined through an artistic lens."
            />
        </div>
      </div>
    </div>
  );
};
