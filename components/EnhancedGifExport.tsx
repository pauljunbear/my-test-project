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

interface EnhancedGifExportProps {
  imageUrl: string;
  onExportComplete?: (blob: Blob, url: string) => void;
}

export default function EnhancedGifExport({ imageUrl, onExportComplete }: EnhancedGifExportProps) {
  // State for selected effect and parameters
  const [selectedEffectKey, setSelectedEffectKey] = useState<string>('none');
  const [uniformValues, setUniformValues] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isGifLibraryAvailable, setIsGifLibraryAvailable] = useState<boolean | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [gifFrameCount, setGifFrameCount] = useState<number>(10);
  const [gifDuration, setGifDuration] = useState<number>(1.0);
  const [gifQuality, setGifQuality] = useState<number>(10);
  
  // Preview canvas ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // Check if GIF library is available
  useEffect(() => {
    const checkGifLibrary = async () => {
      try {
        // Only try to load the browser GIF library
        await import('gif.js.optimized');
        setIsGifLibraryAvailable(true);
      } catch (e) {
        console.error('GIF library not available:', e);
        setIsGifLibraryAvailable(false);
      }
    };
    
    checkGifLibrary();
  }, []);
  
  // Load and initialize the image
  useEffect(() => {
    if (!imageUrl) return;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      imageRef.current = img;
      
      // Draw the original image on the preview canvas
      if (canvasRef.current) {
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
  }, [imageUrl]);
  
  // Initialize uniform values when effect changes
  useEffect(() => {
    if (selectedEffectKey === 'none') {
      setUniformValues({});
      return;
    }
    
    const effect = SHADER_EFFECTS[selectedEffectKey];
    if (!effect) return;
    
    const initialValues: Record<string, number> = {};
    
    // Initialize values from effect definition
    Object.entries(effect.uniforms).forEach(([key, uniform]) => {
      initialValues[key] = uniform.value;
    });
    
    setUniformValues(initialValues);
  }, [selectedEffectKey]);
  
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
        if (selectedEffectKey === 'wave') {
          animatedUniforms.uFrequency = uniformValues.uFrequency + 
            Math.sin(time * Math.PI * 2) * (uniformValues.uFrequency * 0.2);
        } else if (selectedEffectKey === 'pixelate') {
          animatedUniforms.u_pixel_size = uniformValues.u_pixel_size + 
            Math.sin(time * Math.PI * 2) * (uniformValues.u_pixel_size * 0.2);
        } else if (selectedEffectKey === 'dither') {
          animatedUniforms.u_dither_scale = uniformValues.u_dither_scale +
            Math.sin(time * Math.PI * 2) * 0.5;
        } else if (selectedEffectKey === 'halftone') {
          animatedUniforms.u_angle = (uniformValues.u_angle + time) % 6.28;
        } else if (selectedEffectKey === 'ripple') {
          // For ripple effect, time is the most important parameter
          animatedUniforms.u_time = time * 10.0; // Scale time for more noticeable animation
          
          // Optional: We can also vary other parameters for more dynamic effects
          if (uniformValues.u_amplitude > 0) {
            animatedUniforms.u_amplitude = uniformValues.u_amplitude * (0.8 + 0.4 * Math.sin(time * Math.PI));
          }
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
      
      return url;
    } catch (err) {
      console.error('Error exporting GIF:', err);
    } finally {
      setIsExporting(false);
    }
  }, [imageRef, selectedEffectKey, uniformValues, gifFrameCount, gifDuration, gifQuality, isGifLibraryAvailable, onExportComplete]);
  
  // Handle uniform value changes
  const handleUniformChange = (key: string, value: number) => {
    setUniformValues(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Determine if we should show parameter controls
  const showControls = selectedEffectKey !== 'none' && SHADER_EFFECTS[selectedEffectKey];
  
  // Get the current effect for controls
  const currentEffect = selectedEffectKey !== 'none' ? SHADER_EFFECTS[selectedEffectKey] : null;
  
  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column - Effect selection and parameters */}
        <div className="space-y-4">
          <div className="p-4 border rounded-md bg-white">
            <h2 className="text-lg font-semibold mb-4">Shader Effect</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Select Effect</label>
              <Select
                value={selectedEffectKey}
                onValueChange={setSelectedEffectKey}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an effect" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Original)</SelectItem>
                  {Object.entries(SHADER_EFFECTS).map(([key, effect]) => (
                    <SelectItem key={key} value={key}>
                      {effect.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {showControls && currentEffect && (
              <div className="space-y-4">
                {Object.entries(currentEffect.uniforms).map(([key, uniform]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">
                        {key.replace(/^[u_]/, '')}
                      </label>
                      <span className="text-xs">
                        {uniformValues[key]?.toFixed(2) || uniform.value.toFixed(2)}
                      </span>
                    </div>
                    <Slider
                      value={[uniformValues[key] || uniform.value]}
                      min={uniform.min || 0}
                      max={uniform.max || 1}
                      step={uniform.step || 0.01}
                      onValueChange={values => handleUniformChange(key, values[0])}
                      disabled={isProcessing || isExporting}
                    />
                  </div>
                ))}
                
                <Button
                  onClick={applyShader}
                  disabled={isProcessing || isExporting}
                  className="w-full"
                >
                  {isProcessing ? 'Processing...' : 'Apply Effect'}
                </Button>
              </div>
            )}
          </div>
          
          {selectedEffectKey !== 'none' && isGifLibraryAvailable === true && (
            <div className="p-4 border rounded-md bg-gray-50">
              <h3 className="text-sm font-medium mb-3">GIF Export Options</h3>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="text-sm">Frame Count</label>
                    <span className="text-xs">{gifFrameCount}</span>
                  </div>
                  <Slider
                    value={[gifFrameCount]}
                    min={5}
                    max={30}
                    step={1}
                    onValueChange={values => setGifFrameCount(values[0])}
                    disabled={isExporting}
                  />
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="text-sm">Duration (seconds)</label>
                    <span className="text-xs">{gifDuration.toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[gifDuration]}
                    min={0.5}
                    max={5.0}
                    step={0.1}
                    onValueChange={values => setGifDuration(values[0])}
                    disabled={isExporting}
                  />
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="text-sm">Quality (lower is better)</label>
                    <span className="text-xs">{gifQuality}</span>
                  </div>
                  <Slider
                    value={[gifQuality]}
                    min={1}
                    max={20}
                    step={1}
                    onValueChange={values => setGifQuality(values[0])}
                    disabled={isExporting}
                  />
                </div>
                
                <Button
                  onClick={exportAsGif}
                  disabled={isExporting || isGifLibraryAvailable !== true}
                  className="w-full"
                  variant="secondary"
                >
                  {isExporting ? 'Creating GIF...' : 'Export as GIF'}
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Right column - Preview */}
        <div className="space-y-4">
          <div className="p-4 border rounded-md bg-white">
            <h2 className="text-lg font-semibold mb-4">Preview</h2>
            
            <div className="relative w-full">
              <canvas
                ref={canvasRef}
                className="w-full h-auto bg-gray-100 rounded overflow-hidden"
                style={{ aspectRatio: '16/9', objectFit: 'contain' }}
              />
              
              {(isProcessing || isExporting) && (
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded">
                  <div className="text-white text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p>{isExporting ? 'Creating GIF...' : 'Processing effect...'}</p>
                  </div>
                </div>
              )}
            </div>
            
            {processedImageUrl && (
              <div className="mt-4">
                <a
                  href={processedImageUrl}
                  download="processed-image.png"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Download Processed Image
                </a>
              </div>
            )}
          </div>
          
          {isGifLibraryAvailable === false && (
            <div className="p-4 border border-yellow-200 rounded-md bg-yellow-50">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">GIF Export Not Available</h3>
              <p className="text-xs text-yellow-700">
                The GIF export library is not available in your environment. Please install the required dependencies:
              </p>
              <pre className="mt-2 text-xs bg-yellow-100 p-2 rounded">
                npm install gif.js.optimized
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 