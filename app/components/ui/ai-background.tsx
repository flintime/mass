import { useEffect, useState } from 'react';

interface AIBackgroundProps {
  intensity?: number;
}

export function AIBackground({ intensity = 0.5 }: AIBackgroundProps) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div 
        className="absolute inset-0"
        style={{
          opacity: 0.1 + (intensity * 0.2),
          transition: 'opacity 0.3s ease-out'
        }}
      >
        {/* Neural network visualization */}
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="neural-grid" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
              <circle cx="25" cy="25" r="1" fill="rgba(106,13,173,0.2)" />
              <line x1="25" y1="25" x2="50" y2="25" stroke="rgba(138,43,226,0.1)" strokeWidth="0.5" />
              <line x1="25" y1="25" x2="25" y2="50" stroke="rgba(138,43,226,0.1)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#neural-grid)" />
        </svg>
      </div>
      
      {/* Animated particles */}
      <div 
        className="absolute inset-0"
        style={{
          opacity: intensity * 0.4,
          transition: 'opacity 0.3s ease-out'
        }}
      >
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-[#6A0DAD]/15 blur-sm animate-float-particle"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              animationDelay: Math.random() * 5 + 's',
              animationDuration: Math.random() * 10 + 10 + 's'
            }}
          />
        ))}
      </div>

      {/* Gradient overlay */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-transparent via-[#F2F2F2]/10 to-[#F2F2F2]/20"
        style={{
          opacity: intensity * 0.3
        }}
      />
    </div>
  );
} 