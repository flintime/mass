'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface AIBackgroundProps {
  intensity?: number;
}

interface Particle {
  id: number;
  width: number;
  height: number;
  left: number;
  top: number;
  duration: number;
  delay: number;
}

export function AIBackground({ intensity = 0.5 }: AIBackgroundProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  
  // Initialize particles on the client side only
  useEffect(() => {
    const newParticles = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      width: Math.random() * 4 + 2,
      height: Math.random() * 4 + 2,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 5
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Neural network background */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          opacity: 0.2 + (intensity * 0.3),
          transition: 'opacity 0.3s ease-out'
        }}
      >
        <div className="absolute inset-0 bg-repeat" style={{ backgroundImage: 'url(/neural-network.svg)', backgroundSize: '400px' }} />
      </div>
      
      {/* Animated particles */}
      <motion.div 
        className="absolute inset-0"
        style={{
          opacity: intensity,
          transition: 'opacity 0.3s ease-out'
        }}
      >
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-white/30 blur-sm"
            initial={{ x: 0, y: 0 }}
            animate={{ 
              x: [0, Math.random() * 100 - 50, 0],
              y: [0, Math.random() * 100 - 50, 0]
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              ease: "linear",
              delay: particle.delay
            }}
            style={{
              width: `${particle.width}px`,
              height: `${particle.height}px`,
              left: `${particle.left}%`,
              top: `${particle.top}%`,
            }}
          />
        ))}
      </motion.div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-white/10" />
    </div>
  );
} 