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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGrayscale, setIsGrayscale] = useState(false);
  const [isBlur, setIsBlur] = useState(false);
  const [isRipple, setIsRipple] = useState(false);
  const [fps, setFps] = useState(0);
  
  useEffect(() => {
    if (!containerRef.current || !imageData) return;
    
    // Load PixiJS dynamically on client side
    const loadPixi = async () => {
      try {
        // Use dynamic import and type it with the imported types
        const pixiModule = await import('pixi.js') as typeof PIXIModule;
        
        // Create PixiJS application
        const appWidth = containerRef.current?.clientWidth || 800;
        const appHeight = containerRef.current?.clientHeight || 600;
        
        const app = new pixiModule.Application({
          width: appWidth,
          height: appHeight,
          backgroundColor: 0xf0f0f0,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });
        
        // Add view to the DOM
        if (containerRef.current?.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
        containerRef.current?.appendChild(app.view as HTMLCanvasElement);
        
        // Create image from data URL
        const texture = pixiModule.Texture.from(imageData);
        const sprite = new pixiModule.Sprite(texture);
        
        // Center the sprite
        sprite.anchor.set(0.5);
        sprite.x = app.screen.width / 2;
        sprite.y = app.screen.height / 2;
        
        // Scale to fit
        const scaleX = app.screen.width / sprite.width * 0.8;
        const scaleY = app.screen.height / sprite.height * 0.8;
        const scale = Math.min(scaleX, scaleY);
        sprite.scale.set(scale);
        
        // Create filters
        const grayscaleFilter = new pixiModule.filters.ColorMatrixFilter();
        grayscaleFilter.grayscale(1, true);
        
        const blurFilter = new pixiModule.filters.BlurFilter();
        blurFilter.blur = 5;
        
        // Create displacement filter (for ripple effect)
        const displacementFilterSetup = async () => {
          // Create a new canvas for the displacement map
          const mapCanvas = document.createElement('canvas');
          const mapCtx = mapCanvas.getContext('2d');
          mapCanvas.width = 512;
          mapCanvas.height = 512;
          
          if (mapCtx) {
            // Draw a simple displacement map (concentric circles)
            mapCtx.fillStyle = 'black';
            mapCtx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
            
            for (let i = 0; i < 5; i++) {
              const radius = 100 - i * 20;
              mapCtx.strokeStyle = `rgba(255, 255, 255, ${(5-i)/5})`;
              mapCtx.lineWidth = 10;
              mapCtx.beginPath();
              mapCtx.arc(mapCanvas.width/2, mapCanvas.height/2, radius, 0, Math.PI * 2);
              mapCtx.stroke();
            }
            
            // Create a sprite from the canvas
            const displacementTexture = pixiModule.Texture.from(mapCanvas);
            const displacementSprite = new pixiModule.Sprite(displacementTexture);
            displacementSprite.texture.baseTexture.wrapMode = pixiModule.WRAP_MODES.REPEAT;
            
            const displacementFilter = new pixiModule.filters.DisplacementFilter(displacementSprite);
            displacementFilter.scale.set(30);
            
            // Add the sprite to the stage but make it invisible
            displacementSprite.visible = false; 
            app.stage.addChild(displacementSprite);
            
            // Setup animation
            let time = 0;
            app.ticker.add(() => {
              if (isRipple) {
                time += 0.01;
                displacementSprite.scale.set(
                  Math.sin(time * 0.5) * 0.2 + 1,
                  Math.cos(time * 0.5) * 0.2 + 1
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
              if (filters.length > 0 && onProcessedImage) {
                setTimeout(() => {
                  try {
                    if (app.renderer && app.renderer.extract && sprite) {
                      // Use type assertion to help TypeScript understand this is a valid operation
                      const canvasResult = app.renderer.extract.canvas(sprite) as HTMLCanvasElement;
                      const processedImageData = canvasResult.toDataURL('image/png');
                      onProcessedImage(processedImageData);
                    } else {
                      console.warn('Renderer extract API or sprite not available');
                    }
                  } catch (error) {
                    console.error('Error capturing processed image:', error);
                  }
                }, 100);
              }
            };
            
            // Set up watchers for filter state changes
            const watchEffects = (): void => {
              updateFilters();
              
              // FPS counter
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
            };
            
            // Expose state updaters to parent component
            watchEffects();
            
            // Re-apply filters when state changes
            return updateFilters;
          }
        };
        
        // Add sprite to stage
        app.stage.addChild(sprite);
        
        // Initialize displacement filter
        const updateFilters = await displacementFilterSetup();
        
        // Handle state changes
        return () => {
          app.destroy(true, true);
        };
      } catch (error) {
        console.error('Error initializing PixiJS:', error);
      }
    };
    
    loadPixi();
  }, [imageData, isBlur, isGrayscale, isRipple, onProcessedImage]);
  
  return (
    <div className="w-full flex flex-col space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Shader Effects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={isGrayscale ? "default" : "outline"}
              onClick={() => setIsGrayscale(!isGrayscale)}
            >
              {isGrayscale ? 'Disable' : 'Enable'} Grayscale
            </Button>
            
            <Button 
              variant={isBlur ? "default" : "outline"}
              onClick={() => setIsBlur(!isBlur)}
            >
              {isBlur ? 'Disable' : 'Enable'} Blur
            </Button>
            
            <Button 
              variant={isRipple ? "default" : "outline"}
              onClick={() => setIsRipple(!isRipple)}
            >
              {isRipple ? 'Disable' : 'Enable'} Ripple
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Performance: {fps} FPS
          </div>
        </CardContent>
      </Card>
      
      <div 
        ref={containerRef} 
        className="w-full h-[400px] bg-muted/20 border rounded-lg overflow-hidden flex items-center justify-center"
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