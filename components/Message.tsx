import React from 'react';
import { Message, Sender, Place } from '../types';
import { Avatar } from './Avatar';

interface MessageProps {
  message: Message;
  onOpenItineraries: () => void;
  isSpeaking: boolean;
}

const PlacesDisplay: React.FC<{ places: Place[] }> = ({ places }) => {
    if (!places || places.length === 0) return null;

    return (
        <div className="mt-3 space-y-2 w-full max-w-md">
            {places.map((place, index) => (
                <a
                    key={index}
                    href={place.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/20 transition-colors duration-200"
                >
                    <div className="flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <span className="text-white text-sm font-medium truncate" title={place.title}>
                        {place.title}
                    </span>
                    <div className="ml-auto flex-shrink-0">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                         </svg>
                    </div>
                </a>
            ))}
        </div>
    );
};


const SpecialContentDisplay: React.FC<{ content: Message['specialContent'], onOpenItineraries: () => void }> = ({ content, onOpenItineraries }) => {
    if (!content) return null;

    switch (content.type) {
        case 'image':
            return <img src={content.src} alt={content.alt} className="mt-2 rounded-lg max-w-sm" />;
        case 'video':
            return (
                <div className="mt-2 aspect-video w-full max-w-lg">
                    <iframe
                        className="rounded-lg w-full h-full"
                        src={content.src}
                        title={content.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>
            );
        case 'itineraries_button':
            return (
                <button
                    onClick={onOpenItineraries}
                    className="mt-3 px-4 py-2 bg-white/10 border border-white/20 rounded-md text-white font-semibold hover:bg-white/20 transition-colors"
                >
                    View Augmented Itineraries
                </button>
            );
        default:
            return null;
    }
};

const SpeakingIndicator: React.FC = () => (
    <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 border-2 border-black/50" aria-hidden="true">
        <div className="flex space-x-0.5">
            <span className="w-0.5 h-2 bg-white rounded-full animate-wave" style={{ animationDelay: '-0.4s' }}></span>
            <span className="w-0.5 h-2 bg-white rounded-full animate-wave" style={{ animationDelay: '-0.2s' }}></span>
            <span className="w-0.5 h-2 bg-white rounded-full animate-wave"></span>
        </div>
    </div>
);

export const MessageComponent: React.FC<MessageProps> = ({ message, onOpenItineraries, isSpeaking }) => {
  const isAI = message.sender === Sender.AI;

  return (
    <div className={`flex items-start gap-4 my-4 ${isAI ? '' : 'flex-row-reverse'}`}>
      {isAI && (
        <div className="relative flex-shrink-0">
          <Avatar />
          {isSpeaking && <SpeakingIndicator />}
        </div>
      )}
      <div className={`flex flex-col ${isAI ? 'items-start' : 'items-end'}`}>
        <div className={`px-4 py-3 rounded-2xl max-w-xl ${isAI ? 'bg-white/10 rounded-tl-none' : 'bg-blue-600/50 text-white rounded-br-none'}`}>
          <p className="text-white whitespace-pre-wrap">{message.text}</p>
        </div>
        {message.specialContent && <SpecialContentDisplay content={message.specialContent} onOpenItineraries={onOpenItineraries} />}
        {message.places && <PlacesDisplay places={message.places} />}
      </div>
    </div>
  );
};