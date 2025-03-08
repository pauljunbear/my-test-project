'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Import ShaderEffects component with SSR disabled
const ShaderEffects = dynamic(() => import('./ShaderEffects'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] flex items-center justify-center bg-gray-50 border rounded-lg">
      <div className="flex flex-col items-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-2"></div>
        <p>Loading shader effects...</p>
      </div>
    </div>
  ),
});

interface ClientShaderEffectsProps {
  imageData: string | null;
  onProcessedImage?: (processedImageData: string) => void;
}

export default function ClientShaderEffects({ imageData, onProcessedImage }: ClientShaderEffectsProps) {
  const [hasWindow, setHasWindow] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Run only on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHasWindow(true);
      
      // Add global error handler for shader-related errors
      const errorHandler = (event: ErrorEvent) => {
        console.error('Shader error caught:', event.error);
        if (event.error && event.error.toString().includes('WebGL') || 
            event.error && event.error.toString().includes('removeChild')) {
          setHasError(true);
          event.preventDefault(); // Prevent default error handling
        }
      };
      
      window.addEventListener('error', errorHandler);
      
      return () => {
        window.removeEventListener('error', errorHandler);
      };
    }
  }, []);

  if (hasError) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-red-50 border border-red-200 rounded-lg">
        <div className="flex flex-col items-center text-center p-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 mb-4">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h3 className="text-lg font-medium text-red-800 mb-2">WebGL Error Occurred</h3>
          <p className="text-sm text-red-700 mb-4">
            There was an error with the shader effects. This could be due to WebGL compatibility issues or memory constraints.
          </p>
          <button 
            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md transition-colors"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (!hasWindow) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-gray-50 border rounded-lg">
        <p>Preparing shader effects...</p>
      </div>
    );
  }

  return (
    <div className="shader-effects-wrapper">
      <ShaderEffects imageData={imageData} onProcessedImage={onProcessedImage} />
    </div>
  );
} 