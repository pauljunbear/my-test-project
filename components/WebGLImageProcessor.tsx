'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import EnhancedGifExport from './EnhancedGifExport';
import { Slider } from './ui/slider';
import { createImage, createCanvas, isBrowser, downloadFile } from '@/lib/browser-utils';
import { processImageWithShader, SHADER_EFFECTS } from '@/lib/webgl-utils';

// Maximum texture size for WebGL (common safe limit is 4096x4096)
const MAX_TEXTURE_SIZE = 4096;

export default function WebGLImageProcessor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [selectedEffect, setSelectedEffect] = useState<string>('none');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [uniformValues, setUniformValues] = useState<Record<string, any>>({});
  const [imageOriginalDimensions, setImageOriginalDimensions] = useState<{width: number; height: number} | null>(null);
  const [isImageResized, setIsImageResized] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState('effects');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
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
        
        // Check if image needs to be resized for WebGL processing but maintain quality
        const needsResize = img.width > MAX_TEXTURE_SIZE || img.height > MAX_TEXTURE_SIZE;
        setIsImageResized(needsResize);
        
        // Save the image reference for processing
        imageRef.current = img;
      };
      
      // Set image source to the object URL
      img.src = fileUrl;
    }
  };
  
  // Initialize uniform values when effect changes
  useEffect(() => {
    if (selectedEffect === 'none') {
      setUniformValues({});
      return;
    }
    
    const effect = SHADER_EFFECTS[selectedEffect];
    if (!effect) return;
    
    const initialValues: Record<string, any> = {};
    
    // Initialize values from effect definition with proper type checking
    Object.entries(effect.uniforms).forEach(([key, uniform]) => {
      // Handle all possible value types
      if (uniform.value !== undefined) {
        initialValues[key] = uniform.value;
      }
    });
    
    setUniformValues(initialValues);
  }, [selectedEffect]);
  
  // Resize image to fit within WebGL texture size limits
  const resizeImageForWebGL = (img: HTMLImageElement): HTMLImageElement => {
    if (!imageOriginalDimensions) return img;
    
    const { width, height } = imageOriginalDimensions;
    
    // If image is within limits, return the original
    if (width <= MAX_TEXTURE_SIZE && height <= MAX_TEXTURE_SIZE) {
      return img;
    }
    
    // Calculate new dimensions while maintaining aspect ratio
    let newWidth = width;
    let newHeight = height;
    
    if (width > height) {
      if (width > MAX_TEXTURE_SIZE) {
        newWidth = MAX_TEXTURE_SIZE;
        newHeight = Math.floor(height * (MAX_TEXTURE_SIZE / width));
      }
    } else {
      if (height > MAX_TEXTURE_SIZE) {
        newHeight = MAX_TEXTURE_SIZE;
        newWidth = Math.floor(width * (MAX_TEXTURE_SIZE / height));
      }
    }
    
    // Create a temporary canvas to resize the image
    const canvas = createCanvas(newWidth, newHeight);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return img;
    
    // Draw the image on canvas with new dimensions
    ctx.drawImage(img, 0, 0, width, height, 0, 0, newWidth, newHeight);
    
    // Create a new image from the canvas
    const resizedImg = createImage();
    resizedImg.src = canvas.toDataURL('image/png');
    
    return resizedImg;
  };
  
  // Handle applying the selected effect
  const handleApplyEffect = async () => {
    if (!imageRef.current || selectedEffect === 'none') {
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Get the effect definition
      const effect = SHADER_EFFECTS[selectedEffect];
      
      // Process the image with maximum quality preservation
      const processedImageData = await processImageWithShader(
        imageRef.current,
        effect,
        uniformValues
      );
      
      // Convert to URL for display with highest quality (use PNG)
      const canvas = createCanvas(processedImageData.width, processedImageData.height);
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.putImageData(processedImageData, 0, 0);
        // Use PNG format for lossless quality
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        setProcessedImageUrl(dataUrl);
      }
    } catch (error) {
      console.error('Error processing image:', error);
      setIsError(true);
      setErrorMessage('Failed to process image with selected effect.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle uniform value changes
  const handleUniformChange = (key: string, value: any) => {
    setUniformValues(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Handle export completion
  const handleExportComplete = (blob: Blob, url: string) => {
    const exportResult = document.getElementById('export-result');
    if (exportResult) {
      exportResult.innerHTML = `
        <div class="p-3 bg-green-50 border border-green-200 rounded-md">
          <p class="text-green-800 font-medium mb-2">GIF Export Complete!</p>
          <a href="${url}" download="animation.gif" class="inline-flex items-center px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 text-sm">
            <span class="mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </span>
            Download GIF
          </a>
        </div>
      `;
    }
  };
  
  // Function to download the processed image
  const handleDownload = () => {
    if (processedImageUrl) {
      downloadFile(processedImageUrl, 'processed-image.png');
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold">WebGL Image Processor</h2>
        <p className="text-muted-foreground">Upload an image and apply WebGL shader effects. Export as a single frame or animated GIF.</p>
      </div>
      
      <div className="flex flex-1 gap-6">
        {/* Left Sidebar */}
        <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 border rounded-lg shadow-sm overflow-hidden flex flex-col">
          {/* File Upload Section */}
          <div className="p-4 border-b">
            <h3 className="font-medium mb-3">Image Upload</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="image-upload" className="block mb-1.5">Select Image</Label>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full p-2 text-sm border rounded-md"
                />
              </div>
              
              {isError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                  {errorMessage}
                </div>
              )}
              
              {imageOriginalDimensions && (
                <div className="text-xs text-gray-500">
                  Image dimensions: {imageOriginalDimensions.width} × {imageOriginalDimensions.height}px
                  {isImageResized && (
                    <div className="mt-1 text-amber-600">
                      (Will be resized for processing)
                    </div>
                  )}
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
                <TabsList className="w-full justify-start p-0 h-auto bg-transparent border-b">
                  <TabsTrigger 
                    value="effects" 
                    className="data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700 rounded-none py-3 px-4"
                  >
                    Effects
                  </TabsTrigger>
                  <TabsTrigger 
                    value="settings" 
                    className="data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700 rounded-none py-3 px-4"
                  >
                    Settings
                  </TabsTrigger>
                  <TabsTrigger 
                    value="export" 
                    className="data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700 rounded-none py-3 px-4"
                    disabled={!processedImageUrl}
                  >
                    Export
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="effects" className="p-4 space-y-6 mt-0">
                {/* Effect Selection */}
                <div>
                  <h3 className="font-medium mb-4">Select Effect</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(SHADER_EFFECTS).map((effectKey) => (
                      <Button
                        key={effectKey}
                        variant={selectedEffect === effectKey ? "default" : "outline"}
                        className={`text-sm justify-start px-3 py-2 h-auto ${selectedEffect === effectKey ? 'bg-primary text-white' : ''}`}
                        onClick={() => setSelectedEffect(effectKey)}
                      >
                        {SHADER_EFFECTS[effectKey].name}
                      </Button>
                    ))}
                    <Button
                      variant={selectedEffect === 'none' ? "default" : "outline"}
                      className={`text-sm justify-start px-3 py-2 h-auto ${selectedEffect === 'none' ? 'bg-primary text-white' : ''}`}
                      onClick={() => setSelectedEffect('none')}
                    >
                      None
                    </Button>
                  </div>
                </div>
                
                {/* Effect Parameters */}
                {selectedEffect !== 'none' && selectedEffect in SHADER_EFFECTS && (
                  <div>
                    <h3 className="font-medium mb-4">Effect Parameters</h3>
                    <div className="space-y-5">
                      {Object.entries(SHADER_EFFECTS[selectedEffect].uniforms).map(([key, uniform]) => {
                        // Skip standard uniforms like resolution and time that shouldn't be adjusted manually
                        if (['u_resolution', 'u_texture', 'u_textureSize'].includes(key)) {
                          return null;
                        }
                        
                        // Get the current value, falling back to the default
                        const value = uniformValues[key] !== undefined ? uniformValues[key] : uniform.value;
                        
                        // Only render slider controls for numeric uniforms
                        if (typeof value === 'number') {
                          return (
                            <div key={key} className="space-y-2">
                              <div className="flex justify-between">
                                <Label htmlFor={key} className="text-sm">
                                  {uniform.name || key.replace('u_', '')}
                                </Label>
                                <span className="text-sm font-mono">
                                  {Number(value).toFixed(2)}
                                </span>
                              </div>
                              <Slider
                                id={key}
                                min={uniform.min || 0}
                                max={uniform.max || 10}
                                step={uniform.step || 0.01}
                                value={[value]}
                                onValueChange={([newValue]) => handleUniformChange(key, newValue)}
                                className="pt-2"
                              />
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                    
                    <Button 
                      className="w-full mt-6" 
                      onClick={handleApplyEffect}
                      disabled={isProcessing || !imageUrl}
                    >
                      {isProcessing ? 'Processing...' : 'Apply Effect'}
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="settings" className="p-4 space-y-6 mt-0">
                <div>
                  <h3 className="font-medium mb-4">Processing Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm">Image Quality</Label>
                      <div className="text-xs text-gray-500 mb-2">
                        Images are processed in full resolution for maximum quality
                      </div>
                      <select 
                        className="w-full p-2 border rounded-md" 
                        defaultValue="png"
                      >
                        <option value="png">PNG (Lossless)</option>
                        <option value="jpg">JPG (High Quality)</option>
                      </select>
                    </div>
                    
                    {/* Additional settings could go here */}
                    <div className="pt-4">
                      <h4 className="text-sm font-medium mb-2">Performance Mode</h4>
                      <div className="flex items-center">
                        <input type="checkbox" id="performance-mode" className="mr-2" />
                        <Label htmlFor="performance-mode" className="text-sm">
                          Enable for large images
                        </Label>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        For very large images, this may improve performance but could reduce quality
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="export" className="p-4 space-y-6 mt-0">
                {processedImageUrl && imageUrl ? (
                  <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
                      <h3 className="font-medium text-blue-800 text-sm mb-2">GIF Export Options</h3>
                      <ul className="text-xs text-blue-700 space-y-1">
                        <li>Higher frame count = smoother animation</li>
                        <li>Lower quality = smaller file size</li>
                      </ul>
                    </div>
                    
                    <EnhancedGifExport
                      imageUrl={processedImageUrl}
                      onExportComplete={handleExportComplete}
                    />
                    
                    <div id="export-result" className="mt-4">
                      {/* Will be populated by handleExportComplete */}
                    </div>
                    
                    <div className="border-t pt-4">
                      <Button
                        onClick={handleDownload}
                        variant="outline"
                        className="w-full"
                      >
                        Download As PNG
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      Apply an effect first to enable export options
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        {/* Main Canvas Area */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-medium">Canvas</h3>
            
            {processedImageUrl && (
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Save Image
              </Button>
            )}
          </div>
          
          <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-[#f0f0f0] dark:bg-gray-700" style={{ backgroundImage: 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABh0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMS4xYwSAYwAAADRJREFUOE9jGAUD17+6//9xYbA+TAwXhxkCVs9EAYQYTAwXB6PBbyDMAEIYJg4SPwgBAyMAACyBl26j/nYGAAAAAElFTkSuQmCC")' }}>
            {imageUrl && !processedImageUrl && (
              <div className="relative max-w-full max-h-full">
                <img
                  src={imageUrl}
                  alt="Original"
                  className="max-w-full max-h-full object-contain"
                  style={{ maxHeight: 'calc(100vh - 230px)' }}
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}
            
            {processedImageUrl && (
              <div className="relative max-w-full max-h-full">
                <img
                  src={processedImageUrl}
                  alt="Processed"
                  className="max-w-full max-h-full object-contain"
                  style={{ maxHeight: 'calc(100vh - 230px)' }}
                />
              </div>
            )}
            
            {!imageUrl && (
              <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Image Loaded</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Upload an image from the sidebar to get started</p>
                <label htmlFor="image-upload-center" className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm text-white hover:bg-blue-700">
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
          
          {isImageResized && imageOriginalDimensions && (
            <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-100 dark:border-yellow-900/30">
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                Original image size: {imageOriginalDimensions.width}×{imageOriginalDimensions.height}px
                {' '}- Display scaled for preview but processing uses maximum possible resolution
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 