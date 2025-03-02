import React, { useState, useRef, useEffect } from 'react';
import { UploadDropzone } from './ui/upload-dropzone';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './ui/tabs';
import {
  Slider
} from './ui/slider';
import { ColorPicker } from './ui/color-picker';
import { Label } from './ui/label';
import { Download, Undo, Plus, Trash } from 'lucide-react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from './ui/popover';
import { ColorSetSelector } from './ui/color-set-selector';

// Define types
type Effect = 'halftone' | 'duotone' | 'blackwhite' | 'sepia' | 'noise' | 'none';

interface HalftoneSettings {
  dotSize: number;
  spacing: number;
  angle: number;
  shape: 'circle' | 'square' | 'line';
}

interface DuotoneSettings {
  color1: string;
  color2: string;
  intensity: number;
}

interface ImageHistory {
  dataUrl: string;
  effects: AppliedEffect[];
  timestamp: number;
}

interface AppliedEffect {
  type: Effect;
  settings?: HalftoneSettings | DuotoneSettings | { noiseLevel: number };
}

export default function ImageEditorComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [currentEffect, setCurrentEffect] = useState<Effect>('none');
  const [appliedEffects, setAppliedEffects] = useState<AppliedEffect[]>([]);
  const [imageHistory, setImageHistory] = useState<ImageHistory[]>([]);
  const [noiseLevel, setNoiseLevel] = useState(25);
  const [previewMode, setPreviewMode] = useState(false);
  const [, setPreviewEffect] = useState<AppliedEffect | null>(null);
  
  const [halftoneSettings, setHalftoneSettings] = useState<HalftoneSettings>({
    dotSize: 3,
    spacing: 6,
    angle: 45,
    shape: 'circle'
  });
  
  const [duotoneSettings, setDuotoneSettings] = useState<DuotoneSettings>({
    color1: '#000000',
    color2: '#FFFFFF',
    intensity: 0.5
  });
  
  // Refs
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  
  // Handle image upload
  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      if (!e.target?.result) return;
      
      const img = new Image();
      img.onload = () => {
        setImage(img);
        originalImageRef.current = img;
        
        // Reset effects and history
        setAppliedEffects([]);
        setCurrentEffect('none');
        setPreviewMode(false);
        
        // Initialize canvas with the image
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Set initial history
        const newHistory: ImageHistory = {
          dataUrl: canvas.toDataURL('image/png'),
          effects: [],
          timestamp: Date.now()
        };
        
        setImageHistory([newHistory]);
        
        // Render the canvas
        renderCanvas();
      };
      
      img.src = e.target.result as string;
    };
    
    reader.readAsDataURL(file);
  };
  
  // Function to render the canvas with current effects
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    const hiddenCanvas = hiddenCanvasRef.current;
    
    if (!canvas || !hiddenCanvas || !image) return;
    
    const ctx = canvas.getContext('2d');
    const hiddenCtx = hiddenCanvas.getContext('2d');
    
    if (!ctx || !hiddenCtx) return;
    
    // Set canvas dimensions to match the image
    canvas.width = image.width;
    canvas.height = image.height;
    hiddenCanvas.width = image.width;
    hiddenCanvas.height = image.height;
    
    // Draw the original image on the hidden canvas
    hiddenCtx.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
    hiddenCtx.drawImage(image, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
    
    // Get the image data
    const imageData = hiddenCtx.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height);
    
    // Apply all effects
    let processedImageData = imageData;
    for (const effect of appliedEffects) {
      processedImageData = applyEffectToImageData(
        effect, 
        processedImageData, 
        hiddenCtx, 
        hiddenCanvas.width, 
        hiddenCanvas.height
      );
    }
    
    // Put the processed image data back on the canvas
    ctx.putImageData(processedImageData, 0, 0);
  };
  
  // Preview the current effect without applying it
  const previewCurrentEffect = () => {
    if (!image || currentEffect === 'none') return;
    
    const effectToPreview: AppliedEffect = {
      type: currentEffect
    };
    
    if (currentEffect === 'halftone') {
      effectToPreview.settings = { ...halftoneSettings };
    } else if (currentEffect === 'duotone') {
      effectToPreview.settings = { ...duotoneSettings };
    } else if (currentEffect === 'noise') {
      effectToPreview.settings = { noiseLevel };
    }
    
    setPreviewEffect(effectToPreview);
    setPreviewMode(true);
    
    // Apply the preview effect to the canvas
    const canvas = canvasRef.current;
    const hiddenCanvas = hiddenCanvasRef.current;
    
    if (!canvas || !hiddenCanvas || !image) return;
    
    const ctx = canvas.getContext('2d');
    const hiddenCtx = hiddenCanvas.getContext('2d');
    
    if (!ctx || !hiddenCtx) return;
    
    // Set canvas dimensions to match the image
    canvas.width = image.width;
    canvas.height = image.height;
    hiddenCanvas.width = image.width;
    hiddenCanvas.height = image.height;
    
    // Draw the original image on the hidden canvas
    hiddenCtx.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
    hiddenCtx.drawImage(image, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
    
    // Get the image data
    const imageData = hiddenCtx.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height);
    
    // Apply all existing effects
    let processedImageData = imageData;
    for (const effect of appliedEffects) {
      processedImageData = applyEffectToImageData(
        effect, 
        processedImageData, 
        hiddenCtx, 
        hiddenCanvas.width, 
        hiddenCanvas.height
      );
    }
    
    // Apply the preview effect
    processedImageData = applyEffectToImageData(
      effectToPreview, 
      processedImageData, 
      hiddenCtx, 
      hiddenCanvas.width, 
      hiddenCanvas.height
    );
    
    // Put the processed image data back on the canvas
    ctx.putImageData(processedImageData, 0, 0);
  };
  
  // Cancel the preview and revert to the original image with applied effects
  const cancelPreview = () => {
    setPreviewMode(false);
    setPreviewEffect(null);
    
    // Redraw the canvas with only the applied effects
    renderCanvas();
  };

  // Apply the current effect
  const applyEffect = () => {
    if (!image || currentEffect === 'none') return;
    
    const newEffect: AppliedEffect = {
      type: currentEffect
    };
    
    if (currentEffect === 'halftone') {
      newEffect.settings = { ...halftoneSettings };
    } else if (currentEffect === 'duotone') {
      newEffect.settings = { ...duotoneSettings };
    } else if (currentEffect === 'noise') {
      newEffect.settings = { noiseLevel };
    }
    
    setAppliedEffects(prev => [...prev, newEffect]);
    setPreviewMode(false);
    setPreviewEffect(null);
  };
  
  // Remove an effect from the applied effects
  const removeEffect = (index: number) => {
    setAppliedEffects(prev => prev.filter((_, i) => i !== index));
  };
  
  // Effect to update canvas when image or effects change
  useEffect(() => {
    if (!image) return;
    
    // If we're in preview mode, don't re-render the canvas
    if (previewMode) return;
    
    renderCanvas();
    
    // Save the current state to history if effects changed
    if (imageHistory.length > 0 && 
        JSON.stringify(imageHistory[imageHistory.length - 1].effects) !== JSON.stringify(appliedEffects)) {
      const newHistory: ImageHistory = {
        dataUrl: canvasRef.current?.toDataURL('image/png') || '',
        effects: [...appliedEffects],
        timestamp: Date.now()
      };
      
      setImageHistory(prev => [...prev, newHistory]);
    }
  }, [appliedEffects, image, imageHistory, previewMode]);
  
  // Function to apply a single effect to image data
  const applyEffectToImageData = (
    effect: AppliedEffect, 
    imageData: ImageData, 
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): ImageData => {
    const data = imageData.data;
    
    if (effect.type === 'duotone') {
      const settings = effect.settings as DuotoneSettings;
      
      // Parse hex colors to RGB
      const parseColor = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
      };
      
      const color1 = parseColor(settings.color1);
      const color2 = parseColor(settings.color2);
      
      // Apply duotone effect
      for (let i = 0; i < data.length; i += 4) {
        // Calculate grayscale value
        const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
        
        // Mix colors based on gray value
        data[i] = Math.round(color1.r * (1 - gray) + color2.r * gray);   // Red
        data[i + 1] = Math.round(color1.g * (1 - gray) + color2.g * gray); // Green
        data[i + 2] = Math.round(color1.b * (1 - gray) + color2.b * gray); // Blue
        
        // Apply intensity
        if (settings.intensity < 1) {
          const originalWeight = 1 - settings.intensity;
          data[i] = Math.round(data[i] * settings.intensity + imageData.data[i] * originalWeight);
          data[i + 1] = Math.round(data[i + 1] * settings.intensity + imageData.data[i + 1] * originalWeight);
          data[i + 2] = Math.round(data[i + 2] * settings.intensity + imageData.data[i + 2] * originalWeight);
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      return ctx.getImageData(0, 0, width, height);
      
    } else if (effect.type === 'halftone') {
      const settings = effect.settings as HalftoneSettings;
      
      // Create a new canvas for the halftone effect
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return imageData;
      
      // Put the current image data on the temp canvas
      tempCtx.putImageData(imageData, 0, 0);
      
      // Get grayscale data
      const grayscaleData: number[] = [];
      for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        grayscaleData.push(gray);
      }
      
      // Clear the context for halftone effect
      ctx.clearRect(0, 0, width, height);
      
      // Apply halftone effect
      const spacing = settings.spacing; // Dot spacing
      const size = settings.dotSize; // Max dot size
      const radians = (settings.angle * Math.PI) / 180;
      
      // Set white background for halftone effect
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = 'black';
      
      for (let y = 0; y < height; y += spacing) {
        for (let x = 0; x < width; x += spacing) {
          // Get the grayscale value at this position
          const pixelIndex = (y * width + x) * 4;
          const grayIndex = Math.floor(pixelIndex / 4);
          
          if (grayIndex < grayscaleData.length) {
            const gray = grayscaleData[grayIndex];
            // Calculate dot size based on grayscale value (darker = larger dot)
            const dotSize = (255 - gray) * size / 255;
            
            if (dotSize > 0) {
              // Draw the dot
              ctx.beginPath();
              
              if (settings.shape === 'circle') {
                ctx.arc(x, y, dotSize / 2, 0, Math.PI * 2);
              } else if (settings.shape === 'square') {
                ctx.rect(x - dotSize / 2, y - dotSize / 2, dotSize, dotSize);
              } else if (settings.shape === 'line') {
                const startX = x - (dotSize / 2) * Math.cos(radians);
                const startY = y - (dotSize / 2) * Math.sin(radians);
                const endX = x + (dotSize / 2) * Math.cos(radians);
                const endY = y + (dotSize / 2) * Math.sin(radians);
                
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.lineWidth = Math.max(1, dotSize / 3);
              }
              
              ctx.fill();
              if (settings.shape === 'line') {
                ctx.stroke();
              }
            }
          }
        }
      }
      
      return ctx.getImageData(0, 0, width, height);
      
    } else if (effect.type === 'blackwhite') {
      // Apply black and white effect
      for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        data[i] = gray;     // Red
        data[i + 1] = gray; // Green
        data[i + 2] = gray; // Blue
      }
      
      ctx.putImageData(imageData, 0, 0);
      return ctx.getImageData(0, 0, width, height);
      
    } else if (effect.type === 'sepia') {
      // Apply sepia effect
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));     // Red
        data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168)); // Green
        data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131)); // Blue
      }
      
      ctx.putImageData(imageData, 0, 0);
      return ctx.getImageData(0, 0, width, height);
      
    } else if (effect.type === 'noise') {
      const settings = effect.settings as { noiseLevel: number };
      
      // Apply noise effect
      for (let i = 0; i < data.length; i += 4) {
        if (i % 4 < 3) { // Skip alpha channel
          const noise = (Math.random() - 0.5) * settings.noiseLevel;
          data[i] = Math.max(0, Math.min(255, data[i] + noise));
          data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
          data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      return ctx.getImageData(0, 0, width, height);
    }
    
    return imageData;
  };
  
  // Handle undo
  const handleUndo = () => {
    if (imageHistory.length <= 1) return;
    
    // Remove the last item from history
    const newHistory = [...imageHistory];
    newHistory.pop();
    setImageHistory(newHistory);
    
    // Set the applied effects to the previous state
    const previousState = newHistory[newHistory.length - 1];
    setAppliedEffects(previousState.effects);
    
    // If we're back to the original image, reset
    if (newHistory.length === 1) {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        originalImageRef.current = img;
      };
      img.src = previousState.dataUrl;
    }
  };
  
  // Download the processed image
  const handleDownload = () => {
    if (!canvasRef.current) return;
    
    const link = document.createElement('a');
    link.download = `edited-image.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };
  
  // Handle color selection from the color library
  const handleColorSelect = (color: string) => {
    if (currentEffect === 'duotone') {
      setDuotoneSettings(prev => ({ ...prev, color1: color }));
    }
    
    // If no effect is selected, automatically set to duotone
    if (currentEffect === 'none' && image) {
      setCurrentEffect('duotone');
      setDuotoneSettings(prev => ({ ...prev, color1: color }));
    }
  };
  
  // Preview a color from the color library
  const handlePreviewColor = (color: string) => {
    if (!image) return;
    
    // Store current settings to restore later
    const tempEffect: AppliedEffect = {
      type: 'duotone',
      settings: {
        color1: color,
        color2: duotoneSettings.color2,
        intensity: duotoneSettings.intensity
      }
    };
    
    // Apply preview
    setPreviewMode(true);
    setPreviewEffect(tempEffect);
    
    // Apply the preview effect to the canvas
    const canvas = canvasRef.current;
    const hiddenCanvas = hiddenCanvasRef.current;
    
    if (!canvas || !hiddenCanvas || !image) return;
    
    const ctx = canvas.getContext('2d');
    const hiddenCtx = hiddenCanvas.getContext('2d');
    
    if (!ctx || !hiddenCtx) return;
    
    // Set canvas dimensions to match the image
    canvas.width = image.width;
    canvas.height = image.height;
    hiddenCanvas.width = image.width;
    hiddenCanvas.height = image.height;
    
    // Draw the original image on the hidden canvas
    hiddenCtx.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
    hiddenCtx.drawImage(image, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
    
    // Get the image data
    const imageData = hiddenCtx.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height);
    
    // Apply all existing effects
    let processedImageData = imageData;
    for (const effect of appliedEffects) {
      processedImageData = applyEffectToImageData(
        effect, 
        processedImageData, 
        hiddenCtx, 
        hiddenCanvas.width, 
        hiddenCanvas.height
      );
    }
    
    // Apply the preview effect
    processedImageData = applyEffectToImageData(
      tempEffect, 
      processedImageData, 
      hiddenCtx, 
      hiddenCanvas.width, 
      hiddenCanvas.height
    );
    
    // Put the processed image data back on the canvas
    ctx.putImageData(processedImageData, 0, 0);
  };

  // Handle duotone pair selection from the color library
  const handleDuotonePairSelect = (color1: string, color2: string) => {
    setDuotoneSettings(prev => ({ 
      ...prev, 
      color1, 
      color2 
    }));
    
    // If no effect is selected, automatically set to duotone
    if (currentEffect === 'none' && image) {
      setCurrentEffect('duotone');
    }
  };
  
  // Preview a duotone pair from the color library
  const handlePreviewDuotonePair = (color1: string, color2: string) => {
    if (!image) return;
    
    // Store current settings to restore later
    const tempEffect: AppliedEffect = {
      type: 'duotone',
      settings: {
        color1: color1,
        color2: color2,
        intensity: duotoneSettings.intensity
      }
    };
    
    // Apply preview
    setPreviewMode(true);
    setPreviewEffect(tempEffect);
    
    // Apply the preview effect to the canvas
    const canvas = canvasRef.current;
    const hiddenCanvas = hiddenCanvasRef.current;
    
    if (!canvas || !hiddenCanvas || !image) return;
    
    const ctx = canvas.getContext('2d');
    const hiddenCtx = hiddenCanvas.getContext('2d');
    
    if (!ctx || !hiddenCtx) return;
    
    // Set canvas dimensions to match the image
    canvas.width = image.width;
    canvas.height = image.height;
    hiddenCanvas.width = image.width;
    hiddenCanvas.height = image.height;
    
    // Draw the original image on the hidden canvas
    hiddenCtx.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
    hiddenCtx.drawImage(image, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
    
    // Get the image data
    const imageData = hiddenCtx.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height);
    
    // Apply all existing effects
    let processedImageData = imageData;
    for (const effect of appliedEffects) {
      processedImageData = applyEffectToImageData(
        effect, 
        processedImageData, 
        hiddenCtx, 
        hiddenCanvas.width, 
        hiddenCanvas.height
      );
    }
    
    // Apply the preview effect
    processedImageData = applyEffectToImageData(
      tempEffect, 
      processedImageData, 
      hiddenCtx, 
      hiddenCanvas.width, 
      hiddenCanvas.height
    );
    
    // Put the processed image data back on the canvas
    ctx.putImageData(processedImageData, 0, 0);
  };
  
  return (
    <div className="container mx-auto p-4 h-full">
      <Card className="w-full h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle>Image Editor</CardTitle>
          <CardDescription>Upload an image and apply multiple effects</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col md:flex-row gap-4 p-2 overflow-hidden">
          <div className="w-full md:w-3/4 flex flex-col">
            <div className="flex justify-between mb-2">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleUndo}
                  disabled={imageHistory.length <= 1}
                >
                  <Undo className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleDownload}
                  disabled={!image}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100 rounded-md overflow-hidden relative flex items-center justify-center">
              {!image && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <UploadDropzone onUpload={handleImageUpload} />
                </div>
              )}
              <canvas ref={canvasRef} className="max-w-full max-h-full" />
              <canvas ref={hiddenCanvasRef} className="hidden" />
            </div>
          </div>
          
          <div className="w-full md:w-1/4 overflow-y-auto">
            <Tabs defaultValue="effects">
              <TabsList className="w-full">
                <TabsTrigger value="effects" className="flex-1">Effects</TabsTrigger>
                <TabsTrigger value="colors" className="flex-1">Colors</TabsTrigger>
              </TabsList>
              
              <TabsContent value="effects" className="space-y-4 mt-2">
                {/* Applied Effects List */}
                {image && (
                  <div className="mb-4 border-b pb-2">
                    <h3 className="text-sm font-medium mb-1">Applied Effects:</h3>
                    {appliedEffects.length === 0 ? (
                      <p className="text-sm text-gray-500">No effects applied yet</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {appliedEffects.map((effect, index) => (
                          <div 
                            key={`${effect.type}-${index}`} 
                            className="bg-gray-200 rounded-md px-2 py-1 text-xs flex items-center gap-1"
                          >
                            <span>{effect.type}</span>
                            <button 
                              onClick={() => removeEffect(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Black & White</Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentEffect('blackwhite')}
                      className={currentEffect === 'blackwhite' ? "bg-blue-100" : ""}
                      disabled={!image}
                    >
                      Select
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Sepia</Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentEffect('sepia')}
                      className={currentEffect === 'sepia' ? "bg-blue-100" : ""}
                      disabled={!image}
                    >
                      Select
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Noise</Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentEffect('noise')}
                      className={currentEffect === 'noise' ? "bg-blue-100" : ""}
                      disabled={!image}
                    >
                      Select
                    </Button>
                  </div>
                  
                  {currentEffect === 'noise' && (
                    <div className="pt-2">
                      <Label>Noise Level: {noiseLevel}</Label>
                      <Slider
                        value={[noiseLevel]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(value) => setNoiseLevel(value[0])}
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <Label>Halftone</Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentEffect('halftone')}
                      className={currentEffect === 'halftone' ? "bg-blue-100" : ""}
                      disabled={!image}
                    >
                      Select
                    </Button>
                  </div>
                  
                  {currentEffect === 'halftone' && (
                    <div className="space-y-2 pt-2">
                      <div>
                        <Label>Dot Size: {halftoneSettings.dotSize}</Label>
                        <Slider
                          value={[halftoneSettings.dotSize]}
                          min={1}
                          max={10}
                          step={0.5}
                          onValueChange={(value) => setHalftoneSettings(prev => ({ ...prev, dotSize: value[0] }))}
                        />
                      </div>
                      <div>
                        <Label>Spacing: {halftoneSettings.spacing}</Label>
                        <Slider
                          value={[halftoneSettings.spacing]}
                          min={3}
                          max={15}
                          step={1}
                          onValueChange={(value) => setHalftoneSettings(prev => ({ ...prev, spacing: value[0] }))}
                        />
                      </div>
                      <div>
                        <Label>Angle: {halftoneSettings.angle}°</Label>
                        <Slider
                          value={[halftoneSettings.angle]}
                          min={0}
                          max={180}
                          step={5}
                          onValueChange={(value) => setHalftoneSettings(prev => ({ ...prev, angle: value[0] }))}
                        />
                      </div>
                      <div>
                        <Label>Shape:</Label>
                        <select 
                          value={halftoneSettings.shape} 
                          onChange={(e) => setHalftoneSettings(prev => ({ 
                            ...prev, 
                            shape: e.target.value as 'circle' | 'square' | 'line' 
                          }))}
                          className="w-full p-2 border border-gray-300 rounded mt-1"
                        >
                          <option value="circle">Circle</option>
                          <option value="square">Square</option>
                          <option value="line">Line</option>
                        </select>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <Label>Duotone</Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentEffect('duotone')}
                      className={currentEffect === 'duotone' ? "bg-blue-100" : ""}
                      disabled={!image}
                    >
                      Select
                    </Button>
                  </div>
                  
                  {currentEffect === 'duotone' && (
                    <div className="space-y-2 pt-2">
                      <div>
                        <Label>Color 1</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="w-full h-8 mt-1" 
                              style={{ backgroundColor: duotoneSettings.color1 }}
                            />
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <ColorPicker
                              color={duotoneSettings.color1}
                              onChange={(color) => setDuotoneSettings(prev => ({ ...prev, color1: color }))}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label>Color 2</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="w-full h-8 mt-1" 
                              style={{ backgroundColor: duotoneSettings.color2 }}
                            />
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <ColorPicker
                              color={duotoneSettings.color2}
                              onChange={(color) => setDuotoneSettings(prev => ({ ...prev, color2: color }))}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label>Intensity: {duotoneSettings.intensity.toFixed(1)}</Label>
                        <Slider
                          value={[duotoneSettings.intensity * 100]}
                          min={0}
                          max={100}
                          step={10}
                          onValueChange={(value) => setDuotoneSettings(prev => ({ 
                            ...prev, 
                            intensity: value[0] / 100 
                          }))}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Preview and Apply Effect Buttons */}
                  <div className="flex gap-2 mt-4">
                    <Button 
                      className="flex-1"
                      variant="outline"
                      onClick={previewMode ? cancelPreview : previewCurrentEffect}
                      disabled={!image || currentEffect === 'none'}
                    >
                      {previewMode ? "Cancel Preview" : "Preview Effect"}
                    </Button>
                    
                    <Button 
                      className="flex-1"
                      onClick={applyEffect}
                      disabled={!image || currentEffect === 'none'}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Effect
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="colors" className="space-y-4 mt-2">
                <ColorSetSelector 
                  onSelectColor={handleColorSelect}
                  onSelectPair={handleDuotonePairSelect}
                  onPreviewColor={handlePreviewColor}
                  onPreviewPair={handlePreviewDuotonePair}
                  onCancelPreview={cancelPreview}
                  selectedColor={currentEffect === 'duotone' ? duotoneSettings.color1 : undefined}
                  previewMode={!!image}
                />
                
                {currentEffect === 'duotone' && (
                  <div className="mt-4 space-y-2 border-t pt-4">
                    <h3 className="text-sm font-medium">Duotone Settings</h3>
                    <div>
                      <Label>Intensity: {duotoneSettings.intensity.toFixed(1)}</Label>
                      <Slider
                        value={[duotoneSettings.intensity * 100]}
                        min={0}
                        max={100}
                        step={10}
                        onValueChange={(value) => setDuotoneSettings(prev => ({ 
                          ...prev, 
                          intensity: value[0] / 100 
                        }))}
                      />
                    </div>
                    <Button 
                      className="w-full mt-2"
                      onClick={applyEffect}
                      disabled={!image}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Color Effect
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}