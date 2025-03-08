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

  // Run only on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHasWindow(true);
    }
  }, []);

  if (!hasWindow) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-gray-50 border rounded-lg">
        <p>Preparing shader effects...</p>
      </div>
    );
  }

  return <ShaderEffects imageData={imageData} onProcessedImage={onProcessedImage} />;
} 