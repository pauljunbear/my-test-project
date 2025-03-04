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
import { Download, Undo } from 'lucide-react';
import { ColorSetSelector } from './ui/color-set-selector';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

// Define types
type Effect = 'halftone' | 'duotone' | 'blackwhite' | 'sepia' | 'noise' | 'none';

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
  
  // Image upload handler with improved initialization
  const handleImageUpload = (file: File) => {
    console.log(`Starting upload for file: ${file.name} (${file.size} bytes, type: ${file.type})`);
    
    if (!file.type.startsWith('image/')) {
      console.error("Not a valid image file");
      return;
    }
    
    // Ensure all canvas references are available
    if (!canvasRef.current || !hiddenCanvasRef.current) {
      console.error("Canvas references not available at start of upload");
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
        
        // Get the canvas elements
        const canvas = canvasRef.current;
        const hiddenCanvas = hiddenCanvasRef.current;
        
        if (!canvas || !hiddenCanvas) {
          console.error("Canvas references are not available");
          return;
        }
        
        // Get the 2D contexts
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const hiddenCtx = hiddenCanvas.getContext('2d', { willReadFrequently: true });
        
        if (!ctx || !hiddenCtx) {
          console.error("Failed to get canvas contexts");
          return;
        }
        
        // Calculate appropriate dimensions
        // Hard-code reasonable dimensions for testing
        const maxWidth = 800;
        const maxHeight = 600;
        
        console.log(`Using fixed dimensions for testing: ${maxWidth}x${maxHeight}`);
        
        // Calculate scaled dimensions while maintaining aspect ratio
        let width: number, height: number;
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        
        if (aspectRatio > 1) {
          // Image is wider than tall
          width = Math.min(img.naturalWidth, maxWidth);
          height = width / aspectRatio;
          
          // If height exceeds maxHeight, scale down
          if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
          }
        } else {
          // Image is taller than wide or square
          height = Math.min(img.naturalHeight, maxHeight);
          width = height * aspectRatio;
          
          // If width exceeds maxWidth, scale down
          if (width > maxWidth) {
            width = maxWidth;
            height = width / aspectRatio;
          }
        }
        
        // Convert to integer to avoid subpixel rendering issues
        width = Math.floor(width);
        height = Math.floor(height);
        
        console.log(`Setting canvas dimensions to: ${width}x${height}`);
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        hiddenCanvas.width = width;
        hiddenCanvas.height = height;
        
        // Clear both canvases before drawing
        ctx.clearRect(0, 0, width, height);
        hiddenCtx.clearRect(0, 0, width, height);
        
        try {
          // Fill with white first to ensure background
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
          hiddenCtx.fillStyle = 'white';
          hiddenCtx.fillRect(0, 0, width, height);
          
          // Draw the image with proper scaling
          ctx.drawImage(img, 0, 0, width, height);
          console.log("Image drawn on main canvas");
          
          hiddenCtx.drawImage(img, 0, 0, width, height);
          console.log("Image drawn on hidden canvas");
          
          // CRITICAL: Use timeout to ensure the image has time to render before reading pixel data
          setTimeout(() => {
            try {
              console.log("Reading image data after timeout");
              // Store original image data for future use
              const imageData = hiddenCtx.getImageData(0, 0, width, height);
              
              // Log the first few pixels to verify data
              const firstPixels = [];
              for (let i = 0; i < 40; i += 4) {
                firstPixels.push(`(${imageData.data[i]},${imageData.data[i+1]},${imageData.data[i+2]},${imageData.data[i+3]})`);
              }
              console.log("First 10 RGBA pixels:", firstPixels.join(' '));
              
              setOriginalImageData(imageData);
              console.log(`Stored original image data: ${imageData.width}x${imageData.height}`);
              
              // Verify image data is valid
              if (imageData.data.some(val => val !== 0)) {
                console.log("Image data contains non-zero values (good)");
              } else {
                console.warn("Image data appears to be empty or all zeros");
              }
            } catch (error) {
              console.error("Error capturing image data:", error);
            }
          }, 100);
        } catch (error) {
          console.error("Error drawing image to canvas:", error);
        }
      };
      
      // Set up error handler
      img.onerror = (error) => {
        console.error("Error loading image:", error);
      };
      
      // Force CORS handling to be permissive
      img.crossOrigin = "anonymous";
      
      // Set the source to trigger loading
      img.src = e.target.result as string;
      
      // Force decode the image
      img.decode().catch(err => {
        console.error("Error decoding image:", err);
      });
    };
    
    reader.onerror = (error) => {
      console.error("Error reading file:", error);
    };
    
    reader.readAsDataURL(file);
  };
  
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
    const ctx = canvasRef.current.getContext('2d');
    const hiddenCtx = hiddenCanvasRef.current.getContext('2d');
    
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
  
  // Apply effect to history
  const handleApplyEffect = useCallback(() => {
    if (!image || currentEffect === 'none') return;
    
    let newEffect: AppliedEffect;
    
    switch (currentEffect) {
      case 'halftone':
        newEffect = {
          type: 'halftone',
          settings: halftoneSettings
        };
        break;
      case 'duotone':
        newEffect = {
          type: 'duotone',
          settings: duotoneSettings
        };
        break;
      case 'blackwhite':
        newEffect = { type: 'blackwhite', settings: {} };
        break;
      case 'sepia':
        newEffect = { type: 'sepia', settings: {} };
        break;
      case 'noise':
        newEffect = { 
          type: 'noise', 
          settings: { level: noiseLevel } 
        };
        break;
      default:
        return;
    }
    
    // Add the new effect to the list
    const newEffects = [...appliedEffects, newEffect];
    setAppliedEffects(newEffects);
    
    // Save to history
    if (canvasRef.current) {
      const newHistory: ImageHistory = {
        dataUrl: canvasRef.current.toDataURL('image/png'),
        effects: newEffects,
        timestamp: Date.now()
      };
      
      // Truncate future history if we're not at the latest point
      const newHistoryList = history.slice(0, historyIndex + 1).concat([newHistory]);
      setHistory(newHistoryList);
      setHistoryIndex(newHistoryList.length - 1);
      
      // Update original image data for next effect
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        setOriginalImageData(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
      }
    }
    
    // Reset current effect
    setCurrentEffect('none');
  }, [
    image, 
    currentEffect, 
    halftoneSettings, 
    duotoneSettings, 
    noiseLevel, 
    appliedEffects, 
    history, 
    historyIndex
  ]);
  
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
      const dataUrl = canvasRef.current.toDataURL('image/png');
      
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
      
      // Create and trigger download link
      const link = document.createElement('a');
      link.download = 'edited-image.png';
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
    ctx.putImageData(tempData, 0, 0);
    
    // Clear again and draw halftone pattern
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Set drawing style
    ctx.fillStyle = 'black';
    ctx.strokeStyle = 'black';
    
    // Angle in radians
    const radians = angle * Math.PI / 180;
    
    // Loop through the image with spacing intervals
    for (let y = spacing; y < ctx.canvas.height; y += spacing) {
      for (let x = spacing; x < ctx.canvas.width; x += spacing) {
        // Rotate coordinates
        const rotatedX = x * Math.cos(radians) - y * Math.sin(radians);
        const rotatedY = x * Math.sin(radians) + y * Math.cos(radians);
        
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
          ctx.beginPath();
          
          switch (shape) {
            case 'circle':
              ctx.arc(rotatedX, rotatedY, size, 0, Math.PI * 2);
              ctx.fill();
              break;
            case 'square':
              ctx.fillRect(rotatedX - size, rotatedY - size, size * 2, size * 2);
              break;
            case 'line':
              ctx.lineWidth = size;
              ctx.beginPath();
              ctx.moveTo(rotatedX - spacing / 2, rotatedY);
              ctx.lineTo(rotatedX + spacing / 2, rotatedY);
              ctx.stroke();
              break;
          }
        }
      }
    }
    
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
  
  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {/* Hidden canvas for processing */}
      <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />
      
      {/* Effect Navigation Bar */}
      <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
        <div className="flex space-x-2 overflow-x-auto pb-1">
          <Button
            variant={currentEffect === 'none' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('none')}
          >
            Original
          </Button>
          <Button
            variant={currentEffect === 'halftone' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('halftone')}
          >
            Halftone
          </Button>
          <Button
            variant={currentEffect === 'duotone' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('duotone')}
          >
            Duotone
          </Button>
          <Button
            variant={currentEffect === 'blackwhite' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('blackwhite')}
          >
            B&W
          </Button>
          <Button
            variant={currentEffect === 'sepia' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('sepia')}
          >
            Sepia
          </Button>
          <Button
            variant={currentEffect === 'noise' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('noise')}
          >
            Noise
          </Button>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          
          {image && (
            <Button 
              variant="outline"
              onClick={handleDownload}
              className="flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
        {/* Main image display area */}
        <div className="flex-1 flex flex-col bg-muted/20 border rounded-lg overflow-hidden">
          {!image ? (
            <div className="flex-1 flex items-center justify-center">
              <UploadDropzone
                onUpload={(file: File) => handleImageUpload(file)}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
              <div className="relative">
                {/* Debug info in development */}
                <div className="text-xs text-gray-500 mb-2 absolute top-0 left-0">
                  {process.env.NODE_ENV === 'development' && image && (
                    <span>Image: {image.naturalWidth}x{image.naturalHeight}</span>
                  )}
                </div>
                
                <canvas
                  ref={canvasRef}
                  className="shadow-md bg-white border border-gray-200"
                  style={{
                    imageRendering: 'pixelated',
                    display: 'block',
                    maxWidth: '100%',
                    maxHeight: '70vh'
                  }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Side Panel */}
        <div className="w-full md:w-80 flex-shrink-0 flex flex-col gap-4">
          {/* Applied Effects List */}
          {image && (
            <Card>
              <CardHeader>
                <CardTitle>Applied Effects</CardTitle>
              </CardHeader>
              <CardContent>
                {appliedEffects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No effects applied yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {appliedEffects.map((effect, index) => (
                      <li key={index} className="flex items-center justify-between bg-muted p-2 rounded-md">
                        <span className="capitalize">{effect.type}</span>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            const newEffects = [...appliedEffects];
                            newEffects.splice(index, 1);
                            setAppliedEffects(newEffects);
                          }}
                          className="h-8 w-8 text-destructive"
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
            <Card>
              <CardHeader>
                <CardTitle>Effect Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Effect-specific controls */}
                {currentEffect === 'halftone' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dot-size">Dot Size ({halftoneSettings.dotSize})</Label>
                      <Slider 
                        id="dot-size"
                        min={0.5} 
                        max={5} 
                        step={0.1} 
                        value={[halftoneSettings.dotSize]} 
                        onValueChange={([value]) => setHalftoneSettings({...halftoneSettings, dotSize: value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="spacing">Spacing ({halftoneSettings.spacing})</Label>
                      <Slider 
                        id="spacing"
                        min={3} 
                        max={20} 
                        step={1} 
                        value={[halftoneSettings.spacing]} 
                        onValueChange={([value]) => setHalftoneSettings({...halftoneSettings, spacing: value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="angle">Angle ({halftoneSettings.angle}°)</Label>
                      <Slider 
                        id="angle"
                        min={0} 
                        max={180} 
                        step={5} 
                        value={[halftoneSettings.angle]} 
                        onValueChange={([value]) => setHalftoneSettings({...halftoneSettings, angle: value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="shape">Shape</Label>
                      <Select
                        value={halftoneSettings.shape}
                        onValueChange={(value: 'circle' | 'square' | 'line') => 
                          setHalftoneSettings({...halftoneSettings, shape: value})
                        }
                      >
                        <SelectTrigger id="shape">
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
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="intensity">Intensity ({duotoneSettings.intensity}%)</Label>
                      <Slider 
                        id="intensity"
                        min={0} 
                        max={100} 
                        step={1} 
                        value={[duotoneSettings.intensity]} 
                        onValueChange={([value]) => setDuotoneSettings({...duotoneSettings, intensity: value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Colors</Label>
                      <div className="flex gap-4">
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
                    <Label htmlFor="noise-level">Noise Level ({noiseLevel}%)</Label>
                    <Slider 
                      id="noise-level"
                      min={1} 
                      max={100} 
                      step={1} 
                      value={[noiseLevel]} 
                      onValueChange={([value]) => setNoiseLevel(value)}
                    />
                  </div>
                )}
                
                {/* Apply Effect Button */}
                <Button 
                  onClick={handleApplyEffect} 
                  className="w-full"
                >
                  Apply Effect
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}