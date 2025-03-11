'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import EnhancedGifExport from './EnhancedGifExport';
import { Slider } from './ui/slider';
import { createImage, createCanvas, isBrowser, downloadFile } from '@/lib/browser-utils';
import { processImageWithShader, SHADER_EFFECTS } from '@/lib/webgl-utils';
import { debounce } from '@/lib/utils';

// Maximum texture size for WebGL (common safe limit is 4096x4096)
const MAX_TEXTURE_SIZE = 4096;

// Effect types from SHADER_EFFECTS
export type Effect = keyof typeof SHADER_EFFECTS;

export default function WebGLImageProcessor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [selectedEffect, setSelectedEffect] = useState<Effect>('none');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [uniformValues, setUniformValues] = useState<Record<string, any>>({});
  const [imageOriginalDimensions, setImageOriginalDimensions] = useState<{width: number; height: number} | null>(null);
  const [isImageResized, setIsImageResized] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState('effects');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Debounced image processing function for real-time preview
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedProcessImage = useCallback(
    debounce(async (effect: Effect, values: Record<string, any>) => {
      if (!imageRef.current || effect === 'none') {
        return setProcessedImageUrl(imageUrl);
      }
      
      try {
        setIsProcessing(true);
        
        // Get the effect definition
        const shaderEffect = SHADER_EFFECTS[effect];
        if (!shaderEffect) {
          console.error(`Effect ${effect} not found`);
          return;
        }
        
        // Process the image
        const processedImageData = await processImageWithShader(
          imageRef.current,
          shaderEffect,
          values
        );
        
        // Convert to URL for display
        const canvas = createCanvas(processedImageData.width, processedImageData.height);
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.putImageData(processedImageData, 0, 0);
          const dataUrl = canvas.toDataURL('image/png', 1.0);
          setProcessedImageUrl(dataUrl);
        }
      } catch (error) {
        console.error('Error in live preview:', error);
        // Fallback to original image if processing fails
        setProcessedImageUrl(imageUrl);
      } finally {
        setIsProcessing(false);
      }
    }, 150),
    [imageUrl]
  );

  // Initialize default uniform values when the effect changes
  useEffect(() => {
    if (selectedEffect === 'none') {
      setUniformValues({});
      return;
    }
    
    const effect = SHADER_EFFECTS[selectedEffect];
    if (!effect || !effect.uniforms) return;
    
    // Initialize uniform values from defaults
    const initialValues: Record<string, any> = {};
    
    Object.entries(effect.uniforms).forEach(([key, uniformConfig]) => {
      // Note: The type might be different than expected, so handle it safely
      if (typeof uniformConfig === 'object' && uniformConfig !== null && 'value' in uniformConfig) {
        initialValues[key] = uniformConfig.value;
      }
    });
    
    setUniformValues(initialValues);
  }, [selectedEffect]);

  // Apply processing when uniform values change
  useEffect(() => {
    if (imageRef.current && selectedEffect !== 'none') {
      debouncedProcessImage(selectedEffect, uniformValues);
    } else if (imageUrl) {
      setProcessedImageUrl(imageUrl);
    }
  }, [uniformValues, selectedEffect, debouncedProcessImage, imageUrl]);

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
      setProcessedImageUrl(fileUrl); // Initially show original image
      setIsError(false);
      setSelectedEffect('none'); // Reset to no effect
      
      // Load the image to check its dimensions
      const img = new Image();
      img.onload = () => {
        // Store original dimensions
        setImageOriginalDimensions({
          width: img.width,
          height: img.height
        });
        
        // Check if image needs to be resized for WebGL processing but maintain quality
        const needsResize = img.width > MAX_TEXTURE_SIZE || img.height > MAX_TEXTURE_SIZE;
        setIsImageResized(needsResize);
        
        // Save the image reference for processing
        imageRef.current = img;
      };
      img.src = fileUrl;
    }
  };

  // Handle effect selection
  const handleEffectChange = (effect: Effect) => {
    setSelectedEffect(effect);
    
    if (effect === 'none' && imageUrl) {
      setProcessedImageUrl(imageUrl);
    }
  };

  // Handle uniform value change
  const handleUniformChange = (name: string, value: any) => {
    setUniformValues((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle download of processed image
  const handleDownload = () => {
    if (processedImageUrl) {
      const filename = selectedFile?.name 
        ? `${selectedFile.name.split('.')[0]}_${selectedEffect}.png`
        : `image_${selectedEffect}_${Date.now()}.png`;
      
      downloadFile(processedImageUrl, filename);
    }
  };

  // Render the component
  return (
    <div className="relative flex flex-col h-full">
      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Canvas area - Takes remaining space */}
          <div className="flex-1 overflow-auto flex items-center justify-center bg-black">
            {imageUrl ? (
              <div className="relative">
                {/* Loading overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center z-10">
                    <div className="loading-spinner"></div>
                  </div>
                )}
                
                {/* Display the processed image */}
                {processedImageUrl && (
                  <img 
                    src={processedImageUrl} 
                    alt="Processed" 
                    className="max-w-full max-h-[calc(100vh-64px)]"
                  />
                )}
                
                {/* Hidden canvas for processing */}
                <canvas ref={canvasRef} className="hidden" />
              </div>
            ) : (
              <div className="text-center p-8">
                <h3 className="text-lg font-semibold mb-2">Upload an image to begin</h3>
                <p className="text-muted-foreground mb-4">
                  Select a file to apply WebGL image effects
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                >
                  Choose File
                </label>
              </div>
            )}
          </div>

          {/* Bottom toolbar */}
          <div className="p-4 border-t flex justify-between items-center">
            <div>
              {/* File upload button */}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload-bottom"
              />
              <label
                htmlFor="file-upload-bottom"
                className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer mr-2"
              >
                Choose Image
              </label>
              
              {/* Image info */}
              {imageOriginalDimensions && (
                <span className="text-xs text-muted-foreground">
                  {imageOriginalDimensions.width} x {imageOriginalDimensions.height}px
                  {isImageResized && ' (will be resized for processing)'}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Download button */}
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
              
              {/* GIF Export button */}
              {processedImageUrl && selectedEffect !== 'none' && (
                <EnhancedGifExport 
                  imageElement={imageRef.current} 
                  canvasRef={canvasRef}
                  effectName={selectedEffect}
                  effectParams={uniformValues}
                />
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-[320px] border-l h-full flex flex-col overflow-hidden">
          {/* Tabs */}
          <Tabs defaultValue="effects" className="flex flex-col h-full" value={activeSidebarTab} onValueChange={setActiveSidebarTab}>
            <div className="border-b">
              <TabsList className="w-full">
                <TabsTrigger value="effects" className="flex-1">Effects</TabsTrigger>
                <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="effects" className="flex-1 overflow-auto p-4">
              <div>
                <h3 className="font-medium mb-4">Select Effect</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(SHADER_EFFECTS).map((effectKey) => (
                    <Button
                      key={effectKey}
                      variant={selectedEffect === effectKey ? "default" : "outline"}
                      className={`text-sm justify-start ${selectedEffect === effectKey ? "bg-primary" : ""}`}
                      onClick={() => handleEffectChange(effectKey as Effect)}
                    >
                      {SHADER_EFFECTS[effectKey as Effect].name}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Effect Parameters */}
              {selectedEffect !== 'none' && SHADER_EFFECTS[selectedEffect]?.uniforms && (
                <div className="mt-6">
                  <h3 className="font-medium mb-4">Parameters</h3>
                  <div className="space-y-4">
                    {Object.entries(SHADER_EFFECTS[selectedEffect].uniforms).map(([key, uniformConfig]) => {
                      // Skip non-slider uniforms (like color pickers)
                      if (typeof uniformConfig === 'object' && uniformConfig !== null && uniformConfig.type === 'color') {
                        return (
                          <div key={key} className="space-y-2">
                            <Label htmlFor={key}>{key.replace('u_', '').replace(/([A-Z])/g, ' $1').toUpperCase()}</Label>
                            <div className="flex space-x-2">
                              <input
                                type="color"
                                id={key}
                                value={rgbArrayToHex(uniformValues[key] || [0, 0, 0])}
                                onChange={(e) => {
                                  const hexColor = e.target.value;
                                  // Convert hex to RGB array
                                  const r = parseInt(hexColor.slice(1, 3), 16) / 255;
                                  const g = parseInt(hexColor.slice(3, 5), 16) / 255;
                                  const b = parseInt(hexColor.slice(5, 7), 16) / 255;
                                  handleUniformChange(key, [r, g, b]);
                                }}
                                className="w-10 h-10 rounded overflow-hidden"
                              />
                              <span className="text-sm">{rgbArrayToHex(uniformValues[key] || [0, 0, 0])}</span>
                            </div>
                          </div>
                        );
                      }
                      
                      // For sliders and other numeric uniforms
                      if (typeof uniformConfig === 'object' && uniformConfig !== null && 'min' in uniformConfig && 'max' in uniformConfig) {
                        const { min, max, step = 0.01 } = uniformConfig;
                        const value = uniformValues[key] || 0;
                        
                        return (
                          <div key={key} className="space-y-2">
                            <div className="flex justify-between">
                              <Label htmlFor={key}>{formatUniformName(key)}</Label>
                              <span className="text-xs">{typeof value === 'number' ? value.toFixed(2) : value}</span>
                            </div>
                            <Slider
                              id={key}
                              min={min as number}
                              max={max as number}
                              step={step as number}
                              value={[value as number]}
                              onValueChange={(values) => handleUniformChange(key, values[0])}
                            />
                          </div>
                        );
                      }
                      
                      return null;
                    })}
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="settings" className="flex-1 overflow-auto p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Image Information</h3>
                  {imageOriginalDimensions ? (
                    <Card>
                      <CardContent className="p-4 space-y-2">
                        <p><strong>Dimensions:</strong> {imageOriginalDimensions.width} x {imageOriginalDimensions.height}px</p>
                        <p><strong>File:</strong> {selectedFile?.name || 'Unknown'}</p>
                        <p><strong>Size:</strong> {selectedFile ? formatFileSize(selectedFile.size) : 'Unknown'}</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <p className="text-muted-foreground">No image loaded</p>
                  )}
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">WebGL Information</h3>
                  <Card>
                    <CardContent className="p-4">
                      <WebGLInfo />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// Helper component to show WebGL information
function WebGLInfo() {
  const [info, setInfo] = useState<{ supported: boolean; renderer?: string; version?: string }>({
    supported: false
  });
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const canvas = document.createElement('canvas');
      const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
      
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        let renderer = 'Unknown';
        let version = gl.getParameter(gl.VERSION);
        
        if (debugInfo) {
          renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
        
        setInfo({
          supported: true,
          renderer,
          version: version as string
        });
      } else {
        setInfo({ supported: false });
      }
    }
  }, []);
  
  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium">
        <span className={info.supported ? 'text-green-500' : 'text-red-500'}>WebGL is {info.supported ? 'supported' : 'not supported'}</span>
      </p>
      {info.supported && (
        <>
          <p><strong>Renderer:</strong> {info.renderer}</p>
          <p><strong>Version:</strong> {info.version}</p>
        </>
      )}
      {!info.supported && (
        <p className="text-yellow-500">
          WebGL is required for image effects. Please try a different browser or check your graphics settings.
        </p>
      )}
    </div>
  );
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' bytes';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Helper function to format uniform name
function formatUniformName(name: string): string {
  return name
    .replace(/^u_|^u/, '')
    .replace(/([A-Z])/g, ' $1')
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Helper function to convert RGB array to hex
function rgbArrayToHex(rgb: number[]): string {
  if (!rgb || rgb.length < 3) return '#000000';
  
  const r = Math.round(rgb[0] * 255).toString(16).padStart(2, '0');
  const g = Math.round(rgb[1] * 255).toString(16).padStart(2, '0');
  const b = Math.round(rgb[2] * 255).toString(16).padStart(2, '0');
  
  return `#${r}${g}${b}`;
} 