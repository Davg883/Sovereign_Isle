import React from 'react';

interface SovereignSealMarkerProps {
  size?: number;
  className?: string;
}

export const SovereignSealMarker: React.FC<SovereignSealMarkerProps> = ({ 
  size = 32, 
  className = '' 
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Outer Shield */}
    <path
      d="M16 2C16 2 8 4.5 8 8.5V16.5C8 22 11.5 26 15 28C15.5 28.2 16.5 28.2 17 28C20.5 26 24 22 24 16.5V8.5C24 4.5 16 2 16 2Z"
      fill="#D4AF37"
      stroke="#B8860B"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    
    {/* Inner Glow */}
    <path
      d="M16 5C16 5 10.5 7 10.5 10V16C10.5 20.5 13 23.5 15.5 25C15.8 25.1 16.2 25.1 16.5 25C19 23.5 21.5 20.5 21.5 16V10C21.5 7 16 5 16 5Z"
      fill="#FFD700"
      opacity="0.8"
    />
    
    {/* Sun Rays */}
    <path
      d="M16 10L16.5 12M16 22L16.5 20M12 16L10 16M22 16L20 16M13 12L11.5 10.5M19 20L20.5 21.5M13 20L11.5 21.5M19 12L20.5 10.5"
      stroke="#FFFFFF"
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.9"
    />
    
    {/* Crown/Key Symbol */}
    <circle cx="16" cy="14" r="2.5" fill="#FFFFFF" opacity="0.95" />
    <path
      d="M16 16.5V19.5M14.5 19.5H17.5M15 18H17"
      stroke="#FFFFFF"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.95"
    />
  </svg>
);

// Create an HTML string version for use with AdvancedMarkerElement
export const createSovereignSealMarkerHTML = (size: number = 40): string => {
  return `
    <svg
      width="${size}"
      height="${size}"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style="filter: drop-shadow(0 2px 8px rgba(212, 175, 55, 0.6));"
    >
      <path
        d="M16 2C16 2 8 4.5 8 8.5V16.5C8 22 11.5 26 15 28C15.5 28.2 16.5 28.2 17 28C20.5 26 24 22 24 16.5V8.5C24 4.5 16 2 16 2Z"
        fill="#D4AF37"
        stroke="#B8860B"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 5C16 5 10.5 7 10.5 10V16C10.5 20.5 13 23.5 15.5 25C15.8 25.1 16.2 25.1 16.5 25C19 23.5 21.5 20.5 21.5 16V10C21.5 7 16 5 16 5Z"
        fill="#FFD700"
        opacity="0.8"
      />
      <path
        d="M16 10L16.5 12M16 22L16.5 20M12 16L10 16M22 16L20 16M13 12L11.5 10.5M19 20L20.5 21.5M13 20L11.5 21.5M19 12L20.5 10.5"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.9"
      />
      <circle cx="16" cy="14" r="2.5" fill="#FFFFFF" opacity="0.95" />
      <path
        d="M16 16.5V19.5M14.5 19.5H17.5M15 18H17"
        stroke="#FFFFFF"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
    </svg>
  `;
};
