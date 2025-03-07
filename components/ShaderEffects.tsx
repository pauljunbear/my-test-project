'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
// Import the type definitions only - these won't be in the compiled JS
import type * as PIXIModule from 'pixi.js';

interface ShaderEffectsProps {
  imageData: string | null;
  onProcessedImage?: (processedImageData: string) => void;
}

export default function ShaderEffects({ imageData, onProcessedImage }: ShaderEffectsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGrayscale, setIsGrayscale] = useState(true); // Default to grayscale enabled
  const [isBlur, setIsBlur] = useState(false);
  const [isRipple, setIsRipple] = useState(false);
  const [fps, setFps] = useState(0);
  const [appInstance, setAppInstance] = useState<any>(null);
  
  useEffect(() => {
    if (!containerRef.current || !imageData) return;
    
    // Load PixiJS dynamically on client side
    const loadPixi = async () => {
      try {
        // Use dynamic import and type it with the imported types
        const pixiModule = await import('pixi.js') as typeof PIXIModule;
        
        // Set up renderer options to ensure good compatibility
        const rendererOptions = {
          width: containerRef.current?.clientWidth || 800,
          height: containerRef.current?.clientHeight || 600,
          backgroundColor: 0xffffff, // White background
          antialias: true,
          resolution: Math.min(2, window.devicePixelRatio || 1), // Limit resolution to 2x for performance
          autoDensity: true,
          powerPreference: 'high-performance' as const,
          preserveDrawingBuffer: true, // Required for capture functionality
        };
        
        // Cleanup previous app if exists
        if (appInstance) {
          appInstance.destroy(true, true);
        }
        
        // Create PixiJS application with improved settings
        const app = new pixiModule.Application(rendererOptions);
        setAppInstance(app);
        
        // Clean container before adding new view
        if (containerRef.current) {
          while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild);
          }
          containerRef.current.appendChild(app.view as HTMLCanvasElement);
        }
        
        // Pre-load the image to determine dimensions
        const baseTexture = pixiModule.BaseTexture.from(imageData);
        
        baseTexture.on('loaded', () => {
          console.log("Image loaded for shader processing:", baseTexture.width, "x", baseTexture.height);
          
          // Create a texture from the base texture
          const texture = new pixiModule.Texture(baseTexture);
          const sprite = new pixiModule.Sprite(texture);
          
          // Proper sprite setup
          sprite.anchor.set(0.5);
          sprite.x = app.screen.width / 2;
          sprite.y = app.screen.height / 2;
          
          // Calculate proper scale to fit container but preserve aspect ratio
          const containerRatio = app.screen.width / app.screen.height;
          const textureRatio = texture.width / texture.height;
          
          let scale;
          if (containerRatio > textureRatio) {
            // Container is wider than texture
            scale = app.screen.height / texture.height * 0.9;
          } else {
            // Container is taller than texture
            scale = app.screen.width / texture.width * 0.9;
          }
          
          sprite.scale.set(scale);
          
          // Create filters
          const grayscaleFilter = new pixiModule.filters.ColorMatrixFilter();
          grayscaleFilter.grayscale(1, true);
          
          const blurFilter = new pixiModule.filters.BlurFilter();
          blurFilter.blur = 5;
          blurFilter.quality = 4; // Higher quality blur
          
          // Improved displacement filter setup for ripple effect
          const displacementMapSize = 512;
          const displacementMapCanvas = document.createElement('canvas');
          displacementMapCanvas.width = displacementMapSize;
          displacementMapCanvas.height = displacementMapSize;
          
          const displacementMapContext = displacementMapCanvas.getContext('2d');
          
          if (displacementMapContext) {
            // Create a radial gradient for better displacement
            const gradient = displacementMapContext.createRadialGradient(
              displacementMapSize/2, displacementMapSize/2, 0,
              displacementMapSize/2, displacementMapSize/2, displacementMapSize/2
            );
            
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.3, 'rgba(128, 128, 128, 0.7)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            displacementMapContext.fillStyle = gradient;
            displacementMapContext.fillRect(0, 0, displacementMapSize, displacementMapSize);
            
            const displacementTexture = pixiModule.Texture.from(displacementMapCanvas);
            const displacementSprite = new pixiModule.Sprite(displacementTexture);
            
            // Set up for displacement
            displacementSprite.anchor.set(0.5);
            displacementSprite.x = app.screen.width / 2;
            displacementSprite.y = app.screen.height / 2;
            displacementSprite.scale.set(1); // Start at 1x scale
            
            // Create displacement filter with proper settings
            const displacementFilter = new pixiModule.filters.DisplacementFilter(displacementSprite);
            displacementFilter.scale.set(20); // Lower initial scale for subtlety
            
            // Add the displacement sprite to stage
            app.stage.addChild(displacementSprite);
            
            // Add the main image sprite
            app.stage.addChild(sprite);
            
            // Animation for ripple
            let time = 0;
            app.ticker.add(() => {
              if (isRipple) {
                time += 0.01;
                displacementSprite.rotation = time * 0.1;
                displacementSprite.scale.set(
                  0.8 + Math.sin(time) * 0.2
                );
              }
            });
            
            // Apply filters based on state
            const updateFilters = (): void => {
              const filters = [];
              
              if (isGrayscale) {
                filters.push(grayscaleFilter);
              }
              
              if (isBlur) {
                filters.push(blurFilter);
              }
              
              if (isRipple) {
                filters.push(displacementFilter);
              }
              
              sprite.filters = filters.length > 0 ? filters : null;
              
              // Capture result after applying filters
              if (onProcessedImage) {
                setTimeout(() => {
                  try {
                    if (app.renderer) {
                      // Use extract method to get the canvas content
                      if (app.renderer.extract) {
                        // Modern PixiJS (v6+)
                        const processedImageData = app.renderer.extract.canvas(sprite).toDataURL('image/png');
                        onProcessedImage(processedImageData);
                      } else {
                        // Fallback for older versions or type issues
                        const renderer = app.renderer as any;
                        if (renderer.plugins && renderer.plugins.extract) {
                          const processedImageData = renderer.plugins.extract.canvas(sprite).toDataURL('image/png');
                          onProcessedImage(processedImageData);
                        } else {
                          console.warn('Renderer extract API not available');
                        }
                      }
                    }
                  } catch (error) {
                    console.error('Error capturing processed image:', error);
                  }
                }, 100);
              }
            };
            
            // Initialize filters
            updateFilters();
            
            // Set up FPS counter
            let lastTime = performance.now();
            let frames = 0;
            
            app.ticker.add(() => {
              frames++;
              const now = performance.now();
              
              if (now - lastTime >= 1000) {
                setFps(frames);
                frames = 0;
                lastTime = now;
              }
            });
            
            // Update filters when effect states change
            useEffect(() => {
              if (app && sprite) {
                updateFilters();
              }
            }, [isGrayscale, isBlur, isRipple]);
          }
        });
        
        // Return cleanup function
        return () => {
          if (app) {
            app.destroy(true, true);
          }
        };
      } catch (error) {
        console.error('Error initializing PixiJS:', error);
      }
    };
    
    loadPixi();
    
    // Clean up on unmount
    return () => {
      if (appInstance) {
        appInstance.destroy(true, true);
      }
    };
  }, [imageData, onProcessedImage]);
  
  return (
    <div className="w-full flex flex-col space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button 
          variant={isGrayscale ? "default" : "outline"}
          onClick={() => setIsGrayscale(!isGrayscale)}
          className="w-full sm:w-auto"
        >
          {isGrayscale ? 'Disable' : 'Enable'} Grayscale
        </Button>
        
        <Button 
          variant={isBlur ? "default" : "outline"}
          onClick={() => setIsBlur(!isBlur)}
          className="w-full sm:w-auto"
        >
          {isBlur ? 'Disable' : 'Enable'} Blur
        </Button>
        
        <Button 
          variant={isRipple ? "default" : "outline"}
          onClick={() => setIsRipple(!isRipple)}
          className="w-full sm:w-auto"
        >
          {isRipple ? 'Disable' : 'Enable'} Ripple
        </Button>
      </div>
      
      <div className="text-xs text-muted-foreground mt-2">
        Performance: {fps} FPS
      </div>
      
      <div 
        ref={containerRef} 
        className="w-full h-[300px] bg-muted/20 border rounded-lg overflow-hidden flex items-center justify-center"
      >
        {!imageData && (
          <div className="text-muted-foreground">
            Upload an image to apply shader effects
          </div>
        )}
      </div>
    </div>
  );
} 