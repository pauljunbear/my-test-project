'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import dynamic from 'next/dynamic';
import EnhancedGifExport from './EnhancedGifExport';

// Dynamically import WebGL component with no SSR
const WebGLShaderEffect = dynamic(() => import('./WebGLShaderEffect'), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-video bg-gray-100 rounded-md flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full mb-2"></div>
        <p>Loading shader components...</p>
      </div>
    </div>
  )
});

interface ShaderEffectStudioProps {
  initialImageUrl?: string;
  onProcessedImage?: (dataUrl: string) => void;
}

export default function ShaderEffectStudio({ 
  initialImageUrl,
  onProcessedImage
}: ShaderEffectStudioProps) {
  // State for handling images
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for export functionality
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const webglComponentRef = useRef<any>(null);
  
  // State for frames capture
  const [capturedFrames, setCapturedFrames] = useState<string[] | null>(null);
  const [isCapturingFrames, setIsCapturingFrames] = useState(false);
  
  // State for MOV export
  const [isExportingMov, setIsExportingMov] = useState(false);
  const [movExportProgress, setMovExportProgress] = useState(0);
  const [movDownloadUrl, setMovDownloadUrl] = useState<string | null>(null);
  
  // Server URL for MOV export
  const MOV_EXPORT_SERVER_URL = 'http://localhost:3001';
  
  // Handle file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    // Create object URL for the image
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    
    // Clean up previously captured frames
    setCapturedFrames(null);
  };
  
  // Function to capture frames for animation
  const captureAnimationFrames = async () => {
    if (!webglComponentRef.current || !canvasRef.current) {
      setError('Cannot capture frames: WebGL component not initialized');
      return null;
    }
    
    setIsCapturingFrames(true);
    
    try {
      // Use the WebGL component's captureFrames method
      const frames = await webglComponentRef.current.captureFrames();
      
      if (frames && frames.length > 0) {
        setCapturedFrames(frames);
        return frames;
      } else {
        throw new Error('No frames captured');
      }
    } catch (error) {
      console.error('Error capturing frames:', error);
      setError(`Failed to capture frames: ${(error as Error).message}`);
      return null;
    } finally {
      setIsCapturingFrames(false);
    }
  };
  
  // Function to export as MOV
  const exportAsMov = async () => {
    // First capture frames if not already captured
    const frames = capturedFrames || await captureAnimationFrames();
    
    if (!frames || frames.length === 0) {
      setError('No frames available for MOV export');
      return;
    }
    
    setIsExportingMov(true);
    setMovExportProgress(0);
    
    try {
      // Send frames to server
      const response = await fetch(`${MOV_EXPORT_SERVER_URL}/api/create-mov`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frames,
          frameRate: 30,
          filename: 'shader-effect'
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to create MOV file');
      }
      
      // Store download URL
      setMovDownloadUrl(`${MOV_EXPORT_SERVER_URL}${data.downloadUrl}`);
      
      // Trigger download
      window.open(data.downloadUrl, '_blank');
      
    } catch (error) {
      console.error('Error creating MOV:', error);
      setError(`Failed to create MOV: ${(error as Error).message}`);
    } finally {
      setIsExportingMov(false);
    }
  };
  
  // Handle processed image from shader effect
  const handleProcessedImage = (blob: Blob, url: string) => {
    if (onProcessedImage) {
      onProcessedImage(url);
    }
  };
  
  // Handle errors from components
  const handleExportError = (errorMessage: string) => {
    setError(errorMessage);
  };
  
  // Clear object URLs on unmount
  useEffect(() => {
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);
  
  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="mb-6 p-4 border rounded-md bg-white shadow-sm">
        <h2 className="text-xl font-bold mb-4">Shader Effect Studio</h2>
        
        {/* Image Upload */}
        <div className="mb-6">
          <label 
            htmlFor="image-upload" 
            className="block text-sm font-medium mb-2"
          >
            Upload Image
          </label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm p-2 border rounded-md"
          />
          <p className="mt-1 text-xs text-gray-500">
            Select an image to apply shader effects. Supported formats: JPG, PNG, WebP.
          </p>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        
        {/* WebGL Shader Effect */}
        {imageUrl ? (
          <div className="border rounded-md p-4 bg-gray-50">
            <WebGLShaderEffect
              ref={webglComponentRef}
              imageUrl={imageUrl}
              onProcessedImage={handleProcessedImage}
            />
            
            {/* Export Options */}
            <div className="mt-6 flex flex-wrap gap-4">
              <EnhancedGifExport
                imageUrl={imageUrl}  
                onExportComplete={handleProcessedImage}
              />
              
              <Button
                variant="secondary"
                onClick={exportAsMov}
                disabled={isExportingMov || isCapturingFrames}
              >
                {isExportingMov ? `Exporting MOV ${movExportProgress}%...` : 'Export as MOV'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center bg-gray-100 rounded-md p-12">
            <p className="text-gray-500">
              Upload an image to get started with shader effects
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 