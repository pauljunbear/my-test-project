import React, { useState, useRef } from 'react';
import { UploadDropzoneProps } from '../types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({ onUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Please upload an image file (JPEG, PNG, GIF, WebP)';
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 10MB limit. Please choose a smaller file.';
    }
    
    return null;
  };

  const handleFile = (file: File) => {
    const errorMessage = validateFile(file);
    if (errorMessage) {
      setError(errorMessage);
      return;
    }
    
    setError(null);
    onUpload(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div
        className={`p-8 border-2 border-dashed rounded-xl transition-all duration-200 flex flex-col items-center justify-center text-center ${
          isDragging 
            ? 'border-primary bg-primary/5' 
            : 'border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="w-16 h-16 mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-primary"
          >
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/>
            <line x1="16" x2="22" y1="5" y2="5"/>
            <line x1="19" x2="19" y1="2" y2="8"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
          </svg>
        </div>
        <h3 className="text-lg font-medium mb-2">Upload an image</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Drag and drop an image here, or click to select
        </p>
        <p className="text-xs text-muted-foreground">
          Supports: JPG, PNG, GIF, WebP (max 10MB)
        </p>
        {error && (
          <p className="mt-4 text-sm text-red-500">
            {error}
          </p>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
        />
      </div>
    </div>
  );
}; 