import React from 'react';

interface SuggestionPanelsProps {
  onSuggestionClick: (suggestion: string) => void;
}

const suggestions = [
  "What's on today?",
  "Where can I find live music?",
  "Suggest a romantic day for a couple",
];

const SuggestionButton: React.FC<{ text: string; onClick: () => void }> = ({ text, onClick }) => (
  <button
    onClick={onClick}
    className="px-4 py-2 text-sm bg-white/5 border border-white/10 rounded-full text-white font-medium hover:bg-white/20 transition-colors duration-200 backdrop-blur-sm"
    aria-label={`Ask about ${text}`}
  >
    {text}
  </button>
);

export const SuggestionPanels: React.FC<SuggestionPanelsProps> = ({ onSuggestionClick }) => {
  return (
    <div className="flex-shrink-0 px-4 pb-3 flex items-center justify-center gap-2 flex-wrap animate-fade-in">
      {suggestions.map((suggestion) => (
        <SuggestionButton 
          key={suggestion} 
          text={suggestion} 
          onClick={() => onSuggestionClick(suggestion)} 
        />
      ))}
    </div>
  );
};

// Add a simple fade-in animation for the panels
const style = document.createElement('style');
style.textContent = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fade-in 0.5s ease-out forwards;
  }
`;
document.head.append(style);
