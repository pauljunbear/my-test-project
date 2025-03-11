'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

import {
  processImageWithShader,
  SHADER_EFFECTS,
  captureFrames,
  exportGif,
  ShaderEffect
} from '@/lib/webgl-utils';

import { createImage, createCanvas, isBrowser, safelyImportBrowserModule } from '@/lib/browser-utils';

interface EnhancedGifExportProps {
  imageUrl?: string;
  imageElement?: HTMLImageElement | null;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  effectName?: string;
  effectParams?: Record<string, any>;
  onExportComplete?: (blob: Blob, url: string) => void;
}

export default function EnhancedGifExport({ 
  imageUrl, 
  imageElement,
  canvasRef: externalCanvasRef,
  effectName,
  effectParams,
  onExportComplete 
}: EnhancedGifExportProps) {
  // State for selected effect and parameters
  const [selectedEffectKey, setSelectedEffectKey] = useState<string>(effectName || 'none');
  const [uniformValues, setUniformValues] = useState<Record<string, any>>(effectParams || {});
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isGifLibraryAvailable, setIsGifLibraryAvailable] = useState<boolean | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [gifFrameCount, setGifFrameCount] = useState<number>(10);
  const [gifDuration, setGifDuration] = useState<number>(1.0);
  const [gifQuality, setGifQuality] = useState<number>(10);
  
  // Preview canvas ref - use either external or internal
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalCanvasRef || internalCanvasRef;
  const imageRef = useRef<HTMLImageElement | null>(imageElement || null);
  
  // Check if GIF library is available
  useEffect(() => {
    const checkGifLibrary = async () => {
      try {
        // Use our safe browser module import
        await safelyImportBrowserModule(
          () => import('gif.js'),
          null
        );
        setIsGifLibraryAvailable(true);
      } catch (e) {
        console.error('GIF library check failed:', e);
        setIsGifLibraryAvailable(false);
      }
    };
    
    // Only run in browser
    if (isBrowser()) {
      checkGifLibrary();
    } else {
      setIsGifLibraryAvailable(false);
    }
  }, []);
  
  // Load and initialize the image
  useEffect(() => {
    if (!imageUrl && !imageElement) return;
    
    if (imageElement) {
      imageRef.current = imageElement;
      
      // Draw the image on canvas if provided
      if (canvasRef.current && !externalCanvasRef) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          // Set canvas size to match image
          canvasRef.current.width = imageElement.width;
          canvasRef.current.height = imageElement.height;
          
          // Draw the image
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          ctx.drawImage(imageElement, 0, 0);
        }
      }
    } else if (imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        imageRef.current = img;
        
        // Draw the original image on the preview canvas
        if (canvasRef.current && !externalCanvasRef) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            // Set canvas size to match image
            canvasRef.current.width = img.width;
            canvasRef.current.height = img.height;
            
            // Draw the image
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.drawImage(img, 0, 0);
          }
        }
      };
      
      img.onerror = (err) => {
        console.error('Error loading image:', err);
      };
      
      img.src = imageUrl;
      
      return () => {
        img.onload = null;
        img.onerror = null;
      };
    }
  }, [imageUrl, imageElement, externalCanvasRef, canvasRef]);
  
  // Initialize uniform values when effect changes
  useEffect(() => {
    // If effect params are provided directly, use those instead
    if (effectParams && effectName && effectName !== 'none') {
      setUniformValues(effectParams);
      setSelectedEffectKey(effectName);
      return;
    }

    if (selectedEffectKey === 'none') {
      setUniformValues({});
      return;
    }
    
    const effect = SHADER_EFFECTS[selectedEffectKey];
    if (!effect) return;
    
    const initialValues: Record<string, any> = {};
    
    // Initialize values from effect definition
    Object.entries(effect.uniforms).forEach(([key, uniform]) => {
      // Handle all possible value types
      if (uniform.value !== undefined) {
        initialValues[key] = uniform.value;
      }
    });
    
    setUniformValues(initialValues);
  }, [selectedEffectKey, effectName, effectParams]);
  
  // Apply the selected shader to the image
  const applyShader = useCallback(async () => {
    if (selectedEffectKey === 'none' || !imageRef.current) {
      return null;
    }
    
    const effect = SHADER_EFFECTS[selectedEffectKey];
    if (!effect) return null;
    
    setIsProcessing(true);
    
    try {
      // Process the image with the shader
      const processedImageData = await processImageWithShader(
        imageRef.current,
        effect,
        uniformValues
      );
      
      // Convert to URL for preview
      const canvas = document.createElement('canvas');
      canvas.width = processedImageData.width;
      canvas.height = processedImageData.height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(processedImageData, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        setProcessedImageUrl(dataUrl);
      }
      
      // Draw the processed image on the preview canvas
      if (canvasRef.current) {
        const previewCtx = canvasRef.current.getContext('2d');
        if (previewCtx) {
          previewCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          previewCtx.putImageData(processedImageData, 0, 0);
        }
      }
      
      return processedImageData;
    } catch (err) {
      console.error('Error applying shader:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [selectedEffectKey, uniformValues]);
  
  // Export the processed image as a GIF
  const exportAsGif = useCallback(async () => {
    if (!imageRef.current || selectedEffectKey === 'none' || isGifLibraryAvailable !== true) {
      alert('Please ensure an image is loaded and an effect is selected.');
      return;
    }
    
    setIsExporting(true);
    
    try {
      const effect = SHADER_EFFECTS[selectedEffectKey];
      
      // Create a function that processes a frame at a specific time
      const processFrame = async (time: number): Promise<ImageData> => {
        // Create a copy of uniform values to modify for animation
        const animatedUniforms = { ...uniformValues };
        
        // Modify parameters based on time for animation effect
        // This depends on the specific effect
        if (selectedEffectKey === 'wave' && typeof uniformValues.uFrequency === 'number') {
          animatedUniforms.uFrequency = uniformValues.uFrequency + 
            Math.sin(time * Math.PI * 2) * (uniformValues.uFrequency * 0.2);
        } else if (selectedEffectKey === 'pixelate' && typeof uniformValues.u_pixel_size === 'number') {
          animatedUniforms.u_pixel_size = uniformValues.u_pixel_size + 
            Math.sin(time * Math.PI * 2) * (uniformValues.u_pixel_size * 0.2);
        } else if (selectedEffectKey === 'dither' && typeof uniformValues.u_dither_scale === 'number') {
          animatedUniforms.u_dither_scale = uniformValues.u_dither_scale +
            Math.sin(time * Math.PI * 2) * 0.5;
        } else if (selectedEffectKey === 'halftone' && typeof uniformValues.u_angle === 'number') {
          animatedUniforms.u_angle = (uniformValues.u_angle + time) % 6.28;
        } else if (selectedEffectKey === 'bw' && typeof uniformValues.u_threshold === 'number') {
          // For black and white, animate the threshold
          animatedUniforms.u_threshold = uniformValues.u_threshold + 
            Math.sin(time * Math.PI * 2) * 0.15;
        } else if (selectedEffectKey === 'sepia' && typeof uniformValues.u_intensity === 'number') {
          // For sepia, animate the intensity
          animatedUniforms.u_intensity = uniformValues.u_intensity + 
            Math.sin(time * Math.PI * 2) * 0.2;
        }
        
        // Process the image with the current time's parameters
        return await processImageWithShader(
          imageRef.current!,
          effect,
          animatedUniforms
        );
      };
      
      // Capture frames for the GIF
      console.log('Capturing frames for GIF...');
      const frames = await captureFrames(processFrame, gifFrameCount, gifDuration);
      
      if (frames.length === 0) {
        throw new Error('No frames were captured');
      }
      
      console.log(`Captured ${frames.length} frames, exporting as GIF...`);
      
      // Export the frames as a GIF
      const result = await exportGif(frames, {
        width: frames[0].width,
        height: frames[0].height,
        quality: gifQuality,
        delay: Math.round(gifDuration * 1000 / gifFrameCount),
        repeat: 0 // loop forever
      });
      
      // Create a URL for the GIF
      let url: string = URL.createObjectURL(result as Blob);
      
      // Callback with the result
      if (onExportComplete) {
        onExportComplete(result as Blob, url);
      }
      
      // Open in a new window for preview
      window.open(url, '_blank');
      
      return url;
    } catch (err) {
      console.error('Error exporting GIF:', err);
      let errorMessage = 'Unknown error';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      alert(`Error creating GIF: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  }, [imageRef, selectedEffectKey, uniformValues, gifFrameCount, gifDuration, gifQuality, isGifLibraryAvailable, onExportComplete]);
  
  // Handle uniform value changes
  const handleUniformChange = (key: string, value: any) => {
    setUniformValues(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Determine if we should show parameter controls
  const showControls = selectedEffectKey !== 'none' && SHADER_EFFECTS[selectedEffectKey];
  
  // Get the current effect for controls
  const currentEffect = selectedEffectKey !== 'none' ? SHADER_EFFECTS[selectedEffectKey] : null;
  
  // Main render for the component
  return (
    <div className="gif-export">
      {/* If we're used with explicit parameters, show a simple export button */}
      {effectName && effectParams ? (
        <Button 
          variant="outline" 
          onClick={exportAsGif} 
          disabled={isExporting || isGifLibraryAvailable === false}
          className="flex items-center space-x-2"
        >
          {isExporting ? (
            <>
              <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Creating GIF...</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M20.4 14.5L16 10 4 20" />
              </svg>
              <span>Export as GIF</span>
            </>
          )}
        </Button>
      ) : (
        /* Full UI for standalone usage */
        <div className="p-4 space-y-6">
          <h3 className="text-lg font-medium">Export Animated GIF</h3>
          
          {/* Effect selection */}
          <div className="space-y-2">
            <Label htmlFor="effect-select">Effect</Label>
            <Select
              value={selectedEffectKey}
              onValueChange={setSelectedEffectKey}
            >
              <SelectTrigger id="effect-select">
                <SelectValue placeholder="Select an effect" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {Object.entries(SHADER_EFFECTS).map(([key, effect]) => (
                  <SelectItem key={key} value={key}>
                    {effect.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Effect parameters - only show if an effect is selected */}
          {selectedEffectKey !== 'none' && SHADER_EFFECTS[selectedEffectKey] && (
            <div className="space-y-4">
              <h4 className="font-medium">Effect Parameters</h4>
              
              {Object.entries(SHADER_EFFECTS[selectedEffectKey].uniforms).map(([key, uniform]) => {
                // Skip non-adjustable parameters
                if (uniform.type !== 'float' || key === 'u_time') return null;
                
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor={`param-${key}`}>{uniform.name || key}</Label>
                      <span className="text-sm text-gray-500">
                        {uniformValues[key]?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    
                    <Slider 
                      id={`param-${key}`}
                      min={uniform.min || 0}
                      max={uniform.max || 1}
                      step={uniform.step || 0.01}
                      value={[uniformValues[key] || uniform.value || 0]}
                      onValueChange={(values) => {
                        setUniformValues({
                          ...uniformValues,
                          [key]: values[0],
                        });
                      }}
                    />
                  </div>
                );
              })}
              
              <Button 
                onClick={applyShader}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? 'Processing...' : 'Apply Effect'}
              </Button>
            </div>
          )}
          
          {/* GIF export configuration */}
          <div className="space-y-4">
            <h4 className="font-medium">GIF Options</h4>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="gif-frames">Frames</Label>
                <span className="text-sm text-gray-500">{gifFrameCount}</span>
              </div>
              <Slider 
                id="gif-frames"
                min={5}
                max={30}
                step={1}
                value={[gifFrameCount]}
                onValueChange={(values) => setGifFrameCount(values[0])}
              />
              <p className="text-xs text-gray-500">More frames = smoother animation but larger file</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="gif-duration">Duration (seconds)</Label>
                <span className="text-sm text-gray-500">{gifDuration.toFixed(1)}</span>
              </div>
              <Slider 
                id="gif-duration"
                min={0.5}
                max={5.0}
                step={0.1}
                value={[gifDuration]}
                onValueChange={(values) => setGifDuration(values[0])}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="gif-quality">Quality</Label>
                <span className="text-sm text-gray-500">{gifQuality}</span>
              </div>
              <Slider 
                id="gif-quality"
                min={1}
                max={20}
                step={1}
                value={[gifQuality]}
                onValueChange={(values) => setGifQuality(values[0])}
              />
              <p className="text-xs text-gray-500">Lower quality = smaller file size</p>
            </div>
            
            {processedImageUrl && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="border rounded overflow-hidden">
                  <canvas ref={canvasRef} className="w-full h-auto" />
                </div>
              </div>
            )}
            
            <Button 
              onClick={exportAsGif} 
              disabled={isExporting || !imageRef.current || selectedEffectKey === 'none' || isGifLibraryAvailable === false}
              className="w-full"
            >
              {isExporting ? (
                <span className="flex items-center">
                  <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating GIF...
                </span>
              ) : (
                'Export as GIF'
              )}
            </Button>
            
            {isGifLibraryAvailable === false && (
              <p className="text-sm text-red-500">
                GIF export is not available. Please check the browser console for details.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 