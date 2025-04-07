'use client';

import { motion } from 'framer-motion';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface GlowingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export function GlowingButton({ children, className, ...props }: GlowingButtonProps) {
  return (
    <div className="relative group">
      {/* Glow effect */}
      <motion.div
        className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg blur opacity-50 group-hover:opacity-75 transition duration-200"
        animate={{
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Button */}
      <Button
        className={cn(
          "relative bg-black text-white hover:bg-gray-900 border-0",
          className
        )}
        {...props}
      >
        {children}
      </Button>
    </div>
  );
} 