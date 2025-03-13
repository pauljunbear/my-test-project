import { useState, useRef, useCallback } from 'react';
import { SafeCanvasRenderingContext2D, AppliedEffect } from '../types';

interface ImageProcessingState {
  image: HTMLImageElement | null;
  originalImageData: ImageData | null;
  currentImageDataUrl: string | null;
  isProcessing: boolean;
  error: string | null;
}

interface UseImageProcessingReturn extends ImageProcessingState {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  hiddenCanvasRef: React.RefObject<HTMLCanvasElement>;
  processImage: (file: File) => Promise<void>;
  applyEffects: (effects: AppliedEffect[]) => Promise<void>;
  resetToOriginal: () => boolean;
  getImageDimensions: () => { width: number; height: number } | null;
  downloadImage: (filename?: string) => void;
}

export const useImageProcessing = (): UseImageProcessingReturn => {
  const [state, setState] = useState<ImageProcessingState>({
    image: null,
    originalImageData: null,
    currentImageDataUrl: null,
    isProcessing: false,
    error: null,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);

  const getContext = useCallback((canvas: HTMLCanvasElement): SafeCanvasRenderingContext2D | null => {
    return canvas.getContext('2d', { willReadFrequently: true }) as SafeCanvasRenderingContext2D | null;
  }, []);

  const processImage = useCallback(async (file: File): Promise<void> => {
    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      const imageUrl = URL.createObjectURL(file);
      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      if (!canvasRef.current || !hiddenCanvasRef.current) {
        throw new Error('Canvas references not available');
      }

      const canvas = canvasRef.current;
      const ctx = getContext(canvas);
      const hiddenCanvas = hiddenCanvasRef.current;
      const hiddenCtx = getContext(hiddenCanvas);

      if (!ctx || !hiddenCtx) {
        throw new Error('Unable to get canvas context');
      }

      // Set canvas dimensions
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      hiddenCanvas.width = img.naturalWidth;
      hiddenCanvas.height = img.naturalHeight;

      // Draw image on both canvases
      ctx.drawImage(img, 0, 0);
      hiddenCtx.drawImage(img, 0, 0);

      // Store original image data
      const originalImageData = hiddenCtx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);

      setState(prev => ({
        ...prev,
        image: img,
        originalImageData,
        currentImageDataUrl: canvas.toDataURL('image/png'),
        isProcessing: false,
        error: null,
      }));

      URL.revokeObjectURL(imageUrl);
    } catch (error) {
      console.error('Error processing image:', error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Error processing image',
      }));
    }
  }, [getContext]);

  const applyEffects = useCallback(async (effects: AppliedEffect[]): Promise<void> => {
    if (!state.originalImageData || !canvasRef.current) {
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      const canvas = canvasRef.current;
      const ctx = getContext(canvas);

      if (!ctx) {
        throw new Error('Unable to get canvas context');
      }

      // Start with original image
      ctx.putImageData(state.originalImageData, 0, 0);

      // Apply each effect in sequence
      for (const effect of effects) {
        // Here you would call your effect functions
        // This is just a placeholder - actual effect application would be implemented elsewhere
        console.log('Applying effect:', effect.type, effect.settings);
      }

      setState(prev => ({
        ...prev,
        currentImageDataUrl: canvas.toDataURL('image/png'),
        isProcessing: false,
      }));
    } catch (error) {
      console.error('Error applying effects:', error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Error applying effects',
      }));
    }
  }, [state.originalImageData, getContext]);

  const resetToOriginal = useCallback((): boolean => {
    if (!state.originalImageData || !canvasRef.current) {
      return false;
    }

    const ctx = getContext(canvasRef.current);
    if (!ctx) {
      return false;
    }

    ctx.putImageData(state.originalImageData, 0, 0);
    return true;
  }, [state.originalImageData, getContext]);

  const getImageDimensions = useCallback(() => {
    if (!canvasRef.current) {
      return null;
    }

    return {
      width: canvasRef.current.width,
      height: canvasRef.current.height,
    };
  }, []);

  const downloadImage = useCallback((filename: string = 'edited-image.png') => {
    if (!canvasRef.current) {
      return;
    }

    try {
      const dataUrl = canvasRef.current.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading image:', error);
      setState(prev => ({
        ...prev,
        error: 'Error downloading image',
      }));
    }
  }, []);

  return {
    ...state,
    canvasRef,
    hiddenCanvasRef,
    processImage,
    applyEffects,
    resetToOriginal,
    getImageDimensions,
    downloadImage,
  };
}; 