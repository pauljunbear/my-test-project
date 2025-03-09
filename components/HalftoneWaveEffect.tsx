'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';

type HalftoneWaveEffectProps = {
  imageUrl: string;
  onProcessedImage?: (dataUrl: string) => void;
}

// Modify drawHalftoneWave to accept time parameter
const drawHalftoneWave = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  time: number,
  gridSize: number, 
  waveIntensity: number
) => {
  const { width, height } = canvas;
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Draw image as grayscale
  ctx.drawImage(image, 0, 0, width, height);
  
  // Sample brightness values
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Clear canvas again for drawing dots
  ctx.clearRect(0, 0, width, height);
  
  // Set up dot size based on grid size
  const dotSize = gridSize;
  const halfDot = dotSize / 2;
  
  // Draw halftone pattern
  ctx.fillStyle = 'black';
  
  for (let y = halfDot; y < height; y += dotSize) {
    for (let x = halfDot; x < width; x += dotSize) {
      // Get pixel position
      const i = (Math.floor(y) * width + Math.floor(x)) * 4;
      
      // Calculate brightness (0-255)
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      
      // Calculate dot radius based on brightness
      const normalizedBrightness = 1 - brightness / 255;
      
      // Apply wave effect
      const distFromCenter = Math.sqrt(
        Math.pow(x - width / 2, 2) + 
        Math.pow(y - height / 2, 2)
      );
      
      // Wave modifier based on distance and time
      const waveModifier = Math.sin(distFromCenter / (20 - waveIntensity) + time);
      
      // Adjust radius based on wave
      const radius = normalizedBrightness * halfDot * (1 + waveModifier * 0.3);
      
      // Draw dot
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

export default function HalftoneWaveEffect({ imageUrl, onProcessedImage }: HalftoneWaveEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  
  // Import GIF.js dynamically to avoid SSR issues
  const loadGifJs = async () => {
    try {
      const GIF = (await import('gif.js.optimized')).default;
      return GIF;
    } catch (error) {
      console.error('Error loading GIF.js library:', error);
      throw new Error('Failed to load GIF export library');
    }
  };
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  
  // Control parameters
  const [gridSize, setGridSize] = useState(15);
  const [waveSpeed, setWaveSpeed] = useState(0.1);
  const [waveIntensity, setWaveIntensity] = useState(10);
  
  // GIF export options
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [gifFrames, setGifFrames] = useState(10);
  const [gifQuality, setGifQuality] = useState(10);
  
  // Initialize the canvas with the image
  useEffect(() => {
    console.log('HalftoneWaveEffect: Initializing with imageUrl:', imageUrl);
    
    const loadImage = () => {
      setIsLoading(true);
      setError(null);
      
      // Create loading timeout to detect long loads
      const loadingTimeout = setTimeout(() => {
        console.warn('Image loading taking longer than expected');
      }, 5000);
      
      const img = new Image();
      
      img.onload = () => {
        clearTimeout(loadingTimeout);
        console.log('HalftoneWaveEffect: Image loaded successfully', img.width, img.height);
        
        originalImageRef.current = img;
        
        if (canvasRef.current) {
          // Set canvas size to match image aspect ratio
          const canvas = canvasRef.current;
          const maxSize = 800; // Max dimension
          
          let canvasWidth, canvasHeight;
          
          if (img.width > img.height) {
            canvasWidth = Math.min(img.width, maxSize);
            canvasHeight = (img.height / img.width) * canvasWidth;
          } else {
            canvasHeight = Math.min(img.height, maxSize);
            canvasWidth = (img.width / img.height) * canvasHeight;
          }
          
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          
          // Initial render
          const ctx = canvas.getContext('2d');
          if (ctx) {
            console.log('HalftoneWaveEffect: Initial render');
            drawHalftoneWave(ctx, img, canvas, timeRef.current, gridSize, waveIntensity);
            setIsLoading(false);
            startAnimation();
          } else {
            setError('Failed to get canvas context');
            setIsLoading(false);
          }
        }
      };
      
      img.onerror = () => {
        clearTimeout(loadingTimeout);
        console.error('HalftoneWaveEffect: Error loading image');
        setError('Failed to load image');
        setIsLoading(false);
      };
      
      img.src = imageUrl;
    };
    
    loadImage();
    
    // Clean up animation on unmount
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [imageUrl]);
  
  // Start/stop animation based on isPlaying state
  const startAnimation = useCallback(() => {
    console.log('HalftoneWaveEffect: startAnimation called, isPlaying:', isPlaying);
    
    if (!canvasRef.current || !originalImageRef.current) {
      console.warn('Cannot start animation: canvas or image not initialized');
      return;
    }
    
    // Cancel any existing animation
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (!isPlaying) {
      return; // Don't start animation if not playing
    }
    
    console.log('HalftoneWaveEffect: Animation starting...');
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get canvas context');
      return;
    }
    
    // Animation function
    const animate = () => {
      if (!canvasRef.current || !originalImageRef.current || !isPlaying) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Update time
      timeRef.current += 0.05 * waveSpeed;
      
      // Draw frame
      drawHalftoneWave(ctx, originalImageRef.current, canvas, timeRef.current, gridSize, waveIntensity);
      
      // Continue animation
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    console.log("HalftoneWaveEffect: Animation started");
  }, [isPlaying, waveSpeed, gridSize, waveIntensity]);
  
  // Update animation when control parameters change
  useEffect(() => {
    if (isPlaying && !isExporting) {
      startAnimation();
    }
  }, [startAnimation, isPlaying, isExporting]);
  
  // Handle capturing the current frame
  const captureCurrentFrame = () => {
    if (!canvasRef.current) {
      setError('Cannot capture: canvas not initialized');
      return;
    }
    
    try {
      const canvas = canvasRef.current;
      const dataURL = canvas.toDataURL('image/png');
      
      if (onProcessedImage) {
        onProcessedImage(dataURL);
      }
      
      // Also provide direct download
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = 'halftone-frame.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error capturing frame:', error);
      setError('Failed to capture frame');
    }
  };
  
  // Add a new function to export GIF
  const exportAsGif = async () => {
    if (!canvasRef.current || !originalImageRef.current) {
      setError('Cannot export: canvas or image not initialized');
      return;
    }
    
    try {
      setIsExporting(true);
      setExportProgress(0);
      
      // Pause animation during export
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      // Load GIF.js
      const GIF = await loadGifJs();
      
      // Initialize GIF with quality and worker options
      const gif = new GIF({
        workers: 2,
        quality: gifQuality,
        width: canvasRef.current.width,
        height: canvasRef.current.height,
        workerScript: 'https://cdn.jsdelivr.net/gh/jnordberg/gif.js/dist/gif.worker.js',
      });
      
      // Setup progress callback
      gif.on('progress', (p) => {
        setExportProgress(Math.floor(p * 100));
      });
      
      // Setup finished callback
      gif.on('finished', (blob) => {
        // Create URL for download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'halftone-wave-animation.gif';
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        setIsExporting(false);
        setExportProgress(0);
        setShowExportOptions(false);
        
        // Restart animation
        if (isPlaying) {
          startAnimation();
        }
      });
      
      // Get canvas and context
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;
      
      // Create frames for the GIF
      const frameCount = gifFrames;
      const duration = 100; // milliseconds per frame
      
      console.log(`Creating GIF with ${frameCount} frames...`);
      
      // Reset time for consistent animation
      let frameTime = 0;
      const timeIncrement = 2 * Math.PI / frameCount; // Create a complete wave cycle
      
      // Generate frames
      for (let i = 0; i < frameCount; i++) {
        // Draw frame at specific time
        drawHalftoneWave(ctx, originalImageRef.current, canvas, frameTime, gridSize, waveIntensity);
        frameTime += timeIncrement;
        
        // Add frame to GIF
        gif.addFrame(canvas, { copy: true, delay: duration });
        setExportProgress(Math.floor((i / frameCount) * 50)); // First 50% is frame generation
      }
      
      // Render GIF
      gif.render();
      
    } catch (error) {
      console.error('Error exporting GIF:', error);
      setError('Failed to export GIF');
      setIsExporting(false);
      
      // Restart animation on error
      if (isPlaying) {
        startAnimation();
      }
    }
  };
  
  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-md">
        <p className="text-red-600">{error}</p>
        <Button 
          variant="outline" 
          onClick={() => location.reload()}
          className="mt-2"
        >
          Try Again
        </Button>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded-md">
        <div className="text-center">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full mb-2"></div>
          <p>Loading halftone effect...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full flex flex-col space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <Button 
          variant={isPlaying ? "default" : "outline"}
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-auto"
          disabled={isExporting}
        >
          {isPlaying ? '❚❚ Pause' : '▶ Play'}
        </Button>
        
        <div className="flex gap-2">
          <Button 
            variant="default"
            onClick={captureCurrentFrame}
            className="w-auto"
            disabled={isExporting}
          >
            Capture Frame
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => setShowExportOptions(!showExportOptions)}
            className="w-auto"
            disabled={isExporting}
          >
            Export GIF
          </Button>
        </div>
      </div>
      
      {showExportOptions && (
        <div className="p-4 border rounded-md bg-gray-50">
          <h3 className="text-sm font-medium mb-3">GIF Export Options</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-sm">Frames</label>
                <span className="text-xs text-gray-500">{gifFrames}</span>
              </div>
              <Slider
                value={[gifFrames]}
                min={5}
                max={30}
                step={1}
                onValueChange={(values) => setGifFrames(values[0])}
                disabled={isExporting}
              />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-sm">Quality</label>
                <span className="text-xs text-gray-500">{gifQuality}</span>
              </div>
              <Slider
                value={[gifQuality]}
                min={1}
                max={20}
                step={1}
                onValueChange={(values) => setGifQuality(values[0])}
                disabled={isExporting}
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <Button 
              variant="default"
              onClick={exportAsGif}
              disabled={isExporting}
              className="w-auto"
            >
              {isExporting ? `Exporting ${exportProgress}%` : 'Start Export'}
            </Button>
          </div>
        </div>
      )}
      
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label>Grid Size</label>
            <span className="text-xs text-gray-500">{gridSize}px</span>
          </div>
          <Slider
            value={[gridSize]}
            min={5}
            max={50}
            step={1}
            onValueChange={(values) => setGridSize(values[0])}
            disabled={isExporting}
          />
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label>Wave Speed</label>
            <span className="text-xs text-gray-500">{waveSpeed.toFixed(2)}</span>
          </div>
          <Slider
            value={[waveSpeed]}
            min={0.01}
            max={0.2}
            step={0.01}
            onValueChange={(values) => setWaveSpeed(values[0])}
            disabled={isExporting}
          />
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label>Wave Intensity</label>
            <span className="text-xs text-gray-500">{waveIntensity}</span>
          </div>
          <Slider
            value={[waveIntensity]}
            min={1}
            max={20}
            step={1}
            onValueChange={(values) => setWaveIntensity(values[0])}
            disabled={isExporting}
          />
        </div>
      </div>
      
      <div className="relative">
        <canvas 
          ref={canvasRef} 
          className="w-full h-auto bg-white border rounded-md"
        />
        
        {isExporting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-md">
            <div className="text-center text-white p-4">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-gray-200 border-t-white rounded-full mb-2"></div>
              <p>Exporting GIF: {exportProgress}%</p>
            </div>
          </div>
        )}
      </div>
      
      <p className="text-xs text-gray-500 mt-2">
        Adjust parameters to create different halftone wave effects. 
        Tap 'Capture Frame' to save a still image or 'Export GIF' to create an animated version.
      </p>
    </div>
  );
} 