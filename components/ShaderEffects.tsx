'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
// Import the type definitions only - these won't be in the compiled JS
import type * as PIXIModule from 'pixi.js';

interface ShaderEffectsProps {
  imageData: string | null;
  onProcessedImage?: (processedImageData: string) => void;
}

export default function ShaderEffects({ imageData, onProcessedImage }: ShaderEffectsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pixiAppRef = useRef<any>(null);
  const spriteRef = useRef<any>(null);
  const filtersRef = useRef<any>({
    grayscale: null,
    blur: null,
    displacement: null
  });
  const displacementSpriteRef = useRef<any>(null);
  const recordingRef = useRef<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  
  const [isGrayscale, setIsGrayscale] = useState(true);
  const [isBlur, setIsBlur] = useState(false);
  const [isRipple, setIsRipple] = useState(false);
  const [fps, setFps] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Function to apply filters based on current state
  const updateFilters = () => {
    if (!spriteRef.current || !filtersRef.current) return;
    
    setIsProcessing(true);
    
    // Create a fresh array of active filters
    const activeFilters = [];
    
    if (isGrayscale && filtersRef.current.grayscale) {
      activeFilters.push(filtersRef.current.grayscale);
    }
    
    if (isBlur && filtersRef.current.blur) {
      activeFilters.push(filtersRef.current.blur);
    }
    
    if (isRipple && filtersRef.current.displacement) {
      activeFilters.push(filtersRef.current.displacement);
    }
    
    // Apply filters to sprite
    spriteRef.current.filters = activeFilters.length > 0 ? activeFilters : null;
    
    // Force a render of the next frame
    if (pixiAppRef.current) {
      pixiAppRef.current.render();
    }
    
    // Capture the result after applying filters
    // Add a slight delay to ensure rendering is complete
    setTimeout(() => {
      captureProcessedImage();
      setIsProcessing(false);
    }, 100);
  };
  
  // Function to capture the processed image and send it to the parent
  const captureProcessedImage = () => {
    if (!onProcessedImage || !pixiAppRef.current || !spriteRef.current) return;
    
    try {
      const app = pixiAppRef.current;
      
      // Force a render to ensure filters are applied
      app.render();
      
      // Capture the processed image
      let processedImageData: string | null = null;
      
      if (app.renderer.extract && spriteRef.current) {
        processedImageData = app.renderer.extract.canvas(spriteRef.current).toDataURL('image/png');
      } else if (app.renderer.plugins && app.renderer.plugins.extract && spriteRef.current) {
        processedImageData = app.renderer.plugins.extract.canvas(spriteRef.current).toDataURL('image/png');
      } else {
        // Fallback if extract API is not available
        console.warn('Extract API not available, using full stage capture as fallback');
        if (app.renderer.extract) {
          processedImageData = app.renderer.extract.canvas(app.stage).toDataURL('image/png');
        } else if (app.renderer.plugins && app.renderer.plugins.extract) {
          processedImageData = app.renderer.plugins.extract.canvas(app.stage).toDataURL('image/png');
        }
      }
      
      // Check if we successfully captured image data
      if (processedImageData) {
        onProcessedImage(processedImageData);
      } else {
        console.error('Failed to capture processed image data');
      }
    } catch (error) {
      console.error('Error capturing processed image:', error);
    }
  };
  
  // Function to start recording animation for ripple effect
  const startRecording = () => {
    if (!isRipple || !pixiAppRef.current || recordingRef.current) return;
    
    try {
      recordingRef.current = true;
      recordedChunksRef.current = [];
      
      const canvas = pixiAppRef.current.view as HTMLCanvasElement;
      const stream = canvas.captureStream(30); // 30 FPS
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Handle data available event
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = () => {
        // Create blob from recorded chunks
        const blob = new Blob(recordedChunksRef.current, {
          type: 'video/webm'
        });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'ripple-effect.webm';
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
        
        recordingRef.current = false;
      };
      
      // Start recording - 3 seconds
      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current = null;
        }
      }, 3000);
    } catch (error) {
      console.error('Error starting recording:', error);
      recordingRef.current = false;
    }
  };
  
  // Initialize PixiJS when component mounts or imageData changes
  useEffect(() => {
    if (!containerRef.current || !imageData) return;
    
    const loadAndSetupPixi = async () => {
      try {
        // Clean up existing app
        if (pixiAppRef.current) {
          cleanupPixiApp();
        }
        
        console.log('Loading PixiJS and initializing app...');
        
        // Load PixiJS
        const PIXI = await import('pixi.js');
        
        // Get container dimensions
        const containerWidth = containerRef.current?.clientWidth || 800;
        const containerHeight = containerRef.current?.clientHeight || 600;
        
        // Initialize PixiJS app with improved settings
        const app = new PIXI.Application({
          width: containerWidth,
          height: containerHeight,
          backgroundColor: 0xFFFFFF,
          resolution: Math.min(window.devicePixelRatio, 2),
          antialias: true,
          autoDensity: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true, // Required for image capture
        });
        
        pixiAppRef.current = app;
        
        // Clear container and append canvas
        if (containerRef.current) {
          while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild);
          }
          containerRef.current.appendChild(app.view as HTMLCanvasElement);
        }
        
        console.log('PixiJS app initialized, loading image...');
        
        // Create a loader for the image
        const image = new Image();
        image.crossOrigin = "anonymous";
        
        image.onload = () => {
          // Skip if component unmounted
          if (!containerRef.current) return;
          
          console.log(`Image loaded: ${image.width}x${image.height}`);
          
          // Create texture and sprite
          const texture = PIXI.Texture.from(image);
          const sprite = new PIXI.Sprite(texture);
          spriteRef.current = sprite;
          
          // Position in center
          sprite.anchor.set(0.5);
          sprite.x = app.screen.width / 2;
          sprite.y = app.screen.height / 2;
          
          // Calculate scale to fit container while maintaining aspect ratio
          const scaleX = (app.screen.width * 0.9) / image.width;
          const scaleY = (app.screen.height * 0.9) / image.height;
          const scale = Math.min(scaleX, scaleY);
          
          console.log(`Applied scale: ${scale} (scaleX: ${scaleX}, scaleY: ${scaleY})`);
          
          // Apply scale
          sprite.scale.set(scale);
          
          // Create filters
          console.log('Creating filters...');
          
          // Grayscale filter
          const grayscaleFilter = new PIXI.filters.ColorMatrixFilter();
          grayscaleFilter.grayscale(1, true);
          filtersRef.current.grayscale = grayscaleFilter;
          
          // Blur filter
          const blurFilter = new PIXI.filters.BlurFilter();
          blurFilter.blur = 5;
          blurFilter.quality = 4;
          filtersRef.current.blur = blurFilter;
          
          // Displacement filter for ripple effect
          const displacementTexture = createDisplacementTexture(PIXI, 256);
          const displacementSprite = new PIXI.Sprite(displacementTexture);
          displacementSpriteRef.current = displacementSprite;
          
          displacementSprite.anchor.set(0.5);
          displacementSprite.x = app.screen.width / 2;
          displacementSprite.y = app.screen.height / 2;
          displacementSprite.scale.set(1);
          
          const displacementFilter = new PIXI.filters.DisplacementFilter(displacementSprite);
          displacementFilter.scale.set(30);
          filtersRef.current.displacement = displacementFilter;
          
          // Add sprites to stage
          app.stage.addChild(displacementSprite);
          app.stage.addChild(sprite);
          
          console.log('Sprites and filters created and added to stage');
          
          // Setup animation for ripple effect
          let time = 0;
          app.ticker.add(() => {
            if (isRipple && displacementSpriteRef.current) {
              time += 0.01;
              displacementSpriteRef.current.rotation = time * 0.1;
              const scale = 1 + Math.sin(time) * 0.1;
              displacementSpriteRef.current.scale.set(scale);
            }
          });
          
          // FPS counter
          let frameCount = 0;
          let lastTime = performance.now();
          
          app.ticker.add(() => {
            frameCount++;
            const now = performance.now();
            
            if (now - lastTime >= 1000) {
              setFps(frameCount);
              frameCount = 0;
              lastTime = now;
            }
          });
          
          // Initial filter application
          console.log('Applying initial filters...');
          updateFilters();
          setIsInitialized(true);
        };
        
        image.onerror = (error) => {
          console.error("Error loading image for shader effects:", error);
        };
        
        // Load the image
        image.src = imageData;
        
      } catch (error) {
        console.error("Error initializing PixiJS:", error);
      }
    };
    
    loadAndSetupPixi();
    
    // Cleanup function
    return cleanupPixiApp;
  }, [imageData]);
  
  // Create a displacement map texture
  const createDisplacementTexture = (PIXI: any, size: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    
    const context = canvas.getContext('2d');
    if (!context) return PIXI.Texture.EMPTY;
    
    // Create a radial gradient
    const gradient = context.createRadialGradient(
      size/2, size/2, 0,
      size/2, size/2, size/2
    );
    
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(128, 128, 128, 0.7)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    
    return PIXI.Texture.from(canvas);
  };
  
  // Clean up the PixiJS app
  const cleanupPixiApp = () => {
    // Stop any active recording
    if (mediaRecorderRef.current && recordingRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      recordingRef.current = false;
    }
    
    // Clean up PixiJS app
    if (pixiAppRef.current) {
      // Try-catch to prevent errors during cleanup
      try {
        pixiAppRef.current.destroy(true, {children: true, texture: true, baseTexture: true});
      } catch (e) {
        console.warn('Error during PixiJS cleanup:', e);
      }
      pixiAppRef.current = null;
    }
    
    spriteRef.current = null;
    displacementSpriteRef.current = null;
    filtersRef.current = {grayscale: null, blur: null, displacement: null};
    setIsInitialized(false);
  };
  
  // Update filters when effect toggles change
  useEffect(() => {
    if (isInitialized && !isProcessing) {
      updateFilters();
    }
  }, [isGrayscale, isBlur, isRipple, isInitialized]);
  
  return (
    <div className="w-full flex flex-col space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button 
          variant={isGrayscale ? "default" : "outline"}
          onClick={() => setIsGrayscale(!isGrayscale)}
          className="w-full sm:w-auto"
          disabled={isProcessing}
        >
          {isGrayscale ? 'Disable' : 'Enable'} Grayscale
        </Button>
        
        <Button 
          variant={isBlur ? "default" : "outline"}
          onClick={() => setIsBlur(!isBlur)}
          className="w-full sm:w-auto"
          disabled={isProcessing}
        >
          {isBlur ? 'Disable' : 'Enable'} Blur
        </Button>
        
        <Button 
          variant={isRipple ? "default" : "outline"}
          onClick={() => setIsRipple(!isRipple)}
          className="w-full sm:w-auto"
          disabled={isProcessing}
        >
          {isRipple ? 'Disable' : 'Enable'} Ripple
        </Button>
        
        {isRipple && (
          <Button
            variant="outline"
            onClick={startRecording}
            className="w-full sm:w-auto"
            disabled={isProcessing || recordingRef.current}
          >
            Export Animation
          </Button>
        )}
      </div>
      
      <div className="text-xs text-muted-foreground mt-2">
        Performance: {fps} FPS
      </div>
      
      <div 
        ref={containerRef} 
        className="w-full h-[400px] bg-muted/20 border rounded-lg overflow-hidden flex items-center justify-center"
      >
        {!imageData && (
          <div className="text-muted-foreground">
            Upload an image to apply shader effects
          </div>
        )}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-10">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>
    </div>
  );
} 