'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import EnhancedGifExport from './EnhancedGifExport';
import { Slider } from './ui/slider';
import Image from 'next/image';
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
  const [uniformValues, setUniformValues] = useState<Record<string, number>>({});
  const [imageOriginalDimensions, setImageOriginalDimensions] = useState<{width: number; height: number} | null>(null);
  const [isImageResized, setIsImageResized] = useState(false);
  
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
      const fileUrl = URL.createObjectURL(file);
      setImageUrl(fileUrl);
      setProcessedImageUrl(null); // Reset processed image
      setIsError(false);
      setErrorMessage('');
      
      // Check image dimensions when loaded
      const img = createImage();
      img.onload = () => {
        const { width, height } = img;
        setImageOriginalDimensions({ width, height });
        
        // Check if image needs resizing for WebGL processing
        if (width > MAX_TEXTURE_SIZE || height > MAX_TEXTURE_SIZE) {
          setIsImageResized(true);
        } else {
          setIsImageResized(false);
        }
      };
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
    
    const initialValues: Record<string, number> = {};
    
    // Initialize values from effect definition
    Object.entries(effect.uniforms).forEach(([key, uniform]) => {
      initialValues[key] = uniform.value;
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
  
  // Apply selected shader effect
  const applyEffect = async () => {
    if (!imageUrl || selectedEffect === 'none') return;
    
    setIsProcessing(true);
    setIsError(false);
    
    try {
      // Load the image
      const img = createImage();
      img.crossOrigin = 'anonymous';
      
      img.onload = async () => {
        try {
          // Get the shader effect
          const effect = SHADER_EFFECTS[selectedEffect];
          
          // Resize image if needed to fit WebGL texture size limits
          const processableImg = resizeImageForWebGL(img);
          
          // Process the image with the shader
          const processedImageData = await processImageWithShader(
            processableImg,
            effect,
            uniformValues
          );
          
          // Create a temporary canvas to convert the processed image data to a data URL
          const tempCanvas = createCanvas(processedImageData.width, processedImageData.height);
          
          const ctx = tempCanvas.getContext('2d');
          if (ctx) {
            ctx.putImageData(processedImageData, 0, 0);
            const dataUrl = tempCanvas.toDataURL('image/png');
            setProcessedImageUrl(dataUrl);
          }
          
          setIsProcessing(false);
        } catch (error) {
          console.error('Error processing image:', error);
          setIsError(true);
          setErrorMessage('Error processing image. Please try a different effect or image.');
          setIsProcessing(false);
        }
      };
      
      img.onerror = () => {
        setIsError(true);
        setErrorMessage('Error loading image.');
        setIsProcessing(false);
      };
      
      img.src = imageUrl;
    } catch (error) {
      console.error('Error applying effect:', error);
      setIsError(true);
      setErrorMessage('Error processing image. Please try again.');
      setIsProcessing(false);
    }
  };
  
  // Handle uniform value changes
  const handleUniformChange = (key: string, value: number) => {
    setUniformValues(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Handle GIF export completion
  const handleExportComplete = (blob: Blob, url: string) => {
    console.log('Export complete:', url);
    
    // Create a direct download link
    const exportResult = document.getElementById('export-result');
    if (exportResult) {
      // Create download link
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `webgl-effect-${new Date().getTime()}.gif`;
      downloadLink.className = 'block w-full text-center p-3 bg-green-100 border border-green-300 rounded-md text-green-800 hover:bg-green-200 transition-colors font-medium';
      downloadLink.innerHTML = 'Download GIF <span class="text-xs">(Right-click and Save As... if download doesn\'t start)</span>';
      
      // Clear previous content and add the new link
      exportResult.innerHTML = '';
      
      // Add file info
      const fileInfo = document.createElement('div');
      fileInfo.className = 'text-xs text-gray-500 mb-2 text-center';
      fileInfo.textContent = `File size: ${(blob.size / 1024).toFixed(1)} KB`;
      exportResult.appendChild(fileInfo);
      
      exportResult.appendChild(downloadLink);
      
      // Auto-click to start download (optional)
      // downloadLink.click();
    }
    
    // Open in new tab as fallback
    window.open(url, '_blank');
  };
  
  return (
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-4xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>WebGL Image Processor</CardTitle>
          <CardDescription>
            Upload an image and apply WebGL shader effects. Export as a single frame or animated GIF.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="upload">Upload & Process</TabsTrigger>
              <TabsTrigger value="export" disabled={!processedImageUrl}>Export</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left column - Input controls */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="image-upload">Upload Image</Label>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  
                  {imageUrl && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Select Effect</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant={selectedEffect === 'none' ? 'default' : 'outline'}
                            onClick={() => setSelectedEffect('none')}
                            className="w-full"
                          >
                            None
                          </Button>
                          
                          {Object.entries(SHADER_EFFECTS).map(([key, effect]) => (
                            <Button
                              key={key}
                              variant={selectedEffect === key ? 'default' : 'outline'}
                              onClick={() => setSelectedEffect(key)}
                              className="w-full"
                            >
                              {effect.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Effect parameters */}
                      {selectedEffect !== 'none' && SHADER_EFFECTS[selectedEffect] && (
                        <div className="space-y-4 p-4 border rounded-md">
                          <h3 className="text-sm font-medium">Effect Parameters</h3>
                          
                          {Object.entries(SHADER_EFFECTS[selectedEffect].uniforms).map(([key, uniform]) => (
                            <div key={key} className="space-y-1">
                              <div className="flex justify-between">
                                <Label htmlFor={`param-${key}`} className="text-sm">
                                  {key.replace(/^[u_]/, '')}
                                </Label>
                                <span className="text-xs">
                                  {uniformValues[key]?.toFixed(2) || uniform.value.toFixed(2)}
                                </span>
                              </div>
                              
                              <Slider
                                id={`param-${key}`}
                                min={uniform.min || 0}
                                max={uniform.max || 1}
                                step={uniform.step || 0.01}
                                value={[uniformValues[key] || uniform.value]}
                                onValueChange={values => handleUniformChange(key, values[0])}
                                disabled={isProcessing}
                              />
                            </div>
                          ))}
                          
                          <Button 
                            onClick={applyEffect}
                            disabled={isProcessing || !imageUrl}
                            className="w-full"
                          >
                            {isProcessing ? 'Processing...' : 'Apply Effect'}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Right column - Image preview */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {imageUrl && (
                      <div className="space-y-1">
                        <Label className="text-sm">Original Image</Label>
                        <div className="relative aspect-video bg-gray-100 rounded overflow-hidden">
                          <img
                            src={imageUrl}
                            alt="Original image"
                            ref={imageRef}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      <Label className="text-sm">Processed Image</Label>
                      <div className="relative aspect-video bg-gray-100 rounded overflow-hidden">
                        {isProcessing ? (
                          <div className="flex h-full items-center justify-center">
                            <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
                          </div>
                        ) : processedImageUrl ? (
                          <img
                            src={processedImageUrl}
                            alt="Processed image"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-gray-400">
                            {imageUrl ? 'Apply an effect to see result' : 'Upload an image and apply effects'}
                          </div>
                        )}
                        
                        <canvas
                          ref={canvasRef}
                          className="hidden"
                        />
                      </div>
                    </div>
                    
                    {isError && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-red-700 text-sm">{errorMessage}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="export">
              {processedImageUrl && imageUrl ? (
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-md">
                    <h3 className="font-medium text-blue-800 mb-2">GIF Export Instructions</h3>
                    <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
                      <li>Use the controls below to set up your GIF animation</li>
                      <li>For best results with animated effects, try the <strong>Ripple</strong> effect</li>
                      <li>Adjust frame count, duration, and quality to balance file size and quality</li>
                      <li>Higher frame counts produce smoother animations but larger files</li>
                      <li>Lower quality values (1-5) produce better quality GIFs but larger files</li>
                    </ul>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div>
                      <h3 className="text-lg font-medium mb-3">GIF Export Preview</h3>
                      <div className="bg-gray-100 p-4 rounded-md text-center">
                        <img
                          src={processedImageUrl}
                          alt="Preview"
                          className="max-w-full h-auto max-h-64 mx-auto"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <EnhancedGifExport
                        imageUrl={processedImageUrl}
                        onExportComplete={handleExportComplete}
                      />
                      
                      {/* Add a direct download link for the last exported GIF if available */}
                      <div id="export-result" className="mt-4">
                        {/* This div will be populated by handleExportComplete */}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="mx-auto w-16 h-16 text-gray-400 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Image Processed</h3>
                  <p className="text-gray-500">Apply an effect to your image first, then come back to export it as a GIF.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          {isImageResized && (
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md mt-2">
              <p className="text-xs text-yellow-700">
                Your image has been automatically resized for WebGL processing. 
                Original dimensions: {imageOriginalDimensions?.width}×{imageOriginalDimensions?.height}px
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <div className="text-xs text-gray-500">
            WebGL shader effects are applied in real-time on your device.
          </div>
          
          {processedImageUrl && (
            <a
              href={processedImageUrl}
              download="processed-image.png"
              className="text-sm text-blue-600 hover:underline"
            >
              Download Processed Image
            </a>
          )}
        </CardFooter>
      </Card>
    </div>
  );
} 