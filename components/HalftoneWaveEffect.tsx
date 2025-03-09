'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';

interface HalftoneWaveEffectProps {
  imageData: string | null;
  onProcessedImage?: (processedImageData: string) => void;
}

export default function HalftoneWaveEffect({ imageData, onProcessedImage }: HalftoneWaveEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState(20);
  const [waveSpeed, setWaveSpeed] = useState(0.05);
  const [waveIntensity, setWaveIntensity] = useState(10);
  
  // Initialize the canvas with the image
  useEffect(() => {
    if (!canvasRef.current || !imageData) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Could not initialize canvas context');
      return;
    }
    
    setIsLoading(true);
    
    // Load the image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Set canvas dimensions to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Store original image for animation
      originalImageRef.current = img;
      
      // Initial drawing
      drawHalftoneWave(ctx, img, canvas, 0);
      
      setIsLoading(false);
      
      // Start animation if enabled
      if (isPlaying) {
        startAnimation();
      }
    };
    
    img.onerror = () => {
      setError('Failed to load image');
      setIsLoading(false);
    };
    
    img.src = imageData;
    
    // Cleanup on unmount
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [imageData, isPlaying]);
  
  // Handle play/pause toggle
  useEffect(() => {
    if (isPlaying) {
      startAnimation();
    } else if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, [isPlaying, gridSize, waveSpeed, waveIntensity]);
  
  // Function to draw the halftone wave effect
  const drawHalftoneWave = (
    ctx: CanvasRenderingContext2D, 
    img: HTMLImageElement, 
    canvas: HTMLCanvasElement, 
    time: number
  ) => {
    // First, draw the original image (grayscale)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // Get image data for processing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convert to grayscale
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = avg;     // R
      data[i + 1] = avg; // G
      data[i + 2] = avg; // B
      // Alpha remains unchanged
    }
    
    // Put the grayscale image data back
    ctx.putImageData(imageData, 0, 0);
    
    // Draw semi-transparent black overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw halftone pattern
    const rows = Math.ceil(canvas.height / gridSize);
    const cols = Math.ceil(canvas.width / gridSize);
    
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const centerX = x * gridSize;
        const centerY = y * gridSize;
        
        // Sample the image data at this grid position to determine brightness
        const pixelIndex = (Math.floor(centerY) * canvas.width + Math.floor(centerX)) * 4;
        const brightness = pixelIndex < data.length ? data[pixelIndex] / 255 : 0.5;
        
        // Calculate distance from center for wave effect
        const distanceFromCenter = Math.sqrt(
          Math.pow(centerX - canvas.width / 2, 2) + 
          Math.pow(centerY - canvas.height / 2, 2)
        );
        
        const maxDistance = Math.sqrt(
          Math.pow(canvas.width / 2, 2) + 
          Math.pow(canvas.height / 2, 2)
        );
        
        const normalizedDistance = distanceFromCenter / maxDistance;
        
        // Create wave effect
        const waveOffset = Math.sin(normalizedDistance * waveIntensity - time) * 0.5 + 0.5;
        
        // Combine brightness from image with wave effect
        const combinedValue = brightness * waveOffset;
        const dotSize = gridSize * combinedValue * 0.8;
        
        // Draw the dot
        ctx.beginPath();
        ctx.arc(centerX, centerY, dotSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${combinedValue * 0.8 + 0.2})`;
        ctx.fill();
      }
    }
  };
  
  // Animation loop
  let time = 0;
  const startAnimation = () => {
    if (!canvasRef.current || !originalImageRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const animate = () => {
      drawHalftoneWave(ctx, originalImageRef.current!, canvas, time);
      time += waveSpeed;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
  };
  
  // Handle capturing the current frame
  const captureCurrentFrame = () => {
    if (!canvasRef.current) return;
    
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      
      if (onProcessedImage) {
        onProcessedImage(dataUrl);
      }
    } catch (e) {
      console.error('Error capturing frame:', e);
      setError('Failed to capture current frame');
    }
  };
  
  if (error) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center bg-red-50 border border-red-200 rounded-lg">
        <div className="text-center p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <Button 
            variant="secondary"
            onClick={() => setError(null)}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center bg-gray-50 border rounded-lg">
        <div className="flex flex-col items-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-2"></div>
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
        >
          {isPlaying ? '❚❚ Pause' : '▶ Play'}
        </Button>
        
        <Button 
          variant="default"
          onClick={captureCurrentFrame}
          className="w-auto"
        >
          Capture Frame
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Grid Size</label>
            <span className="text-xs text-gray-500">{gridSize}px</span>
          </div>
          <Slider
            value={[gridSize]}
            min={5}
            max={50}
            step={1}
            onValueChange={(values) => setGridSize(values[0])}
          />
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Wave Speed</label>
            <span className="text-xs text-gray-500">{waveSpeed.toFixed(2)}</span>
          </div>
          <Slider
            value={[waveSpeed * 100]}
            min={1}
            max={20}
            step={1}
            onValueChange={(values) => setWaveSpeed(values[0] / 100)}
          />
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Wave Intensity</label>
            <span className="text-xs text-gray-500">{waveIntensity}</span>
          </div>
          <Slider
            value={[waveIntensity]}
            min={1}
            max={20}
            step={1}
            onValueChange={(values) => setWaveIntensity(values[0])}
          />
        </div>
      </div>
      
      <div className="w-full border rounded-lg overflow-hidden bg-black flex items-center justify-center">
        <canvas 
          ref={canvasRef} 
          className="max-w-full object-contain"
        />
      </div>
      
      <div className="text-xs text-muted-foreground">
        <p className="font-medium mb-1">Halftone Wave Effect</p>
        <p>
          An animated halftone effect that creates a wave pattern based on the image brightness.
          Adjust the controls above to customize the effect, then click "Capture Frame" when you're satisfied.
        </p>
      </div>
    </div>
  );
} 