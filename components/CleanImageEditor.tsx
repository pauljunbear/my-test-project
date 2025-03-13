'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Undo, Crop, RefreshCw, Trash2, Image as ImageIcon, Contrast, Droplet, Wind, Feather } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
// Import the EffectsPanel component
// import EffectsPanel from './EffectsPanel';

// Type definitions
type EffectType = 'none' | 'halftone' | 'duotone' | 'blackwhite' | 'sepia' | 'noise' | 'dither' | 'exposure' | 'contrast';

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

interface ExposureSettings {
  level: number; // -100 to 100
}

interface ContrastSettings {
  level: number; // -100 to 100
}

interface EmptySettings {}

type EffectSettings = HalftoneSettings | DuotoneSettings | NoiseSettings | EmptySettings | ExposureSettings | ContrastSettings;

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
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (JPEG, PNG, GIF, WebP)');
        return;
      }
      
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds 10MB limit. Please choose a smaller file.');
        return;
      }
      
      onUpload(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds 10MB limit. Please choose a smaller file.');
        return;
      }
      
      onUpload(file);
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
        Supports: JPG, PNG, GIF, WebP (max 10MB)
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
  
  // After the noise level state
  const [exposureLevel, setExposureLevel] = useState(0);
  const [contrastLevel, setContrastLevel] = useState(0);
  
  // Use debounce for better performance
  const debouncedHalftoneSettings = useDebounce(halftoneSettings, 50);
  const debouncedDuotoneSettings = useDebounce(duotoneSettings, 50);
  const debouncedNoiseLevel = useDebounce(noiseLevel, 50);
  
  // Debounce function for handling frequent updates
  function useDebounce<T>(value: T, delay: number = 50): T {
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
      case 'dither':
        return applyDitheringEffect(ctx, imageData);
      case 'exposure':
        return applyExposureEffect(ctx, imageData, (settings as ExposureSettings).level);
      case 'contrast':
        return applyContrastEffect(ctx, imageData, (settings as ContrastSettings).level);
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
      case 'exposure':
        currentEffectObj = { type: 'exposure', settings: { level: exposureLevel } };
        break;
      case 'contrast':
        currentEffectObj = { type: 'contrast', settings: { level: contrastLevel } };
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
    applyEffect,
    exposureLevel,
    contrastLevel
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
    image,
    exposureLevel,
    contrastLevel
  ]);

  // Function to render all effects to the canvas
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
  
  // Color selection handlers for duotone effect
  const handleColorSelect = (color: string, index: 1 | 2) => {
    if (index === 1) {
      setDuotoneSettings({
        ...duotoneSettings,
        color1: color
      });
    } else {
      setDuotoneSettings({
        ...duotoneSettings,
        color2: color
      });
    }
  };
  
  const handleDuotonePairSelect = (color1: string, color2: string) => {
    setDuotoneSettings({
      ...duotoneSettings,
      color1,
      color2
    });
  };
  
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
      case 'exposure':
        effectSettings = { level: exposureLevel };
        break;
      case 'contrast':
        effectSettings = { level: contrastLevel };
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
  }, [currentEffect, halftoneSettings, duotoneSettings, noiseLevel, exposureLevel, contrastLevel, addToHistory, currentImageDataUrl]);

  // Handle undo action
  const handleUndo = () => {
    if (history.length <= 1) return;
    
    // Remove the last item from history
    const newHistory = [...history];
    newHistory.pop();
    
    // Update the history and applied effects
    setHistory(newHistory);
    setAppliedEffects(newHistory[newHistory.length - 1]?.effects || []);
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
      
      // Create a download URL
      const dataUrl = canvasRef.current.toDataURL('image/png', 1.0); // Use max quality
      
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
  
  // Function to reset the editor and allow uploading a new image
  const handleResetEditor = () => {
    setImage(null);
    setOriginalImageData(null);
    setAppliedEffects([]);
    setCurrentEffect('none');
    setHistory([]);
    setHistoryIndex(-1);
    setCurrentImageDataUrl(null);
    setIsCropping(false);
    setIsResizing(false);
  };
  
  // Start cropping mode
  const startCropping = () => {
    setIsCropping(true);
    
    // Make sure crop canvas is prepared
    setTimeout(() => {
      if (canvasRef.current && cropCanvasRef.current) {
        // Copy current canvas to crop canvas
        const ctx = cropCanvasRef.current.getContext('2d');
        if (ctx) {
          cropCanvasRef.current.width = canvasRef.current.width;
          cropCanvasRef.current.height = canvasRef.current.height;
          ctx.drawImage(canvasRef.current, 0, 0);
        }
      }
    }, 50);
  };
  
  // Apply crop to the image
  const applyCrop = () => {
    if (!canvasRef.current || !cropCanvasRef.current) return;
    
    const { startX, startY, endX, endY } = cropState;
    
    // Ensure proper crop coordinates (handle if user dragged in reverse)
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    
    // Check if crop area is valid
    if (width < 10 || height < 10) {
      console.error("Crop area is too small");
      setIsCropping(false);
      return;
    }
    
    try {
      // Get crop canvas context
      const cropCtx = cropCanvasRef.current.getContext('2d');
      if (!cropCtx) return;
      
      // Get the image data for the cropped region
      const cropData = cropCtx.getImageData(x, y, width, height);
      
      // Get the main canvas context
      const mainCtx = canvasRef.current.getContext('2d');
      if (!mainCtx) return;
      
      // Create a temporary canvas for the cropped image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;
      
      // Draw the cropped image data to the temporary canvas
      tempCtx.putImageData(cropData, 0, 0);
      
      // Resize the main canvas to the crop dimensions
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      
      // Clear and draw the cropped image
      mainCtx.clearRect(0, 0, width, height);
      mainCtx.drawImage(tempCanvas, 0, 0);
      
      // Update image data for effects
      const newImageData = mainCtx.getImageData(0, 0, width, height);
      setOriginalImageData(newImageData);
      
      // Take a snapshot of the cropped image
      const dataUrl = canvasRef.current.toDataURL('image/png');
      setCurrentImageDataUrl(dataUrl);
      
      // Add to history
      addToHistory(dataUrl, appliedEffects);
      
      // Exit crop mode
      setIsCropping(false);
      
      // Reset crop state
      setCropState({
        active: false,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0
      });
      
      console.log(`Image cropped to ${width}x${height}`);
    } catch (error) {
      console.error("Error applying crop:", error);
    }
  };
  
  // Cancel cropping mode
  const cancelCrop = () => {
    setIsCropping(false);
  };
  
  // Start resize mode
  const startResizing = () => {
    if (!canvasRef.current) return;
    
    setResizeWidth(canvasRef.current.width);
    setResizeHeight(canvasRef.current.height);
    setAspectRatio(canvasRef.current.width / canvasRef.current.height);
    setIsResizing(true);
  };
  
  // Mark these functions as intentionally unused
  // These functions are part of the resize functionality which is currently not active in the UI
  // They will be used in a future update for the resize controls
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const handleResizeWidthChange = (value: number) => {
    setResizeWidth(value);
    if (maintainAspectRatio) {
      setResizeHeight(Math.round(value / aspectRatio));
    }
  };

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const handleResizeHeightChange = (value: number) => {
    setResizeHeight(value);
    if (maintainAspectRatio) {
      setResizeWidth(Math.round(value * aspectRatio));
    }
  };

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const handleMaintainAspectRatio = (value: boolean) => {
    setMaintainAspectRatio(value);
    if (value && resizeWidth && resizeHeight) {
      // Update aspect ratio to match current dimensions
      setAspectRatio(resizeWidth / resizeHeight);
    }
  };
  
  // Apply resize to the image
  const applyResize = () => {
    if (!canvasRef.current || !originalImageData) return;
    
    try {
      // Create temporary canvas for resizing
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = resizeWidth;
      tempCanvas.height = resizeHeight;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (!tempCtx) {
        console.error("Could not get temporary canvas context");
        return;
      }
      
      // Draw current canvas to temporary canvas with new dimensions
      tempCtx.drawImage(canvasRef.current, 0, 0, resizeWidth, resizeHeight);
      
      // Resize main canvas
      canvasRef.current.width = resizeWidth;
      canvasRef.current.height = resizeHeight;
      
      // Get main canvas context
      const mainCtx = canvasRef.current.getContext('2d');
      if (!mainCtx) {
        console.error("Could not get main canvas context");
        return;
      }
      
      // Draw resized image back to main canvas
      mainCtx.drawImage(tempCanvas, 0, 0);
      
      // Get new image data
      const newImageData = mainCtx.getImageData(0, 0, resizeWidth, resizeHeight);
      
      // Update image data
      setOriginalImageData(newImageData);
      
      // Take a snapshot of the resized image
      const dataUrl = canvasRef.current.toDataURL('image/png');
      setCurrentImageDataUrl(dataUrl);
      
      // Add to history
      addToHistory(dataUrl, appliedEffects);
      
      // Exit resize mode
      setIsResizing(false);
      
      console.log(`Image resized to ${resizeWidth}x${resizeHeight}`);
    } catch (error) {
      console.error("Error applying resize:", error);
    }
  };
  
  // Cancel resize
  const cancelResize = () => {
    setIsResizing(false);
  };
  
  // Handle crop mouse down
  const handleCropMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropCanvasRef.current) return;
    
    const rect = cropCanvasRef.current.getBoundingClientRect();
    const scaleX = cropCanvasRef.current.width / rect.width;
    const scaleY = cropCanvasRef.current.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setCropState({
      active: true,
      startX: x,
      startY: y,
      endX: x,
      endY: y
    });
  };
  
  // Handle crop mouse move
  const handleCropMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropState.active || !cropCanvasRef.current) return;
    
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
  
  // Handle crop mouse up
  const handleCropMouseUp = () => {
    setCropState(prev => ({
      ...prev,
      active: false
    }));
  };
  
  // Draw crop overlay
  const drawCropOverlay = () => {
    if (!cropCanvasRef.current) return;
    
    const ctx = cropCanvasRef.current.getContext('2d');
    if (!ctx) return;
    
    const { startX, startY, endX, endY } = cropState;
    
    // Ensure proper crop coordinates (handle if user dragged in reverse)
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    
    // Redraw the image from original canvas
    if (canvasRef.current) {
      ctx.clearRect(0, 0, cropCanvasRef.current.width, cropCanvasRef.current.height);
      ctx.drawImage(canvasRef.current, 0, 0);
    }
    
    // Draw crop guide - semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, cropCanvasRef.current.width, cropCanvasRef.current.height);
    
    // Clear the selection area
    ctx.clearRect(x, y, width, height);
    
    // Draw border around selection
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    
    // Draw corner handles
    const handleSize = 8;
    const handles = [
      { x: x - handleSize / 2, y: y - handleSize / 2 },  // top-left
      { x: x + width - handleSize / 2, y: y - handleSize / 2 },  // top-right
      { x: x + width - handleSize / 2, y: y + height - handleSize / 2 },  // bottom-right
      { x: x - handleSize / 2, y: y + height - handleSize / 2 }   // bottom-left
    ];
    
    ctx.fillStyle = '#fff';
    handles.forEach(handle => {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
    });
    
    // Draw dimensions label
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    const dimensionsText = `${Math.round(width)} × ${Math.round(height)}`;
    const textWidth = ctx.measureText(dimensionsText).width;
    
    // Position text at the top center of selection
    ctx.fillText(
      dimensionsText,
      x + (width - textWidth) / 2,
      y - 10
    );
  };
  
  // Add effect implementations
  const applyHalftoneEffect = (ctx: CanvasRenderingContext2D, imageData: ImageData, settings: HalftoneSettings): ImageData => {
    console.log('Applying halftone effect with settings:', settings);
    const { dotSize, spacing, angle, shape } = settings;
    
    // Create a temporary canvas for processing
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) {
      console.error('Could not get temporary canvas context');
      return imageData;
    }
    
    // Draw the original image data to the temporary canvas
    tempCtx.putImageData(imageData, 0, 0);
    
    // Create a new canvas for the halftone effect
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = imageData.width;
    outputCanvas.height = imageData.height;
    const outputCtx = outputCanvas.getContext('2d');
    
    if (!outputCtx) {
      console.error('Could not get output canvas context');
      return imageData;
    }
    
    // Fill with white background
    outputCtx.fillStyle = 'white';
    outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
    
    // Set drawing style
    outputCtx.fillStyle = 'black';
    outputCtx.strokeStyle = 'black';
    
    // Angle in radians
    const radians = angle * Math.PI / 180;
    
    // Loop through the image with spacing intervals
    for (let y = 0; y < imageData.height; y += spacing) {
      for (let x = 0; x < imageData.width; x += spacing) {
        // Get the pixel data at this position
        const pixelData = tempCtx.getImageData(x, y, 1, 1).data;
        
        // Calculate grayscale value
        const r = pixelData[0] / 255;
        const g = pixelData[1] / 255;
        const b = pixelData[2] / 255;
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Calculate dot size based on gray value (invert for proper effect)
        // Darker areas should have larger dots
        const size = dotSize * (1 - gray);
        
        if (size > 0) {
          outputCtx.save();
          
          // Translate to the dot position
          outputCtx.translate(x, y);
          
          // Apply rotation if needed
          if (angle !== 0) {
            outputCtx.rotate(radians);
          }
          
          // Draw the appropriate shape
          switch (shape) {
            case 'circle':
              outputCtx.beginPath();
              outputCtx.arc(0, 0, size, 0, Math.PI * 2);
              outputCtx.fill();
              break;
            case 'square':
              outputCtx.fillRect(-size, -size, size * 2, size * 2);
              break;
            case 'line':
              outputCtx.lineWidth = size;
              outputCtx.beginPath();
              outputCtx.moveTo(-spacing / 2, 0);
              outputCtx.lineTo(spacing / 2, 0);
              outputCtx.stroke();
              break;
          }
          
          outputCtx.restore();
        }
      }
    }
    
    // Get the final image data from the output canvas
    return outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
  };

  const applyDuotoneEffect = (ctx: CanvasRenderingContext2D, imageData: ImageData, settings: DuotoneSettings): ImageData => {
    console.log('Applying duotone effect with settings:', settings);
    const { color1, color2, intensity } = settings;
    
    // Parse colors to RGB components
    const parseColor = (color: string) => {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
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
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Convert to grayscale using the precise formula 
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      
      // Normalize to 0-1 range
      const normalizedGray = gray / 255;
      
      // Apply intensity adjustment
      const intensityFactor = intensity / 100;
      const adjustedGray = Math.pow(normalizedGray, 1 - intensityFactor * 0.5);
      
      // Map the grayscale value to the two colors
      // p' = (1 - gray) × c1 + gray × c2
      const r_out = Math.round((1 - adjustedGray) * c1[0] + adjustedGray * c2[0]);
      const g_out = Math.round((1 - adjustedGray) * c1[1] + adjustedGray * c2[1]);
      const b_out = Math.round((1 - adjustedGray) * c1[2] + adjustedGray * c2[2]);
      
      // Set the output pixel values
      outputData[i] = r_out;
      outputData[i + 1] = g_out;
      outputData[i + 2] = b_out;
      outputData[i + 3] = data[i + 3]; // Keep original alpha
    }
    
    return new ImageData(outputData, imageData.width, imageData.height);
  };

  const applyBlackAndWhiteEffect = (ctx: CanvasRenderingContext2D, imageData: ImageData): ImageData => {
    console.log('Applying black and white effect');
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = avg;
      data[i + 1] = avg;
      data[i + 2] = avg;
    }
    return imageData;
  };

  const applySepiaEffect = (ctx: CanvasRenderingContext2D, imageData: ImageData): ImageData => {
    console.log('Applying sepia effect');
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
      data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
      data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
    }
    return imageData;
  };

  const applyNoiseEffect = (ctx: CanvasRenderingContext2D, imageData: ImageData, level: number): ImageData => {
    console.log('Applying noise effect with level:', level);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * level;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    return imageData;
  };

  const applyDitheringEffect = (ctx: CanvasRenderingContext2D, imageData: ImageData): ImageData => {
    console.log('Applying dithering effect');
    
    // Create a copy of the image data to work with
    const outputData = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    
    // Convert to grayscale first
    for (let i = 0; i < outputData.length; i += 4) {
      const r = outputData[i];
      const g = outputData[i + 1];
      const b = outputData[i + 2];
      
      // Standard grayscale conversion
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      outputData[i] = outputData[i + 1] = outputData[i + 2] = gray;
    }
    
    // Apply Floyd-Steinberg dithering algorithm
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        
        // Get current pixel value
        const oldPixel = outputData[index];
        
        // Determine new pixel value (0 or 255)
        const newPixel = oldPixel < 128 ? 0 : 255;
        
        // Set the new pixel value
        outputData[index] = outputData[index + 1] = outputData[index + 2] = newPixel;
        
        // Calculate quantization error
        const error = oldPixel - newPixel;
        
        // Distribute error to neighboring pixels using Floyd-Steinberg algorithm
        if (x + 1 < width) {
          // Right pixel
          outputData[(y * width + x + 1) * 4] += error * 7 / 16;
          outputData[(y * width + x + 1) * 4 + 1] += error * 7 / 16;
          outputData[(y * width + x + 1) * 4 + 2] += error * 7 / 16;
        }
        
        if (y + 1 < height) {
          if (x - 1 >= 0) {
            // Bottom-left pixel
            outputData[((y + 1) * width + x - 1) * 4] += error * 3 / 16;
            outputData[((y + 1) * width + x - 1) * 4 + 1] += error * 3 / 16;
            outputData[((y + 1) * width + x - 1) * 4 + 2] += error * 3 / 16;
          }
          
          // Bottom pixel
          outputData[((y + 1) * width + x) * 4] += error * 5 / 16;
          outputData[((y + 1) * width + x) * 4 + 1] += error * 5 / 16;
          outputData[((y + 1) * width + x) * 4 + 2] += error * 5 / 16;
          
          if (x + 1 < width) {
            // Bottom-right pixel
            outputData[((y + 1) * width + x + 1) * 4] += error * 1 / 16;
            outputData[((y + 1) * width + x + 1) * 4 + 1] += error * 1 / 16;
            outputData[((y + 1) * width + x + 1) * 4 + 2] += error * 1 / 16;
          }
        }
      }
    }
    
    return new ImageData(outputData, width, height);
  };

  const applyExposureEffect = (ctx: CanvasRenderingContext2D, imageData: ImageData, level: number): ImageData => {
    console.log('Applying exposure effect with level:', level);
    const data = imageData.data;
    const factor = 1 + level / 100; // Convert from -100/100 to appropriate multiplier
    
    for (let i = 0; i < data.length; i += 4) {
      // Apply exposure adjustment to RGB channels
      data[i] = Math.min(255, Math.max(0, Math.round(data[i] * factor)));
      data[i + 1] = Math.min(255, Math.max(0, Math.round(data[i + 1] * factor)));
      data[i + 2] = Math.min(255, Math.max(0, Math.round(data[i + 2] * factor)));
      // Alpha channel remains unchanged
    }
    
    return imageData;
  };

  const applyContrastEffect = (ctx: CanvasRenderingContext2D, imageData: ImageData, level: number): ImageData => {
    console.log('Applying contrast effect with level:', level);
    const data = imageData.data;
    
    // Normalize level from -100/100 to a reasonable contrast factor
    // This formula gives a good range of contrast adjustment
    const factor = (259 * (level + 255)) / (255 * (259 - level));
    
    for (let i = 0; i < data.length; i += 4) {
      // Apply contrast adjustment to RGB channels
      data[i] = Math.min(255, Math.max(0, Math.round(factor * (data[i] - 128) + 128)));
      data[i + 1] = Math.min(255, Math.max(0, Math.round(factor * (data[i + 1] - 128) + 128)));
      data[i + 2] = Math.min(255, Math.max(0, Math.round(factor * (data[i + 2] - 128) + 128)));
      // Alpha channel remains unchanged
    }
    
    return imageData;
  };
  
  // Now use handleResizeWidthChange and handleResizeHeightChange in the component
  // In appropriate UI element handlers
  
  // Component implementation will continue...
  return (
    <div className="w-full h-full flex flex-col space-y-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 overflow-hidden">
      {/* Hidden canvas for processing */}
      <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />
      
      {/* Effect Navigation Bar - Always visible regardless of if image is uploaded */}
      <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300">
          <Button
            variant={currentEffect === 'none' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('none')}
            className="rounded-lg"
            disabled={isCropping || isResizing}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Original
          </Button>
          <Button
            variant={currentEffect === 'halftone' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('halftone')}
            className="rounded-lg"
            disabled={isCropping || isResizing}
          >
            <Droplet className="h-4 w-4 mr-2" />
            Halftone
          </Button>
          <Button
            variant={currentEffect === 'duotone' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('duotone')}
            className="rounded-lg"
            disabled={isCropping || isResizing}
          >
            <Feather className="h-4 w-4 mr-2" />
            Duotone
          </Button>
          <Button
            variant={currentEffect === 'blackwhite' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('blackwhite')}
            className="rounded-lg"
            disabled={isCropping || isResizing}
          >
            <Contrast className="h-4 w-4 mr-2" />
            B&W
          </Button>
          <Button
            variant={currentEffect === 'sepia' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('sepia')}
            className="rounded-lg"
            disabled={isCropping || isResizing}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Sepia
          </Button>
          <Button
            variant={currentEffect === 'noise' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('noise')}
            className="rounded-lg"
            disabled={isCropping || isResizing}
          >
            <Wind className="h-4 w-4 mr-2" />
            Noise
          </Button>
          <Button
            variant={currentEffect === 'dither' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('dither')}
            className="rounded-lg"
            disabled={isCropping || isResizing}
          >
            <Wind className="h-4 w-4 mr-2" />
            Dithering
          </Button>
          <Button
            variant={currentEffect === 'exposure' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('exposure')}
            className="rounded-lg"
            disabled={isCropping || isResizing}
          >
            <Contrast className="h-4 w-4 mr-2" />
            Exposure
          </Button>
          <Button
            variant={currentEffect === 'contrast' ? 'default' : 'outline'}
            onClick={() => setCurrentEffect('contrast')}
            className="rounded-lg"
            disabled={isCropping || isResizing}
          >
            <Contrast className="h-4 w-4 mr-2" />
            Contrast
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
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4">
          {/* Effect Controls Panel - Show based on the selected effect */}
          {currentEffect !== 'none' && image && (
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
                
                {currentEffect === 'exposure' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="exposure-level" className="text-sm font-medium">Exposure Level</Label>
                      <span className="text-xs font-medium bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-md">{exposureLevel}%</span>
                    </div>
                    <Slider 
                      id="exposure-level"
                      min={-100} 
                      max={100} 
                      step={1} 
                      value={[exposureLevel]} 
                      onValueChange={([value]) => setExposureLevel(value)}
                      className="mt-1"
                    />
                  </div>
                )}
                
                {currentEffect === 'contrast' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="contrast-level" className="text-sm font-medium">Contrast Level</Label>
                      <span className="text-xs font-medium bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-md">{contrastLevel}%</span>
                    </div>
                    <Slider 
                      id="contrast-level"
                      min={-100} 
                      max={100} 
                      step={1} 
                      value={[contrastLevel]} 
                      onValueChange={([value]) => setContrastLevel(value)}
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
          
          {/* Applied Effects List */}
          {image && appliedEffects.length > 0 && (
            <Card className="rounded-xl shadow-sm overflow-hidden border-0">
              <CardHeader className="bg-white dark:bg-gray-800 border-b pb-3">
                <CardTitle className="text-lg font-semibold">Applied Effects</CardTitle>
              </CardHeader>
              <CardContent className="bg-white dark:bg-gray-800 p-4">
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
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
