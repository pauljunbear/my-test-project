'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Application, Sprite, Filter, Assets } from 'pixi.js';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Slider } from './ui/slider';
import { createImage, createCanvas, downloadFile } from '@/lib/browser-utils';
import { debounce } from '@/lib/utils';

// Define shader modes
type ShaderMode = 'basic' | 'advanced';

// Define shader effects with GLSL code
const SHADER_EFFECTS = {
  none: {
    name: 'Original',
    fragment: `
      varying vec2 vTextureCoord;
      uniform sampler2D uSampler;
      
      void main(void) {
        gl_FragColor = texture2D(uSampler, vTextureCoord);
      }
    `,
    uniforms: {}
  },
  pixelate: {
    name: 'Pixelate',
    fragment: `
      varying vec2 vTextureCoord;
      uniform sampler2D uSampler;
      uniform float pixelSize;
      uniform vec2 resolution;
      
      void main(void) {
        vec2 uv = vTextureCoord;
        vec2 pixelated = floor(uv * resolution / pixelSize) * pixelSize / resolution;
        gl_FragColor = texture2D(uSampler, pixelated);
      }
    `,
    uniforms: {
      pixelSize: { type: 'float', value: 4.0, min: 2.0, max: 32.0, step: 1.0 }
    }
  },
  halftone: {
    name: 'Halftone',
    fragment: `
      varying vec2 vTextureCoord;
      uniform sampler2D uSampler;
      uniform float dotSize;
      uniform vec2 resolution;
      
      void main(void) {
        vec2 uv = vTextureCoord;
        vec4 color = texture2D(uSampler, uv);
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        
        vec2 st = uv * resolution / dotSize;
        vec2 gridPos = fract(st) - 0.5;
        float dist = length(gridPos);
        float radius = 0.4 * sqrt(1.0 - gray);
        float dot = 1.0 - smoothstep(radius - 0.01, radius, dist);
        
        gl_FragColor = vec4(vec3(dot), color.a);
      }
    `,
    uniforms: {
      dotSize: { type: 'float', value: 8.0, min: 4.0, max: 32.0, step: 1.0 }
    }
  },
  duotone: {
    name: 'Duotone',
    fragment: `
      varying vec2 vTextureCoord;
      uniform sampler2D uSampler;
      uniform vec3 color1;
      uniform vec3 color2;
      uniform float intensity;
      
      void main(void) {
        vec4 texColor = texture2D(uSampler, vTextureCoord);
        float gray = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
        vec3 duotone = mix(color1, color2, gray * intensity);
        gl_FragColor = vec4(duotone, texColor.a);
      }
    `,
    uniforms: {
      color1: { type: 'vec3', value: [0.0, 0.0, 0.4] },
      color2: { type: 'vec3', value: [1.0, 0.0, 0.0] },
      intensity: { type: 'float', value: 1.0, min: 0.0, max: 1.0, step: 0.01 }
    }
  }
};

export default function PixiShaderProcessor() {
  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedEffect, setSelectedEffect] = useState('none');
  const [shaderMode, setShaderMode] = useState<ShaderMode>('basic');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uniformValues, setUniformValues] = useState<Record<string, any>>({});
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const spriteRef = useRef<Sprite | null>(null);
  const filterRef = useRef<Filter | null>(null);

  // Initialize Pixi.js application
  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    // Create Pixi application with proper settings
    const app = new Application({
      backgroundAlpha: 0,
      antialias: true,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      view: document.createElement('canvas') as HTMLCanvasElement
    });

    // Add to DOM
    containerRef.current.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;

    return () => {
      app.destroy(true);
      appRef.current = null;
    };
  }, []);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    try {
      setIsProcessing(true);
      
      // Create object URL
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      
      // Load image and create sprite
      const texture = await Assets.load(url);
      const sprite = new Sprite(texture);
      
      // Set dimensions
      const { width, height } = texture;
      setDimensions({ width, height });
      
      // Scale sprite to fit container while maintaining aspect ratio
      const containerWidth = containerRef.current?.clientWidth ?? width;
      const containerHeight = containerRef.current?.clientHeight ?? height;
      const scale = Math.min(
        containerWidth / width,
        containerHeight / height
      );
      
      sprite.scale.set(scale);
      sprite.position.set(
        (containerWidth - width * scale) / 2,
        (containerHeight - height * scale) / 2
      );
      
      // Clear previous sprite and add new one
      if (appRef.current) {
        appRef.current.stage.removeChildren();
        appRef.current.stage.addChild(sprite);
      }
      
      spriteRef.current = sprite;
      setSelectedEffect('none');
      
    } catch (error) {
      console.error('Error loading image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply shader effect
  const applyShaderEffect = useCallback((effectName: string) => {
    if (!spriteRef.current || !appRef.current) return;
    
    // Remove existing filter
    if (filterRef.current) {
      spriteRef.current.filters = [];
      filterRef.current = null;
    }
    
    // If no effect selected, return
    if (effectName === 'none') return;
    
    // Get effect configuration
    const effect = SHADER_EFFECTS[effectName];
    if (!effect) return;
    
    try {
      // Create new filter with shader
      const filter = new Filter(
        undefined, // Use default vertex shader
        effect.fragment,
        { 
          ...effect.uniforms,
          resolution: [
            appRef.current.screen.width,
            appRef.current.screen.height
          ]
        }
      );
      
      // Apply filter
      spriteRef.current.filters = [filter];
      filterRef.current = filter;
      
      // Initialize uniform values
      const initialUniforms = {};
      Object.entries(effect.uniforms).forEach(([key, config]) => {
        initialUniforms[key] = config.value;
      });
      setUniformValues(initialUniforms);
      
    } catch (error) {
      console.error('Error applying shader effect:', error);
    }
  }, []);

  // Handle uniform value changes
  const handleUniformChange = (name: string, value: number) => {
    if (!filterRef.current) return;
    
    setUniformValues(prev => ({ ...prev, [name]: value }));
    filterRef.current.uniforms[name] = value;
  };

  // Handle download
  const handleDownload = async () => {
    if (!appRef.current) return;
    
    try {
      const dataUrl = appRef.current.view.toDataURL('image/png');
      downloadFile(dataUrl, `processed-image-${selectedEffect}.png`);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  // Effect cleanup
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  // Apply effect when selected effect changes
  useEffect(() => {
    applyShaderEffect(selectedEffect);
  }, [selectedEffect, applyShaderEffect]);

  return (
    <div className="w-full h-full flex flex-col space-y-6 p-4">
      {/* Effect Navigation Bar */}
      <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="flex space-x-2">
          {Object.entries(SHADER_EFFECTS).map(([key, effect]) => (
            <Button
              key={key}
              variant={selectedEffect === key ? 'default' : 'outline'}
              onClick={() => setSelectedEffect(key)}
              className="rounded-lg"
            >
              {effect.name}
            </Button>
          ))}
        </div>

        {imageUrl && (
          <Button
            variant="default"
            onClick={handleDownload}
            className="rounded-lg"
          >
            Download
          </Button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Image Display Area */}
        <div className="flex-1 bg-white dark:bg-gray-800 border rounded-xl shadow-sm overflow-hidden">
          {!imageUrl ? (
            <div className="h-full flex items-center justify-center p-8">
              <div 
                className="w-full h-64 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileUpload(file);
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="text-center cursor-pointer">
                  <div className="mb-2">Drop an image here or click to upload</div>
                  <div className="text-sm text-muted-foreground">
                    Supports PNG, JPG up to 10MB
                  </div>
                </label>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b">
                <h2 className="text-sm font-medium">
                  Image Preview
                  {dimensions && (
                    <span className="ml-2 text-muted-foreground">
                      {dimensions.width} × {dimensions.height}
                    </span>
                  )}
                </h2>
              </div>
              <div 
                ref={containerRef} 
                className="flex-1 bg-[#f0f0f0] dark:bg-gray-900"
              />
            </div>
          )}
        </div>

        {/* Settings Panel */}
        {selectedEffect !== 'none' && (
          <Card className="w-80 rounded-xl shadow-sm">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-medium">Effect Settings</h3>
              {Object.entries(SHADER_EFFECTS[selectedEffect].uniforms)
                .filter(([_, config]) => config.type === 'float')
                .map(([name, config]) => (
                  <div key={name} className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor={name} className="capitalize">
                        {name.replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                      <span className="text-sm text-muted-foreground">
                        {uniformValues[name]?.toFixed(2)}
                      </span>
                    </div>
                    <Slider
                      id={name}
                      min={config.min}
                      max={config.max}
                      step={config.step}
                      value={[uniformValues[name] || config.value]}
                      onValueChange={([value]) => handleUniformChange(name, value)}
                    />
                  </div>
                ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 