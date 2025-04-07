'use client';

import { motion } from 'framer-motion';

interface AIWaveformProps {
  className?: string;
}

export function AIWaveform({ className = '' }: AIWaveformProps) {
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="w-1 h-4 bg-current rounded-full"
          animate={{
            height: ['16px', '32px', '16px'],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
} 