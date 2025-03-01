import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, Image as FabricImage, filters } from 'fabric';
import { UploadDropzone } from './ui/upload-dropzone';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Download, RotateCw, Undo, ZoomIn, ZoomOut, Maximize, Move } from 'lucide-react';

type Effect = 'halftone' | 'duotone' | 'blackwhite' | 'sepia' | 'noise' | 'none';

interface HalftoneSettings {
  dotSize: number;
  spacing: number;
  angle: number;
}

interface DuotoneSettings {
  color1: string;
  color2: string;
  intensity: number;
}

interface ImageHistory {
  dataUrl: string;
  effect: Effect;
  timestamp: number;
}

export default function ImageEditorComponent() {
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [effect, setEffect] = useState<Effect>('none');
  const [imageHistory, setImageHistory] = useState<ImageHistory[]>([]);
  const [halftoneSettings, setHalftoneSettings] = useState<HalftoneSettings>({
    dotSize: 4,
    spacing: 10,
    angle: 45
  });
  const [duotoneSettings, setDuotoneSettings] = useState<DuotoneSettings>({
    color1: '#000000',
    color2: '#ffffff',
    intensity: 100
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPanMode, setIsPanMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  
  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || canvas) return;

    const fabricCanvas = new Canvas(canvasRef.current);
    fabricCanvas.setDimensions({
      width: window.innerWidth - 420, // Account for sidebar
      height: window.innerHeight - 40
    });
    
    fabricCanvas.backgroundColor = '#f8f9fa';
    fabricCanvas.renderAll();

    // Enable mouse wheel zoom
    fabricCanvas.on('mouse:wheel', function(opt) {
      const delta = opt.e.deltaY;
      let zoom = fabricCanvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.1) zoom = 0.1;
      
      // Get mouse position
      const pointer = fabricCanvas.getPointer(opt.e);
      
      // Set zoom point (zoom towards mouse position)
      fabricCanvas.zoomToPoint({ x: pointer.x, y: pointer.y }, zoom);
      
      // Update zoom level state
      setZoomLevel(zoom);
      
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    setCanvas(fabricCanvas);

    const handleResize = () => {
      fabricCanvas.setDimensions({
        width: window.innerWidth - 420,
        height: window.innerHeight - 40
      });
      fabricCanvas.renderAll();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      fabricCanvas.dispose();
    };
  }, []);

  // Toggle pan mode
  useEffect(() => {
    if (!canvas) return;
    
    const objects = canvas.getObjects();
    if (objects.length === 0) return;
    
    const image = objects[0] as FabricImage;
    
    if (isPanMode) {
      image.set({
        selectable: true,
        hasControls: false,
        hasBorders: true,
        lockRotation: true,
        lockScalingX: true,
        lockScalingY: true,
        hoverCursor: 'move'
      });
    } else {
      image.set({
        selectable: false,
        hasControls: false,
        hasBorders: false
      });
    }
    
    canvas.renderAll();
  }, [canvas, isPanMode]);

  // Custom halftone filter
  const applyHalftoneFilter = useCallback((image: FabricImage) => {
    setIsProcessing(true);
    
    // Get image data
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    
    if (!ctx) {
      setIsProcessing(false);
      return;
    }
    
    // Set canvas dimensions to match image
    const scaleFactor = image.scaleX || 1;
    const width = (image.width || 0) * scaleFactor;
    const height = (image.height || 0) * scaleFactor;
    
    tempCanvas.width = width;
    tempCanvas.height = height;
    
    // Draw image to canvas
    const imgElement = image.getElement() as HTMLImageElement;
    ctx.drawImage(imgElement, 0, 0, width, height);
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const outputData = new Uint8ClampedArray(data.length);
    
    // Apply halftone effect
    const { dotSize, spacing, angle } = halftoneSettings;
    const radians = (angle * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    
    // Process image data
    for (let y = 0; y < height; y += spacing) {
      for (let x = 0; x < width; x += spacing) {
        // Sample the pixel luminance in this region
        let totalLuminance = 0;
        let pixelCount = 0;
        
        for (let dy = 0; dy < spacing && y + dy < height; dy++) {
          for (let dx = 0; dx < spacing && x + dx < width; dx++) {
            const i = 4 * ((y + dy) * width + (x + dx));
            // Calculate luminance
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            
            totalLuminance += luminance;
            pixelCount++;
          }
        }
        
        // Normalized luminance in this region
        const avgLuminance = totalLuminance / (pixelCount * 255);
        const dotRadius = dotSize * avgLuminance;
        
        // Draw the dot
        for (let dy = 0; dy < spacing && y + dy < height; dy++) {
          for (let dx = 0; dx < spacing && x + dx < width; dx++) {
            // Calculate distance from center of cell
            const cx = spacing / 2;
            const cy = spacing / 2;
            
            // Apply rotation
            const rotX = (dx - cx) * cos - (dy - cy) * sin + cx;
            const rotY = (dx - cx) * sin + (dy - cy) * cos + cy;
            
            const distance = Math.sqrt(
              Math.pow(rotX - cx, 2) + Math.pow(rotY - cy, 2)
            );
            
            const i = 4 * ((y + dy) * width + (x + dx));
            
            if (distance <= dotRadius) {
              // Inside the dot - black
              outputData[i] = 0;
              outputData[i + 1] = 0;
              outputData[i + 2] = 0;
              outputData[i + 3] = 255;
            } else {
              // Outside the dot - white
              outputData[i] = 255;
              outputData[i + 1] = 255;
              outputData[i + 2] = 255;
              outputData[i + 3] = 255;
            }
          }
        }
      }
    }
    
    // Update image with halftone effect
    const outputImageData = new ImageData(outputData, width, height);
    ctx.putImageData(outputImageData, 0, 0);
    
    // Create new image from canvas
    const newImg = new Image();
    newImg.src = tempCanvas.toDataURL('image/png');
    
    newImg.onload = () => {
      // Save to history
      const historyItem: ImageHistory = {
        dataUrl: newImg.src,
        effect: 'halftone',
        timestamp: Date.now()
      };
      setImageHistory(prev => [...prev, historyItem]);
      
      // Update canvas
      const fabricImage = new FabricImage(newImg);
      fabricImage.scaleToWidth(width);
      fabricImage.set({
        left: (canvas!.width! - fabricImage.width! * fabricImage.scaleX!) / 2,
        top: (canvas!.height! - fabricImage.height! * fabricImage.scaleY!) / 2,
        selectable: false,
        hasControls: false
      });
      
      if (canvas) {
        canvas.clear();
        canvas.add(fabricImage);
        canvas.renderAll();
      }
      
      setIsProcessing(false);
    };
  }, [halftoneSettings, canvas]);

  // Custom duotone filter
  const applyDuotoneFilter = useCallback((image: FabricImage) => {
    setIsProcessing(true);
    
    const { color1, color2, intensity } = duotoneSettings;
    
    // Helper to convert hex to rgb
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    };
    
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    
    // Get image data
    const el = image.getElement() as HTMLImageElement;
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    
    if (!ctx) {
      setIsProcessing(false);
      return;
    }
    
    tempCanvas.width = el.width;
    tempCanvas.height = el.height;
    
    ctx.drawImage(el, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    
    // Apply duotone effect
    for (let i = 0; i < data.length; i += 4) {
      const luminance = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
      
      // Calculate color based on luminance
      const normIntensity = intensity / 100;
      const r = c1.r * (1 - luminance) + c2.r * luminance;
      const g = c1.g * (1 - luminance) + c2.g * luminance;
      const b = c1.b * (1 - luminance) + c2.b * luminance;
      
      // Apply with intensity
      data[i] = Math.round(data[i] * (1 - normIntensity) + r * normIntensity);
      data[i + 1] = Math.round(data[i + 1] * (1 - normIntensity) + g * normIntensity);
      data[i + 2] = Math.round(data[i + 2] * (1 - normIntensity) + b * normIntensity);
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Create new image from canvas
    const newImg = new Image();
    newImg.src = tempCanvas.toDataURL('image/png');
    
    newImg.onload = () => {
      // Save to history
      const historyItem: ImageHistory = {
        dataUrl: newImg.src,
        effect: 'duotone',
        timestamp: Date.now()
      };
      setImageHistory(prev => [...prev, historyItem]);
      
      // Update canvas
      const fabricImage = new FabricImage(newImg);
      const scaleFactor = image.scaleX || 1;
      const width = (image.width || 0) * scaleFactor;
      
      fabricImage.scaleToWidth(width);
      fabricImage.set({
        left: (canvas!.width! - fabricImage.width! * fabricImage.scaleX!) / 2,
        top: (canvas!.height! - fabricImage.height! * fabricImage.scaleY!) / 2,
        selectable: false,
        hasControls: false
      });
      
      if (canvas) {
        canvas.clear();
        canvas.add(fabricImage);
        canvas.renderAll();
      }
      
      setIsProcessing(false);
    };
  }, [duotoneSettings, canvas]);

  // Black and white filter
  const applyBlackWhiteFilter = useCallback((image: FabricImage) => {
    image.filters = [
      new filters.Grayscale(),
      new filters.Contrast({ contrast: 0.7 }),
      new filters.Brightness({ brightness: 0.1 })
    ];
    
    image.applyFilters();
    canvas?.renderAll();
    
    // Save to history
    const historyItem: ImageHistory = {
      dataUrl: canvas?.toDataURL() || '',
      effect: 'blackwhite',
      timestamp: Date.now()
    };
    setImageHistory(prev => [...prev, historyItem]);
  }, [canvas]);

  // Sepia filter
  const applySepiaFilter = useCallback((image: FabricImage) => {
    image.filters = [
      new filters.Sepia()
    ];
    
    image.applyFilters();
    canvas?.renderAll();
    
    // Save to history
    const historyItem: ImageHistory = {
      dataUrl: canvas?.toDataURL() || '',
      effect: 'sepia',
      timestamp: Date.now()
    };
    setImageHistory(prev => [...prev, historyItem]);
  }, [canvas]);

  // Noise filter
  const applyNoiseFilter = useCallback((image: FabricImage) => {
    image.filters = [
      new filters.Noise({ noise: 50 })
    ];
    
    image.applyFilters();
    canvas?.renderAll();
    
    // Save to history
    const historyItem: ImageHistory = {
      dataUrl: canvas?.toDataURL() || '',
      effect: 'noise',
      timestamp: Date.now()
    };
    setImageHistory(prev => [...prev, historyItem]);
  }, [canvas]);

  // Apply effect
  const applyEffect = useCallback((effectType: Effect) => {
    if (!canvas) return;
    
    const image = canvas.getObjects()[0] as FabricImage;
    if (!image) return;
    
    setEffect(effectType);
    
    if (effectType === 'none') {
      // Reset to original
      if (imageHistory.length > 0) {
        const original = imageHistory[0];
        const img = new Image();
        img.src = original.dataUrl;
        
        img.onload = () => {
          const fabricImage = new FabricImage(img);
          fabricImage.set({
            left: (canvas.width! - fabricImage.width!) / 2,
            top: (canvas.height! - fabricImage.height!) / 2,
            selectable: false,
            hasControls: false
          });
          
          canvas.clear();
          canvas.add(fabricImage);
          canvas.renderAll();
        };
      }
      return;
    }
    
    switch (effectType) {
      case 'halftone':
        applyHalftoneFilter(image);
        break;
      case 'duotone':
        applyDuotoneFilter(image);
        break;
      case 'blackwhite':
        applyBlackWhiteFilter(image);
        break;
      case 'sepia':
        applySepiaFilter(image);
        break;
      case 'noise':
        applyNoiseFilter(image);
        break;
    }
  }, [canvas, applyHalftoneFilter, applyDuotoneFilter, applyBlackWhiteFilter, applySepiaFilter, applyNoiseFilter, imageHistory]);
  
  // Handle image upload
  const handleImageUpload = useCallback((file: File) => {
    if (!canvas) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const imgElement = new Image();
      imgElement.crossOrigin = 'anonymous';
      
      imgElement.onload = () => {
        // Save original to history
        const historyItem: ImageHistory = {
          dataUrl: e.target?.result as string,
          effect: 'none',
          timestamp: Date.now()
        };
        setImageHistory([historyItem]);
        
        const fabricImage = new FabricImage(imgElement);
        
        // Scale to fit canvas
        const scale = Math.min(
          (canvas.width! - 40) / fabricImage.width!,
          (canvas.height! - 40) / fabricImage.height!
        );
        
        fabricImage.scale(scale);
        fabricImage.set({
          left: (canvas.width! - fabricImage.width! * scale) / 2,
          top: (canvas.height! - fabricImage.height! * scale) / 2,
          selectable: isPanMode,
          hasControls: false,
          hasBorders: isPanMode,
          lockRotation: true,
          lockScalingX: true,
          lockScalingY: true,
          hoverCursor: isPanMode ? 'move' : 'default'
        });
        
        canvas.clear();
        canvas.add(fabricImage);
        canvas.renderAll();
        
        // Reset effect and zoom
        setEffect('none');
        setZoomLevel(1);
        canvas.setZoom(1);
        canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
        canvas.renderAll();
      };
      
      imgElement.src = e.target?.result as string;
    };
    
    reader.readAsDataURL(file);
  }, [canvas, isPanMode]);

  // Undo to previous state
  const handleUndo = useCallback(() => {
    if (imageHistory.length <= 1) return;
    
    // Get previous state
    const newHistory = [...imageHistory];
    newHistory.pop();
    const prevState = newHistory[newHistory.length - 1];
    
    // Load previous image
    const img = new Image();
    img.src = prevState.dataUrl;
    
    img.onload = () => {
      const fabricImage = new FabricImage(img);
      
      if (canvas) {
        fabricImage.set({
          left: (canvas.width! - fabricImage.width!) / 2,
          top: (canvas.height! - fabricImage.height!) / 2,
          selectable: false,
          hasControls: false
        });
        
        canvas.clear();
        canvas.add(fabricImage);
        canvas.renderAll();
        
        // Update state
        setImageHistory(newHistory);
        setEffect(prevState.effect);
      }
    };
  }, [canvas, imageHistory]);

  // Export image
  const handleExport = useCallback(() => {
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `edited-image-${Date.now()}.png`;
    link.href = canvas.toDataURL({ 
      format: 'png',
      multiplier: 1
    });
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [canvas]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (!canvas) return;
    
    let newZoom = zoomLevel * 1.2;
    if (newZoom > 20) newZoom = 20;
    
    // Get canvas center
    const center = {
      x: canvas.width! / 2,
      y: canvas.height! / 2
    };
    
    canvas.zoomToPoint(center, newZoom);
    setZoomLevel(newZoom);
  }, [canvas, zoomLevel]);

  const handleZoomOut = useCallback(() => {
    if (!canvas) return;
    
    let newZoom = zoomLevel / 1.2;
    if (newZoom < 0.1) newZoom = 0.1;
    
    // Get canvas center
    const center = {
      x: canvas.width! / 2,
      y: canvas.height! / 2
    };
    
    canvas.zoomToPoint(center, newZoom);
    setZoomLevel(newZoom);
  }, [canvas, zoomLevel]);

  const handleResetZoom = useCallback(() => {
    if (!canvas) return;
    
    // Reset zoom and position
    canvas.setZoom(1);
    canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    
    // Center the image
    const objects = canvas.getObjects();
    if (objects.length > 0) {
      const image = objects[0] as FabricImage;
      image.set({
        left: (canvas.width! - image.width! * image.scaleX!) / 2,
        top: (canvas.height! - image.height! * image.scaleY!) / 2
      });
    }
    
    canvas.renderAll();
    setZoomLevel(1);
  }, [canvas]);

  return (
    <div className="h-full w-full flex bg-[#fafafa] text-[#0a0a0a] dark:bg-[#121212] dark:text-[#fafafa]">
      {/* Left Panel */}
      <div className="w-96 h-full flex flex-col border-r border-[#e1e1e1] dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a]">
        <div className="p-6 border-b border-[#e1e1e1] dark:border-[#2a2a2a]">
          <h1 className="text-2xl font-bold">Image Editor</h1>
          <p className="text-[#64748b] dark:text-[#a1a1aa] mt-1">Create halftones & duotones</p>
        </div>
        
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Image</CardTitle>
              <CardDescription>Drag & drop or select a file</CardDescription>
            </CardHeader>
            <CardContent>
              <UploadDropzone onUpload={handleImageUpload} />
            </CardContent>
          </Card>
          
          {/* Canvas Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Canvas Controls</CardTitle>
              <CardDescription>Zoom and pan your image</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Zoom: {Math.round(zoomLevel * 100)}%</span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 0.1}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 20}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleResetZoom}
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="pan-mode" 
                  checked={isPanMode}
                  onCheckedChange={setIsPanMode}
                />
                <Label htmlFor="pan-mode" className="flex items-center gap-1">
                  <Move className="h-4 w-4" />
                  Pan Mode
                </Label>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Tip: Use mouse wheel to zoom in/out. Enable pan mode to move the image.
              </p>
            </CardContent>
          </Card>
          
          {/* Effect Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Effects</CardTitle>
              <CardDescription>Apply effects to your image</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="halftone" className="w-full">
                <TabsList className="grid grid-cols-2 mb-6">
                  <TabsTrigger value="halftone">Halftone</TabsTrigger>
                  <TabsTrigger value="duotone">Duotone</TabsTrigger>
                </TabsList>
                
                <TabsContent value="halftone" className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="dotSize">Dot Size</Label>
                      <span className="text-sm text-[#64748b] dark:text-[#a1a1aa]">
                        {halftoneSettings.dotSize}px
                      </span>
                    </div>
                    <Slider
                      id="dotSize"
                      min={1}
                      max={10}
                      step={1}
                      value={[halftoneSettings.dotSize]}
                      onValueChange={(value) => setHalftoneSettings({...halftoneSettings, dotSize: value[0]})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="spacing">Spacing</Label>
                      <span className="text-sm text-[#64748b] dark:text-[#a1a1aa]">
                        {halftoneSettings.spacing}px
                      </span>
                    </div>
                    <Slider
                      id="spacing"
                      min={5}
                      max={20}
                      step={1}
                      value={[halftoneSettings.spacing]}
                      onValueChange={(value) => setHalftoneSettings({...halftoneSettings, spacing: value[0]})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="angle">Angle</Label>
                      <span className="text-sm text-[#64748b] dark:text-[#a1a1aa]">
                        {halftoneSettings.angle}°
                      </span>
                    </div>
                    <Slider
                      id="angle"
                      min={0}
                      max={360}
                      step={15}
                      value={[halftoneSettings.angle]}
                      onValueChange={(value) => setHalftoneSettings({...halftoneSettings, angle: value[0]})}
                    />
                  </div>
                  
                  <Button
                    onClick={() => applyEffect('halftone')}
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Processing...' : 'Apply Halftone'}
                  </Button>
                </TabsContent>
                
                <TabsContent value="duotone" className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="color1">Color 1</Label>
                      <ColorPicker
                        color={duotoneSettings.color1}
                        onChange={(color) => setDuotoneSettings({...duotoneSettings, color1: color})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="color2">Color 2</Label>
                      <ColorPicker
                        color={duotoneSettings.color2}
                        onChange={(color) => setDuotoneSettings({...duotoneSettings, color2: color})}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="intensity">Intensity</Label>
                      <span className="text-sm text-[#64748b] dark:text-[#a1a1aa]">
                        {duotoneSettings.intensity}%
                      </span>
                    </div>
                    <Slider
                      id="intensity"
                      min={0}
                      max={100}
                      step={1}
                      value={[duotoneSettings.intensity]}
                      onValueChange={(value) => setDuotoneSettings({...duotoneSettings, intensity: value[0]})}
                    />
                  </div>
                  
                  <Button
                    onClick={() => applyEffect('duotone')}
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Processing...' : 'Apply Duotone'}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          {/* Quick Effects */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Effects</CardTitle>
              <CardDescription>One-click transformations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => applyEffect('blackwhite')}
                  className="h-auto py-2"
                >
                  Black & White
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => applyEffect('sepia')}
                  className="h-auto py-2"
                >
                  Sepia
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => applyEffect('noise')}
                  className="h-auto py-2"
                >
                  Noise
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => applyEffect('none')}
                  className="h-auto py-2"
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="p-6 border-t border-[#e1e1e1] dark:border-[#2a2a2a]">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleUndo}
              disabled={imageHistory.length <= 1}
              className="flex-1"
            >
              <Undo className="w-4 h-4 mr-2" />
              Undo
            </Button>
            <Button 
              onClick={handleExport} 
              className="flex-1"
              disabled={!canvas || canvas.getObjects().length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main Canvas Area */}
      <div className="flex-1 p-6 flex items-center justify-center bg-[#f5f5f5] dark:bg-[#161616]">
        <div 
          ref={canvasContainerRef}
          className="w-full h-full rounded-xl border-2 border-dashed border-[#e1e1e1] dark:border-[#2a2a2a] overflow-hidden bg-white dark:bg-black shadow-sm"
        >
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}