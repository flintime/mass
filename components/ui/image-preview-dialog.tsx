import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { X } from "lucide-react";

interface ImagePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
}

export function ImagePreviewDialog({ isOpen, onClose, imageUrl }: ImagePreviewDialogProps) {
  // Handle keyboard events
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-transparent border-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Image Preview</DialogTitle>
          <DialogDescription>
            Full size preview of the shared image. Press Escape or click outside to close.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            aria-label="Close preview"
          >
            <X className="h-6 w-6 text-white" />
          </button>
          
          {/* Image */}
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={imageUrl}
              alt="Image preview"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              style={{ 
                boxShadow: '0 0 20px rgba(0,0,0,0.3)',
                backgroundColor: 'rgba(0,0,0,0.8)'
              }}
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                console.error('Error loading image in preview:', imageUrl);
                // Replace with inline SVG placeholder
                const target = e.currentTarget;
                target.style.width = '200px';
                target.style.height = '200px';
                target.style.padding = '2rem';
                target.style.backgroundColor = '#1f2937';
                
                // Create SVG placeholder
                const svg = `
                  <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                    <line x1="4" y1="4" x2="20" y2="20"></line>
                    <text x="12" y="24" text-anchor="middle" fill="#9ca3af" font-family="system-ui, sans-serif" font-size="2px">Image failed to load</text>
                  </svg>
                `;
                
                // Set the image source to a data URI containing the SVG
                target.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 