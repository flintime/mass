'use client';

import { motion } from 'framer-motion';
import { Brain, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIScoreBadgeProps {
  score: number;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AIScoreBadge({ 
  score, 
  className,
  showLabel = true,
  size = 'md'
}: AIScoreBadgeProps) {
  // Convert score to percentage and round to nearest integer
  const percentage = Math.round(score * 100);
  
  // Determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'bg-violet-500 text-white';
    if (score >= 0.7) return 'bg-violet-100 text-violet-700';
    return 'bg-gray-100 text-gray-700';
  };

  // Determine if it's an AI pick (score >= 0.9)
  const isAIPick = score >= 0.9;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1 gap-1',
    md: 'text-sm px-3 py-1.5 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex items-center rounded-full font-medium',
        sizeClasses[size],
        getScoreColor(score),
        className
      )}
    >
      {isAIPick ? (
        <>
          <Sparkles className={iconSizes[size]} />
          <span>Flintime AI Pick</span>
        </>
      ) : (
        <>
          <Brain className={iconSizes[size]} />
          {showLabel && (
            <>
              <span>AI Score:</span>
              <span>{percentage}%</span>
            </>
          )}
        </>
      )}
      
      {isAIPick && (
        <motion.div
          className="absolute inset-0 rounded-full bg-white mix-blend-soft-light"
          animate={{
            opacity: [0.1, 0.3, 0.1],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
    </motion.div>
  );
} 