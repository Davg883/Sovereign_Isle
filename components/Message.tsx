import React from 'react';
import { Message, Sender, Place } from '../types';
import { Avatar } from './Avatar';

interface MessageProps {
  message: Message;
  onOpenItineraries: () => void;
  isSpeaking: boolean;
  onOpenMap: (itinerary?: any) => void;
}

// Function to safely format AI-generated text with basic HTML elements
const formatAIText = (text: string) => {
  // Escape HTML characters to prevent XSS
  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // First escape all HTML to prevent XSS
  let safeText = escapeHtml(text);
  
  // Then convert markdown-style headings to HTML headings
  let formattedText = safeText
    // Convert ## Heading ## to <h2>Heading</h2>
    .replace(/^##\s+(.*?)\s*##*$/gm, '<h2 class="font-serif-elegant text-xl font-semibold my-3 text-white">$1</h2>')
    // Convert ### Heading ### to <h3>Heading</h3>
    .replace(/^###\s+(.*?)\s*##*$/gm, '<h3 class="font-serif-elegant text-lg font-semibold my-2.5 text-white">$1</h3>')
    // Convert #### Heading #### to <h4>Heading</h4>
    .replace(/^####\s+(.*?)\s*##*$/gm, '<h4 class="font-serif-elegant font-semibold my-2 text-white">$1</h4>')
    // Convert **bold** to <strong>bold</strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // Convert *italic* to <em>italic</em>
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    // Convert line breaks to <br> tags
    .replace(/\n/g, '<br />');

  return formattedText;
};

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


const SpecialContentDisplay: React.FC<{ content: Message['specialContent'], onOpenItineraries: () => void, onOpenMap: (itinerary?: any) => void }> = ({ content, onOpenItineraries, onOpenMap }) => {
    // Debug logging
    console.log('SpecialContentDisplay rendered with content:', content);
    
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
        case 'map_link':
            console.log('Rendering map_link button with itinerary:', content.itinerary);
            return (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        console.log('Map link clicked with itinerary:', content.itinerary);
                        console.log('Calling onOpenMap with itinerary:', content.itinerary);
                        onOpenMap(content.itinerary);
                        console.log('onOpenMap call completed');
                    }}
                    className="mt-3 px-4 py-2 bg-blue-600/50 border border-blue-400/30 rounded-md text-white font-semibold hover:bg-blue-600/70 transition-colors flex items-center"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    View on Enchanted Atlas
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

export const MessageComponent: React.FC<MessageProps> = ({ message, onOpenItineraries, isSpeaking, onOpenMap }) => {
  // Debug logging
  console.log('MessageComponent rendered with message:', message);
  console.log('onOpenMap function:', onOpenMap);
  
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
          {isAI ? (
            <div 
              className="text-white whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: formatAIText(message.text) }}
            />
          ) : (
            <p className="text-white whitespace-pre-wrap">{message.text}</p>
          )}
        </div>
        {message.specialContent && <SpecialContentDisplay content={message.specialContent} onOpenItineraries={onOpenItineraries} onOpenMap={onOpenMap} />}
        {message.places && <PlacesDisplay places={message.places} />}
      </div>
    </div>
  );
};