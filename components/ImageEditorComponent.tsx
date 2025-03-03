"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UploadDropzone } from './ui/upload-dropzone';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './ui/tabs';
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

export default function ImageEditorComponent() {
  // Canvas references
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Image and effect state
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [currentEffect, setCurrentEffect] = useState<Effect>('none');
  const [appliedEffects, setAppliedEffects] = useState<AppliedEffect[]>([]);
  const [imageHistory, setImageHistory] = useState<ImageHistory[]>([]);
  
  // Effect-specific settings
  const [halftoneSettings, setHalftoneSettings] = useState<HalftoneSettings>({
    dotSize: 3,
    spacing: 5,
    angle: 45,
    shape: 'circle'
  });
  
  const [duotoneSettings, setDuotoneSettings] = useState<DuotoneSettings>({
    color1: '#0000ff',
    color2: '#ff0000',
    intensity: 0.5
  });
  
  const [noiseLevel, setNoiseLevel] = useState(0.5);
  
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
  
  // Debounced values to prevent too many re-renders
  const debouncedHalftoneSettings = useDebounce(halftoneSettings, 100);
  const debouncedDuotoneSettings = useDebounce(duotoneSettings, 100);
  const debouncedNoiseLevel = useDebounce(noiseLevel, 100);
  
  // Handle file upload
  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          
          // Setup canvas size
          if (canvasRef.current && hiddenCanvasRef.current) {
            const aspectRatio = img.width / img.height;
            const canvasWidth = 800;
            const canvasHeight = canvasWidth / aspectRatio;
            
            canvasRef.current.width = canvasWidth;
            canvasRef.current.height = canvasHeight;
            hiddenCanvasRef.current.width = canvasWidth;
            hiddenCanvasRef.current.height = canvasHeight;
            
            // Initial render of the image
            renderCanvas();
            
            // Add to history
            const newHistory: ImageHistory = {
              dataUrl: canvasRef.current.toDataURL('image/png'),
              effects: [],
              timestamp: Date.now()
            };
            
            setImageHistory([newHistory]);
          }
        };
        img.src = e.target.result as string;
      }
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
  
  // Preview the current effect based on selected settings
  const previewCurrentEffect = useCallback(() => {
    if (!canvasRef.current || !hiddenCanvasRef.current || !image || currentEffect === 'none') return;
    
    const canvas = canvasRef.current;
    const hiddenCanvas = hiddenCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const hiddenCtx = hiddenCanvas.getContext('2d');
    
    if (!ctx || !hiddenCtx) return;
    
    // Clear the hidden canvas
    hiddenCtx.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
    
    // Draw the original image to the hidden canvas
    hiddenCtx.drawImage(image, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
    
    // Get the image data from the hidden canvas
    let imageData = hiddenCtx.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height);
    
    // First apply all existing effects
    for (const effect of appliedEffects) {
      imageData = applyEffect(imageData, effect);
    }
    
    // Then apply the current effect with current settings
    let currentEffectObj: AppliedEffect;
    
    switch (currentEffect) {
      case 'halftone':
        currentEffectObj = { type: 'halftone', settings: debouncedHalftoneSettings };
        break;
      case 'duotone':
        currentEffectObj = { type: 'duotone', settings: debouncedDuotoneSettings };
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
    
    imageData = applyEffect(imageData, currentEffectObj);
    
    // Draw the processed image data to the visible canvas
    ctx.putImageData(imageData, 0, 0);
  }, [
    appliedEffects, 
    image, 
    currentEffect, 
    debouncedHalftoneSettings, 
    debouncedDuotoneSettings, 
    debouncedNoiseLevel
  ]);
  
  // Effect to update canvas when effects or settings change
  useEffect(() => {
    if (currentEffect === 'none') {
      renderCanvas();
    } else {
      previewCurrentEffect();
    }
  }, [
    renderCanvas, 
    previewCurrentEffect, 
    currentEffect, 
    debouncedHalftoneSettings, 
    debouncedDuotoneSettings, 
    debouncedNoiseLevel
  ]);
  
  // Function to save the current effect to the appliedEffects list
  const saveCurrentEffect = () => {
    if (!image || currentEffect === 'none') return;
    
    let newEffect: AppliedEffect;
    
    switch (currentEffect) {
      case 'halftone':
        newEffect = { type: 'halftone', settings: { ...halftoneSettings } };
        break;
      case 'duotone':
        newEffect = { type: 'duotone', settings: { ...duotoneSettings } };
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
      
      setImageHistory(prev => [...prev, newHistory]);
    }
    
    // Reset the current effect
    setCurrentEffect('none');
  };
  
  // Handle undo action
  const handleUndo = () => {
    if (imageHistory.length <= 1) return;
    
    // Remove the last item from history
    const newHistory = [...imageHistory];
    newHistory.pop();
    
    // Update the history and applied effects
    setImageHistory(newHistory);
    setAppliedEffects(newHistory[newHistory.length - 1].effects);
  };
  
  // Handle color selection from the color library
  const handleColorSelect = (color: string) => {
    if (currentEffect === 'duotone') {
      setDuotoneSettings(prev => ({ ...prev, color1: color }));
    }
    
    // If no effect is selected, automatically set to duotone
    if (currentEffect === 'none' && image) {
      setCurrentEffect('duotone');
      setDuotoneSettings(prev => ({ ...prev, color1: color }));
    }
  };
  
  // Handle duotone pair selection from the color library
  const handleDuotonePairSelect = (color1: string, color2: string) => {
    setDuotoneSettings(prev => ({ 
      ...prev, 
      color1, 
      color2 
    }));
    
    // If no effect is selected, automatically set to duotone
    if (currentEffect === 'none' && image) {
      setCurrentEffect('duotone');
    }
  };
  
  // Download the edited image
  const handleDownload = () => {
    if (!canvasRef.current) return;
    
    const link = document.createElement('a');
    link.download = 'edited-image.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };
  
  return (
    <div className="flex flex-col h-full">
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
        
        {/* Controls sidebar */}
        <div className="w-full md:w-80 h-full shrink-0">
          <Tabs defaultValue="effects">
            <TabsList className="w-full">
              <TabsTrigger value="effects" className="flex-1">Effects</TabsTrigger>
              <TabsTrigger value="colors" className="flex-1">Colors</TabsTrigger>
            </TabsList>
            
            <TabsContent value="effects" className="h-full">
              {image && (
                <div className="space-y-4">
                  {/* Effect controls */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Applied Effects</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {appliedEffects.length > 0 ? (
                        <div className="space-y-2">
                          {appliedEffects.map((effect, index) => (
                            <div key={index} className="flex justify-between items-center bg-muted/50 p-2 rounded text-sm">
                              <span className="capitalize">{effect.type}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  const newEffects = [...appliedEffects];
                                  newEffects.splice(index, 1);
                                  setAppliedEffects(newEffects);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          {appliedEffects.length > 0 && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-2 w-full"
                              onClick={handleUndo}
                            >
                              <Undo className="h-4 w-4 mr-2" />
                              Undo Last Effect
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground text-sm p-2">
                          No effects applied yet.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Effect type selector */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Effect Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Select 
                        value={currentEffect} 
                        onValueChange={(value) => setCurrentEffect(value as Effect)}
                      >
                        <SelectTrigger>
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
                      
                      {/* Effect specific controls */}
                      {currentEffect === 'halftone' && (
                        <div className="mt-4 space-y-4">
                          <div>
                            <Label htmlFor="dotSize">Dot Size: {halftoneSettings.dotSize.toFixed(1)}</Label>
                            <Slider
                              id="dotSize"
                              min={1}
                              max={10}
                              step={0.5}
                              value={[halftoneSettings.dotSize]}
                              onValueChange={(value) => setHalftoneSettings(prev => ({ ...prev, dotSize: value[0] }))}
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="spacing">Spacing: {halftoneSettings.spacing}</Label>
                            <Slider
                              id="spacing"
                              min={5}
                              max={20}
                              step={1}
                              value={[halftoneSettings.spacing]}
                              onValueChange={(value) => setHalftoneSettings(prev => ({ ...prev, spacing: value[0] }))}
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="angle">Angle: {halftoneSettings.angle}°</Label>
                            <Slider
                              id="angle"
                              min={0}
                              max={90}
                              step={5}
                              value={[halftoneSettings.angle]}
                              onValueChange={(value) => setHalftoneSettings(prev => ({ ...prev, angle: value[0] }))}
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="shape">Shape</Label>
                            <Select 
                              value={halftoneSettings.shape} 
                              onValueChange={(value) => setHalftoneSettings(prev => ({ ...prev, shape: value as 'circle' | 'square' | 'line' }))}
                            >
                              <SelectTrigger id="shape" className="mt-1">
                                <SelectValue />
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
                        <div className="mt-4 space-y-4">
                          <div>
                            <Label htmlFor="intensity">Intensity: {Math.round(duotoneSettings.intensity * 100)}%</Label>
                            <Slider
                              id="intensity"
                              min={0}
                              max={1}
                              step={0.1}
                              value={[duotoneSettings.intensity]}
                              onValueChange={(value) => setDuotoneSettings(prev => ({ ...prev, intensity: value[0] }))}
                              className="mt-1"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Color Library</Label>
                            <ColorSetSelector 
                              onSelectColor={handleColorSelect}
                              onSelectPair={handleDuotonePairSelect}
                              selectedColor={duotoneSettings.color1}
                            />
                          </div>
                        </div>
                      )}
                      
                      {currentEffect === 'noise' && (
                        <div className="mt-4">
                          <Label htmlFor="noise-level">Noise Level: {Math.round(noiseLevel * 100)}%</Label>
                          <Slider
                            id="noise-level"
                            min={0}
                            max={1}
                            step={0.05}
                            value={[noiseLevel]}
                            onValueChange={(value) => setNoiseLevel(value[0])}
                            className="mt-1"
                          />
                        </div>
                      )}
                      
                      {currentEffect !== 'none' && (
                        <div className="mt-4 flex justify-end">
                          <Button
                            onClick={saveCurrentEffect}
                            disabled={!image}
                          >
                            Apply Effect
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Download button */}
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={handleDownload}
                    disabled={!image}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Image
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="colors" className="h-full">
              <ColorSetSelector 
                onSelectColor={handleColorSelect}
                onSelectPair={handleDuotonePairSelect}
                selectedColor={currentEffect === 'duotone' ? duotoneSettings.color1 : undefined}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}