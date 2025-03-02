import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Download, Undo, ZoomIn, ZoomOut, Maximize, Move } from 'lucide-react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from './ui/popover';

// Client-side only code
const isBrowser = typeof window !== 'undefined';

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
  position?: { left: number; top: number };
  scale?: { scaleX: number; scaleY: number };
}

export default function ImageEditorComponent() {
  const [canvas, setCanvas] = useState<any>(null);
  const [effectState, setCurrentEffect] = useState<Effect>('none');
  const [imageHistory, setImageHistory] = useState<ImageHistory[]>([]);
  const [halftoneSettings, setHalftoneSettings] = useState<HalftoneSettings>({
    dotSize: 4,
    spacing: 4,
    angle: 45
  });
  const [duotoneSettings, setDuotoneSettings] = useState<DuotoneSettings>({
    color1: '#000000',
    color2: '#ffffff',
    intensity: 50
  });
  const [noiseLevel, setNoiseLevel] = useState(25);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPanMode, setIsPanMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [imageKey, setImageKey] = useState<number>(0);
  const fabricInitialized = useRef(false);
  
  // Log effect state changes to ensure it's used
  useEffect(() => {
    console.log('Current effect:', effectState);
  }, [effectState]);
  
  // Log image key changes to ensure it's used
  useEffect(() => {
    if (imageKey > 0) {
      console.log('Image updated, key:', imageKey);
    }
  }, [imageKey]);
  
  // Load fabric.js only on client-side
  useEffect(() => {
    let isMounted = true;
    
    const loadFabric = async () => {
      if (!isBrowser) return;
      
      try {
        const fabricModule = await import('fabric');
        if (isMounted) {
          console.log("Fabric.js loaded successfully");
          initializeCanvas(fabricModule);
        }
      } catch (error) {
        console.error("Failed to load Fabric.js:", error);
      }
    };
    
    if (!fabricInitialized.current) {
      loadFabric();
    }
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize canvas once fabric is loaded and DOM is ready
  const initializeCanvas = useCallback((fabricModule: any) => {
    if (!canvasRef.current || !fabricModule || fabricInitialized.current) return;
    
    console.log("Initializing canvas...");
    try {
      // Clean up any existing canvas instance
      if (canvas) {
        canvas.dispose();
      }

      // Get container dimensions
      const container = canvasContainerRef.current;
      if (!container) {
        console.error("Canvas container not found");
        return;
      }
      
      const width = container.clientWidth;
      const height = container.clientHeight || 500; // Fallback height
      
      console.log(`Creating canvas with dimensions: ${width}x${height}`);
      
      // Create new canvas with explicit dimensions
      const fabricCanvas = new fabricModule.Canvas(canvasRef.current, {
        width: width,
        height: height,
        backgroundColor: '#f5f5f5',
        preserveObjectStacking: true,
        selection: false,
        renderOnAddRemove: true
      });
      
      // Set up event listeners
      fabricCanvas.on('mouse:wheel', function(opt: any) {
        if (!isPanMode) return;
        
        const delta = opt.e.deltaY;
        let zoom = fabricCanvas.getZoom();
        zoom *= 0.999 ** delta;
        if (zoom > 20) zoom = 20;
        if (zoom < 0.1) zoom = 0.1;
        
        fabricCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
        setZoomLevel(zoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
      });
      
      // Add pan functionality
      fabricCanvas.on('mouse:down', function(this: any, opt: any) {
        if (!isPanMode) return;
        
        const evt = opt.e;
        this.isDragging = true;
        this.lastPosX = evt.clientX;
        this.lastPosY = evt.clientY;
      });
      
      fabricCanvas.on('mouse:move', function(this: any, opt: any) {
        if (!this.isDragging || !isPanMode) return;
        
        const evt = opt.e;
        const vpt = this.viewportTransform;
        if (!vpt) return;
        
        vpt[4] += evt.clientX - (this.lastPosX || 0);
        vpt[5] += evt.clientY - (this.lastPosY || 0);
        this.requestRenderAll();
        this.lastPosX = evt.clientX;
        this.lastPosY = evt.clientY;
      });
      
      fabricCanvas.on('mouse:up', function(this: any) {
        this.isDragging = false;
      });
      
      // Store canvas instance
      setCanvas(fabricCanvas);
      fabricInitialized.current = true;
      console.log("Canvas initialized successfully");
    } catch (error) {
      console.error("Error initializing canvas:", error);
    }
  }, [canvas, isPanMode]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvas || !canvasContainerRef.current) return;
      
      const container = canvasContainerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight || 500;
      
      canvas.setWidth(width);
      canvas.setHeight(height);
      canvas.renderAll();
      
      console.log(`Canvas resized to: ${width}x${height}`);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canvas]);

  // Initialize canvas when component mounts
  useEffect(() => {
    if (canvasRef.current && !fabricInitialized.current) {
      // We'll handle initialization in the dynamic import
      // No need to call initializeCanvas here
    }
    
    // Cleanup on unmount
    return () => {
      if (canvas) {
        canvas.dispose();
      }
    };
  }, [canvas, initializeCanvas]);

  // Handle image upload
  const handleImageUpload = useCallback((file: File) => {
    if (!canvas) {
      console.error("Canvas not initialized");
      return;
    }
    
    // Create a blob URL for the image
    const blobUrl = URL.createObjectURL(file);
    
    // Load the image using the native Image API
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Get the current canvas dimensions
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();
      
      // Clear the canvas
      canvas.clear();
      
      // Now create fabric image from the loaded image
      // @ts-expect-error - Fabric types are not accurate
      const fabricImage = new canvas.constructor.Image(img, {
        originX: 'center',
        originY: 'center',
      });
      
      // Calculate scale to fit the image within the canvas with some padding
      const padding = 20;
      const maxWidth = canvasWidth - padding * 2;
      const maxHeight = canvasHeight - padding * 2;
      
      const scaleX = maxWidth / fabricImage.width;
      const scaleY = maxHeight / fabricImage.height;
      const scale = Math.min(scaleX, scaleY, 1); // Don't upscale images
      
      fabricImage.scale(scale);
      
      // Center the image on the canvas
      fabricImage.set({
        left: canvasWidth / 2,
        top: canvasHeight / 2
      });
      
      // Add the image to the canvas
      canvas.add(fabricImage);
      canvas.renderAll();
      
      // Save to history
      const newHistory: ImageHistory = {
        dataUrl: blobUrl,
        effect: 'none',
        timestamp: Date.now(),
        position: { left: fabricImage.left || 0, top: fabricImage.top || 0 },
        scale: { scaleX: fabricImage.scaleX || 1, scaleY: fabricImage.scaleY || 1 }
      };
      
      setImageHistory([newHistory]);
      
      // Update image key to trigger re-render
      setImageKey(prev => prev + 1);
    };
    
    img.onerror = () => {
      console.error('Error loading image');
      URL.revokeObjectURL(blobUrl);
    };
    
    img.src = blobUrl;
  }, [canvas]);

  // Handle undo
  const handleUndo = useCallback(() => {
    if (!canvas || imageHistory.length <= 1) {
      console.log("Cannot undo: No history or canvas not available");
      return;
    }
    
    // Get the previous state
    const previousState = imageHistory[imageHistory.length - 2];
    
    // Create a new image from the previous state
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Clear the canvas
      canvas.clear();
      
      // Create fabric image
      // @ts-expect-error - Fabric types are not accurate
      const fabricImage = new canvas.constructor.Image(img, {
        originX: 'center',
        originY: 'center'
      });
      
      // Apply position and scale from history
      if (previousState.position && previousState.scale) {
        fabricImage.set({
          left: previousState.position.left,
          top: previousState.position.top,
          scaleX: previousState.scale.scaleX,
          scaleY: previousState.scale.scaleY,
          selectable: isPanMode,
          hasControls: isPanMode,
          hasBorders: isPanMode
        });
      }
      
      // Add the image to the canvas
      canvas.add(fabricImage);
      canvas.renderAll();
      
      // Update state
      setImageHistory(imageHistory.slice(0, -1));
      setCurrentEffect(previousState.effect);
      console.log("Undo completed successfully");
    };
    
    img.onerror = (error) => {
      console.error("Error loading previous image:", error);
    };
    
    img.src = previousState.dataUrl;
  }, [canvas, imageHistory, isPanMode]);

  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    if (!canvas) return;
    
    let zoom = canvas.getZoom();
    zoom *= 1.1;
    if (zoom > 20) zoom = 20;
    
    canvas.setZoom(zoom);
    setZoomLevel(zoom);
  }, [canvas]);

  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    if (!canvas) return;
    
    let zoom = canvas.getZoom();
    zoom /= 1.1;
    if (zoom < 0.1) zoom = 0.1;
    
    canvas.setZoom(zoom);
    setZoomLevel(zoom);
  }, [canvas]);

  // Handle reset zoom
  const handleResetZoom = useCallback(() => {
    if (!canvas) return;
    
    canvas.setZoom(1);
    canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    canvas.renderAll();
    setZoomLevel(1);
  }, [canvas]);

  // Toggle pan mode
  const handleTogglePanMode = useCallback(() => {
    setIsPanMode(prev => !prev);
  }, []);

  return (
    <div className="w-full h-full flex flex-col">
      <Card className="w-full h-full flex flex-col">
        <CardHeader>
          <CardTitle>Image Editor</CardTitle>
          <CardDescription>Upload and edit your images</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">
          <div className="w-full md:w-1/3 flex flex-col gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-medium mb-2">Upload</h3>
              <UploadDropzone onUpload={handleImageUpload} />
            </div>
            
            <Tabs defaultValue="effects" className="flex-1">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="effects">Effects</TabsTrigger>
                <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
              </TabsList>
              
              <TabsContent value="effects" className="border rounded-lg p-4 h-full overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Halftone</h3>
                    <div className="space-y-2">
                      <div>
                        <Label>Dot Size</Label>
                        <Slider 
                          value={[halftoneSettings.dotSize]} 
                          min={1} 
                          max={10} 
                          step={0.1} 
                          onValueChange={(value) => setHalftoneSettings(prev => ({ ...prev, dotSize: value[0] }))} 
                        />
                      </div>
                      <div>
                        <Label>Spacing</Label>
                        <Slider 
                          value={[halftoneSettings.spacing]} 
                          min={1} 
                          max={10} 
                          step={0.1} 
                          onValueChange={(value) => setHalftoneSettings(prev => ({ ...prev, spacing: value[0] }))} 
                        />
                      </div>
                      <div>
                        <Label>Angle</Label>
                        <Slider 
                          value={[halftoneSettings.angle]} 
                          min={0} 
                          max={180} 
                          step={1} 
                          onValueChange={(value) => setHalftoneSettings(prev => ({ ...prev, angle: value[0] }))} 
                        />
                      </div>
                      <Button className="w-full" onClick={() => setCurrentEffect('halftone')}>Apply Halftone</Button>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Duotone</h3>
                    <div className="space-y-2">
                      <div>
                        <Label>Color 1</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="w-full h-8" 
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
                              className="w-full h-8" 
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
                        <Label>Intensity</Label>
                        <Slider 
                          value={[duotoneSettings.intensity]} 
                          min={0} 
                          max={100} 
                          step={1} 
                          onValueChange={(value) => setDuotoneSettings(prev => ({ ...prev, intensity: value[0] }))} 
                        />
                      </div>
                      <Button className="w-full" onClick={() => setCurrentEffect('duotone')}>Apply Duotone</Button>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Other Effects</h3>
                    <div className="space-y-2">
                      <Button className="w-full" onClick={() => setCurrentEffect('blackwhite')}>Black & White</Button>
                      <Button className="w-full" onClick={() => setCurrentEffect('sepia')}>Sepia</Button>
                      <div>
                        <Label>Noise Level</Label>
                        <Slider 
                          value={[noiseLevel]} 
                          min={0} 
                          max={100} 
                          step={1} 
                          onValueChange={(value) => setNoiseLevel(value[0])} 
                        />
                      </div>
                      <Button className="w-full" onClick={() => setCurrentEffect('noise')}>Apply Noise</Button>
                      <Button className="w-full" onClick={() => setCurrentEffect('none')}>Remove Effects</Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="adjustments" className="border rounded-lg p-4 h-full overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Canvas Controls</h3>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={handleZoomIn} size="icon">
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button onClick={handleZoomOut} size="icon">
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <Button onClick={handleResetZoom} size="icon">
                        <Maximize className="h-4 w-4" />
                      </Button>
                      <Button 
                        onClick={handleTogglePanMode} 
                        size="icon"
                        variant={isPanMode ? "default" : "outline"}
                      >
                        <Move className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-2">
                      <Label>Pan Mode</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Switch 
                          checked={isPanMode} 
                          onCheckedChange={setIsPanMode} 
                          id="pan-mode" 
                        />
                        <Label htmlFor="pan-mode">
                          {isPanMode ? 'On' : 'Off'}
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="w-full md:w-2/3 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <Button 
                onClick={handleUndo} 
                disabled={imageHistory.length <= 1}
                variant="outline"
              >
                <Undo className="h-4 w-4 mr-2" />
                Undo
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
            
            <div 
              ref={canvasContainerRef} 
              className="flex-1 border rounded-lg overflow-hidden bg-gray-100 relative"
              style={{ minHeight: '500px' }}
            >
              <canvas 
                ref={canvasRef} 
                id={`fabric-canvas-${imageKey}`}
                className="absolute inset-0"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}