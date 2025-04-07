'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import { Input } from './input';
import { AIWaveform } from './ai-waveform';
import { Button } from './button';
import { Search, MessageSquare, Star } from 'lucide-react';
import { Badge } from './badge';

const TYPING_TEXT = "I need a plumber for a leaking pipe...";

export function InteractiveSteps() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [typedText, setTypedText] = useState('');
  const [showCards, setShowCards] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const step1InView = useInView(step1Ref, { once: true, margin: "-100px" });
  const step2InView = useInView(step2Ref, { once: true, margin: "-100px" });
  const step3InView = useInView(step3Ref, { once: true, margin: "-100px" });

  const opacity = useSpring(
    useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])
  );

  const y = useSpring(
    useTransform(scrollYProgress, [0, 1], ["20%", "-20%"]),
    { stiffness: 100, damping: 30 }
  );

  useEffect(() => {
    if (step1InView) {
      let currentIndex = 0;
      const typingInterval = setInterval(() => {
        if (currentIndex <= TYPING_TEXT.length) {
          setTypedText(TYPING_TEXT.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
        }
      }, 100);

      return () => clearInterval(typingInterval);
    }
  }, [step1InView]);

  useEffect(() => {
    if (step2InView) {
      setTimeout(() => setShowCards(true), 500);
    }
  }, [step2InView]);

  useEffect(() => {
    if (step3InView) {
      setTimeout(() => setShowChat(true), 500);
    }
  }, [step3InView]);

  const mockBusinessCards = [
    { name: "Expert Plumbing Co", rating: 4.8, reviews: 156, match: 98 },
    { name: "Quick Fix Plumbers", rating: 4.6, reviews: 98, match: 95 },
    { name: "24/7 Plumbing Services", rating: 4.7, reviews: 203, match: 92 }
  ];

  return (
    <div ref={containerRef} className="min-h-screen py-20 bg-gradient-to-b from-violet-950 via-violet-900 to-violet-800">
      <motion.div
        style={{ opacity, y }}
        className="container mx-auto px-4"
      >
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            How Flintime Works
          </h2>
          <p className="text-xl text-violet-200 max-w-2xl mx-auto">
            Experience the future of service booking with our AI-powered platform
          </p>
        </div>

        <div className="max-w-6xl mx-auto space-y-40">
          {/* Step 1: Describe Your Need */}
          <div ref={step1Ref} className="relative">
            {/* Holographic glow effect */}
            <div className="absolute -inset-10 bg-gradient-to-r from-violet-600/30 to-indigo-600/30 rounded-3xl blur-xl opacity-50" />
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={step1InView ? { opacity: 1 } : {}}
              transition={{ duration: 1 }}
              className="relative bg-white/5 backdrop-blur-sm rounded-3xl p-12 border border-white/10"
            >
              <div className="text-center mb-8">
                <Badge 
                  className="bg-violet-500/20 text-violet-200 border-violet-400/20 backdrop-blur-sm mb-4"
                >
                  Step 1
                </Badge>
                <h3 className="text-3xl font-semibold text-white mb-4">Describe Your Need</h3>
                <p className="text-violet-200">Tell us what you're looking for in plain language</p>
              </div>
              
              <div className="max-w-2xl mx-auto">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300" />
                  <div className="relative">
                    <Input
                      value={typedText}
                      readOnly
                      className="h-14 text-lg pl-12 pr-12 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-violet-300" />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <AIWaveform className="text-violet-300" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Step 2: AI Matching */}
          <div ref={step2Ref} className="relative">
            {/* Holographic glow effect */}
            <div className="absolute -inset-10 bg-gradient-to-r from-violet-600/30 to-indigo-600/30 rounded-3xl blur-xl opacity-50" />
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={step2InView ? { opacity: 1 } : {}}
              transition={{ duration: 1 }}
              className="relative bg-white/5 backdrop-blur-sm rounded-3xl p-12 border border-white/10"
            >
              <div className="text-center mb-12">
                <Badge 
                  className="bg-violet-500/20 text-violet-200 border-violet-400/20 backdrop-blur-sm mb-4"
                >
                  Step 2
                </Badge>
                <h3 className="text-3xl font-semibold text-white mb-4">AI Finds the Best Matches</h3>
                <p className="text-violet-200">Our AI analyzes your request and matches you with perfect service providers</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {mockBusinessCards.map((business, index) => (
                  <motion.div
                    key={business.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={showCards ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: index * 0.2 }}
                    className="relative group"
                  >
                    {/* Card glow effect */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl opacity-30 group-hover:opacity-50 blur transition duration-300" />
                    
                    <div className="relative bg-white/10 backdrop-blur rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <Badge className="bg-violet-500/20 text-violet-200 border-violet-400/20">
                          {business.match}% Match
                        </Badge>
                        <AIWaveform className="text-violet-300" />
                      </div>
                      
                      <h4 className="text-white font-semibold text-lg mb-2">{business.name}</h4>
                      
                      <div className="flex items-center gap-2 text-violet-200">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{business.rating}</span>
                        <span className="text-violet-300">•</span>
                        <span>{business.reviews} reviews</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Step 3: Chat & Book */}
          <div ref={step3Ref} className="relative">
            {/* Holographic glow effect */}
            <div className="absolute -inset-10 bg-gradient-to-r from-violet-600/30 to-indigo-600/30 rounded-3xl blur-xl opacity-50" />
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={step3InView ? { opacity: 1 } : {}}
              transition={{ duration: 1 }}
              className="relative bg-white/5 backdrop-blur-sm rounded-3xl p-12 border border-white/10"
            >
              <div className="text-center mb-12">
                <Badge 
                  className="bg-violet-500/20 text-violet-200 border-violet-400/20 backdrop-blur-sm mb-4"
                >
                  Step 3
                </Badge>
                <h3 className="text-3xl font-semibold text-white mb-4">Chat & Book Instantly</h3>
                <p className="text-violet-200">Connect with providers and schedule services in real-time</p>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={showChat ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5 }}
                className="max-w-md mx-auto relative"
              >
                {/* Chat window glow effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl opacity-30 group-hover:opacity-50 blur transition duration-300" />
                
                <div className="relative bg-white/10 backdrop-blur rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 border-b border-white/10 p-4">
                    <div className="w-10 h-10 bg-violet-500/20 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-violet-200" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Expert Plumbing Co</h4>
                      <div className="flex items-center gap-2 text-sm text-violet-200">
                        <span className="w-2 h-2 bg-green-400 rounded-full" />
                        <span>Online now</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    <div className="bg-violet-500/20 rounded-lg p-3 text-violet-100 max-w-[80%]">
                      Hi! I can help with your leaking pipe. When would you like us to come by?
                    </div>
                    
                    <div className="bg-white/10 rounded-lg p-3 text-white max-w-[80%] ml-auto">
                      Can you come today? It's quite urgent.
                    </div>
                    
                    <div className="bg-violet-500/20 rounded-lg p-3 text-violet-100 max-w-[80%]">
                      Yes, I have a slot available in 2 hours. Shall I book that for you?
                    </div>
                  </div>
                  
                  <div className="p-4 border-t border-white/10">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type your message..."
                        className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                      <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 