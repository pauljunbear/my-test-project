import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface UploadDropzoneProps {
  onUpload: (file: File) => void;
}

export function UploadDropzone({ onUpload }: UploadDropzoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log('Files dropped:', acceptedFiles);
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      console.log('Processing file:', file.name, file.type, file.size);
      onUpload(file);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1,
    multiple: false
  });

  return (
    <div
      {...getRootProps()}
      className={`w-full max-w-xl mx-auto border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 
        ${isDragActive 
          ? 'border-primary bg-primary/10 scale-105' 
          : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-4">
        <div className={`p-4 rounded-full bg-gradient-to-br from-gray-100 to-white dark:from-gray-800 dark:to-gray-700 shadow-sm transition-transform duration-300 ${isDragActive ? 'scale-110' : ''}`}>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-8 w-8 transition-colors duration-300 ${isDragActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
            />
          </svg>
        </div>
        <div className="space-y-2">
          <p className={`text-base font-medium transition-colors duration-300 ${isDragActive ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>
            {isDragActive
              ? "Drop the image here..."
              : "Drag & drop an image here"}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            or <span className="text-primary underline cursor-pointer">browse files</span>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
            Supports: JPG, PNG, GIF, WEBP (max 10MB)
          </p>
        </div>
        
        {isDragActive && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-full h-full absolute inset-0 bg-primary/5 rounded-xl animate-pulse"></div>
          </div>
        )}
      </div>
    </div>
  );
} 