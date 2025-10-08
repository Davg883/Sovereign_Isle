import React from "react";
import styles from "./SuggestionPanels.module.css";

interface SuggestionPanelsProps {
  onSuggestionClick: (suggestion: string) => void;
}

const suggestions = [
  "Unveil today's sovereign happenings.",
  "Find a cozy pub with a real fire.",
  "Craft a perfect windswept walk.",
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
    <div className={`flex-shrink-0 px-4 pb-3 flex items-center justify-center gap-2 flex-wrap ${styles.fadeIn}`}>
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