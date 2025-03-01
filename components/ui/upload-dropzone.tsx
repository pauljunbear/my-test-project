import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image } from 'lucide-react';

interface UploadDropzoneProps {
  onUpload: (file: File) => void;
}

export function UploadDropzone({ onUpload }: UploadDropzoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles[0]);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
        ${isDragActive 
          ? 'border-primary bg-primary/5' 
          : 'border-muted-foreground/20 hover:border-primary/50'}
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-2">
        {isDragActive ? (
          <Image className="h-10 w-10 text-muted-foreground" />
        ) : (
          <Upload className="h-10 w-10 text-muted-foreground" />
        )}
        <p className="text-sm font-medium">
          {isDragActive ? 'Drop the image here' : 'Drag & drop an image here'}
        </p>
        <p className="text-xs text-muted-foreground">
          or click to select a file
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Supports: JPG, PNG, GIF, WEBP up to 10MB
        </p>
      </div>
    </div>
  );
} 