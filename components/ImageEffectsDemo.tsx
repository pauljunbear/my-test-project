import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import EffectsPanel from './EffectsPanel';

/**
 * Demo component that showcases the image effects system
 */
export default function ImageEffectsDemo() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [processedImageData, setProcessedImageData] = useState<ImageData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setIsLoading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };
  
  // Trigger file input click
  const handleSelectImage = () => {
    fileInputRef.current?.click();
  };
  
  // Update canvas when image changes
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions to match the image
    canvas.width = image.width;
    canvas.height = image.height;
    
    // Draw the image
    ctx.drawImage(image, 0, 0);
    
    // Get image data for processing
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setImageData(imgData);
  }, [image]);
  
  // Update display canvas when processed image data changes
  useEffect(() => {
    if (!processedImageData || !displayCanvasRef.current) return;
    
    const canvas = displayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = processedImageData.width;
    canvas.height = processedImageData.height;
    
    // Draw the processed image data
    ctx.putImageData(processedImageData, 0, 0);
  }, [processedImageData]);
  
  // Handle processed image change from EffectsPanel
  const handleProcessedImageChange = (newImageData: ImageData | null) => {
    setProcessedImageData(newImageData);
  };
  
  // Download the processed image
  const handleDownload = () => {
    if (!displayCanvasRef.current) return;
    
    const link = document.createElement('a');
    link.download = 'processed-image.png';
    link.href = displayCanvasRef.current.toDataURL('image/png');
    link.click();
  };
  
  return (
    <div className="container mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Image Effects Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div>
              <Button onClick={handleSelectImage}>
                Select Image
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>
            
            {isLoading && (
              <div className="text-center py-8">Loading image...</div>
            )}
            
            {image && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Original Image */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Original</h3>
                  <div className="border rounded-md overflow-hidden">
                    <canvas 
                      ref={canvasRef} 
                      className="max-w-full h-auto hidden"
                    />
                    <img 
                      src={image.src} 
                      alt="Original" 
                      className="max-w-full h-auto"
                    />
                  </div>
                </div>
                
                {/* Processed Image */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium">Processed</h3>
                    {processedImageData && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDownload}
                      >
                        Download
                      </Button>
                    )}
                  </div>
                  <div className="border rounded-md overflow-hidden bg-gray-50 dark:bg-gray-900">
                    {processedImageData ? (
                      <canvas 
                        ref={displayCanvasRef} 
                        className="max-w-full h-auto"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full min-h-[300px] text-gray-500">
                        Apply an effect to see the result
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Effects Panel */}
      {imageData && (
        <Card>
          <CardHeader>
            <CardTitle>Effects</CardTitle>
          </CardHeader>
          <CardContent>
            <EffectsPanel 
              imageData={imageData}
              onProcessedImageChange={handleProcessedImageChange}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
} 