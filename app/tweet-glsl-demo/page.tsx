'use client';

import { useState, useRef } from 'react';
import TweetGLSLImageProcessor from '@/components/TweetGLSLImageProcessor';
import { Button } from '@/components/ui/button';

export default function TweetGLSLDemo() {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [processedImageUrl, setProcessedImageUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setImageUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProcessedImage = (dataUrl: string) => {
    setProcessedImageUrl(dataUrl);
  };

  const handleDownload = () => {
    if (!processedImageUrl) return;
    
    const link = document.createElement('a');
    link.href = processedImageUrl;
    link.download = 'tweet-glsl-processed.png';
    link.click();
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Tweet GLSL Image Processor Demo</h1>
      
      <div className="mb-6">
        <input 
          type="file" 
          ref={fileInputRef}
          accept="image/*" 
          className="hidden" 
          onChange={handleFileChange}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="mb-4"
        >
          Upload Image
        </Button>
        
        {imageUrl && (
          <div className="mt-4">
            <h2 className="text-lg font-semibold mb-2">Original Image</h2>
            <img 
              src={imageUrl} 
              alt="Original" 
              className="max-w-full h-auto max-h-96 rounded-md border"
            />
          </div>
        )}
      </div>
      
      {imageUrl && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">GLSL Shader Processing</h2>
          <TweetGLSLImageProcessor 
            imageUrl={imageUrl}
            onProcessedImage={handleProcessedImage}
          />
        </div>
      )}
      
      {processedImageUrl && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Processed Result</h2>
          <img 
            src={processedImageUrl} 
            alt="Processed" 
            className="max-w-full h-auto max-h-96 rounded-md border mb-4"
          />
          <Button onClick={handleDownload}>
            Download Result
          </Button>
        </div>
      )}
    </div>
  );
} 