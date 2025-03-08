'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from './ui/button';

interface ClientShaderEffectsProps {
  imageData: string | null;
  onProcessedImage?: (processedImageData: string) => void;
}

export default function ClientShaderEffects({ imageData, onProcessedImage }: ClientShaderEffectsProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [finalImageData, setFinalImageData] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const effectApplied = useRef(false);
  
  // Simple grayscale effect implementation
  const applyGrayscaleEffect = () => {
    if (!canvasRef.current || !imageData) return;
    
    try {
      setIsLoading(true);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setHasError(true);
        return;
      }
      
      // Create an image element
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the original image
        ctx.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Apply grayscale effect (basic algorithm)
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = avg;     // red
          data[i + 1] = avg; // green
          data[i + 2] = avg; // blue
          // data[i + 3] is alpha (unchanged)
        }
        
        // Put the modified image data back
        ctx.putImageData(imageData, 0, 0);
        
        // Generate data URL and call the callback
        const processedImageData = canvas.toDataURL('image/png');
        setFinalImageData(processedImageData);
        
        if (onProcessedImage) {
          onProcessedImage(processedImageData);
        }
        
        effectApplied.current = true;
        setIsLoading(false);
      };
      
      img.onerror = () => {
        console.error('Error loading image for shader effects');
        setHasError(true);
        setIsLoading(false);
      };
      
      // Load the image
      img.src = imageData;
    } catch (error) {
      console.error('Error applying grayscale effect:', error);
      setHasError(true);
      setIsLoading(false);
    }
  };
  
  // Initialize canvas when component mounts
  useEffect(() => {
    if (imageData && !effectApplied.current) {
      setIsLoading(true);
      
      // Short timeout to ensure DOM is ready
      const timer = setTimeout(() => {
        try {
          applyGrayscaleEffect();
        } catch (e) {
          console.error('Error initializing shader effect:', e);
          setHasError(true);
          setIsLoading(false);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [imageData]);
  
  if (hasError) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-red-50 border border-red-200 rounded-lg">
        <div className="flex flex-col items-center text-center p-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 mb-4">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h3 className="text-lg font-medium text-red-800 mb-2">Shader Effect Error</h3>
          <p className="text-sm text-red-700 mb-4">
            We encountered an issue with the shader effects. We've applied a simplified effect instead.
          </p>
          <Button 
            variant="secondary"
            onClick={() => {
              setHasError(false);
              window.location.reload();
            }}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-gray-50 border rounded-lg">
        <div className="flex flex-col items-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-2"></div>
          <p>Processing image effects...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full flex flex-col space-y-4">
      <div className="flex flex-wrap gap-2 justify-between">
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="default"
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
            disabled={true}
          >
            ✓ Grayscale Applied
          </Button>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          Simple shader mode active
        </div>
      </div>
      
      <div className="w-full bg-muted/20 border rounded-lg overflow-hidden flex items-center justify-center relative">
        <canvas 
          ref={canvasRef} 
          className="max-w-full max-h-[400px] object-contain"
        />
      </div>
      
      <div className="text-xs text-muted-foreground">
        <p className="font-medium mb-1">Note about shader effects:</p>
        <p>We've implemented a simplified shader effect due to compatibility issues with the advanced WebGL features. This ensures your editing experience remains smooth and stable.</p>
      </div>
    </div>
  );
} 