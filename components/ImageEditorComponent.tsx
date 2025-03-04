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
  // Canvas references
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
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
  
  // Image upload handler with fixed scaling
  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        setImage(img);
        
        // Reset all effects and state
        setAppliedEffects([]);
        setCurrentEffect('none');
        setHistory([]);
        setHistoryIndex(-1);
        
        // Initialize canvas with proper scaling
        if (canvasRef.current && hiddenCanvasRef.current) {
          const canvas = canvasRef.current;
          const hiddenCanvas = hiddenCanvasRef.current;
          const ctx = canvas.getContext('2d');
          const hiddenCtx = hiddenCanvas.getContext('2d');
          
          if (ctx && hiddenCtx) {
            // Get the container dimensions
            const container = canvas.parentElement?.parentElement?.parentElement;
            if (!container) return;
            
            // Get the actual available space
            const containerWidth = container.clientWidth - 48; // Account for padding
            const containerHeight = container.clientHeight - 48;
            
            // Calculate dimensions while maintaining aspect ratio
            const imageAspectRatio = img.width / img.height;
            const containerAspectRatio = containerWidth / containerHeight;
            
            let width, height;
            
            if (imageAspectRatio > containerAspectRatio) {
              // Image is wider than container
              width = containerWidth;
              height = containerWidth / imageAspectRatio;
            } else {
              // Image is taller than container
              height = containerHeight;
              width = containerHeight * imageAspectRatio;
            }
            
            // Set canvas dimensions
            canvas.width = width;
            canvas.height = height;
            hiddenCanvas.width = width;
            hiddenCanvas.height = height;
            
            // Clear and draw image
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            
            // Also draw on hidden canvas
            hiddenCtx.clearRect(0, 0, width, height);
            hiddenCtx.drawImage(img, 0, 0, width, height);
            
            // Store the original image data
            const imageData = ctx.getImageData(0, 0, width, height);
            setOriginalImageData(imageData);
            
            console.log("Image loaded successfully:", width, height);
          }
        }
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.readAsDataURL(file);
  };
  
  // Function to apply a single effect to image data
  const applyEffect = (imageData: ImageData, effect: AppliedEffect): ImageData => {
    const { type, settings } = effect;
    
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return imageData;
    
    ctx.putImageData(imageData, 0, 0);
    
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
  };
  
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
  
  // Effect application functions
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
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = 'edited-image.png';
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  };
  
  // Render all applied effects to the canvas
  const renderAllEffects = useCallback(() => {
    if (!canvasRef.current || !hiddenCanvasRef.current || !originalImageData || !image) return;
    
    const canvas = canvasRef.current;
    const hiddenCanvas = hiddenCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const hiddenCtx = hiddenCanvas.getContext('2d');
    
    if (!ctx || !hiddenCtx) return;
    
    // Reset to original image
    hiddenCtx.putImageData(originalImageData, 0, 0);
    
    // Apply all effects in sequence
    let imageData = hiddenCtx.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height);
    
    for (const effect of appliedEffects) {
      imageData = applyEffect(imageData, effect);
    }
    
    // Draw the final result to the visible canvas
    ctx.putImageData(imageData, 0, 0);
  }, [appliedEffects, originalImageData, image, applyEffect]);
  
  // Update canvas when applied effects change
  useEffect(() => {
    renderAllEffects();
  }, [appliedEffects, renderAllEffects]);
  
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
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="relative max-w-full max-h-full flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-full"
                  style={{
                    imageRendering: 'pixelated',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
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