'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  LayoutGrid, 
  Map as MapIcon, 
  Star, 
  Zap, 
  Brain, 
  SlidersHorizontal 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pagination } from "@/components/ui/pagination";

export type SortOption = 'ai' | 'rating' | 'response';
export type ViewMode = 'list' | 'map';

interface SmartSortProps {
  onSortChange: (option: SortOption) => void;
  onViewChange: (mode: ViewMode) => void;
  onPageChange: (page: number) => void;
  currentSort: SortOption;
  currentView: ViewMode;
  currentPage: number;
  totalResults: number;
  itemsPerPage?: number;
}

export function SmartSort({ 
  onSortChange, 
  onViewChange,
  onPageChange,
  currentSort, 
  currentView,
  currentPage,
  totalResults,
  itemsPerPage = 10
}: SmartSortProps) {
  const sortOptions = [
    { id: 'ai' as const, label: 'AI Recommended', Icon: Brain },
    { id: 'rating' as const, label: 'Highest Rated', Icon: Star },
    { id: 'response' as const, label: 'Fastest Response', Icon: Zap },
  ];

  const currentSortOption = sortOptions.find(opt => opt.id === currentSort);
  const totalPages = Math.ceil(totalResults / itemsPerPage);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            {totalResults} results sorted by
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                {currentSortOption && (
                  <currentSortOption.Icon className="h-4 w-4" />
                )}
                {currentSortOption?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.id}
                  onClick={() => onSortChange(option.id)}
                  className="gap-2"
                >
                  <option.Icon className="h-4 w-4" />
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant={currentView === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('list')}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            List
          </Button>
          <Button
            variant={currentView === 'map' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('map')}
            className="gap-2"
          >
            <MapIcon className="h-4 w-4" />
            Map
          </Button>
        </div>
      </div>

      {currentView === 'list' && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
} 