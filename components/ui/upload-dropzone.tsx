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
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900'}`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6 text-gray-500 dark:text-gray-400" 
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
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {isDragActive
              ? "Drop the image here..."
              : "Drag & drop an image here, or click to select"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Supports: JPG, PNG, GIF, WEBP up to 10MB
          </p>
        </div>
      </div>
    </div>
  );
} 