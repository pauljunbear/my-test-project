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
import { Download, Undo, X } from 'lucide-react';
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

// Define the color set selector props based on how we're using it
interface DuotoneColorProps {
  color1: string;
  color2: string;
  onColor1Change: (color: string) => void;
  onColor2Change: (color: string) => void;
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
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            // Set canvas dimensions based on image aspect ratio
            const containerWidth = canvas.parentElement?.clientWidth || 800;
            const containerHeight = canvas.parentElement?.clientHeight || 600;
            
            const scale = Math.min(
              containerWidth / img.width,
              containerHeight / img.height
            ) * 0.9; // 90% of container to leave some margin
            
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            
            // Clear canvas and draw image centered
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Store the original image data for resetting between effects
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            setOriginalImageData(imageData);
          }
        }
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.readAsDataURL(file);
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
    resetToOriginal
  ]);
  
  // Effect to update canvas when effects or settings change
  useEffect(() => {
    if (currentEffect === 'none') {
      resetToOriginal();
    } else {
      applyEffectWithReset();
    }
  }, [
    currentEffect, 
    debouncedHalftoneSettings, 
    debouncedDuotoneSettings, 
    debouncedNoiseLevel,
    resetToOriginal,
    applyEffectWithReset
  ]);
  
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
  
  // Effect application functions
  const applyHalftoneEffect = (ctx: CanvasRenderingContext2D, imageData: ImageData, settings: HalftoneSettings): ImageData => {
    const { dotSize, spacing, angle, shape } = settings;
    
    // Convert to grayscale first
    const grayscaleData = new Uint8ClampedArray(imageData.data);
    for (let i = 0; i < grayscaleData.length; i += 4) {
      const avg = (grayscaleData[i] + grayscaleData[i + 1] + grayscaleData[i + 2]) / 3;
      grayscaleData[i] = grayscaleData[i + 1] = grayscaleData[i + 2] = avg;
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
        const grayValue = grayscaleData[pixelIndex] / 255;
        
        // Calculate size based on gray value (invert for proper effect)
        const size = dotSize * (1 - grayValue);
        
        if (size > 0) {
          ctx.beginPath();
          
          switch (shape) {
            case 'circle':
              ctx.arc(rotatedX, rotatedY, size, 0, Math.PI * 2);
              ctx.fill();
              break;
            case 'square':
              ctx.fillRect(rotatedX - size / 2, rotatedY - size / 2, size, size);
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
    
    // Parse colors
    const parseColor = (color: string) => {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return { r, g, b };
    };
    
    const c1 = parseColor(color1);
    const c2 = parseColor(color2);
    
    // Create a new array for the output data
    const outputData = new Uint8ClampedArray(imageData.data);
    
    // Apply duotone effect
    for (let i = 0; i < outputData.length; i += 4) {
      const avg = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
      
      // Normalize to [0, 1]
      const t = avg / 255;
      
      // Interpolate between the two colors
      outputData[i] = c1.r * (1 - t) + c2.r * t;
      outputData[i + 1] = c1.g * (1 - t) + c2.g * t;
      outputData[i + 2] = c1.b * (1 - t) + c2.b * t;
      
      // Apply intensity - blend with original
      if (intensity < 1) {
        outputData[i] = outputData[i] * intensity + imageData.data[i] * (1 - intensity);
        outputData[i + 1] = outputData[i + 1] * intensity + imageData.data[i + 1] * (1 - intensity);
        outputData[i + 2] = outputData[i + 2] * intensity + imageData.data[i + 2] * (1 - intensity);
      }
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
  
  // Apply all effects to the canvas
  const renderCanvas = useCallback(() => {
    if (!canvasRef.current || !hiddenCanvasRef.current || !image) return;
    
    const canvas = canvasRef.current;
    const hiddenCanvas = hiddenCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const hiddenCtx = hiddenCanvas.getContext('2d');
    
    if (!ctx || !hiddenCtx) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hiddenCtx.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
    
    // Draw the original image to the hidden canvas
    hiddenCtx.drawImage(image, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
    
    // Get the image data from the hidden canvas
    let imageData = hiddenCtx.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height);
    
    // Apply all effects in sequence
    for (const effect of appliedEffects) {
      imageData = applyEffect(imageData, effect);
    }
    
    // Draw the processed image data to the visible canvas
    ctx.putImageData(imageData, 0, 0);
  }, [appliedEffects, image]);
  
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
  
  // Color handling functions
  const handleColorSelect = useCallback((color: string) => {
    if (currentEffect === 'duotone') {
      setDuotoneSettings(prev => ({ ...prev, color1: color }));
    }
  }, [currentEffect]);

  const handleDuotonePairSelect = useCallback((color1: string, color2: string) => {
    setDuotoneSettings(prev => ({ ...prev, color1, color2 }));
  }, []);
  
  // Download the edited image
  const handleDownload = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = 'edited-image.png';
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  };
  
  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {/* Hidden canvas for processing */}
      <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />
      
      <div className="flex flex-col md:flex-row h-full gap-4">
        {/* Main image display area */}
        <div className="flex-1 flex items-center justify-center bg-muted/20 border rounded-lg overflow-hidden">
          {!image ? (
            <UploadDropzone
              onUpload={(file: File) => handleImageUpload(file)}
            />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full object-contain shadow-lg"
              />
            </div>
          )}
        </div>
        
        {/* Controls panel */}
        <div className="w-full md:w-80 flex flex-col gap-4">
          {/* Effects Stack */}
          <Card>
            <CardHeader>
              <CardTitle>Image Effects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Applied Effects Section */}
              <div>
                <h3 className="text-lg font-medium mb-2">Applied Effects</h3>
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
                            renderCanvas();
                          }}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              {/* Effect Type Selection */}
              <div>
                <Label htmlFor="effect-type" className="text-lg font-medium mb-2">Effect Type</Label>
                <Select
                  value={currentEffect}
                  onValueChange={(value: Effect) => setCurrentEffect(value)}
                >
                  <SelectTrigger id="effect-type">
                    <SelectValue placeholder="Select effect" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="halftone">Halftone</SelectItem>
                    <SelectItem value="duotone">Duotone</SelectItem>
                    <SelectItem value="blackwhite">Black & White</SelectItem>
                    <SelectItem value="sepia">Sepia</SelectItem>
                    <SelectItem value="noise">Noise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Effect Controls */}
              {currentEffect === 'halftone' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="dot-size">Dot Size: {halftoneSettings.dotSize.toFixed(1)}</Label>
                    </div>
                    <Slider
                      id="dot-size"
                      min={0.5}
                      max={10}
                      step={0.1}
                      value={[halftoneSettings.dotSize]}
                      onValueChange={(values) => setHalftoneSettings({...halftoneSettings, dotSize: values[0]})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="spacing">Spacing: {halftoneSettings.spacing}</Label>
                    </div>
                    <Slider
                      id="spacing"
                      min={1}
                      max={20}
                      step={1}
                      value={[halftoneSettings.spacing]}
                      onValueChange={(values) => setHalftoneSettings({...halftoneSettings, spacing: values[0]})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="angle">Angle: {halftoneSettings.angle}°</Label>
                    </div>
                    <Slider
                      id="angle"
                      min={0}
                      max={180}
                      step={1}
                      value={[halftoneSettings.angle]}
                      onValueChange={(values) => setHalftoneSettings({...halftoneSettings, angle: values[0]})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="shape">Shape</Label>
                    <Select
                      value={halftoneSettings.shape}
                      onValueChange={(value: 'circle' | 'square' | 'line') => 
                        setHalftoneSettings({...halftoneSettings, shape: value})}
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
                    <div className="flex justify-between">
                      <Label htmlFor="intensity">Intensity: {duotoneSettings.intensity}%</Label>
                    </div>
                    <Slider
                      id="intensity"
                      min={0}
                      max={100}
                      step={1}
                      value={[duotoneSettings.intensity]}
                      onValueChange={(values) => setDuotoneSettings({...duotoneSettings, intensity: values[0]})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Colors</Label>
                    <ColorSetSelector
                      onSelectColor={handleColorSelect}
                      onSelectPair={handleDuotonePairSelect}
                      selectedColor={duotoneSettings.color1}
                    />
                  </div>
                </div>
              )}
              
              {currentEffect === 'noise' && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="noise-level">Noise Level: {noiseLevel}%</Label>
                  </div>
                  <Slider
                    id="noise-level"
                    min={0}
                    max={100}
                    step={1}
                    value={[noiseLevel]}
                    onValueChange={(values) => setNoiseLevel(values[0])}
                  />
                </div>
              )}
              
              {/* Apply Effect Button */}
              {currentEffect !== 'none' && (
                <Button 
                  onClick={handleApplyEffect} 
                  className="w-full"
                >
                  Apply Effect
                </Button>
              )}
            </CardContent>
          </Card>
          
          {/* History buttons */}
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
                className="flex-1"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Image
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}