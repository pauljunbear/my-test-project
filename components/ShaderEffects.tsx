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
  const [error, setError] = useState<string | null>(null);
  const [webGLSupported, setWebGLSupported] = useState(true);
  
  // Check WebGL support
  useEffect(() => {
    const checkWebGLSupport = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
          console.error('WebGL is not supported in this browser');
          setWebGLSupported(false);
          setError('Your browser does not support WebGL, which is required for shader effects.');
          return false;
        }
        
        // Test for basic WebGL capabilities - properly type cast to WebGLRenderingContext
        const webGLContext = gl as WebGLRenderingContext;
        const extension = webGLContext.getExtension('WEBGL_lose_context');
        if (extension) extension.loseContext();
        
        return true;
      } catch (err) {
        console.error('Error checking WebGL support:', err);
        setWebGLSupported(false);
        setError('Error initializing WebGL. Shader effects may not work properly.');
        return false;
      }
    };
    
    // Only check in browser environment
    if (typeof window !== 'undefined') {
      checkWebGLSupport();
    }
  }, []);
  
  // Function to apply filters based on current state
  const updateFilters = () => {
    if (!spriteRef.current || !filtersRef.current) {
      console.log("Cannot update filters - sprite or filters not initialized");
      return;
    }
    
    setIsProcessing(true);
    console.log("Updating filters...");
    
    // Create a fresh array of active filters
    const activeFilters = [];
    
    if (isGrayscale && filtersRef.current.grayscale) {
      console.log("Adding grayscale filter");
      activeFilters.push(filtersRef.current.grayscale);
    }
    
    if (isBlur && filtersRef.current.blur) {
      console.log("Adding blur filter with strength:", filtersRef.current.blur.blur);
      activeFilters.push(filtersRef.current.blur);
    }
    
    if (isRipple && filtersRef.current.displacement) {
      console.log("Adding displacement (ripple) filter");
      activeFilters.push(filtersRef.current.displacement);
    }
    
    // Apply filters to sprite
    spriteRef.current.filters = activeFilters.length > 0 ? activeFilters : null;
    console.log(`Applied ${activeFilters.length} filters to sprite`);
    
    // Force a render of the next frame
    if (pixiAppRef.current) {
      pixiAppRef.current.render();
      console.log("Forced render of next frame");
    }
    
    // Capture the result after applying filters
    // Add a slight delay to ensure rendering is complete
    setTimeout(() => {
      captureProcessedImage();
      setIsProcessing(false);
      console.log("Filter processing complete");
    }, 100);
  };
  
  // Function to capture the processed image and send it to the parent
  const captureProcessedImage = () => {
    if (!onProcessedImage || !pixiAppRef.current || !spriteRef.current) return;
    
    try {
      const app = pixiAppRef.current;
      
      // Force a render to ensure filters are applied
      app.render();
      
      // Attempt to get processed image data with several fallback methods
      let processedImageData: string | null = null;
      
      try {
        // Method 1: Direct extract from sprite (preferred)
        if (app.renderer.extract && spriteRef.current) {
          processedImageData = app.renderer.extract.canvas(spriteRef.current).toDataURL('image/png');
        }
      } catch (err) {
        console.warn('Failed to extract sprite directly, trying stage extract', err);
      }
      
      if (!processedImageData) {
        try {
          // Method 2: Extract from entire stage
          if (app.renderer.extract) {
            processedImageData = app.renderer.extract.canvas(app.stage).toDataURL('image/png');
          } else if (app.renderer.plugins && app.renderer.plugins.extract) {
            processedImageData = app.renderer.plugins.extract.canvas(app.stage).toDataURL('image/png');
          }
        } catch (err) {
          console.warn('Failed to extract from stage, trying view capture', err);
        }
      }
      
      if (!processedImageData) {
        try {
          // Method 3: Direct canvas capture
          processedImageData = (app.view as HTMLCanvasElement).toDataURL('image/png');
        } catch (err) {
          console.warn('Failed to capture from view', err);
        }
      }
      
      // Final fallback: Create a new canvas and draw stage content
      if (!processedImageData) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = app.view.width;
          canvas.height = app.view.height;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(app.view as HTMLCanvasElement, 0, 0);
            processedImageData = canvas.toDataURL('image/png');
          }
        } catch (err) {
          console.error('All capture methods failed', err);
        }
      }
      
      // Check if we successfully captured image data
      if (processedImageData) {
        console.log('Successfully captured processed image');
        onProcessedImage(processedImageData);
      } else {
        console.error('Failed to capture processed image data after all attempts');
      }
      
    } catch (error) {
      console.error('Error in captureProcessedImage:', error);
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
  
  // Extract the Pixi initialization function to component level for reusability
  const initializePixi = async () => {
    if (!containerRef.current || !imageData || !webGLSupported) return;
    
    try {
      // Clean up existing app
      if (pixiAppRef.current) {
        cleanupPixiApp();
      }
      
      console.log('Loading PixiJS and initializing app...');
      
      // Load PixiJS
      // Import the module type to ensure TypeScript understands the PIXI variable
      let PIXI: typeof import('pixi.js');
      try {
        PIXI = await import('pixi.js');
      } catch (err) {
        console.error('Failed to load PixiJS library:', err);
        setError('Failed to load shader libraries. Please try refreshing the page.');
        return;
      }
      
      // Get container dimensions
      const containerWidth = containerRef.current?.clientWidth || 800;
      const containerHeight = containerRef.current?.clientHeight || 600;
      
      // WebGL texture size detection
      const getMaxTextureSize = () => {
        try {
          // Create temporary canvas and get webgl context
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          
          if (!gl) {
            console.warn('WebGL not supported, using fallback size of 2048');
            return 2048;
          }
          
          // Get max texture size
          // Explicitly cast gl to WebGLRenderingContext to access WebGL methods
          const webGLContext = gl as WebGLRenderingContext;
          const maxTextureSize = webGLContext.getParameter(webGLContext.MAX_TEXTURE_SIZE);
          console.log(`Detected max WebGL texture size: ${maxTextureSize}x${maxTextureSize}`);
          
          // Clean up
          const loseContext = webGLContext.getExtension('WEBGL_lose_context');
          if (loseContext) loseContext.loseContext();
          
          return maxTextureSize;
        } catch (err) {
          console.warn('Error detecting max texture size, using fallback size of 2048', err);
          return 2048;
        }
      };
      
      const MAX_TEXTURE_SIZE = getMaxTextureSize();
      
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
        try {
          // Safer way to clear the container
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(app.view as HTMLCanvasElement);
        } catch (err) {
          console.error('Error attaching canvas to container:', err);
          setError('Failed to initialize WebGL canvas');
        }
      }
      
      console.log('PixiJS app initialized, loading image...');
      
      // Create a loader for the image
      const image = new Image();
      image.crossOrigin = "anonymous";
      
      image.onload = () => {
        // Skip if component unmounted
        if (!containerRef.current) return;
        
        console.log(`Image loaded: ${image.width}x${image.height}`);
        
        // Check if image exceeds WebGL texture size limits
        const needsResize = image.width > MAX_TEXTURE_SIZE || image.height > MAX_TEXTURE_SIZE;
        let textureSource: HTMLImageElement | HTMLCanvasElement = image;
        
        if (needsResize) {
          console.log(`Image exceeds WebGL texture size limits, resizing...`);
          // Create a scaled version of the image for WebGL processing
          const scaledCanvas = document.createElement('canvas');
          let scaledWidth = image.width;
          let scaledHeight = image.height;
          
          // Calculate scaled dimensions while maintaining aspect ratio
          if (image.width > image.height) {
            scaledWidth = Math.min(MAX_TEXTURE_SIZE, image.width);
            scaledHeight = Math.round((scaledWidth / image.width) * image.height);
          } else {
            scaledHeight = Math.min(MAX_TEXTURE_SIZE, image.height);
            scaledWidth = Math.round((scaledHeight / image.height) * image.width);
          }
          
          // Apply the scaled dimensions
          scaledCanvas.width = scaledWidth;
          scaledCanvas.height = scaledHeight;
          
          // Draw scaled image
          const ctx = scaledCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(image, 0, 0, scaledWidth, scaledHeight);
            textureSource = scaledCanvas;
            console.log(`Resized to: ${scaledWidth}x${scaledHeight}`);
          } else {
            console.warn('Could not get 2D context for scaling, using original image');
          }
        }
        
        // Create texture and sprite with properly scaled image
        const texture = PIXI.Texture.from(textureSource);
        const sprite = new PIXI.Sprite(texture);
        spriteRef.current = sprite;
        
        // Position in center
        sprite.anchor.set(0.5);
        sprite.x = app.screen.width / 2;
        sprite.y = app.screen.height / 2;
        
        // Calculate scale to fit container while maintaining aspect ratio
        const scaleX = (app.screen.width * 0.9) / sprite.width;
        const scaleY = (app.screen.height * 0.9) / sprite.height;
        const scale = Math.min(scaleX, scaleY);
        
        console.log(`Applied display scale: ${scale} (scaleX: ${scaleX}, scaleY: ${scaleY})`);
        
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
        blurFilter.blur = 15; // Increased from 5 to 15 for more noticeable effect
        blurFilter.quality = 8; // Increased from 4 to 8 for better quality
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
      setError(`Shader initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Initialize PixiJS when component mounts or imageData changes
  useEffect(() => {
    initializePixi();
    
    // Cleanup function
    return cleanupPixiApp;
  }, [imageData, webGLSupported]);
  
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
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping media recorder:', e);
      }
      mediaRecorderRef.current = null;
      recordingRef.current = false;
    }
    
    // Clean up PixiJS app
    if (pixiAppRef.current) {
      // Try-catch to prevent errors during cleanup
      try {
        // First, try to stop all animations
        if (pixiAppRef.current.ticker) {
          pixiAppRef.current.ticker.stop();
        }
        
        // Remove the view from DOM safely before destroying
        try {
          const view = pixiAppRef.current.view;
          if (view && view.parentNode) {
            view.parentNode.removeChild(view);
          }
        } catch (e) {
          console.warn('Error removing canvas from DOM:', e);
        }
        
        // Now destroy the app
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
      console.log("Effect toggle changed - updating filters:");
      console.log("- Grayscale:", isGrayscale);
      console.log("- Blur:", isBlur);
      console.log("- Ripple:", isRipple);
      updateFilters();
    }
  }, [isGrayscale, isBlur, isRipple, isInitialized]);
  
  return (
    <div className="w-full flex flex-col space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800 mb-4">
          <p className="font-medium">Error with shader effects</p>
          <p className="text-sm">{error}</p>
          <button 
            className="mt-2 text-sm px-3 py-1 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
            onClick={() => {
              setError(null);
              initializePixi();
            }}
          >
            Try Again
          </button>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 justify-between">
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
            className={`w-full sm:w-auto ${isBlur ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
            disabled={isProcessing}
          >
            {isBlur ? '✓ Blur Enabled' : 'Enable Blur'}
          </Button>
          
          <Button 
            variant={isRipple ? "default" : "outline"}
            onClick={() => setIsRipple(!isRipple)}
            className="w-full sm:w-auto"
            disabled={isProcessing}
          >
            {isRipple ? 'Disable' : 'Enable'} Ripple
          </Button>
        </div>
        
        {isRipple && (
          <Button
            variant="outline"
            onClick={startRecording}
            className="w-full sm:w-auto"
            disabled={isProcessing || recordingRef.current}
          >
            {recordingRef.current ? 'Recording...' : 'Export Animation'}
          </Button>
        )}
      </div>
      
      <div className="flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          Performance: {fps} FPS
        </div>
        <div className="text-xs text-muted-foreground">
          {isInitialized && spriteRef.current ? 
            `Shader Size: ${Math.round(spriteRef.current.width)}×${Math.round(spriteRef.current.height)}` : 
            'Initializing shader...'}
        </div>
      </div>
      
      <div 
        ref={containerRef} 
        className="w-full h-[400px] bg-muted/20 border rounded-lg overflow-hidden flex items-center justify-center relative"
      >
        {!imageData && (
          <div className="text-muted-foreground">
            Upload an image to apply shader effects
          </div>
        )}
        
        {imageData && !isInitialized && (
          <div className="text-muted-foreground flex flex-col items-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-2"></div>
            Initializing WebGL shader...
          </div>
        )}
        
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-10">
            <div className="flex flex-col items-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-2"></div>
              <div className="text-sm font-medium">Processing shader effects...</div>
            </div>
          </div>
        )}
      </div>
      
      <div className="text-xs text-muted-foreground">
        <p className="font-medium mb-1">Tips for optimal shader performance:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Large images (over 4096×4096) will be automatically scaled down for WebGL processing</li>
          <li>For best results, apply one effect at a time</li>
          <li>If you encounter issues, try disabling all effects and re-enabling them one by one</li>
        </ul>
      </div>
    </div>
  );
} 