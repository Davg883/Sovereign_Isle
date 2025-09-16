import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { Sender } from '../types';
import { MessageComponent } from './Message';
import { ItinerariesModal } from './ItinerariesModal';
import { sendMessageToAI } from '../services/geminiService';
import { DEMO_PROMPTS, INITIAL_MESSAGE, uniqueId } from '../constants';
import { Weather } from './Weather';
import { SuggestionPanels } from './SuggestionPanels';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { textToSpeech } from '../services/elevenLabsService';

interface ChatProps {
  mapPrompt: string | null;
  onPromptSent: () => void;
  onOpenMap: (itinerary?: any) => void;
}

const TypingIndicator: React.FC = () => (
    <div className="flex items-center space-x-1.5 p-4">
        <div className="h-2 w-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
        <div className="h-2 w-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
        <div className="h-2 w-2 bg-gray-400 rounded-full animate-pulse"></div>
    </div>
);

export const Chat: React.FC<ChatProps> = ({ mapPrompt, onPromptSent, onOpenMap }) => {
  // Debug logging
  console.log('Chat component rendered with onOpenMap:', onOpenMap);
  
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { playAudio, stopAudio } = useAudioPlayer(() => {
    setCurrentlySpeakingId(null);
  });

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (mapPrompt) {
      handleSendMessage(mapPrompt);
      onPromptSent();
    }
  }, [mapPrompt]);


  const toggleVoice = () => {
    const newVoiceState = !isVoiceEnabled;
    setIsVoiceEnabled(newVoiceState);
    if (!newVoiceState) { // Turning voice off
        stopAudio();
        setCurrentlySpeakingId(null);
    }
  };

  const handleSendMessage = async (prompt: string) => {
    if (!prompt.trim() || isLoading) return;

    stopAudio();
    setCurrentlySpeakingId(null);

    const userMessage: Message = {
      id: uniqueId(),
      sender: Sender.User,
      text: prompt,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Check if this is a demo prompt before calling AI
    const normalizedInput = prompt.trim().toLowerCase();
    
    // Check for exact matches first
    let specialContent = DEMO_PROMPTS[normalizedInput] || (DEMO_PROMPTS[normalizedInput.replace(/[.?]/g, '')]);
    
    // If no exact match, check for partial matches
    if (!specialContent) {
      for (const key in DEMO_PROMPTS) {
        if (normalizedInput.includes(key)) {
          specialContent = DEMO_PROMPTS[key];
          break;
        }
      }
    }

    // Debug logging
    console.log('Input:', normalizedInput);
    console.log('Special content found:', specialContent);

    let aiMessage: Message;

    // If we found a demo prompt, use a predefined response
    if (specialContent && specialContent.type === 'map_link') {
      aiMessage = {
        id: uniqueId(),
        sender: Sender.AI,
        text: "Allow me to craft a bespoke journey for you. A day that begins with the dramatic cliffs of The Needles, where the chalk stacks stand sentinel against the endless sky. We'll then journey to Osborne House, Queen Victoria's cherished retreat, where history whispers through the halls. Finally, we'll descend into the enchanting Shanklin Chine, where water and wind have carved a cathedral of natural wonder.\n\n...allow me to show you this journey on my Enchanted Atlas.",
        specialContent: specialContent,
        places: [],
      };
    } else {
      const aiResponse = await sendMessageToAI(prompt);
      
      aiMessage = {
        id: uniqueId(),
        sender: Sender.AI,
        text: aiResponse.text,
        specialContent: specialContent,
        places: aiResponse.places,
      };
    }

    setMessages((prev) => [...prev, aiMessage]);
    setIsLoading(false);

    // Voice is only enabled for actual AI responses, not demo prompts
    if (specialContent && specialContent.type === 'map_link') {
      // Do nothing for demo prompts
    } else if (isVoiceEnabled && aiMessage.text) {
      // This is for actual AI responses
      const audioBlob = await textToSpeech(aiMessage.text);
      if (audioBlob) {
        playAudio(audioBlob);
        setCurrentlySpeakingId(aiMessage.id);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };
  
  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };


  return (
    <>
      <div className="flex flex-col h-full bg-black/50 border border-white/10 rounded-t-xl overflow-hidden backdrop-blur-md shadow-2xl">
        <Weather />
        <div className="flex-grow overflow-y-auto p-3 md:p-4">
          {messages.map((msg) => (
            <MessageComponent 
                key={msg.id} 
                message={msg} 
                onOpenItineraries={() => setIsModalOpen(true)}
                isSpeaking={msg.id === currentlySpeakingId}
                onOpenMap={(itinerary) => {
                  console.log('Chat onOpenMap called with itinerary:', itinerary);
                  onOpenMap(itinerary);
                }}
            />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
        {messages.length <= 1 && <SuggestionPanels onSuggestionClick={handleSuggestionClick} />}
        <form onSubmit={handleSubmit} className="p-3 border-t border-white/10 bg-black/30 flex-shrink-0">
          <div className="flex items-center bg-white/5 rounded-full p-1.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Begin your story..."
              className="flex-grow bg-transparent text-white placeholder-gray-400 focus:outline-none px-3 py-1"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={toggleVoice}
              className={`p-2 rounded-full hover:bg-white/20 transition-colors ${isVoiceEnabled ? 'text-white' : 'text-gray-500'}`}
              aria-label={isVoiceEnabled ? "Disable voice" : "Enable voice"}
            >
              {isVoiceEnabled ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M11 5.054a1 1 0 01.52.883v12.126a1 1 0 01-1.52.883L5.432 14H4a1 1 0 01-1-1V11a1 1 0 011-1h1.432l4.048-4.946A1 1 0 0111 5.054z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.683 3.904 11 4.146 11 4.707V19.293c0 .561-.317.804-.707.414L5.586 15zM17 17l-5-5m0 0l-5 5m5-5l5 5" />
                </svg>
              )}
            </button>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-white/10 text-white rounded-full p-2 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-1"
              aria-label="Send message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </form>
      </div>
      <ItinerariesModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};