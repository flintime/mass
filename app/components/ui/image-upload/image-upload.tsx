'use client';

import * as React from 'react';
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { ImagePlus, X } from 'lucide-react';
import Image from 'next/image';

interface ImageUploadProps extends React.HTMLAttributes<HTMLDivElement> {
  images: { url: string }[];
  onUpload: (files: File[]) => Promise<void>;
  onRemove: (index: number) => void;
  maxImages?: number;
}

export function ImageUpload({
  images,
  onUpload,
  onRemove,
  maxImages = 5,
  className,
  ...props
}: ImageUploadProps) {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Validate file types
    const validFiles = acceptedFiles.filter(file => 
      file.type.startsWith('image/')
    );

    if (validFiles.length === 0) {
      console.error('Please upload only image files');
      return;
    }

    // Check file sizes (5MB limit)
    const validSizedFiles = validFiles.filter(file => file.size <= 5 * 1024 * 1024);
    if (validSizedFiles.length < validFiles.length) {
      console.error('Some files exceed the 5MB size limit');
    }

    // Check maximum number of images
    if (images.length + validSizedFiles.length > maxImages) {
      console.error(`You can only upload up to ${maxImages} images`);
      return;
    }

    await onUpload(validSizedFiles);
  }, [images.length, maxImages, onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    disabled: images.length >= maxImages
  });

  return (
    <div className={cn('space-y-4', className)} {...props}>
      <div 
        {...getRootProps()} 
        className={cn(
          'border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors',
          isDragActive ? 'border-violet-500 bg-violet-50' : 'border-gray-300 hover:border-violet-500',
          images.length >= maxImages && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2 text-sm text-gray-600">
          <ImagePlus className="w-8 h-8 text-gray-400" />
          {isDragActive ? (
            <p>Drop the files here...</p>
          ) : (
            <>
              <p>Drag & drop images here, or click to select files</p>
              <p className="text-xs text-gray-500">
                PNG, JPG or WEBP (max {maxImages} images, 5MB each)
              </p>
            </>
          )}
        </div>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div key={image.url} className="relative group aspect-square">
              <Image
                src={image.url}
                alt={`Uploaded image ${index + 1}`}
                fill
                className="object-cover rounded-lg"
              />
              <button
                onClick={() => onRemove(index)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 