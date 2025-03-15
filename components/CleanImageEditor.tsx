'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Undo, Crop, RefreshCw, Trash2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ColorSetSelector } from '@/components/image-editor/ui/ColorSetSelector';
import {
  applyHalftoneEffect,
  applyDuotoneEffect,
  applyNoiseEffect,
  applyKaleidoscopeEffect,
  applyLightLeaksEffect,
  applyVignetteEffect,
  applyTextureEffect,
  applyFrameEffect
} from '@/components/image-editor/effects';
import type {
  EffectType,
  HalftoneSettings,
  DuotoneSettings,
  NoiseSettings,
  KaleidoscopeSettings,
  LightLeaksSettings,
  VignetteSettings,
  TextureSettings,
  FrameSettings,
  ImageHistory,
  AppliedEffect,
  CropState,
  ContrastSettings,
  DitheringSettings,
  ExposureSettings
} from '@/components/image-editor/types';

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

// Helper functions
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

const CleanImageEditor = () => {
  // State for image and canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // State for image and effects
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [appliedEffects, setAppliedEffects] = useState<AppliedEffect[]>([]);
  const [currentEffect, setCurrentEffect] = useState<EffectType>('none');
  const [history, setHistory] = useState<ImageHistory[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [currentImageDataUrl, setCurrentImageDataUrl] = useState<string | null>(null);

  // State for cropping and resizing
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [cropState, setCropState] = useState<CropState>({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    isSelecting: false
  });

  // State for effects
  const [halftoneSettings, setHalftoneSettings] = useState<HalftoneSettings>({
    enabled: false,
    dotSize: 2,
    spacing: 4,
    angle: 45,
    shape: 'circle'
  });

  const [duotoneSettings, setDuotoneSettings] = useState<DuotoneSettings>({
    enabled: false,
    shadowColor: '#000000',
    highlightColor: '#ffffff',
    intensity: 100
  });

  const [noiseSettings, setNoiseSettings] = useState<NoiseSettings>({
    enabled: false,
    level: 20
  });

  const [kaleidoscopeSettings, setKaleidoscopeSettings] = useState<KaleidoscopeSettings>({
    enabled: false,
    segments: 8,
    rotation: 0,
    zoom: 1.0
  });

  const [lightLeaksSettings, setLightLeaksSettings] = useState<LightLeaksSettings>({
    enabled: false,
    intensity: 50,
    color: '#FFA500',
    position: 45,
    blend: 'screen'
  });

  const [vignetteSettings, setVignetteSettings] = useState<VignetteSettings>({
    enabled: false,
    intensity: 50,
    color: '#000000',
    feather: 50,
    shape: 'circular'
  });

  const [textureSettings, setTextureSettings] = useState<TextureSettings>({
    enabled: false,
    texture: 'paper',
    opacity: 50,
    blend: 'overlay',
    scale: 1.0
  });

  const [frameSettings, setFrameSettings] = useState<FrameSettings>({
    enabled: false,
    ratio: '1:1',
    width: 1000,
    height: 1000,
    color: '#FFFFFF',
    padding: 20
  });

  // Function to add current state to history
  const addToHistory = useCallback((currentHistory: ImageHistory[], currentIndex: number, dataUrl: string, effects: AppliedEffect[]): { newHistory: ImageHistory[], newIndex: number } => {
    try {
      // Create new history entry
      const newHistory: ImageHistory = {
        dataUrl,
        effects,
        timestamp: Date.now()
      };
      
      // Truncate future history if we're not at the latest point
      const newHistoryList = currentHistory.slice(0, currentIndex + 1).concat([newHistory]);
      return {
        newHistory: newHistoryList,
        newIndex: newHistoryList.length - 1
      };
    } catch (error) {
      console.error("Error adding to history:", error);
      return { newHistory: currentHistory, newIndex: currentIndex };
    }
  }, []);

  // Function to apply a single effect to image data
  const applyEffect = useCallback((imageData: ImageData, effect: AppliedEffect): ImageData => {
    const { type, settings } = effect;
    const ctx = canvasRef.current?.getContext('2d');
    
    if (!ctx) {
      console.error('Could not get canvas context');
      return imageData;
    }
    
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
        return applyNoiseEffect(ctx, imageData, settings as NoiseSettings);
      case 'kaleidoscope':
        return applyKaleidoscopeEffect(ctx, imageData, settings as KaleidoscopeSettings);
      case 'lightleaks':
        return applyLightLeaksEffect(ctx, imageData, settings as LightLeaksSettings);
      case 'vignette':
        return applyVignetteEffect(ctx, imageData, settings as VignetteSettings);
      case 'texture':
        return applyTextureEffect(ctx, imageData, settings as TextureSettings);
      case 'frame':
        return applyFrameEffect(ctx, imageData, settings as FrameSettings);
      default:
        return imageData;
    }
  }, [canvasRef]);

  // Base settings for effects
  const baseSettings = {
    blackwhite: { enabled: true, level: 100 } as ContrastSettings,
    sepia: { enabled: true, level: 100 } as ContrastSettings,
    dither: { enabled: true, intensity: 100 } as DitheringSettings,
    exposure: { enabled: true, level: 0 } as ExposureSettings,
    contrast: { enabled: true, level: 0 } as ContrastSettings,
    noise: { enabled: true, level: 20 } as NoiseSettings
  };

  // Effect buttons configuration
  const effectButtons = [
    { id: 'none', label: 'Original' },
    { id: 'halftone', label: 'Halftone' },
    { id: 'duotone', label: 'Duotone' },
    { id: 'blackwhite', label: 'B&W' },
    { id: 'sepia', label: 'Sepia' },
    { id: 'noise', label: 'Noise' },
    { id: 'kaleidoscope', label: 'Kaleidoscope' },
    { id: 'lightleaks', label: 'Light Leaks' },
    { id: 'vignette', label: 'Vignette' },
    { id: 'texture', label: 'Texture' },
    { id: 'frame', label: 'Frame' }
  ] as const;

  // Add state for resize dimensions
  const [resizeWidth] = useState<number>(0);
  const [resizeHeight] = useState<number>(0);

  // Add state for custom colors
  const [customColor1Hex, setCustomColor1Hex] = useState<string>('#000000');
  const [customColor2Hex, setCustomColor2Hex] = useState<string>('#ffffff');

  // Add state for effect settings
  const [ditheringIntensity, setDitheringIntensity] = useState<number>(100);
  const [exposureLevel, setExposureLevel] = useState<number>(0);
  const [contrastLevel, setContrastLevel] = useState<number>(0);

  // Function to handle undo action
  const handleUndo = () => {
    if (history.length <= 1) return;
    
    // Remove the last item from history
    const newHistory = [...history];
    newHistory.pop();
    
    // Update the history and applied effects
    setHistory(newHistory);
    setAppliedEffects(newHistory[newHistory.length - 1]?.effects || []);
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

  // Start resize mode
  const startResizing = () => {
    if (!canvasRef.current) return;
    setIsResizing(true);
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

  // Download the edited image
  const handleDownload = () => {
    if (!canvasRef.current) {
      console.error("Canvas reference is not available for download");
      return;
    }
    
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = 'edited-image.png';
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error during image download:", error);
    }
  };

  // Apply crop to the image
  const applyCrop = () => {
    if (!canvasRef.current || !cropCanvasRef.current) return;
    
    const { startX, startY, endX, endY } = cropState;
    
    // Ensure proper crop coordinates
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    
    if (width < 10 || height < 10) {
      console.error("Crop area is too small");
      setIsCropping(false);
      return;
    }
    
    try {
      const cropCtx = cropCanvasRef.current.getContext('2d');
      if (!cropCtx) return;
      
      const cropData = cropCtx.getImageData(x, y, width, height);
      const mainCtx = canvasRef.current.getContext('2d');
      if (!mainCtx) return;
      
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      mainCtx.putImageData(cropData, 0, 0);
      
      setOriginalImageData(cropData);
      setIsCropping(false);
      setCropState({
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        isSelecting: false
      });
    } catch (error) {
      console.error("Error applying crop:", error);
    }
  };

  // Cancel cropping mode
  const cancelCrop = () => {
    setIsCropping(false);
    setCropState({
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      isSelecting: false
    });
  };

  // Image upload handler
  const handleImageUpload = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      console.error("File is too large. Maximum size is 10MB.");
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      console.error("Not a valid image file");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target?.result) return;
      
      const img = new Image();
      img.onload = () => {
        setImage(img);
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            canvasRef.current.width = img.width;
            canvasRef.current.height = img.height;
            ctx.drawImage(img, 0, 0);
            setOriginalImageData(ctx.getImageData(0, 0, img.width, img.height));
          }
        }
      };
      img.src = e.target.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  // Apply resize to the image
  const applyResize = () => {
    if (!canvasRef.current || !originalImageData) return;
    
    try {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = resizeWidth;
      tempCanvas.height = resizeHeight;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (!tempCtx) return;
      
      tempCtx.drawImage(canvasRef.current, 0, 0, resizeWidth, resizeHeight);
      
      canvasRef.current.width = resizeWidth;
      canvasRef.current.height = resizeHeight;
      
      const mainCtx = canvasRef.current.getContext('2d');
      if (!mainCtx) return;
      
      mainCtx.drawImage(tempCanvas, 0, 0);
      
      const newImageData = mainCtx.getImageData(0, 0, resizeWidth, resizeHeight);
      setOriginalImageData(newImageData);
      setIsResizing(false);
    } catch (error) {
      console.error("Error applying resize:", error);
    }
  };

  // Cancel resize
  const cancelResize = () => {
    setIsResizing(false);
  };

  // Handle crop mouse events
  const handleCropMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropCanvasRef.current) return;
    
    const rect = cropCanvasRef.current.getBoundingClientRect();
    const scaleX = cropCanvasRef.current.width / rect.width;
    const scaleY = cropCanvasRef.current.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setCropState({
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      isSelecting: true
    });
  };

  const handleCropMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropState.isSelecting || !cropCanvasRef.current) return;
    
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
  };

  const handleCropMouseUp = () => {
    setCropState(prev => ({
      ...prev,
      isSelecting: false
    }));
  };

  // Color selection handlers
  const handleColorSelect = (color: string, index: 1 | 2) => {
    if (index === 1) {
      setDuotoneSettings({
        ...duotoneSettings,
        shadowColor: color
      });
    } else {
      setDuotoneSettings({
        ...duotoneSettings,
        highlightColor: color
      });
    }
  };

  const handleDuotonePairSelect = (color1: string, color2: string) => {
    setDuotoneSettings({
      ...duotoneSettings,
      shadowColor: color1,
      highlightColor: color2
    });
  };

  // Function to handle hex input changes
  const handleHexInputChange = (
    value: string,
    setColor: (color: string) => void,
    setHex: (hex: string) => void
  ) => {
    // Remove any non-hex characters and ensure it starts with #
    let sanitized = value.replace(/[^0-9A-Fa-f]/g, '');
    
    // Limit to 6 characters (not counting #)
    if (sanitized.length > 6) {
      sanitized = sanitized.substring(0, 6);
    }
    
    // Add # prefix if missing
    const hexValue = '#' + sanitized;
    setHex(hexValue);
    
    // Only update the actual color if we have a valid hex (# + 6 chars)
    if (sanitized.length === 6) {
      setColor(hexValue);
    }
  };

  // Update noise level state handler
  const handleNoiseChange = (value: number) => {
    setNoiseSettings(prev => ({ ...prev, level: value }));
  };

  const handleDuotoneIntensityChange = (value: number) => {
    setDuotoneSettings({
      ...duotoneSettings,
      enabled: true
    });
  };

  return (
    <div className="w-full h-full flex flex-col space-y-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 overflow-hidden">
      {/* Hidden canvas for processing */}
      <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />
      
      {/* Effect Navigation Bar - Always visible regardless of if image is uploaded */}
      <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300">
          {effectButtons.map(({ id, label }) => (
            <Button
              key={id}
              variant={currentEffect === id ? 'default' : 'outline'}
              onClick={() => setCurrentEffect(id as EffectType)}
              className="rounded-lg whitespace-nowrap"
            >
              {label}
            </Button>
          ))}
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
                      
                      {/* Color presets */}
                      <div className="mt-1">
                        <ColorSetSelector 
                          onSelectColor={handleColorSelect}
                          onSelectPair={handleDuotonePairSelect}
                          selectedColor={duotoneSettings.shadowColor}
                        />
                      </div>
                      
                      {/* Custom color inputs with hex */}
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <Label className="text-sm font-medium">Custom Color 1</Label>
                          <div className="flex items-center mt-2">
                            <div 
                              className="w-8 h-8 rounded border"
                              style={{ backgroundColor: customColor1Hex }}
                            />
                            <input
                              type="text"
                              value={customColor1Hex}
                              onChange={(e) => handleHexInputChange(
                                e.target.value,
                                (color) => setDuotoneSettings({...duotoneSettings, shadowColor: color}),
                                setCustomColor1Hex
                              )}
                              className="ml-2 px-2 py-1 border rounded text-sm w-24"
                              placeholder="#000000"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Custom Color 2</Label>
                          <div className="flex items-center mt-2">
                            <div 
                              className="w-8 h-8 rounded border"
                              style={{ backgroundColor: customColor2Hex }}
                            />
                            <input
                              type="text"
                              value={customColor2Hex}
                              onChange={(e) => handleHexInputChange(
                                e.target.value,
                                (color) => setDuotoneSettings({...duotoneSettings, highlightColor: color}),
                                setCustomColor2Hex
                              )}
                              className="ml-2 px-2 py-1 border rounded text-sm w-24"
                              placeholder="#ffffff"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {currentEffect === 'noise' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="noise-level" className="text-sm font-medium">Noise Level</Label>
                      <span className="text-xs font-medium bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-md">{noiseSettings.level}%</span>
                    </div>
                    <Slider 
                      id="noise-level"
                      min={1} 
                      max={100} 
                      step={1} 
                      value={[noiseSettings.level]} 
                      onValueChange={([value]) => handleNoiseChange(value)}
                      className="mt-1"
                    />
                  </div>
                )}
                
                {currentEffect === 'dither' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="dithering-intensity" className="text-sm font-medium">Dithering Intensity</Label>
                      <span className="text-xs font-medium bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-md">{ditheringIntensity}%</span>
                    </div>
                    <Slider 
                      id="dithering-intensity"
                      min={10} 
                      max={100} 
                      step={1} 
                      value={[ditheringIntensity]} 
                      onValueChange={([value]) => setDitheringIntensity(value)}
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

export default CleanImageEditor;
