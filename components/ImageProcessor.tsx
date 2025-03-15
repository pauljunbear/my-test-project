'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Label } from './ui/label';
import { Slider } from './ui/slider';

type ImageEffect = 'none' | 'grayscale' | 'duotone' | 'halftone' | 'dither';

interface EffectConfig {
  name: string;
  settings?: {
    [key: string]: {
      min: number;
      max: number;
      step: number;
      default: number;
    };
  };
}

const IMAGE_EFFECTS: Record<ImageEffect, EffectConfig> = {
  none: {
    name: 'None'
  },
  grayscale: {
    name: 'Grayscale'
  },
  duotone: {
    name: 'Duotone',
    settings: {
      threshold: {
        min: 0,
        max: 255,
        step: 1,
        default: 128
      }
    }
  },
  halftone: {
    name: 'Halftone',
    settings: {
      size: {
        min: 1,
        max: 20,
        step: 1,
        default: 4
      },
      spacing: {
        min: 1,
        max: 20,
        step: 1,
        default: 4
      }
    }
  },
  dither: {
    name: 'Dither',
    settings: {
      threshold: {
        min: 0,
        max: 255,
        step: 1,
        default: 128
      }
    }
  }
};

export default function ImageProcessor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedEffect, setSelectedEffect] = useState<ImageEffect>('none');
  const [settings, setSettings] = useState<Record<string, number>>({});
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);

  const applyEffect = (
    ctx: CanvasRenderingContext2D,
    imageData: ImageData,
    effect: ImageEffect
  ) => {
    const { data } = imageData;

    switch (effect) {
      case 'grayscale':
        for (let i = 0; i < data.length; i += 4) {
          const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
          data[i] = data[i + 1] = data[i + 2] = gray;
        }
        break;

      case 'duotone':
        const threshold = settings.threshold ?? IMAGE_EFFECTS.duotone.settings!.threshold.default;
        for (let i = 0; i < data.length; i += 4) {
          const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
          const value = gray < threshold ? 0 : 255;
          data[i] = data[i + 1] = data[i + 2] = value;
        }
        break;

      case 'halftone':
        const size = settings.size ?? IMAGE_EFFECTS.halftone.settings!.size.default;
        const spacing = settings.spacing ?? IMAGE_EFFECTS.halftone.settings!.spacing.default;
        
        // Create a temporary canvas for the halftone effect
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = ctx.canvas.width;
        tempCanvas.height = ctx.canvas.height;
        const tempCtx = tempCanvas.getContext('2d')!;
        
        // Draw original image
        tempCtx.putImageData(imageData, 0, 0);
        
        // Clear main canvas
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Draw halftone pattern
        ctx.fillStyle = 'black';
        for (let y = 0; y < ctx.canvas.height; y += spacing) {
          for (let x = 0; x < ctx.canvas.width; x += spacing) {
            const pixelData = tempCtx.getImageData(x, y, 1, 1).data;
            const brightness = (pixelData[0] + pixelData[1] + pixelData[2]) / 3 / 255;
            const radius = (size * brightness) / 2;
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        return; // Skip putting image data back since we drew directly

      case 'dither':
        const ditherThreshold = settings.threshold ?? IMAGE_EFFECTS.dither.settings!.threshold.default;
        const w = ctx.canvas.width;
        const newData = new Uint8ClampedArray(data);
        
        for (let y = 0; y < ctx.canvas.height; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            const newValue = gray < ditherThreshold ? 0 : 255;
            const error = gray - newValue;
            
            newData[i] = newData[i + 1] = newData[i + 2] = newValue;
            
            // Floyd-Steinberg dithering
            if (x < w - 1) distributeError(newData, i + 4, error * 7/16, w);
            if (y < ctx.canvas.height - 1) {
              if (x > 0) distributeError(newData, i + w * 4 - 4, error * 3/16, w);
              distributeError(newData, i + w * 4, error * 5/16, w);
              if (x < w - 1) distributeError(newData, i + w * 4 + 4, error * 1/16, w);
            }
          }
        }
        
        imageData.data.set(newData);
        break;
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const distributeError = (data: Uint8ClampedArray, i: number, error: number, width: number) => {
    data[i] = Math.max(0, Math.min(255, data[i] + error));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + error));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + error));
  };

  const handleFileUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setSelectedFile(file);

    const img = new Image();
    img.onload = () => {
      setDimensions({ width: img.width, height: img.height });
      originalImageRef.current = img;
      
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')!;
        canvasRef.current.width = img.width;
        canvasRef.current.height = img.height;
        ctx.drawImage(img, 0, 0);
      }
    };
    img.src = url;
  };

  const handleEffectChange = (effect: ImageEffect) => {
    setSelectedEffect(effect);
    
    // Reset settings to defaults
    if (effect !== 'none' && IMAGE_EFFECTS[effect].settings) {
      const defaultSettings: Record<string, number> = {};
      Object.entries(IMAGE_EFFECTS[effect].settings!).forEach(([key, config]) => {
        defaultSettings[key] = config.default;
      });
      setSettings(defaultSettings);
    }
  };

  const handleSettingChange = (name: string, value: number) => {
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (!canvasRef.current || !originalImageRef.current) return;

    const ctx = canvasRef.current.getContext('2d')!;
    ctx.drawImage(originalImageRef.current, 0, 0);

    if (selectedEffect !== 'none') {
      const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
      applyEffect(ctx, imageData, selectedEffect);
    }
  }, [selectedEffect, settings]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    
    const link = document.createElement('a');
    link.download = `processed-image-${selectedEffect}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="w-full h-full flex flex-col space-y-6 p-4">
      {/* Effect Navigation Bar */}
      <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="flex space-x-2">
          {Object.entries(IMAGE_EFFECTS).map(([key, effect]) => (
            <Button
              key={key}
              variant={selectedEffect === key ? 'default' : 'outline'}
              onClick={() => handleEffectChange(key as ImageEffect)}
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
              <div className="flex-1 bg-[#f0f0f0] dark:bg-gray-900 flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          )}
        </div>

        {/* Settings Panel */}
        {selectedEffect !== 'none' && IMAGE_EFFECTS[selectedEffect].settings && (
          <Card className="w-80 rounded-xl shadow-sm">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-medium">Effect Settings</h3>
              {Object.entries(IMAGE_EFFECTS[selectedEffect].settings!).map(([name, config]) => (
                <div key={name} className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor={name} className="capitalize">
                      {name.replace(/([A-Z])/g, ' $1').trim()}
                    </Label>
                    <span className="text-sm text-muted-foreground">
                      {settings[name]?.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    id={name}
                    min={config.min}
                    max={config.max}
                    step={config.step}
                    value={[settings[name] || config.default]}
                    onValueChange={([value]) => handleSettingChange(name, value)}
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