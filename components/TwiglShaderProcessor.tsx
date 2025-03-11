'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Slider } from './ui/slider';
import { createImage, createCanvas, isBrowser, downloadFile } from '@/lib/browser-utils';
import { debounce } from '@/lib/utils';

// Define shader modes from Twigl
type ShaderMode = 'classic' | 'geek' | 'geeker' | 'geekest';

// Example shaders for various effects
const EXAMPLE_SHADERS = {
  pixelate: `
// Pixelation effect - geekest mode
vec2 uv = FC.xy/r;
float pixelSize = 20.0 * u_pixel_amount;
vec2 pixelated = floor(uv * pixelSize) / pixelSize;
o = texture(b, pixelated);
`,
  vortex: `
// Vortex effect - geekest mode
vec2 uv = FC.xy/r;
vec2 center = vec2(0.5);
vec2 delta = uv - center;
float angle = t * u_speed;
float dist = length(delta);
delta *= rotate2D(angle * (1.0 - dist));
o = texture(b, center + delta);
`,
  halftone: `
// Halftone effect - geekest mode
vec2 uv = FC.xy/r;
float size = 15.0 * u_dot_size;
vec2 pixel = floor(FC.xy / size) * size;
vec3 col = texture(b, pixel/r).rgb;
float bright = (col.r + col.g + col.b) / 3.0;
float dots = smoothstep(0.1, 0.9, bright);
o = vec4(vec3(dots), 1.0);
`,
  ripple: `
// Ripple effect - geekest mode
vec2 uv = FC.xy/r;
vec2 center = vec2(0.5);
float dist = length(uv - center);
float ripple = sin(dist * 30.0 - t * u_speed) * u_amplitude;
vec2 distUv = uv + ripple * 0.01;
o = texture(b, distUv);
`,
  duotone: `
// Duotone effect - geekest mode
vec2 uv = FC.xy/r;
vec3 color1 = vec3(0.0, 0.5, 0.9);  // First color (can be controlled via uniform)
vec3 color2 = vec3(0.9, 0.1, 0.3);  // Second color (can be controlled via uniform)
vec3 tex = texture(b, uv).rgb;
float gray = dot(tex, vec3(0.299, 0.587, 0.114));
o = vec4(mix(color1, color2, gray), 1.0);
`
};

// Define uniforms for each shader effect
const SHADER_UNIFORMS = {
  pixelate: {
    u_pixel_amount: { value: 0.5, min: 0.1, max: 1.0, step: 0.01, name: 'Pixel Amount' }
  },
  vortex: {
    u_speed: { value: 0.5, min: 0.0, max: 2.0, step: 0.01, name: 'Speed' }
  },
  halftone: {
    u_dot_size: { value: 1.0, min: 0.5, max: 2.0, step: 0.01, name: 'Dot Size' }
  },
  ripple: {
    u_speed: { value: 1.0, min: 0.0, max: 3.0, step: 0.01, name: 'Speed' },
    u_amplitude: { value: 0.5, min: 0.0, max: 1.0, step: 0.01, name: 'Amplitude' }
  },
  duotone: {}
};

export default function TwiglShaderProcessor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [selectedEffect, setSelectedEffect] = useState<string>('none');
  const [shaderCode, setShaderCode] = useState<string>('');
  const [shaderMode, setShaderMode] = useState<ShaderMode>('geekest');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [uniformValues, setUniformValues] = useState<Record<string, any>>({});
  const [imageOriginalDimensions, setImageOriginalDimensions] = useState<{width: number; height: number} | null>(null);
  const [isImageResized, setIsImageResized] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState('effects');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const twiglCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Debounced shader processing function for real-time preview
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedProcessShader = useCallback(
    debounce(async (effect: string, values: Record<string, any>) => {
      if (!imageRef.current || effect === 'none') return;
      
      try {
        setIsProcessing(true);
        
        // We'll need to initialize a WebGL context and compile the shader
        // This is a placeholder until we properly integrate Twigl's API
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Process the shader effect - this will be replaced with Twigl's renderer
        simulateTwiglProcessing(canvas, effect, values);
        
        // Get the result as a data URL
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        setProcessedImageUrl(dataUrl);
      } catch (error) {
        console.error('Error in live preview:', error);
      } finally {
        setIsProcessing(false);
      }
    }, 150),
    []
  );
  
  // Helper function to simulate Twigl processing (temporary until full integration)
  const simulateTwiglProcessing = (canvas: HTMLCanvasElement, effect: string, values: Record<string, any>) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !imageRef.current) return;
    
    // Draw the original image first
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
    
    // Apply a simulated effect based on the selected shader
    // This will be replaced with actual WebGL shaders
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    if (effect === 'pixelate') {
      const pixelSize = Math.ceil(20 * (values.u_pixel_amount || 0.5));
      if (pixelSize > 1) {
        // Simple pixelation algorithm
        for (let y = 0; y < canvas.height; y += pixelSize) {
          for (let x = 0; x < canvas.width; x += pixelSize) {
            // Get color from one pixel in each block
            const pixelData = ctx.getImageData(x, y, 1, 1).data;
            // Fill the entire block with that color
            ctx.fillStyle = `rgba(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]}, ${pixelData[3] / 255})`;
            ctx.fillRect(x, y, pixelSize, pixelSize);
          }
        }
      }
    }
    
    // For other effects, we'll just place a colored overlay
    // until we implement the actual WebGL shaders
    if (effect !== 'pixelate' && effect !== 'none') {
      ctx.fillStyle = effect === 'duotone' ? 'rgba(255, 0, 255, 0.3)' : 
                      effect === 'vortex' ? 'rgba(0, 255, 255, 0.3)' :
                      effect === 'halftone' ? 'rgba(0, 0, 255, 0.3)' :
                      'rgba(255, 255, 0, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add a label with the effect name for now
      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${effect} effect (Twigl simulation)`, canvas.width / 2, canvas.height / 2);
    }
  };
  
  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Check if the file is an image
      if (!file.type.startsWith('image/')) {
        setIsError(true);
        setErrorMessage('Please select an image file.');
        return;
      }
      
      setSelectedFile(file);
      
      // Create a high-quality object URL for the image
      const fileUrl = URL.createObjectURL(file);
      setImageUrl(fileUrl);
      setProcessedImageUrl(null); // Reset processed image
      setIsError(false);
      
      // Load the image to check its dimensions
      const img = new Image();
      img.onload = () => {
        // Store original dimensions
        setImageOriginalDimensions({
          width: img.width,
          height: img.height
        });
        
        // Initialize canvas with proper dimensions
        if (canvasRef.current) {
          canvasRef.current.width = img.width;
          canvasRef.current.height = img.height;
          
          // Draw the original image to the canvas
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, img.width, img.height);
          }
        }
        
        // Set as the source for processing
        imageRef.current = img;
        
        // If there was a selected effect, apply it to the new image
        if (selectedEffect !== 'none') {
          debouncedProcessShader(selectedEffect, uniformValues);
        }
      };
      
      // Set image source to the object URL
      img.src = fileUrl;
    }
  };
  
  // Effect to update shader code when effect is selected
  useEffect(() => {
    if (selectedEffect === 'none') {
      setShaderCode('');
      return;
    }
    
    // Set the shader code from our examples
    setShaderCode(EXAMPLE_SHADERS[selectedEffect as keyof typeof EXAMPLE_SHADERS] || '');
    
    // Initialize uniform values for the selected effect
    const effectUniforms = SHADER_UNIFORMS[selectedEffect as keyof typeof SHADER_UNIFORMS] || {};
    const initialValues: Record<string, any> = {};
    
    // Type safety for the uniform values
    Object.entries(effectUniforms).forEach(([key, uniformValue]) => {
      const uniform = uniformValue as { value: any; min?: number; max?: number; step?: number; name?: string };
      initialValues[key] = uniform.value;
    });
    
    setUniformValues(initialValues);
  }, [selectedEffect]);
  
  // Effect to apply processing when effect or uniform values change
  useEffect(() => {
    if (imageRef.current && selectedEffect !== 'none') {
      debouncedProcessShader(selectedEffect, uniformValues);
    }
  }, [selectedEffect, uniformValues, debouncedProcessShader]);
  
  // Handle real-time uniform value changes with preview
  const handleUniformChange = (key: string, value: any) => {
    setUniformValues(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Handle reset to original image
  const handleResetImage = () => {
    setProcessedImageUrl(null);
    setSelectedEffect('none');
    setUniformValues({});
    setShaderCode('');
  };
  
  // Handle download
  const handleDownload = () => {
    if (processedImageUrl) {
      downloadFile(processedImageUrl, 'twigl-processed-image.png');
    }
  };
  
  // Handle shader mode change
  const handleModeChange = (mode: ShaderMode) => {
    setShaderMode(mode);
    // We'd need to adapt the shader code for the new mode
    // For now, let's just log the change
    console.log(`Changed shader mode to: ${mode}`);
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Twigl Shader Processor</h2>
        <p className="text-muted-foreground">Upload an image and apply advanced shader effects using Twigl technology</p>
      </div>
      
      <div className="flex flex-1 gap-6">
        {/* Left Sidebar */}
        <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden flex flex-col">
          {/* File Upload Section */}
          <div className="p-4 border-b">
            <h3 className="font-medium mb-3">Image Upload</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl border-gray-300 dark:border-gray-600 cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                      </svg>
                      <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                        {selectedFile ? selectedFile.name : "Click to upload image"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG or WebP</p>
                    </div>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              
              {isError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {errorMessage}
                </div>
              )}
              
              {imageOriginalDimensions && (
                <div className="text-xs text-gray-500">
                  Image dimensions: {imageOriginalDimensions.width} × {imageOriginalDimensions.height}px
                </div>
              )}
            </div>
          </div>
          
          {/* Controls Tabs */}
          <div className="flex-1 overflow-y-auto">
            <Tabs 
              defaultValue="effects" 
              value={activeSidebarTab} 
              onValueChange={setActiveSidebarTab}
              className="w-full"
            >
              <div className="border-b">
                <TabsList className="w-full justify-start p-0 h-auto bg-transparent border-b rounded-none">
                  <TabsTrigger 
                    value="effects" 
                    className="data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700 rounded-none py-3 px-4 transition-colors"
                  >
                    Effects
                  </TabsTrigger>
                  <TabsTrigger 
                    value="code" 
                    className="data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700 rounded-none py-3 px-4 transition-colors"
                  >
                    Code
                  </TabsTrigger>
                  <TabsTrigger 
                    value="settings" 
                    className="data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700 rounded-none py-3 px-4 transition-colors"
                  >
                    Settings
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="effects" className="p-4 space-y-6 mt-0">
                {/* Shader Selection */}
                <div>
                  <h3 className="font-medium mb-4">Select Effect</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(EXAMPLE_SHADERS).map((effectKey) => (
                      <Button
                        key={effectKey}
                        variant={selectedEffect === effectKey ? "default" : "outline"}
                        className={`text-sm justify-start px-3 py-2 h-auto rounded-lg ${selectedEffect === effectKey ? 'bg-primary text-white shadow-sm' : ''}`}
                        onClick={() => setSelectedEffect(effectKey)}
                      >
                        {effectKey.charAt(0).toUpperCase() + effectKey.slice(1)}
                      </Button>
                    ))}
                    <Button
                      variant={selectedEffect === 'none' ? "default" : "outline"}
                      className={`text-sm justify-start px-3 py-2 h-auto rounded-lg ${selectedEffect === 'none' ? 'bg-primary text-white shadow-sm' : ''}`}
                      onClick={() => setSelectedEffect('none')}
                    >
                      None
                    </Button>
                  </div>
                </div>
                
                {/* Effect Parameters */}
                {selectedEffect !== 'none' && SHADER_UNIFORMS[selectedEffect as keyof typeof SHADER_UNIFORMS] && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium">Effect Parameters</h3>
                      {isProcessing && (
                        <div className="flex items-center text-xs text-blue-600">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Previewing...
                        </div>
                      )}
                    </div>
                    <div className="space-y-5">
                      {Object.entries(SHADER_UNIFORMS[selectedEffect as keyof typeof SHADER_UNIFORMS]).map(([key, uniformValue]) => {
                        // Type safety for uniform values
                        const uniform = uniformValue as { value: any; min?: number; max?: number; step?: number; name?: string };
                        
                        // Get the current value, falling back to the default
                        const value = uniformValues[key] !== undefined ? uniformValues[key] : uniform.value;
                        
                        return (
                          <div key={key} className="space-y-2">
                            <div className="flex justify-between">
                              <Label htmlFor={key} className="text-sm">
                                {uniform.name || key}
                              </Label>
                              <span className="text-sm font-mono text-gray-600 dark:text-gray-300">
                                {typeof value === 'number' ? value.toFixed(2) : value}
                              </span>
                            </div>
                            <Slider
                              id={key}
                              min={uniform.min || 0}
                              max={uniform.max || 1}
                              step={uniform.step || 0.01}
                              value={[value]}
                              onValueChange={([newValue]) => handleUniformChange(key, newValue)}
                              className="pt-2"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <div className="mt-6 space-y-2">
                  <Button 
                    className="w-full rounded-lg shadow-sm hover:shadow"
                    variant="outline"
                    onClick={handleResetImage}
                  >
                    Reset Image
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="code" className="p-4 space-y-6 mt-0">
                <div>
                  <h3 className="font-medium mb-4">Shader Code</h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm">Shader Mode</Label>
                      <div className="flex mt-2 space-x-2">
                        {(['classic', 'geek', 'geeker', 'geekest'] as ShaderMode[]).map((mode) => (
                          <Button
                            key={mode}
                            variant={shaderMode === mode ? "default" : "outline"}
                            size="sm"
                            className={`text-xs ${shaderMode === mode ? 'bg-primary text-white' : ''}`}
                            onClick={() => handleModeChange(mode)}
                          >
                            {mode}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-auto" style={{ height: '300px' }}>
                      <pre>{shaderCode || 'No shader code available. Select an effect first.'}</pre>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      <p>In <strong>geekest</strong> mode, Twigl provides shortcuts like:</p>
                      <ul className="list-disc pl-5 mt-1">
                        <li><code>FC</code> for <code>gl_FragCoord</code></li>
                        <li><code>r</code> for <code>resolution</code></li>
                        <li><code>t</code> for <code>time</code></li>
                        <li><code>b</code> for <code>backbuffer</code></li>
                        <li><code>o</code> for <code>outColor</code> (output)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="settings" className="p-4 space-y-6 mt-0">
                <div>
                  <h3 className="font-medium mb-4">Twigl Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm">Output Format</Label>
                      <select 
                        className="w-full p-2 border rounded-lg mt-1" 
                        defaultValue="png"
                      >
                        <option value="png">PNG (Lossless)</option>
                        <option value="jpg">JPG (High Quality)</option>
                        <option value="gif">Animated GIF</option>
                        <option value="webm">WebM Video</option>
                      </select>
                    </div>
                    
                    <div className="pt-4">
                      <h4 className="text-sm font-medium mb-2">WebGL Options</h4>
                      <div className="flex items-center">
                        <input type="checkbox" id="webgl2" className="mr-2 rounded" defaultChecked />
                        <Label htmlFor="webgl2" className="text-sm">
                          Use WebGL 2.0 when available
                        </Label>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Enables GLSL ES 3.0 features for more advanced shaders
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        {/* Main Canvas Area */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <h3 className="font-medium">Canvas</h3>
              {selectedEffect !== 'none' && (
                <div className="text-sm text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                  {selectedEffect.charAt(0).toUpperCase() + selectedEffect.slice(1)}
                </div>
              )}
            </div>
            
            {processedImageUrl && (
              <Button size="sm" variant="outline" onClick={handleDownload} className="rounded-lg shadow-sm">
                <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Save Image
              </Button>
            )}
          </div>
          
          <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-neutral-100 dark:bg-gray-700" style={{ backgroundImage: 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABh0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMS4xYwSAYwAAADRJREFUOE9jGAUD17+6//9xYbA+TAwXhxkCVs9EAYQYTAwXB6PBbyDMAEIYJg4SPwgBAyMAACyBl26j/nYGAAAAAElFTkSuQmCC")' }}>
            {imageUrl && (
              <div className="relative max-w-full max-h-full">
                {processedImageUrl ? (
                  <img
                    src={processedImageUrl}
                    alt="Processed"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    style={{ maxHeight: 'calc(100vh - 230px)' }}
                  />
                ) : (
                  <img
                    src={imageUrl}
                    alt="Original"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    style={{ maxHeight: 'calc(100vh - 230px)' }}
                  />
                )}
                <canvas ref={canvasRef} className="hidden" />
                <canvas ref={twiglCanvasRef} id="twigl-canvas" className="hidden" />
              </div>
            )}
            
            {!imageUrl && (
              <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-3">No Image Loaded</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Upload an image to apply Twigl shader effects</p>
                <label htmlFor="image-upload-center" className="cursor-pointer inline-flex items-center px-5 py-2.5 bg-blue-600 border border-transparent rounded-lg text-white hover:bg-blue-700 shadow-sm transition-colors">
                  Select Image
                  <input
                    id="image-upload-center"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>
              </div>
            )}
          </div>
          
          {imageOriginalDimensions && selectedEffect !== 'none' && (
            <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-100 dark:border-amber-900/30">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Using Twigl shader processing with {shaderMode} mode. Image: {imageOriginalDimensions.width}×{imageOriginalDimensions.height}px
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 