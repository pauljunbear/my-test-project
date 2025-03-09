"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UploadDropzone } from './ui/upload-dropzone';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Label } from './ui/label';
import { Download, Undo, Wand2 } from 'lucide-react';
import { ColorSetSelector } from './ui/color-set-selector';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import HalftoneWaveEffect from './HalftoneWaveEffect';

// Define types
type Effect = 'halftone' | 'duotone' | 'blackwhite' | 'sepia' | 'noise' | 'wavehalftone' | 'none';

interface HalftoneSettings {
  dotSize: number;
  spacing: number;
  angle: number;
  shape: 'circle' | 'square' | 'line';
}

interface DuotoneSettings {
  color1: string;
  color2: string;
  intensity: number;
}

interface NoiseSettings {
  level: number;
}

interface EmptySettings {}

type EffectSettings = HalftoneSettings | DuotoneSettings | NoiseSettings | EmptySettings;

interface ImageHistory {
  dataUrl: string;
  effects: AppliedEffect[];
  timestamp: number;
}

interface AppliedEffect {
  type: Effect;
  settings: EffectSettings;
}

export default function ImageEditorComponent() {
  // Refs for DOM elements
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // State for the app
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [appliedEffects, setAppliedEffects] = useState<AppliedEffect[]>([]);
  const [currentEffect, setCurrentEffect] = useState<Effect>('none');
  const [history, setHistory] = useState<ImageHistory[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [currentImageDataUrl, setCurrentImageDataUrl] = useState<string | null>(null);
  
  // Effect settings state
  const [halftoneSettings, setHalftoneSettings] = useState<HalftoneSettings>({
    dotSize: 2,
    spacing: 5,
    angle: 45,
    shape: 'circle'
  });
  
  const [duotoneSettings, setDuotoneSettings] = useState<DuotoneSettings>({
    color1: '#000000',
    color2: '#ffffff',
    intensity: 100
  });
  
  const [noiseLevel, setNoiseLevel] = useState<number>(20);
  
  // Use debounce for better performance
  const debouncedHalftoneSettings = useDebounce(halftoneSettings, 200);
  const debouncedDuotoneSettings = useDebounce(duotoneSettings, 200);
  const debouncedNoiseLevel = useDebounce(noiseLevel, 200);
  
  // Debounce function for handling frequent updates
  function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    
    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
      
      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);
    
    return debouncedValue;
  }
  
  // Use effect to handle initialization
  useEffect(() => {
    console.log("Component initialized");
  }, []);
  
  // Function to add current state to history
  const addToHistory = useCallback((dataUrl: string, effects: AppliedEffect[]) => {
    if (!canvasRef.current) return;
    
    try {
      // Create new history entry
      const newHistory: ImageHistory = {
        dataUrl,
        effects,
        timestamp: Date.now()
      };
      
      // Truncate future history if we're not at the latest point
      const newHistoryList = history.slice(0, historyIndex + 1).concat([newHistory]);
      setHistory(newHistoryList);
      setHistoryIndex(newHistoryList.length - 1);
      
      console.log("Added to history, new length:", newHistoryList.length);
    } catch (error) {
      console.error("Error adding to history:", error);
    }
  }, [history, historyIndex]);
  
  // Image upload handler with improved initialization
  const handleImageUpload = useCallback((file: File) => {
    console.log(`Starting upload for file: ${file.name} (${file.size} bytes, type: ${file.type})`);
    
    // Check file size - limit to 10MB
    if (file.size > 10 * 1024 * 1024) {
      console.error("File is too large. Maximum size is 10MB.");
      // You could add a UI notification here
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      console.error("Not a valid image file");
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      if (!e.target?.result) {
        console.error("FileReader result is null");
        return;
      }
      
      console.log("FileReader loaded successfully");
      
      // Create a new image object to get dimensions
      const img = new Image();
      
      // Set up onload handler before setting src
      img.onload = () => {
        console.log(`Image loaded with natural dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
        
        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
          console.error("Image has invalid dimensions (0 width or height)");
          return;
        }
        
        // Store the image for later use
        setImage(img);
        
        // Reset all effects and state
        setAppliedEffects([]);
        setCurrentEffect('none');
        setHistory([]);
        setHistoryIndex(-1);
        
        // Use setTimeout to ensure the canvas refs are available after state updates
        setTimeout(() => {
          // Get the canvas elements
          const canvas = canvasRef.current;
          const hiddenCanvas = hiddenCanvasRef.current;
          
          if (!canvas || !hiddenCanvas) {
            console.error("Canvas references are not available after delay");
            return;
          }
          
          // Get the 2D contexts
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          const hiddenCtx = hiddenCanvas.getContext('2d', { willReadFrequently: true });
          
          if (!ctx || !hiddenCtx) {
            console.error("Failed to get canvas contexts");
            return;
          }
          
          console.log(`Original image dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
          
          // Use original dimensions in high-res mode
          let width: number, height: number;
          width = img.naturalWidth;
          height = img.naturalHeight;
          
          // Convert to integer to avoid subpixel rendering issues
          width = Math.floor(width);
          height = Math.floor(height);
          
          console.log(`Setting canvas dimensions to: ${width}x${height}`);
          
          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;
          hiddenCanvas.width = width;
          hiddenCanvas.height = height;
          
          // Fill with white background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          hiddenCtx.fillStyle = '#FFFFFF';
          hiddenCtx.fillRect(0, 0, width, height);
          
          // Draw the image to the canvas
          try {
            ctx.drawImage(img, 0, 0, width, height);
            
            // Also draw to hidden canvas for processing
            hiddenCtx.drawImage(img, 0, 0, width, height);
            
            // Get image data from hidden canvas
            const imageData = hiddenCtx.getImageData(0, 0, width, height);
            setOriginalImageData(imageData);
            
            // Inside handleImageUpload, before the return:
            setTimeout(() => {
              if (canvasRef.current) {
                setCurrentImageDataUrl(canvasRef.current.toDataURL('image/png'));
              }
            }, 200);
          } catch (error) {
            console.error("Error drawing image:", error);
          }
        }, 100); // Small delay to ensure state updates have completed
      };
      
      img.src = e.target.result as string;
    };
    
    reader.onerror = (e) => {
      console.error("FileReader error:", e);
    };
    
    reader.readAsDataURL(file);
  }, [canvasRef, hiddenCanvasRef]);
  
  // Function to apply a single effect to image data
  const applyEffect = useCallback((imageData: ImageData, effect: AppliedEffect): ImageData => {
    const { type, settings } = effect;
    
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return imageData;
    
    ctx.putImageData(imageData, 0, 0);
    
    console.log(`Applying effect: ${type} with settings:`, settings);
    
    switch (type) {
      case 'halftone':
        return applyHalftoneEffect(ctx, imageData, settings as HalftoneSettings);
      case 'duotone':
        return applyDuotoneEffect(ctx, imageData, settings as DuotoneSettings);
      case 'blackwhite':
        return applyBlackAndWhiteEffect(ctx, imageData);
      case 'sepia':
        return applySepiaEffect(ctx, imageData);
      case 'noise':
        return applyNoiseEffect(ctx, imageData, (settings as NoiseSettings).level);
      default:
        return imageData;
    }
  }, []);
  
  // Reset to original image before applying new effect
  const resetToOriginal = useCallback(() => {
    if (canvasRef.current && originalImageData) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.putImageData(originalImageData, 0, 0);
        return true;
      }
    }
    return false;
  }, [originalImageData]);
  
  // Apply effect with reset first
  const applyEffectWithReset = useCallback(() => {
    if (!image || !resetToOriginal()) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let currentEffectObj: AppliedEffect | null = null;
    
    switch (currentEffect) {
      case 'halftone':
        currentEffectObj = {
          type: 'halftone',
          settings: debouncedHalftoneSettings
        };
        break;
      case 'duotone':
        currentEffectObj = {
          type: 'duotone',
          settings: debouncedDuotoneSettings
        };
        break;
      case 'blackwhite':
        currentEffectObj = { type: 'blackwhite', settings: {} };
        break;
      case 'sepia':
        currentEffectObj = { type: 'sepia', settings: {} };
        break;
      case 'noise':
        currentEffectObj = { 
          type: 'noise', 
          settings: { level: debouncedNoiseLevel } 
        };
        break;
      default:
        return;
    }
    
    if (currentEffectObj) {
      imageData = applyEffect(imageData, currentEffectObj);
      ctx.putImageData(imageData, 0, 0);
    }
  }, [
    image, 
    currentEffect, 
    debouncedHalftoneSettings, 
    debouncedDuotoneSettings, 
    debouncedNoiseLevel,
    resetToOriginal,
    applyEffect
  ]);
  
  // Effect to update canvas when effects or settings change
  useEffect(() => {
    if (currentEffect === 'none' || !image) {
      resetToOriginal();
      return;
    }
    
    // Apply live preview effect
    applyEffectWithReset();
  }, [
    currentEffect, 
    debouncedHalftoneSettings, 
    debouncedDuotoneSettings, 
    debouncedNoiseLevel,
    resetToOriginal,
    applyEffectWithReset,
    image
  ]);
  
  // Improved renderAllEffects function
  const renderAllEffects = useCallback(() => {
    console.log("Rendering all effects to canvas");
    
    // Verify required resources are available
    if (!canvasRef.current || !hiddenCanvasRef.current) {
      console.error("Canvas refs not available for rendering effects");
      return;
    }
    
    if (!originalImageData || !image) {
      console.error("Original image data or image not available");
      return;
    }
    
    // Get the 2D rendering contexts
    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
    const hiddenCtx = hiddenCanvasRef.current.getContext('2d', { willReadFrequently: true });
    
    if (!ctx || !hiddenCtx) {
      console.error("Failed to get 2D contexts");
      return;
    }
    
    console.log(`Canvas dimensions: ${canvasRef.current.width}x${canvasRef.current.height}`);
    console.log(`Original image data dimensions: ${originalImageData.width}x${originalImageData.height}`);
    
    try {
      // Ensure canvas dimensions match the original image data
      if (hiddenCanvasRef.current.width !== originalImageData.width ||
          hiddenCanvasRef.current.height !== originalImageData.height) {
        console.log("Adjusting canvas dimensions to match original image data");
        hiddenCanvasRef.current.width = originalImageData.width;
        hiddenCanvasRef.current.height = originalImageData.height;
        canvasRef.current.width = originalImageData.width;
        canvasRef.current.height = originalImageData.height;
      }
      
      // Fill with white background first
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      hiddenCtx.fillStyle = '#FFFFFF';
      hiddenCtx.fillRect(0, 0, hiddenCanvasRef.current.width, hiddenCanvasRef.current.height);
      
      // Reset to original image
      hiddenCtx.putImageData(originalImageData, 0, 0);
      
      // Process any applied effects
      let processedImageData = originalImageData;
      
      console.log(`Applying ${appliedEffects.length} effects`);
      
      // Apply each effect in sequence
      for (let i = 0; i < appliedEffects.length; i++) {
        const effect = appliedEffects[i];
        console.log(`Applying effect ${i + 1}: ${effect.type}`);
        processedImageData = applyEffect(processedImageData, effect);
      }
      
      // Verify processed data dimensions
      console.log(`Processed image data dimensions: ${processedImageData.width}x${processedImageData.height}`);
      
      // Draw the processed image on the visible canvas
      ctx.putImageData(processedImageData, 0, 0);
      console.log("Final image rendered to visible canvas");
    } catch (error) {
      console.error("Error rendering effects:", error);
    }
  }, [appliedEffects, originalImageData, image, applyEffect]);
  
  // Update canvas when applied effects change
  useEffect(() => {
    if (originalImageData && image) {
      console.log("Effects changed, re-rendering canvas");
      renderAllEffects();
    }
  }, [appliedEffects, originalImageData, image, renderAllEffects]);
  
  // Handle apply effect button click
  const handleApplyEffect = useCallback(() => {
    if (!currentEffect || currentEffect === 'none') return;
    
    let effectSettings: EffectSettings;
    
    // Construct the appropriate settings based on the current effect
    switch (currentEffect) {
      case 'halftone':
        effectSettings = halftoneSettings;
        break;
      case 'duotone':
        effectSettings = duotoneSettings;
        break;
      case 'noise':
        effectSettings = { level: noiseLevel };
        break;
      case 'wavehalftone':
        // For wavehalftone effects, we don't add them here
        // They're handled by the HalftoneWaveEffect component's onProcessedImage callback
        console.log('Wavehalftone effect is applied directly via HalftoneWaveEffect component');
        return;
      default:
        effectSettings = {};
    }
    
    // Create a new effect
    const newEffect: AppliedEffect = {
      type: currentEffect,
      settings: effectSettings
    };
    
    // Add to applied effects
    setAppliedEffects(prev => [...prev, newEffect]);
    
    // Add to history
    if (currentImageDataUrl) {
      addToHistory(currentImageDataUrl, [newEffect]);
    } else {
      console.warn('No current image data URL available for history');
    }
    
    console.log(`Applied ${currentEffect} effect`, newEffect);
  }, [currentEffect, halftoneSettings, duotoneSettings, noiseLevel, addToHistory, currentImageDataUrl]);
  
  // Handle undo action
  const handleUndo = () => {
    if (history.length <= 1) return;
    
    // Remove the last item from history
    const newHistory = [...history];
    newHistory.pop();
    
    // Update the history and applied effects
    setHistory(newHistory);
    setAppliedEffects(newHistory[newHistory.length - 1].effects);
  };
  
  // Color selection handlers for duotone effect
  const handleColorSelect = (color: string) => {
    setDuotoneSettings({
      ...duotoneSettings,
      color1: color
    });
  };
  
  const handleDuotonePairSelect = (color1: string, color2: string) => {
    setDuotoneSettings({
      ...duotoneSettings,
      color1,
      color2
    });
  };
  
  // Download the edited image
  const handleDownload = () => {
    if (!canvasRef.current) {
      console.error("Canvas reference is not available for download");
      return;
    }
    
    try {
      console.log("Preparing image for download");
      console.log(`Canvas dimensions: ${canvasRef.current.width}x${canvasRef.current.height}`);
      
      // Ensure the canvas has content by rendering all effects again
      renderAllEffects();
      
      // Create a download URL
      const dataUrl = canvasRef.current.toDataURL('image/png', 1.0); // Use max quality
      
      // Check if dataUrl is valid
      if (!dataUrl || dataUrl === 'data:,') {
        console.error("Generated data URL is empty or invalid");
        return;
      }
      
      // Basic check to ensure it's not just a white image
      if (dataUrl === 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2NgAAIAAAUAAR4f7BQAAAAASUVORK5CYII=') {
        console.error("Generated image appears to be blank or all white");
      } else {
        console.log("DataURL generated successfully, length:", dataUrl.length);
      }
      
      // Generate a filename with original dimensions and applied effects
      let filename = 'edited-image';
      
      // Include information about applied effects if any
      if (appliedEffects.length > 0) {
        const effectNames = appliedEffects.map(effect => effect.type).join('-');
        filename += `-${effectNames}`;
      }
      
      // Include dimensions
      if (canvasRef.current) {
        filename += `-${canvasRef.current.width}x${canvasRef.current.height}`;
      }
      
      // Add extension
      filename += '.png';
      
      // Create and trigger download link
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log("Download initiated successfully");
    } catch (error) {
      console.error("Error during image download:", error);
    }
  };
  
  const applyHalftoneEffect = (ctx: CanvasRenderingContext2D, imageData: ImageData, settings: HalftoneSettings): ImageData => {
    const { dotSize, spacing, angle, shape } = settings;
    
    // Create a Bayer matrix for ordered dithering (4x4)
    const bayerMatrix4x4 = [
      [ 1,  9,  3, 11],
      [13,  5, 15,  7],
      [ 4, 12,  2, 10],
      [16,  8, 14,  6]
    ].map(row => row.map(val => val / 17)); // Normalize to [0, 1] range
    
    // Convert to grayscale first
    const grayscaleData = new Uint8ClampedArray(imageData.data);
    for (let i = 0; i < grayscaleData.length; i += 4) {
      // Apply grayscale formula: gray = 0.299 × r + 0.587 × g + 0.114 × b
      const r = grayscaleData[i] / 255;
      const g = grayscaleData[i + 1] / 255;
      const b = grayscaleData[i + 2] / 255;
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      
      const grayValue = Math.round(gray * 255);
      grayscaleData[i] = grayscaleData[i + 1] = grayscaleData[i + 2] = grayValue;
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Create a new ImageData with grayscale values
    const tempData = new ImageData(grayscaleData, imageData.width, imageData.height);
    
    // First draw the grayscale version as a base
    ctx.putImageData(tempData, 0, 0);
    
    // Create an offscreen canvas for the halftone pattern
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = ctx.canvas.width;
    offscreenCanvas.height = ctx.canvas.height;
    const offCtx = offscreenCanvas.getContext('2d');
    
    if (!offCtx) {
      console.error('Could not get offscreen canvas context');
      return imageData;
    }
    
    // Clear offscreen canvas
    offCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    
    // Fill with white background
    offCtx.fillStyle = 'white';
    offCtx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    
    // Set drawing style
    offCtx.fillStyle = 'black';
    offCtx.strokeStyle = 'black';
    
    // Angle in radians
    const radians = angle * Math.PI / 180;
    
    // Loop through the image with spacing intervals (using original coordinates)
    for (let y = 0; y < ctx.canvas.height; y += spacing) {
      for (let x = 0; x < ctx.canvas.width; x += spacing) {
        // Sample the grayscale value at this point
        const pixelIndex = (Math.floor(y) * imageData.width + Math.floor(x)) * 4;
        
        // Apply Bayer dithering
        const i = Math.floor(y) % 4;
        const j = Math.floor(x) % 4;
        const threshold = bayerMatrix4x4[i][j];
        
        const grayValue = grayscaleData[pixelIndex] / 255;
        
        // Calculate size based on gray value (invert for proper effect)
        // Use dithering threshold to create a more detailed pattern
        const size = dotSize * (grayValue > threshold ? (1 - grayValue) * 0.8 + 0.2 : 0);
        
        if (size > 0) {
          offCtx.save();
          
          // First translate to where the dot should be
          offCtx.translate(x, y);
          
          // Only apply rotation if needed
          if (angle !== 0) {
            // For individual elements, rotate around their center
            offCtx.rotate(radians);
          }
          
          offCtx.beginPath();
          
          switch (shape) {
            case 'circle':
              offCtx.arc(0, 0, size, 0, Math.PI * 2);
              offCtx.fill();
              break;
            case 'square':
              offCtx.fillRect(-size, -size, size * 2, size * 2);
              break;
            case 'line':
              offCtx.lineWidth = size;
              offCtx.beginPath();
              offCtx.moveTo(-spacing / 2, 0);
              offCtx.lineTo(spacing / 2, 0);
              offCtx.stroke();
              break;
          }
          
          offCtx.restore();
        }
      }
    }
    
    // Draw the halftone pattern from the offscreen canvas onto the main canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(offscreenCanvas, 0, 0);
    
    // Return the new image data
    return ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  };
  
  const applyDuotoneEffect = (ctx: CanvasRenderingContext2D, imageData: ImageData, settings: DuotoneSettings): ImageData => {
    const { color1, color2, intensity } = settings;
    
    // Parse colors to RGB components
    const parseColor = (color: string) => {
      const r = parseInt(color.slice(1, 3), 16) / 255;
      const g = parseInt(color.slice(3, 5), 16) / 255;
      const b = parseInt(color.slice(5, 7), 16) / 255;
      return [r, g, b];
    };
    
    const c1 = parseColor(color1); // Shadow color
    const c2 = parseColor(color2); // Highlight color
    
    // Create a new array for the modified pixel data
    const data = imageData.data;
    const outputData = new Uint8ClampedArray(data.length);
    
    // Apply the duotone effect to each pixel
    for (let i = 0; i < data.length; i += 4) {
      // Get the RGB values for the current pixel
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      
      // Convert to grayscale using the precise formula 
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      
      // Apply intensity adjustment
      const adjustedGray = Math.pow(gray, (intensity / 50) * 0.8 + 0.6);
      
      // Map the grayscale value to the two colors
      // p' = (1 - gray) × c1 + gray × c2
      const r_out = Math.round(((1 - adjustedGray) * c1[0] + adjustedGray * c2[0]) * 255);
      const g_out = Math.round(((1 - adjustedGray) * c1[1] + adjustedGray * c2[1]) * 255);
      const b_out = Math.round(((1 - adjustedGray) * c1[2] + adjustedGray * c2[2]) * 255);
      
      // Set the output pixel values
      outputData[i] = r_out;
      outputData[i + 1] = g_out;
      outputData[i + 2] = b_out;
      outputData[i + 3] = data[i + 3]; // Keep original alpha
    }
    
    return new ImageData(outputData, imageData.width, imageData.height);
  };
  
  const applyBlackAndWhiteEffect = (ctx: CanvasRenderingContext2D, imageData: ImageData): ImageData => {
    const outputData = new Uint8ClampedArray(imageData.data);
    
    for (let i = 0; i < outputData.length; i += 4) {
      const avg = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
      outputData[i] = outputData[i + 1] = outputData[i + 2] = avg;
    }
    
    return new ImageData(outputData, imageData.width, imageData.height);
  };
  
  const applySepiaEffect = (ctx: CanvasRenderingContext2D, imageData: ImageData): ImageData => {
    const outputData = new Uint8ClampedArray(imageData.data);
    
    for (let i = 0; i < outputData.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      
      outputData[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
      outputData[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
      outputData[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
    }
    
    return new ImageData(outputData, imageData.width, imageData.height);
  };
  
  const applyNoiseEffect = (ctx: CanvasRenderingContext2D, imageData: ImageData, settings: number): ImageData => {
    const outputData = new Uint8ClampedArray(imageData.data);
    const amount = settings * 50; // Scale to appropriate noise level
    
    for (let i = 0; i < outputData.length; i += 4) {
      // Generate random noise
      const noise = Math.random() * amount - amount / 2;
      
      // Add noise to each channel
      outputData[i] = Math.min(255, Math.max(0, imageData.data[i] + noise));
      outputData[i + 1] = Math.min(255, Math.max(0, imageData.data[i + 1] + noise));
      outputData[i + 2] = Math.min(255, Math.max(0, imageData.data[i + 2] + noise));
    }
    
    return new ImageData(outputData, imageData.width, imageData.height);
  };
  
  // Add a function to handle processed images from shader effects
  const handleProcessedImage = (processedImageData: string) => {
    if (!canvasRef.current || !hiddenCanvasRef.current) return;
    
    // Create a temporary image from processed data
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Get the canvas contexts
      const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
      const hiddenCtx = hiddenCanvasRef.current?.getContext('2d', { willReadFrequently: true });
      
      if (!ctx || !hiddenCtx || !canvasRef.current || !hiddenCanvasRef.current) return;
      
      // Clear the canvases
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      hiddenCtx.clearRect(0, 0, hiddenCanvasRef.current.width, hiddenCanvasRef.current.height);
      
      // Draw the processed image to the canvas at correct dimensions
      ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
      hiddenCtx.drawImage(img, 0, 0, hiddenCanvasRef.current.width, hiddenCanvasRef.current.height);
      
      // Update current image data URL
      setCurrentImageDataUrl(processedImageData);
      
      // Create a meaningful shader effect entry based on active shader effects
      const shaderEffect: AppliedEffect = {
        type: 'wavehalftone',
        settings: {}
      };
      
      // Add to history
      addToHistory(processedImageData, [shaderEffect]);
      
      // Add to applied effects if Apply button is clicked
      if (currentEffect === 'wavehalftone') {
        setAppliedEffects([...appliedEffects, shaderEffect]);
      }
    };
    
    img.onerror = (error) => {
      console.error("Error loading processed shader image:", error);
    };
    
    img.src = processedImageData;
  };
  
  return (
    <div className="w-full h-full flex flex-col space-y-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Hidden canvas for processing */}
      <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />
      
      {/* Effect Navigation Bar */}
      <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300">
          <Button
            variant={currentEffect === 'none' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('none')}
            className="rounded-lg"
          >
            Original
          </Button>
          <Button
            variant={currentEffect === 'halftone' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('halftone')}
            className="rounded-lg"
          >
            Halftone
          </Button>
          <Button
            variant={currentEffect === 'duotone' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('duotone')}
            className="rounded-lg"
          >
            Duotone
          </Button>
          <Button
            variant={currentEffect === 'blackwhite' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('blackwhite')}
            className="rounded-lg"
          >
            B&W
          </Button>
          <Button
            variant={currentEffect === 'sepia' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('sepia')}
            className="rounded-lg"
          >
            Sepia
          </Button>
          <Button
            variant={currentEffect === 'noise' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('noise')}
            className="rounded-lg"
          >
            Noise
          </Button>
          <Button
            variant={currentEffect === 'wavehalftone' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('wavehalftone')}
            className="rounded-lg"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Wavehalftone
          </Button>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Undo"
            className="rounded-lg"
          >
            <Undo className="h-4 w-4" />
          </Button>
          
          {image && (
            <Button 
              variant="default"
              onClick={handleDownload}
              className="flex items-center rounded-lg"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Main image display area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 border rounded-xl shadow-sm overflow-hidden">
          {!image ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <UploadDropzone
                onUpload={(file: File) => handleImageUpload(file)}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
                <h2 className="text-sm font-medium">Image Preview</h2>
                <span className="text-xs text-muted-foreground">
                  {canvasRef.current?.width || 0} × {canvasRef.current?.height || 0}
                </span>
              </div>
              <div className="flex-1 flex items-center justify-center p-8 bg-[#f0f0f0] dark:bg-gray-900 bg-grid-pattern">
                <div className="relative rounded-lg overflow-hidden shadow-xl transition-all duration-300 hover:shadow-2xl">
                  <canvas
                    ref={canvasRef}
                    style={{
                      imageRendering: 'auto',
                      display: 'block',
                      maxWidth: '100%',
                      maxHeight: '70vh',
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Side Panel */}
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4">
          {/* Applied Effects List */}
          {image && (
            <Card className="rounded-xl shadow-sm overflow-hidden border-0">
              <CardHeader className="bg-white dark:bg-gray-800 border-b pb-3">
                <CardTitle className="text-lg font-semibold">Applied Effects</CardTitle>
              </CardHeader>
              <CardContent className="bg-white dark:bg-gray-800 p-4">
                {appliedEffects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                    <p className="text-sm text-muted-foreground">No effects applied yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">Select an effect from the top bar and apply it to your image.</p>
                  </div>
                ) : (
                  <ul className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {appliedEffects.map((effect, index) => (
                      <li key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                        <div className="flex items-center min-w-0 overflow-hidden">
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mr-2"></div>
                          <span className="capitalize font-medium truncate">{effect.type}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            const newEffects = [...appliedEffects];
                            newEffects.splice(index, 1);
                            setAppliedEffects(newEffects);
                          }}
                          className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive rounded-full ml-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Effect Controls Panel */}
          {currentEffect !== 'none' && (
            <Card className="rounded-xl shadow-sm overflow-hidden border-0">
              <CardHeader className="bg-white dark:bg-gray-800 border-b pb-3">
                <CardTitle className="text-lg font-semibold">
                  <span className="capitalize">{currentEffect}</span> Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-white dark:bg-gray-800 p-4 space-y-5">
                {/* Effect-specific controls */}
                {currentEffect === 'halftone' && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="dot-size" className="text-sm font-medium">Dot Size</Label>
                        <span className="text-xs font-medium bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-md">{halftoneSettings.dotSize}</span>
                      </div>
                      <Slider 
                        id="dot-size"
                        min={0.5} 
                        max={5} 
                        step={0.1} 
                        value={[halftoneSettings.dotSize]} 
                        onValueChange={([value]) => setHalftoneSettings({...halftoneSettings, dotSize: value})}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="spacing" className="text-sm font-medium">Spacing</Label>
                        <span className="text-xs font-medium bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-md">{halftoneSettings.spacing}</span>
                      </div>
                      <Slider 
                        id="spacing"
                        min={3} 
                        max={20} 
                        step={1} 
                        value={[halftoneSettings.spacing]} 
                        onValueChange={([value]) => setHalftoneSettings({...halftoneSettings, spacing: value})}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="angle" className="text-sm font-medium">Angle</Label>
                        <span className="text-xs font-medium bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-md">{halftoneSettings.angle}°</span>
                      </div>
                      <Slider 
                        id="angle"
                        min={0} 
                        max={180} 
                        step={5} 
                        value={[halftoneSettings.angle]} 
                        onValueChange={([value]) => setHalftoneSettings({...halftoneSettings, angle: value})}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="shape" className="text-sm font-medium">Shape</Label>
                      <Select
                        value={halftoneSettings.shape}
                        onValueChange={(value: 'circle' | 'square' | 'line') => 
                          setHalftoneSettings({...halftoneSettings, shape: value})
                        }
                      >
                        <SelectTrigger id="shape" className="mt-1">
                          <SelectValue placeholder="Select shape" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="circle">Circle</SelectItem>
                          <SelectItem value="square">Square</SelectItem>
                          <SelectItem value="line">Line</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                
                {currentEffect === 'duotone' && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="intensity" className="text-sm font-medium">Intensity</Label>
                        <span className="text-xs font-medium bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-md">{duotoneSettings.intensity}%</span>
                      </div>
                      <Slider 
                        id="intensity"
                        min={0} 
                        max={100} 
                        step={1} 
                        value={[duotoneSettings.intensity]} 
                        onValueChange={([value]) => setDuotoneSettings({...duotoneSettings, intensity: value})}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Colors</Label>
                      <div className="mt-1">
                        <ColorSetSelector 
                          onSelectColor={handleColorSelect}
                          onSelectPair={handleDuotonePairSelect}
                          selectedColor={duotoneSettings.color1}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {currentEffect === 'noise' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="noise-level" className="text-sm font-medium">Noise Level</Label>
                      <span className="text-xs font-medium bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-md">{noiseLevel}%</span>
                    </div>
                    <Slider 
                      id="noise-level"
                      min={1} 
                      max={100} 
                      step={1} 
                      value={[noiseLevel]} 
                      onValueChange={([value]) => setNoiseLevel(value)}
                      className="mt-1"
                    />
                  </div>
                )}
                
                {currentEffect === 'wavehalftone' && image && (
                  <HalftoneWaveEffect 
                    imageUrl={currentImageDataUrl || ''}
                    onProcessedImage={handleProcessedImage}
                  />
                )}
                
                {/* Apply Effect Button */}
                <Button 
                  onClick={handleApplyEffect} 
                  className="w-full mt-4 rounded-lg"
                >
                  Apply {currentEffect === 'blackwhite' ? 'B&W' : currentEffect.charAt(0).toUpperCase() + currentEffect.slice(1)} Effect
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}