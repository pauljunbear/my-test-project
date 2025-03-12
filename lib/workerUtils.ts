// Utility functions for working with Web Workers

interface ImageDataTransfer {
  width: number;
  height: number;
  data: Uint8ClampedArray | ArrayBuffer;
}

interface WorkerResponse {
  success: boolean;
  imageData?: ImageDataTransfer;
  error?: string;
}

type EffectParams = Record<string, any>;

/**
 * Creates a Web Worker for processing effects
 * This is wrapped in a function to ensure it only runs on the client side
 */
export function createEffectsWorker() {
  if (typeof window === 'undefined') {
    return null;
  }
  
  // Create worker with a URL to the worker file
  try {
    return new Worker(new URL('../workers/effectsWorker.ts', import.meta.url));
  } catch (error) {
    console.error('Failed to create Web Worker:', error);
    return null;
  }
}

/**
 * Process an effect using a Web Worker
 * @param worker The Web Worker instance
 * @param imageData The image data to process
 * @param effectType The type of effect to apply
 * @param params The parameters for the effect
 * @returns A promise that resolves with the processed image data
 */
export function processEffectWithWorker(
  worker: Worker | null,
  imageData: ImageData,
  effectType: string,
  params: EffectParams
): Promise<ImageData> {
  // If worker is not available, return the original image data
  if (!worker) {
    return Promise.resolve(imageData);
  }
  
  return new Promise((resolve, reject) => {
    // Set up message handler
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      if (!e.data.success) {
        reject(new Error(e.data.error || 'Unknown error in worker'));
        return;
      }
      
      if (!e.data.imageData) {
        reject(new Error('Worker did not return image data'));
        return;
      }
      
      // Create a new ImageData from the result
      const result = new ImageData(
        new Uint8ClampedArray(e.data.imageData.data as ArrayBuffer),
        e.data.imageData.width,
        e.data.imageData.height
      );
      
      resolve(result);
    };
    
    // Handle worker errors
    worker.onerror = (error) => {
      reject(new Error(`Worker error: ${error.message}`));
    };
    
    // Send the image data to the worker
    worker.postMessage({
      imageData: {
        width: imageData.width,
        height: imageData.height,
        data: imageData.data.buffer
      },
      effectType,
      params
    }, [imageData.data.buffer.slice(0)]); // Transfer a copy of the buffer
  });
}

/**
 * Applies an effect to an image on the main thread for fallback
 * @param imageData The image data to process
 * @param effectType The type of effect to apply
 * @param params The parameters for the effect
 * @returns The processed image data
 */
export function applyEffectOnMainThread(
  imageData: ImageData,
  effectType: string,
  params: EffectParams
): ImageData {
  // Create a copy of the image data
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return imageData; // Fallback if context can't be created
  }
  
  ctx.putImageData(imageData, 0, 0);
  const imgCopy = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Apply a simple effect as fallback
  // In a real app, you would implement the same effects as in the worker
  
  // Simple grayscale fallback
  if (effectType === 'duotone' || effectType === 'blackandwhite') {
    const data = imgCopy.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = data[i + 1] = data[i + 2] = gray;
    }
  }
  
  return imgCopy;
}

/**
 * Safely process an effect, using a Worker if available, falling back to main thread
 */
export async function applyEffect(
  imageData: ImageData,
  effectType: string,
  params: EffectParams
): Promise<ImageData> {
  try {
    // Try to create a worker
    const worker = createEffectsWorker();
    
    if (worker) {
      // Use worker if available
      return await processEffectWithWorker(worker, imageData, effectType, params);
    } else {
      // Fall back to main thread processing
      return applyEffectOnMainThread(imageData, effectType, params);
    }
  } catch (error) {
    console.error('Error applying effect:', error);
    // Return original image data on error
    return imageData;
  }
} 