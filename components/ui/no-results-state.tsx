'use client';

import { motion } from 'framer-motion';
import { AlertCircle, Clock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface NoResultsStateProps {
  searchQuery: string;
  suggestedCategories?: string[];
  onNotifyMe?: (category: string) => void;
}

export function NoResultsState({ 
  searchQuery, 
  suggestedCategories = [],
  onNotifyMe 
}: NoResultsStateProps) {
  // Improved category detection from search query
  const detectCategory = (query: string): string => {
    const query_lower = query.toLowerCase();
    
    // Define category keywords
    const categoryKeywords = {
      lawyer: ['lawyer', 'attorney', 'legal', 'law', 'immigration', 'counsel'],
      doctor: ['doctor', 'physician', 'medical', 'healthcare', 'clinic', 'medicine'],
      dentist: ['dentist', 'dental', 'orthodontist', 'teeth'],
      tutor: ['tutor', 'teacher', 'instructor', 'teaching', 'education', 'learning'],
      accountant: ['accountant', 'accounting', 'tax', 'bookkeeper', 'cpa'],
      therapist: ['therapist', 'counselor', 'psychologist', 'mental health'],
      realtor: ['realtor', 'real estate', 'property', 'housing', 'broker'],
      consultant: ['consultant', 'advisor', 'consulting'],
      trainer: ['trainer', 'fitness', 'personal training', 'gym'],
      photographer: ['photographer', 'photography', 'photo', 'camera']
    };

    // Check each category's keywords against the query
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => query_lower.includes(keyword))) {
        return category;
      }
    }

    // If no specific category is found, return the first word as fallback
    return query_lower.split(' ')[0];
  };

  const searchCategory = detectCategory(searchQuery);

  // Common professional service categories we plan to support
  const plannedCategories = {
    lawyer: {
      title: 'Legal Services',
      description: 'We\'re currently onboarding legal professionals for immigration, business, and other legal services.',
      alternatives: [
        'Immigration Consultants',
        'Document Translation Services',
        'Legal Document Preparation',
        'Notary Services'
      ],
      specializations: ['Immigration Law', 'Business Law', 'Family Law', 'Real Estate Law']
    },
    doctor: {
      title: 'Medical Services',
      description: 'Medical professionals will be joining our platform soon.',
      alternatives: [
        'Telemedicine Consultations',
        'Health & Wellness Centers',
        'Medical Testing Services',
        'Health Screening Services'
      ],
      specializations: ['General Practice', 'Specialists', 'Family Medicine']
    },
    dentist: {
      title: 'Dental Services',
      description: 'We\'re expanding our network to include dental professionals.',
      alternatives: [
        'Dental Hygiene Services',
        'Dental Care Centers',
        'Orthodontic Services'
      ],
      specializations: ['General Dentistry', 'Orthodontics', 'Dental Surgery']
    },
    tutor: {
      title: 'Educational Services',
      description: 'We\'re building a network of qualified tutors and educational professionals.',
      alternatives: [
        'Online Learning Platforms',
        'Educational Assessment Services',
        'Study Groups',
        'Learning Centers'
      ],
      specializations: ['Academic Subjects', 'Test Preparation', 'Language Learning']
    },
    accountant: {
      title: 'Accounting Services',
      description: 'Financial professionals will be available soon.',
      alternatives: [
        'Bookkeeping Services',
        'Tax Preparation Services',
        'Financial Advisory'
      ],
      specializations: ['Tax Accounting', 'Business Accounting', 'Personal Finance']
    }
  };

  const category = plannedCategories[searchCategory as keyof typeof plannedCategories];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center max-w-2xl mx-auto py-12 px-4"
    >
      <div className="bg-violet-50 p-3 rounded-full mb-6">
        <AlertCircle className="h-8 w-8 text-violet-500" />
      </div>

      <h3 className="text-2xl font-semibold text-gray-900 mb-3">
        {category ? `${category.title} Coming Soon` : 'No Results Found'}
      </h3>

      <p className="text-gray-600 mb-6 max-w-md">
        {category ? (
          category.description
        ) : (
          `We couldn't find any businesses matching "${searchQuery}". We're continuously expanding our network of service providers.`
        )}
      </p>

      {category && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8 w-full max-w-md">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-violet-500" />
            <h4 className="font-medium text-gray-900">Coming to Flintime Soon</h4>
          </div>
          
          <div className="space-y-4 text-left mb-6">
            {category.specializations && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Planned Specializations:
                </p>
                <div className="flex flex-wrap gap-2">
                  {category.specializations.map((spec, index) => (
                    <span
                      key={index}
                      className="text-xs bg-violet-50 text-violet-700 px-2 py-1 rounded-full"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Available Alternatives:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 pl-4 space-y-1">
                {category.alternatives.map((alt, index) => (
                  <li key={index}>{alt}</li>
                ))}
              </ul>
            </div>
          </div>

          <Button
            onClick={() => onNotifyMe?.(searchCategory)}
            className="w-full gap-2"
          >
            <Mail className="h-4 w-4" />
            Notify Me When Available
          </Button>
        </div>
      )}

      {suggestedCategories.length > 0 && (
        <div className="w-full max-w-md">
          <h4 className="font-medium text-gray-900 mb-4">Available Categories</h4>
          <div className="grid grid-cols-2 gap-3">
            {suggestedCategories.map((category, index) => (
              <Link
                key={index}
                href={`/search?category=${encodeURIComponent(category)}`}
                className="text-sm text-violet-600 hover:text-violet-700 hover:underline p-2 bg-violet-50 rounded-lg"
              >
                {category}
              </Link>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
} 