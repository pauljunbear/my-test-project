'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Dynamically import the ClientShaderEffects component with no SSR
const ClientShaderEffects = dynamic(() => import('./ClientShaderEffects'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] flex items-center justify-center bg-gray-50 border rounded-lg">
      <div className="flex flex-col items-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-2"></div>
        <p>Loading shader components...</p>
      </div>
    </div>
  )
});

interface ShaderEffectsWrapperProps {
  imageData: string | null;
  onProcessedImage?: (processedImageData: string) => void;
}

export default function ShaderEffectsWrapper({
  imageData,
  onProcessedImage
}: ShaderEffectsWrapperProps) {
  // State to track if we're on the client side
  const [isMounted, setIsMounted] = useState(false);

  // Only render on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // Return a placeholder during SSR
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-gray-50 border rounded-lg">
        <p className="text-gray-500">
          Shader components loading...
        </p>
      </div>
    );
  }

  // On client side, render the actual component
  return (
    <ClientShaderEffects
      imageData={imageData}
      onProcessedImage={onProcessedImage}
    />
  );
} 