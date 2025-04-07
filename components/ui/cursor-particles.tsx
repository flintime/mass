'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export function CursorParticles() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePosition = useRef({ x: 0, y: 0 });
  const particles = useRef<HTMLDivElement[]>([]);
  const requestRef = useRef<number>();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosition.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Create particles
    if (containerRef.current) {
      particles.current = Array.from({ length: 5 }).map(() => {
        const particle = document.createElement('div');
        particle.className = 'absolute w-1 h-1 rounded-full bg-violet-500 opacity-0';
        containerRef.current?.appendChild(particle);
        return particle;
      });
    }

    // Animation loop
    const animate = () => {
      particles.current.forEach((particle, index) => {
        const delay = index * 2;
        const x = mousePosition.current.x;
        const y = mousePosition.current.y;
        
        setTimeout(() => {
          particle.style.opacity = '0.5';
          particle.style.transform = `translate(${x}px, ${y}px)`;
          
          setTimeout(() => {
            particle.style.opacity = '0';
          }, 200);
        }, delay);
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      particles.current.forEach(particle => particle.remove());
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 pointer-events-none z-50"
      style={{ perspective: '500px' }}
    />
  );
} 