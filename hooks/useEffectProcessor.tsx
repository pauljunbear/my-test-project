import { useState, useEffect, useCallback } from 'react';
import { createEffectsWorker, applyEffect } from '../lib/workerUtils';

interface UseEffectProcessorOptions {
  initialImageData?: ImageData | null;
}

interface EffectProcessorResult {
  imageData: ImageData | null;
  processedImageData: ImageData | null;
  processingEffect: boolean;
  error: string | null;
  setImageData: (imageData: ImageData | null) => void;
  processEffect: (effectType: string, params: Record<string, any>) => Promise<ImageData | null>;
  resetToOriginal: () => void;
}

/**
 * Custom hook for processing image effects
 */
export function useEffectProcessor(options: UseEffectProcessorOptions = {}): EffectProcessorResult {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(options.initialImageData || null);
  const [processedImageData, setProcessedImageData] = useState<ImageData | null>(null);
  const [processingEffect, setProcessingEffect] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the Web Worker
  useEffect(() => {
    // Only create worker in browser environment
    if (typeof window !== 'undefined') {
      const newWorker = createEffectsWorker();
      setWorker(newWorker);
      
      // Cleanup function to terminate worker when component unmounts
      return () => {
        if (newWorker) {
          newWorker.terminate();
        }
      };
    }
  }, []);

  // Update processed image data when original image data changes
  useEffect(() => {
    if (imageData) {
      setProcessedImageData(imageData);
    } else {
      setProcessedImageData(null);
    }
  }, [imageData]);

  // Reset to original image
  const resetToOriginal = useCallback(() => {
    if (imageData) {
      setProcessedImageData(imageData);
      setError(null);
    }
  }, [imageData]);

  // Process an effect
  const processEffect = useCallback(
    async (effectType: string, params: Record<string, any>): Promise<ImageData | null> => {
      if (!processedImageData) {
        setError('No image data to process');
        return null;
      }

      setProcessingEffect(true);
      setError(null);

      try {
        // Create a copy of the image data to avoid modifying the original
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Could not create canvas context');
        }
        
        canvas.width = processedImageData.width;
        canvas.height = processedImageData.height;
        ctx.putImageData(processedImageData, 0, 0);
        
        const imgCopy = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Process the effect
        const result = await applyEffect(imgCopy, effectType, params);
        
        // Update state with the result
        setProcessedImageData(result);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error processing effect';
        setError(errorMessage);
        console.error('Error processing effect:', err);
        return null;
      } finally {
        setProcessingEffect(false);
      }
    },
    [processedImageData]
  );

  return {
    imageData,
    processedImageData,
    processingEffect,
    error,
    setImageData,
    processEffect,
    resetToOriginal
  };
} 