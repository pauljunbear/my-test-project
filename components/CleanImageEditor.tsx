'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Undo, Crop, RefreshCw, Trash2 } from "lucide-react";

// Type definitions
type EffectType = 'none' | 'halftone' | 'duotone' | 'blackwhite' | 'sepia' | 'noise' | 'dither';

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
  type: EffectType;
  settings: EffectSettings;
}

// Add new interface for crop state
interface CropState {
  active: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

// UploadDropzone Component
const UploadDropzone = ({ onUpload }: { onUpload: (file: File) => void }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onUpload(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div
      className={`w-full max-w-md p-8 border-2 border-dashed rounded-xl transition-all duration-200 flex flex-col items-center justify-center text-center ${
        isDragging 
          ? 'border-primary bg-primary/5' 
          : 'border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <div className="w-16 h-16 mb-4 rounded-full bg-primary/10 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><line x1="16" x2="22" y1="5" y2="5"/><line x1="19" x2="19" y1="2" y2="8"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
      </div>
      <h3 className="text-lg font-medium mb-2">Upload an image</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Drag and drop an image here, or click to select
      </p>
      <p className="text-xs text-muted-foreground">
        Supports: JPG, PNG, GIF, WebP
      </p>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
};

// ColorSetSelector Component
const ColorSetSelector = ({ 
  onSelectColor, 
  onSelectPair,
  selectedColor 
}: { 
  onSelectColor: (color: string, index: 1 | 2) => void;
  onSelectPair: (color1: string, color2: string) => void;
  selectedColor?: string;
}) => {
  // Predefined color pairs for duotone effect
  const colorPairs = [
    { name: 'Blue/Yellow', color1: '#0062ff', color2: '#ffe100' },
    { name: 'Purple/Pink', color1: '#6b0096', color2: '#ff88ce' },
    { name: 'Green/Blue', color1: '#00b36b', color2: '#0097b3' },
    { name: 'Orange/Blue', color1: '#ff6b00', color2: '#0088ff' },
    { name: 'Red/Teal', color1: '#ff0062', color2: '#00ffe1' },
  ];

  // Individual colors for custom selection
  const colors = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#00ffff', '#ff00ff', '#ff6b00', '#6b00ff',
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Preset Color Pairs</Label>
        <div className="grid grid-cols-2 gap-2">
          {colorPairs.map((pair, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto py-2 px-3 flex items-center justify-between"
              onClick={() => onSelectPair(pair.color1, pair.color2)}
            >
              <span className="text-xs truncate mr-2">{pair.name}</span>
              <div className="flex">
                <div 
                  className="w-4 h-4 rounded-sm border border-gray-300 dark:border-gray-600" 
                  style={{ backgroundColor: pair.color1 }}
                />
                <div 
                  className="w-4 h-4 rounded-sm border border-gray-300 dark:border-gray-600 ml-1" 
                  style={{ backgroundColor: pair.color2 }}
                />
              </div>
            </Button>
          ))}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label className="text-xs text-muted-foreground">Custom Colors</Label>
          <div className="flex space-x-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-5 px-2 text-xs"
              onClick={() => onSelectColor('#000000', 1)}
            >
              Color 1
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-5 px-2 text-xs"
              onClick={() => onSelectColor('#ffffff', 2)}
            >
              Color 2
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {colors.map((color, index) => (
            <button
              key={index}
              className={`w-full aspect-square rounded-md border ${
                selectedColor === color 
                  ? 'ring-2 ring-primary ring-offset-2' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => onSelectColor(color, 1)}
            />
          ))}
        </div>
      </div>
      
      <div className="pt-2">
        <div className="flex space-x-2">
          <input
            type="color"
            id="color-picker-1"
            className="sr-only"
            onChange={(e) => onSelectColor(e.target.value, 1)}
          />
          <label 
            htmlFor="color-picker-1"
            className="flex-1 h-8 flex items-center justify-center text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md cursor-pointer"
          >
            Custom Color 1
          </label>
          
          <input
            type="color"
            id="color-picker-2"
            className="sr-only"
            onChange={(e) => onSelectColor(e.target.value, 2)}
          />
          <label 
            htmlFor="color-picker-2"
            className="flex-1 h-8 flex items-center justify-center text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md cursor-pointer"
          >
            Custom Color 2
          </label>
        </div>
      </div>
    </div>
  );
};

export default function CleanImageEditor() {
  // Refs for DOM elements
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // State for the app
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [appliedEffects, setAppliedEffects] = useState<AppliedEffect[]>([]);
  const [currentEffect, setCurrentEffect] = useState<EffectType>('none');
  const [history, setHistory] = useState<ImageHistory[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [currentImageDataUrl, setCurrentImageDataUrl] = useState<string | null>(null);
  
  // Add new states for cropping and resizing
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [cropState, setCropState] = useState<CropState>({
    active: false,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0
  });
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [resizeWidth, setResizeWidth] = useState<number>(0);
  const [resizeHeight, setResizeHeight] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState<boolean>(true);
  
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
      case 'dither':
        return applyDitheringEffect(ctx, imageData);
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
      case 'dither':
        currentEffectObj = { type: 'dither', settings: {} };
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
      case 'dither':
        effectSettings = {};
        break;
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

  // Effect implementation functions
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
      // Use proper grayscale conversion formula
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      
      // Luminance formula: 0.299*R + 0.587*G + 0.114*B
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      
      // Set all RGB channels to the grayscale value
      outputData[i] = gray;     // R
      outputData[i + 1] = gray; // G
      outputData[i + 2] = gray; // B
      // Keep alpha channel unchanged
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
  
  const applyNoiseEffect = (ctx: CanvasRenderingContext2D, imageData: ImageData, level: number): ImageData => {
    const outputData = new Uint8ClampedArray(imageData.data);
    const amount = level * 2.5; // Scale to appropriate noise level
    
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
  
  const applyDitheringEffect = (ctx: CanvasRenderingContext2D, imageData: ImageData): ImageData => {
    const outputData = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    
    // Floyd-Steinberg dithering algorithm
    // Convert to grayscale first
    const grayscale = new Uint8ClampedArray(imageData.width * imageData.height);
    
    // Convert to grayscale
    for (let i = 0; i < outputData.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      
      // Luminance formula: 0.299*R + 0.587*G + 0.114*B
      grayscale[i/4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }
    
    // Apply Floyd-Steinberg dithering
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const idx = y * width + x;
        const oldPixel = grayscale[idx];
        const newPixel = oldPixel > 127 ? 255 : 0;
        grayscale[idx] = newPixel;
        
        const error = oldPixel - newPixel;
        
        // Distribute error to neighboring pixels
        if (x + 1 < width) {
          grayscale[idx + 1] += error * 7 / 16;
        }
        if (y + 1 < imageData.height) {
          if (x > 0) {
            grayscale[idx + width - 1] += error * 3 / 16;
          }
          grayscale[idx + width] += error * 5 / 16;
          if (x + 1 < width) {
            grayscale[idx + width + 1] += error * 1 / 16;
          }
        }
      }
    }
    
    // Convert back to RGBA
    for (let i = 0; i < outputData.length; i += 4) {
      outputData[i] = outputData[i + 1] = outputData[i + 2] = grayscale[i/4];
    }
    
    return new ImageData(outputData, imageData.width, imageData.height);
  };

  // Function to reset the editor and allow uploading a new image
  const handleResetEditor = () => {
    if (window.confirm('Are you sure you want to remove this image? All applied effects will be lost.')) {
      setImage(null);
      setOriginalImageData(null);
      setAppliedEffects([]);
      setCurrentEffect('none');
      setHistory([]);
      setHistoryIndex(-1);
      setCurrentImageDataUrl(null);
      setIsCropping(false);
      setIsResizing(false);
      
      // Clear canvases
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      
      if (hiddenCanvasRef.current) {
        const ctx = hiddenCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, hiddenCanvasRef.current.width, hiddenCanvasRef.current.height);
      }
    }
  };

  // Start cropping mode
  const startCropping = () => {
    if (!image || !canvasRef.current) {
      console.error("Cannot start cropping: image or canvas not available");
      return;
    }
    
    console.log("Starting crop mode");
    setIsCropping(true);
    setIsResizing(false);
    
    // Set initial crop state to a default selection in the center (1/3 of the image)
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    
    console.log(`Canvas dimensions: ${width}x${height}`);
    
    const cropWidth = Math.floor(width / 3);
    const cropHeight = Math.floor(height / 3);
    
    const startX = Math.floor((width - cropWidth) / 2);
    const startY = Math.floor((height - cropHeight) / 2);
    
    setCropState({
      active: false,
      startX: startX,
      startY: startY,
      endX: startX + cropWidth,
      endY: startY + cropHeight
    });
    
    console.log(`Initial crop selection: (${startX},${startY}) to (${startX + cropWidth},${startY + cropHeight})`);
    
    // Setup crop canvas
    if (cropCanvasRef.current) {
      cropCanvasRef.current.width = canvasRef.current.width;
      cropCanvasRef.current.height = canvasRef.current.height;
      console.log(`Crop canvas dimensions set to: ${cropCanvasRef.current.width}x${cropCanvasRef.current.height}`);
      
      const ctx = cropCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvasRef.current, 0, 0);
        console.log("Image drawn to crop canvas");
        
        // Draw initial crop overlay
        setTimeout(() => {
          console.log("Drawing initial crop overlay");
          drawCropOverlay();
        }, 50);
      } else {
        console.error("Failed to get crop canvas context");
      }
    } else {
      console.error("Crop canvas ref is not available");
    }
  };
  
  // Handle mouse down for crop selection
  const handleCropMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping || !cropCanvasRef.current) {
      console.log("Mouse down ignored: not in crop mode or canvas not available");
      return;
    }
    
    const rect = cropCanvasRef.current.getBoundingClientRect();
    const scaleX = cropCanvasRef.current.width / rect.width;
    const scaleY = cropCanvasRef.current.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    console.log(`Crop selection started at (${x}, ${y})`);
    
    setCropState({
      active: true,
      startX: x,
      startY: y,
      endX: x,
      endY: y
    });
  };
  
  // Handle mouse move for crop selection
  const handleCropMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping || !cropState.active || !cropCanvasRef.current) {
      return;
    }
    
    const rect = cropCanvasRef.current.getBoundingClientRect();
    const scaleX = cropCanvasRef.current.width / rect.width;
    const scaleY = cropCanvasRef.current.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setCropState(prev => ({
      ...prev,
      endX: x,
      endY: y
    }));
    
    // Draw crop overlay
    drawCropOverlay();
  };
  
  // Handle mouse up for crop selection
  const handleCropMouseUp = () => {
    if (!isCropping) return;
    
    console.log(`Crop selection completed: (${Math.min(cropState.startX, cropState.endX)}, ${Math.min(cropState.startY, cropState.endY)}) to (${Math.max(cropState.startX, cropState.endX)}, ${Math.max(cropState.startY, cropState.endY)})`);
    
    setCropState(prev => ({
      ...prev,
      active: false
    }));
  };
  
  // Draw crop overlay
  const drawCropOverlay = () => {
    if (!cropCanvasRef.current || !canvasRef.current) return;
    
    const ctx = cropCanvasRef.current.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas and redraw image
    ctx.clearRect(0, 0, cropCanvasRef.current.width, cropCanvasRef.current.height);
    ctx.drawImage(canvasRef.current, 0, 0);
    
    // Calculate crop rectangle
    const startX = Math.min(cropState.startX, cropState.endX);
    const startY = Math.min(cropState.startY, cropState.endY);
    const width = Math.abs(cropState.endX - cropState.startX);
    const height = Math.abs(cropState.endY - cropState.startY);
    
    // Draw semi-transparent overlay with higher opacity (60% instead of default)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, cropCanvasRef.current.width, cropCanvasRef.current.height);
    
    // Clear the crop area
    ctx.clearRect(startX, startY, width, height);
    
    // Draw border around crop area with increased width and more visible color
    // First draw a slightly larger black border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.strokeRect(startX, startY, width, height);
    
    // Then draw a white border on top for contrast
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(startX, startY, width, height);
    
    // Draw corner handles with larger size
    const handleSize = 12;
    
    // Draw black outline for handles
    ctx.fillStyle = '#000000';
    // Top-left handle outline
    ctx.fillRect(startX - handleSize/2 - 1, startY - handleSize/2 - 1, handleSize + 2, handleSize + 2);
    // Top-right handle outline
    ctx.fillRect(startX + width - handleSize/2 - 1, startY - handleSize/2 - 1, handleSize + 2, handleSize + 2);
    // Bottom-left handle outline
    ctx.fillRect(startX - handleSize/2 - 1, startY + height - handleSize/2 - 1, handleSize + 2, handleSize + 2);
    // Bottom-right handle outline
    ctx.fillRect(startX + width - handleSize/2 - 1, startY + height - handleSize/2 - 1, handleSize + 2, handleSize + 2);
    
    // Draw white handles
    ctx.fillStyle = '#ffffff';
    // Top-left handle
    ctx.fillRect(startX - handleSize/2, startY - handleSize/2, handleSize, handleSize);
    // Top-right handle
    ctx.fillRect(startX + width - handleSize/2, startY - handleSize/2, handleSize, handleSize);
    // Bottom-left handle
    ctx.fillRect(startX - handleSize/2, startY + height - handleSize/2, handleSize, handleSize);
    // Bottom-right handle
    ctx.fillRect(startX + width - handleSize/2, startY + height - handleSize/2, handleSize, handleSize);
    
    // Draw dimensions text with improved visibility
    // First draw text shadow/outline
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw width x height text in the center of the selection with shadow
    const dimensionText = `${Math.round(width)} × ${Math.round(height)}`;
    // Draw text outline
    ctx.fillText(dimensionText, startX + width/2 - 1, startY + height/2 - 1);
    ctx.fillText(dimensionText, startX + width/2 + 1, startY + height/2 - 1);
    ctx.fillText(dimensionText, startX + width/2 - 1, startY + height/2 + 1);
    ctx.fillText(dimensionText, startX + width/2 + 1, startY + height/2 + 1);
    
    // Draw the actual text in white
    ctx.fillStyle = '#ffffff';
    ctx.fillText(dimensionText, startX + width/2, startY + height/2);
  };
  
  // Apply crop
  const applyCrop = () => {
    if (!isCropping || !canvasRef.current || !hiddenCanvasRef.current || !image) {
      console.error("Cannot apply crop: missing required elements");
      return;
    }
    
    console.log("Applying crop...");
    
    // Calculate crop rectangle
    const startX = Math.min(cropState.startX, cropState.endX);
    const startY = Math.min(cropState.startY, cropState.endY);
    const width = Math.abs(cropState.endX - cropState.startX);
    const height = Math.abs(cropState.endY - cropState.startY);
    
    console.log(`Crop dimensions: ${width}x${height} at (${startX},${startY})`);
    
    // Ensure we have a valid crop area
    if (width < 10 || height < 10) {
      alert('Please select a larger area to crop');
      return;
    }
    
    try {
      // Create temporary canvas for cropped image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      
      if (!tempCtx) {
        console.error("Failed to get temporary canvas context");
        return;
      }
      
      // Draw cropped portion
      tempCtx.drawImage(
        canvasRef.current,
        startX, startY, width, height,
        0, 0, width, height
      );
      
      // Create new image from cropped canvas
      const croppedImage = new Image();
      
      // Set up onload handler before setting src
      croppedImage.onload = () => {
        console.log("Cropped image loaded successfully");
        
        // Reset canvas dimensions
        canvasRef.current!.width = width;
        canvasRef.current!.height = height;
        hiddenCanvasRef.current!.width = width;
        hiddenCanvasRef.current!.height = height;
        
        // Draw cropped image to both canvases
        const ctx = canvasRef.current!.getContext('2d', { willReadFrequently: true });
        const hiddenCtx = hiddenCanvasRef.current!.getContext('2d', { willReadFrequently: true });
        
        if (ctx && hiddenCtx) {
          ctx.drawImage(croppedImage, 0, 0);
          hiddenCtx.drawImage(croppedImage, 0, 0);
          
          // Update original image data
          const newImageData = hiddenCtx.getImageData(0, 0, width, height);
          setOriginalImageData(newImageData);
          
          // Update current image data URL
          setCurrentImageDataUrl(canvasRef.current!.toDataURL('image/png'));
          
          // Update image dimensions
          const newImg = new Image();
          newImg.src = tempCanvas.toDataURL('image/png');
          newImg.onload = () => {
            setImage(newImg);
            console.log("New image set with dimensions:", newImg.width, "x", newImg.height);
          };
          
          // Reset applied effects since we're working with a new image
          setAppliedEffects([]);
          setHistory([]);
          setHistoryIndex(-1);
        } else {
          console.error("Failed to get canvas contexts after crop");
        }
        
        // Exit crop mode
        setIsCropping(false);
      };
      
      croppedImage.onerror = (err) => {
        console.error("Error loading cropped image:", err);
      };
      
      // Set the source to trigger the onload event
      const dataUrl = tempCanvas.toDataURL('image/png');
      console.log("Generated data URL length:", dataUrl.length);
      croppedImage.src = dataUrl;
      
    } catch (error) {
      console.error("Error during crop operation:", error);
    }
  };
  
  // Cancel crop
  const cancelCrop = () => {
    setIsCropping(false);
  };
  
  // Start resize mode
  const startResizing = () => {
    if (!image || !canvasRef.current) return;
    
    setIsResizing(true);
    setIsCropping(false);
    
    // Set initial resize dimensions
    setResizeWidth(canvasRef.current.width);
    setResizeHeight(canvasRef.current.height);
    setAspectRatio(canvasRef.current.width / canvasRef.current.height);
  };
  
  // Handle resize width change
  const handleResizeWidthChange = (value: number) => {
    setResizeWidth(value);
    if (maintainAspectRatio) {
      setResizeHeight(Math.round(value / aspectRatio));
    }
  };
  
  // Handle resize height change
  const handleResizeHeightChange = (value: number) => {
    setResizeHeight(value);
    if (maintainAspectRatio) {
      setResizeWidth(Math.round(value * aspectRatio));
    }
  };
  
  // Apply resize
  const applyResize = () => {
    if (!isResizing || !canvasRef.current || !hiddenCanvasRef.current || !image) return;
    
    // Create temporary canvas for resized image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = resizeWidth;
    tempCanvas.height = resizeHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) return;
    
    // Draw resized image
    tempCtx.drawImage(canvasRef.current, 0, 0, resizeWidth, resizeHeight);
    
    // Create new image from resized canvas
    const resizedImage = new Image();
    resizedImage.onload = () => {
      // Reset canvas dimensions
      canvasRef.current!.width = resizeWidth;
      canvasRef.current!.height = resizeHeight;
      hiddenCanvasRef.current!.width = resizeWidth;
      hiddenCanvasRef.current!.height = resizeHeight;
      
      // Draw resized image to both canvases
      const ctx = canvasRef.current!.getContext('2d');
      const hiddenCtx = hiddenCanvasRef.current!.getContext('2d');
      
      if (ctx && hiddenCtx) {
        ctx.drawImage(resizedImage, 0, 0);
        hiddenCtx.drawImage(resizedImage, 0, 0);
        
        // Update original image data
        const newImageData = hiddenCtx.getImageData(0, 0, resizeWidth, resizeHeight);
        setOriginalImageData(newImageData);
        
        // Update current image data URL
        setCurrentImageDataUrl(canvasRef.current!.toDataURL('image/png'));
        
        // Update image dimensions
        const newImg = new Image();
        newImg.src = tempCanvas.toDataURL('image/png');
        setImage(newImg);
        
        // Reset applied effects since we're working with a new image
        setAppliedEffects([]);
        setHistory([]);
        setHistoryIndex(-1);
      }
      
      // Exit resize mode
      setIsResizing(false);
    };
    
    resizedImage.src = tempCanvas.toDataURL('image/png');
  };
  
  // Cancel resize
  const cancelResize = () => {
    setIsResizing(false);
  };

  // Component implementation will continue...
  return (
    <div className="w-full h-full flex flex-col space-y-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 overflow-hidden">
      {/* Hidden canvas for processing */}
      <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />
      
      {/* Effect Navigation Bar */}
      <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300">
          <Button
            variant={currentEffect === 'none' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('none')}
            className="rounded-lg"
            disabled={isCropping || isResizing}
          >
            Original
          </Button>
          <Button
            variant={currentEffect === 'halftone' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('halftone')}
            className="rounded-lg"
            disabled={isCropping || isResizing}
          >
            Halftone
          </Button>
          <Button
            variant={currentEffect === 'duotone' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('duotone')}
            className="rounded-lg"
            disabled={isCropping || isResizing}
          >
            Duotone
          </Button>
          <Button
            variant={currentEffect === 'blackwhite' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('blackwhite')}
            className="rounded-lg"
            disabled={isCropping || isResizing}
          >
            B&W
          </Button>
          <Button
            variant={currentEffect === 'sepia' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('sepia')}
            className="rounded-lg"
            disabled={isCropping || isResizing}
          >
            Sepia
          </Button>
          <Button
            variant={currentEffect === 'noise' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('noise')}
            className="rounded-lg"
            disabled={isCropping || isResizing}
          >
            Noise
          </Button>
          <Button
            variant={currentEffect === 'dither' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('dither')}
            className="rounded-lg"
            disabled={isCropping || isResizing}
          >
            Dither
          </Button>
        </div>
        
        <div className="flex space-x-2">
          {image && !isCropping && !isResizing && (
            <>
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
              
              <Button
                variant="outline"
                size="icon"
                onClick={startCropping}
                title="Crop Image"
                className="rounded-lg"
              >
                <Crop className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={startResizing}
                title="Resize Image"
                className="rounded-lg"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={handleResetEditor}
                title="Remove Image"
                className="rounded-lg text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="default"
                onClick={handleDownload}
                className="flex items-center rounded-lg"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </>
          )}
          
          {isCropping && (
            <>
              <Button
                variant="default"
                onClick={() => {
                  console.log("Apply Crop button clicked");
                  applyCrop();
                }}
                className="rounded-lg bg-primary hover:bg-primary/90 text-white font-medium"
              >
                Apply Crop
              </Button>
              
              <Button
                variant="outline"
                onClick={cancelCrop}
                className="rounded-lg"
              >
                Cancel
              </Button>
            </>
          )}
          
          {isResizing && (
            <>
              <Button
                variant="default"
                onClick={applyResize}
                className="rounded-lg"
              >
                Apply Resize
              </Button>
              
              <Button
                variant="outline"
                onClick={cancelResize}
                className="rounded-lg"
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-auto">
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
              <div className="flex-1 flex items-center justify-center p-8 bg-[#f0f0f0] dark:bg-gray-900 bg-grid-pattern overflow-auto">
                <div className="relative rounded-lg overflow-hidden shadow-xl transition-all duration-300 hover:shadow-2xl">
                  {isCropping ? (
                    <canvas
                      ref={cropCanvasRef}
                      style={{
                        imageRendering: 'auto',
                        display: 'block',
                        maxWidth: '100%',
                        maxHeight: '70vh',
                        cursor: 'crosshair'
                      }}
                      onMouseDown={handleCropMouseDown}
                      onMouseMove={handleCropMouseMove}
                      onMouseUp={handleCropMouseUp}
                      onMouseLeave={handleCropMouseUp}
                    />
                  ) : (
                    <canvas
                      ref={canvasRef}
                      style={{
                        imageRendering: 'auto',
                        display: 'block',
                        maxWidth: '100%',
                        maxHeight: '70vh',
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Side Panel */}
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
          {/* Crop Controls */}
          {isCropping && image && (
            <Card className="rounded-xl shadow-sm overflow-hidden border-0">
              <CardHeader className="bg-white dark:bg-gray-800 border-b pb-3">
                <CardTitle className="text-lg font-semibold">Crop Image</CardTitle>
              </CardHeader>
              <CardContent className="bg-white dark:bg-gray-800 p-4 space-y-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="crop-width" className="text-sm font-medium">Width</Label>
                      <span className="text-xs font-medium bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-md">
                        {Math.abs(cropState.endX - cropState.startX).toFixed(0)}px
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        id="crop-width"
                        type="number"
                        min="10"
                        max={canvasRef.current?.width || 1000}
                        value={Math.abs(cropState.endX - cropState.startX).toFixed(0)}
                        onChange={(e) => {
                          const width = parseInt(e.target.value);
                          if (isNaN(width)) return;
                          
                          setCropState(prev => {
                            const startX = Math.min(prev.startX, prev.endX);
                            return {
                              ...prev,
                              endX: startX + width
                            };
                          });
                          
                          // Redraw crop overlay after state update
                          setTimeout(drawCropOverlay, 0);
                        }}
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="crop-height" className="text-sm font-medium">Height</Label>
                      <span className="text-xs font-medium bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-md">
                        {Math.abs(cropState.endY - cropState.startY).toFixed(0)}px
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        id="crop-height"
                        type="number"
                        min="10"
                        max={canvasRef.current?.height || 1000}
                        value={Math.abs(cropState.endY - cropState.startY).toFixed(0)}
                        onChange={(e) => {
                          const height = parseInt(e.target.value);
                          if (isNaN(height)) return;
                          
                          setCropState(prev => {
                            const startY = Math.min(prev.startY, prev.endY);
                            return {
                              ...prev,
                              endY: startY + height
                            };
                          });
                          
                          // Redraw crop overlay after state update
                          setTimeout(drawCropOverlay, 0);
                        }}
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-2 text-sm text-muted-foreground">
                    <p>Click and drag on the image to select crop area, or enter dimensions manually.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Resize Controls */}
          {isResizing && image && (
            <Card className="rounded-xl shadow-sm overflow-hidden border-0">
              <CardHeader className="bg-white dark:bg-gray-800 border-b pb-3">
                <CardTitle className="text-lg font-semibold">Resize Image</CardTitle>
              </CardHeader>
              <CardContent className="bg-white dark:bg-gray-800 p-4 space-y-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="resize-width" className="text-sm font-medium">Width</Label>
                      <span className="text-xs font-medium bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-md">{resizeWidth}px</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Slider 
                        id="resize-width"
                        min={50} 
                        max={Math.max(2000, canvasRef.current?.width || 0)} 
                        step={1} 
                        value={[resizeWidth]} 
                        onValueChange={([value]) => handleResizeWidthChange(value)}
                        className="flex-1"
                      />
                      <input
                        type="number"
                        min="50"
                        max={Math.max(2000, canvasRef.current?.width || 0)}
                        value={resizeWidth}
                        onChange={(e) => {
                          const width = parseInt(e.target.value);
                          if (!isNaN(width)) handleResizeWidthChange(width);
                        }}
                        className="w-20 p-1 text-sm border rounded-md"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="resize-height" className="text-sm font-medium">Height</Label>
                      <span className="text-xs font-medium bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-md">{resizeHeight}px</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Slider 
                        id="resize-height"
                        min={50} 
                        max={Math.max(2000, canvasRef.current?.height || 0)} 
                        step={1} 
                        value={[resizeHeight]} 
                        onValueChange={([value]) => handleResizeHeightChange(value)}
                        className="flex-1"
                      />
                      <input
                        type="number"
                        min="50"
                        max={Math.max(2000, canvasRef.current?.height || 0)}
                        value={resizeHeight}
                        onChange={(e) => {
                          const height = parseInt(e.target.value);
                          if (!isNaN(height)) handleResizeHeightChange(height);
                        }}
                        className="w-20 p-1 text-sm border rounded-md"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id="maintain-aspect-ratio"
                      checked={maintainAspectRatio}
                      onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="maintain-aspect-ratio" className="text-sm">Maintain aspect ratio</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Applied Effects List */}
          {image && !isResizing && (
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
          {currentEffect !== 'none' && !isCropping && !isResizing && (
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
