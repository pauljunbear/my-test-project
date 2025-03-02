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
import * as fabric from 'fabric';

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
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [currentEffect, setCurrentEffect] = useState<Effect>('none');
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
  const [imageKey, setImageKey] = useState<number>(0);
  
  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || canvas) return;

    console.log('Initializing canvas with Fabric.js...');
    
    try {
      // Create a new Fabric.js canvas instance with explicit initialization
      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        backgroundColor: '#f8f9fa',
        preserveObjectStacking: true,
        selection: false,
        renderOnAddRemove: true
      });
      
      if (!fabricCanvas) {
        console.error("Failed to create Fabric.js canvas");
        return;
      }
      
      // Set dimensions
      const initialWidth = window.innerWidth - 420;
      const initialHeight = window.innerHeight - 40;
      
      fabricCanvas.setDimensions({
        width: initialWidth,
        height: initialHeight
      });
      
      console.log(`Canvas dimensions set to ${initialWidth}x${initialHeight}`);
      
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
        fabricCanvas.zoomToPoint(new fabric.Point(pointer.x, pointer.y), zoom);
        
        // Update zoom level state
        setZoomLevel(zoom);
        
        opt.e.preventDefault();
        opt.e.stopPropagation();
      });

      // Force an initial render
      fabricCanvas.renderAll();
      
      console.log('Canvas initialized successfully:', fabricCanvas);
      setCanvas(fabricCanvas);

      const handleResize = () => {
        const newWidth = window.innerWidth - 420;
        const newHeight = window.innerHeight - 40;
        
        fabricCanvas.setDimensions({
          width: newWidth,
          height: newHeight
        });
        fabricCanvas.renderAll();
        console.log(`Canvas resized to ${newWidth}x${newHeight}`);
      };

      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        console.log('Disposing canvas...');
        fabricCanvas.dispose();
      };
    } catch (error) {
      console.error("Error initializing canvas:", error);
    }
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

  // Handle image upload
  const handleImageUpload = useCallback((file: File) => {
    if (!canvas) {
      console.error("Canvas is not initialized");
      return;
    }
    
    try {
      console.log("Starting image upload process for file:", file.name, "size:", file.size);
      
      // Create a local blob URL instead of using FileReader
      const blobUrl = URL.createObjectURL(file);
      console.log("Created blob URL:", blobUrl);
      
      // Use fabric.Image.fromURL directly
      fabric.Image.fromURL(
        blobUrl, 
        function(fabricImage: fabric.Image) {
          if (!canvas) {
            console.error("Canvas no longer available");
            URL.revokeObjectURL(blobUrl);
            return;
          }
          
          if (!fabricImage) {
            console.error("Failed to create fabric image");
            URL.revokeObjectURL(blobUrl);
            return;
          }
          
          console.log("Fabric image created successfully");
          
          // Get canvas dimensions
          const canvasWidth = canvas.getWidth();
          const canvasHeight = canvas.getHeight();
          
          console.log(`Canvas dimensions: ${canvasWidth}x${canvasHeight}`);
          console.log(`Image dimensions: ${fabricImage.width}x${fabricImage.height}`);
          
          // Calculate scale to fit the image within the canvas (with some padding)
          const scaleX = (canvasWidth - 100) / fabricImage.width!;
          const scaleY = (canvasHeight - 100) / fabricImage.height!;
          const scale = Math.min(scaleX, scaleY, 1); // Don't scale up images that are smaller than canvas
          
          console.log(`Calculated scale: ${scale}`);
          
          // Center the image on the canvas
          fabricImage.set({
            originX: 'center',
            originY: 'center',
            left: canvasWidth / 2,
            top: canvasHeight / 2,
            scaleX: scale,
            scaleY: scale,
            selectable: isPanMode,
            hasControls: false,
            hasBorders: isPanMode,
            lockRotation: true,
            lockScalingX: true,
            lockScalingY: true,
            hoverCursor: isPanMode ? 'move' : 'default'
          });
          
          // Create history item
          const historyItem: ImageHistory = {
            dataUrl: blobUrl,
            effect: 'none',
            timestamp: Date.now(),
            position: { left: fabricImage.left || 0, top: fabricImage.top || 0 },
            scale: { scaleX: scale, scaleY: scale }
          };
          
          // Remove all existing objects from canvas
          canvas.clear();
          
          // Add the image to the canvas
          canvas.add(fabricImage);
          console.log("Image added to canvas");
          
          // Force an immediate render of the canvas
          canvas.renderAll();
          console.log("Canvas rendered");
          
          // Update history state
          setImageHistory([historyItem]);
          
          // Update other state variables
          setCurrentEffect('none');
          setZoomLevel(1);
          canvas.setZoom(1);
          canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
          
          // Trigger a component re-render by updating the key
          setImageKey(prevKey => prevKey + 1);
          
          console.log("Image upload process completed successfully");
        },
        { crossOrigin: 'anonymous' }
      );
      
    } catch (err) {
      console.error("Error in upload process:", err);
    }
  }, [canvas, isPanMode]);

  // Custom halftone filter
  const applyHalftoneFilter = useCallback((image: FabricImage) => {
    setIsProcessing(true);
    
    try {
      console.log("Starting halftone filter application");
      
      // Get current image info before applying filter
      const imgElement = image.getElement() as HTMLImageElement;
      if (!imgElement) {
        console.error("No image element found");
        setIsProcessing(false);
        return;
      }
      
      console.log("Original image dimensions:", imgElement.naturalWidth, imgElement.naturalHeight);
      const originalWidth = image.getScaledWidth();
      const originalHeight = image.getScaledHeight();
      const currentLeft = image.left || 0;
      const currentTop = image.top || 0;
      
      console.log("Current image position:", currentLeft, currentTop);
      console.log("Current image scale:", image.scaleX, image.scaleY);

      // Create a clone of the original image to work with
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      
      if (!ctx) {
        console.error("Failed to get 2D context");
        setIsProcessing(false);
        return;
      }
      
      // Set canvas dimensions to match image's NATURAL dimensions
      tempCanvas.width = imgElement.naturalWidth;
      tempCanvas.height = imgElement.naturalHeight;
      
      // Draw image to canvas
      ctx.drawImage(imgElement, 0, 0, imgElement.naturalWidth, imgElement.naturalHeight);
      
      const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const data = imageData.data;
      const outputData = new Uint8ClampedArray(data.length);
      
      // Apply halftone effect
      const { dotSize, spacing, angle } = halftoneSettings;
      const radians = (angle * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      
      // Process image data
      for (let y = 0; y < tempCanvas.height; y += spacing) {
        for (let x = 0; x < tempCanvas.width; x += spacing) {
          // Sample the pixel luminance in this region
          let totalLuminance = 0;
          let pixelCount = 0;
          
          for (let dy = 0; dy < spacing && y + dy < tempCanvas.height; dy++) {
            for (let dx = 0; dx < spacing && x + dx < tempCanvas.width; dx++) {
              const i = 4 * ((y + dy) * tempCanvas.width + (x + dx));
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
          for (let dy = 0; dy < spacing && y + dy < tempCanvas.height; dy++) {
            for (let dx = 0; dx < spacing && x + dx < tempCanvas.width; dx++) {
              // Calculate distance from center of cell
              const cx = spacing / 2;
              const cy = spacing / 2;
              
              // Apply rotation
              const rotX = (dx - cx) * cos - (dy - cy) * sin + cx;
              const rotY = (dx - cx) * sin + (dy - cy) * cos + cy;
              
              const distance = Math.sqrt(
                Math.pow(rotX - cx, 2) + Math.pow(rotY - cy, 2)
              );
              
              const i = 4 * ((y + dy) * tempCanvas.width + (x + dx));
              
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
      const outputImageData = new ImageData(outputData, tempCanvas.width, tempCanvas.height);
      ctx.putImageData(outputImageData, 0, 0);
      
      // Create new image from canvas
      const newImg = new Image();
      
      // IMPORTANT: Define onload handler BEFORE setting src
      newImg.onload = () => {
        if (!canvas) {
          console.error("Canvas not available");
          setIsProcessing(false);
          return;
        }
        
        try {
          console.log("New image loaded successfully");
          
          // Clean up canvas first
          canvas.clear();
          
          // Create a new Fabric.js image
          const fabricImage = new FabricImage(newImg);
          
          console.log("New fabric image created:", fabricImage.width, fabricImage.height);
          
          // Set the scale to match original dimensions
          const scaleX = originalWidth / fabricImage.width!;
          const scaleY = originalHeight / fabricImage.height!;
          fabricImage.scale(Math.min(scaleX, scaleY));
          
          // Position at the same spot as the original
          fabricImage.set({
            left: currentLeft,
            top: currentTop,
            selectable: isPanMode,
            hasControls: false,
            hasBorders: isPanMode
          });
          
          console.log("New image positioned at:", fabricImage.left, fabricImage.top);
          console.log("New image scaled to:", fabricImage.scaleX, fabricImage.scaleY);
          
          // Save to history before updating canvas
          const historyItem: ImageHistory = {
            dataUrl: newImg.src,
            effect: 'halftone',
            timestamp: Date.now(),
            position: { left: currentLeft, top: currentTop },
            scale: { scaleX: fabricImage.scaleX || 1, scaleY: fabricImage.scaleY || 1 }
          };
          
          setImageHistory(prev => [...prev, historyItem]);
          
          // Add to canvas
          canvas.add(fabricImage);
          canvas.renderAll();
          
          // Increment key to trigger animation
          setImageKey(prevKey => prevKey + 1);
          
          console.log("Halftone effect applied successfully");
          
          setIsProcessing(false);
        } catch (err) {
          console.error("Error applying halftone effect (onload):", err);
          setIsProcessing(false);
        }
      };
      
      // Set error handler
      newImg.onerror = (err) => {
        console.error("Error loading new image:", err);
        setIsProcessing(false);
      };
      
      // Set the source AFTER defining the onload handler
      newImg.src = tempCanvas.toDataURL('image/png');
      
    } catch (error) {
      console.error('Error applying halftone filter:', error);
      setIsProcessing(false);
    }
  }, [halftoneSettings, canvas, isPanMode]);

  // Custom duotone filter
  const applyDuotoneFilter = useCallback((image: FabricImage) => {
    setIsProcessing(true);
    
    try {
      // Get current image info before applying filter
      const imgElement = image.getElement() as HTMLImageElement;
      const originalWidth = image.getScaledWidth();
      const originalHeight = image.getScaledHeight();
      const currentLeft = image.left || 0;
      const currentTop = image.top || 0;
      
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
      
      // Create a clone of the original image to work with
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      
      if (!ctx) {
        setIsProcessing(false);
        console.error("Failed to get 2D context");
        return;
      }
      
      tempCanvas.width = imgElement.naturalWidth;
      tempCanvas.height = imgElement.naturalHeight;
      
      ctx.drawImage(imgElement, 0, 0, imgElement.naturalWidth, imgElement.naturalHeight);
      
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
      newImg.onload = () => {
        if (!canvas) {
          setIsProcessing(false);
          return;
        }
        
        // Create a new Fabric.js image
        const fabricImage = new FabricImage(newImg);
        
        // Set the scale to match original dimensions
        const scaleX = originalWidth / fabricImage.width!;
        const scaleY = originalHeight / fabricImage.height!;
        fabricImage.scale(Math.min(scaleX, scaleY));
        
        // Position at the same spot as the original
        fabricImage.set({
          left: currentLeft,
          top: currentTop,
          selectable: isPanMode,
          hasControls: false,
          hasBorders: isPanMode
        });
        
        // Save to history before updating canvas
        const historyItem: ImageHistory = {
          dataUrl: newImg.src,
          effect: 'duotone',
          timestamp: Date.now(),
          position: { left: currentLeft, top: currentTop },
          scale: { scaleX: fabricImage.scaleX || 1, scaleY: fabricImage.scaleY || 1 }
        };
        
        setImageHistory(prev => [...prev, historyItem]);
        
        // Update canvas
        canvas.clear();
        canvas.add(fabricImage);
        canvas.renderAll();
        
        // Increment key to trigger animation
        setImageKey(prevKey => prevKey + 1);
        
        // Debug canvas state
        console.log("Canvas objects before:", canvas.getObjects().length);
        console.log("Canvas objects after:", canvas.getObjects().length);
        console.log("Image dimensions:", fabricImage.width, fabricImage.height);
        console.log("Image position:", fabricImage.left, fabricImage.top);
        
        setIsProcessing(false);
      };
      
      // Set the source after defining the onload handler
      newImg.src = tempCanvas.toDataURL('image/png');
      
    } catch (error) {
      console.error('Error applying duotone filter:', error);
      setIsProcessing(false);
    }
  }, [duotoneSettings, canvas, isPanMode]);

  // Black and white filter
  const applyBlackWhiteFilter = useCallback((image: FabricImage) => {
    try {
      // Get current image info before applying filter
      const imgElement = image.getElement() as HTMLImageElement;
      const originalWidth = image.getScaledWidth();
      const originalHeight = image.getScaledHeight();
      const currentLeft = image.left || 0;
      const currentTop = image.top || 0;
      
      // Clone the current image for animation purposes
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      
      if (!ctx) {
        console.error('Failed to get 2D context');
        return;
      }
      
      tempCanvas.width = imgElement.naturalWidth;
      tempCanvas.height = imgElement.naturalHeight;
      ctx.drawImage(imgElement, 0, 0, imgElement.naturalWidth, imgElement.naturalHeight);
      
      // Create a new fabric image with the same dimensions
      const newImg = new Image();
      newImg.crossOrigin = 'anonymous';
      
      newImg.onload = () => {
        if (!canvas) return;
        
        // Create a new Fabric.js image
        const fabricImage = new FabricImage(newImg);
        
        // Apply filters to the new image
        fabricImage.filters = [
          new filters.Grayscale(),
          new filters.Contrast({ contrast: 0.7 }),
          new filters.Brightness({ brightness: 0.1 })
        ];
        
        // Apply filters and ensure it completes
        fabricImage.applyFilters();
        
        // Set the scale to match original dimensions
        const scaleX = originalWidth / fabricImage.width!;
        const scaleY = originalHeight / fabricImage.height!;
        fabricImage.scale(Math.min(scaleX, scaleY));
        
        // Position at the same spot as the original
        fabricImage.set({
          left: currentLeft,
          top: currentTop,
          selectable: isPanMode,
          hasControls: false,
          hasBorders: isPanMode
        });
        
        // Save to history before updating canvas
        const historyItem: ImageHistory = {
          dataUrl: fabricImage.toDataURL({ format: 'png', multiplier: 1 }),
          effect: 'blackwhite',
          timestamp: Date.now(),
          position: { left: currentLeft, top: currentTop },
          scale: { scaleX: fabricImage.scaleX || 1, scaleY: fabricImage.scaleY || 1 }
        };
        
        setImageHistory(prev => [...prev, historyItem]);
        
        // Increment key to trigger animation
        setImageKey(prevKey => prevKey + 1);
        
        // Update canvas with proper cleanup
        canvas.clear();
        canvas.add(fabricImage);
        canvas.renderAll();
        
        // Debug canvas state
        console.log("Canvas objects before:", canvas.getObjects().length);
        console.log("Canvas objects after:", canvas.getObjects().length);
        console.log("Image dimensions:", fabricImage.width, fabricImage.height);
        console.log("Image position:", fabricImage.left, fabricImage.top);
      };
      
      newImg.src = tempCanvas.toDataURL('image/png');
      
    } catch (error) {
      console.error('Error applying black and white filter:', error);
    }
  }, [canvas, isPanMode]);

  // Sepia filter
  const applySepiaFilter = useCallback((image: FabricImage) => {
    try {
      // Get current image info before applying filter
      const imgElement = image.getElement() as HTMLImageElement;
      const originalWidth = image.getScaledWidth();
      const originalHeight = image.getScaledHeight();
      const currentLeft = image.left || 0;
      const currentTop = image.top || 0;
      
      // Clone the current image for animation purposes
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      
      if (!ctx) {
        console.error('Failed to get 2D context');
        return;
      }
      
      tempCanvas.width = imgElement.naturalWidth;
      tempCanvas.height = imgElement.naturalHeight;
      ctx.drawImage(imgElement, 0, 0, imgElement.naturalWidth, imgElement.naturalHeight);
      
      // Create a new fabric image with the same dimensions
      const newImg = new Image();
      newImg.crossOrigin = 'anonymous';
      
      newImg.onload = () => {
        if (!canvas) return;
        
        // Create a new Fabric.js image
        const fabricImage = new FabricImage(newImg);
        
        // Apply filters to the new image
        fabricImage.filters = [
          new filters.Sepia()
        ];
        
        // Apply filters and ensure it completes
        fabricImage.applyFilters();
        
        // Set the scale to match original dimensions
        const scaleX = originalWidth / fabricImage.width!;
        const scaleY = originalHeight / fabricImage.height!;
        fabricImage.scale(Math.min(scaleX, scaleY));
        
        // Position at the same spot as the original
        fabricImage.set({
          left: currentLeft,
          top: currentTop,
          selectable: isPanMode,
          hasControls: false,
          hasBorders: isPanMode
        });
        
        // Save to history before updating canvas
        const historyItem: ImageHistory = {
          dataUrl: fabricImage.toDataURL({ format: 'png', multiplier: 1 }),
          effect: 'sepia',
          timestamp: Date.now(),
          position: { left: currentLeft, top: currentTop },
          scale: { scaleX: fabricImage.scaleX || 1, scaleY: fabricImage.scaleY || 1 }
        };
        
        setImageHistory(prev => [...prev, historyItem]);
        
        // Increment key to trigger animation
        setImageKey(prevKey => prevKey + 1);
        
        // Update canvas with proper cleanup
        canvas.clear();
        canvas.add(fabricImage);
        canvas.renderAll();
        
        // Debug canvas state
        console.log("Canvas objects before:", canvas.getObjects().length);
        console.log("Canvas objects after:", canvas.getObjects().length);
        console.log("Image dimensions:", fabricImage.width, fabricImage.height);
        console.log("Image position:", fabricImage.left, fabricImage.top);
      };
      
      newImg.src = tempCanvas.toDataURL('image/png');
      
    } catch (error) {
      console.error('Error applying sepia filter:', error);
    }
  }, [canvas, isPanMode]);

  // Noise filter
  const applyNoiseFilter = useCallback((image: FabricImage) => {
    try {
      // Get current image info before applying filter
      const imgElement = image.getElement() as HTMLImageElement;
      const originalWidth = image.getScaledWidth();
      const originalHeight = image.getScaledHeight();
      const currentLeft = image.left || 0;
      const currentTop = image.top || 0;
      
      // Clone the current image for animation purposes
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      
      if (!ctx) {
        console.error('Failed to get 2D context');
        return;
      }
      
      tempCanvas.width = imgElement.naturalWidth;
      tempCanvas.height = imgElement.naturalHeight;
      ctx.drawImage(imgElement, 0, 0, imgElement.naturalWidth, imgElement.naturalHeight);
      
      // Create a new fabric image with the same dimensions
      const newImg = new Image();
      newImg.crossOrigin = 'anonymous';
      
      newImg.onload = () => {
        if (!canvas) return;
        
        // Create a new Fabric.js image
        const fabricImage = new FabricImage(newImg);
        
        // Apply filters to the new image
        fabricImage.filters = [
          new filters.Noise({ noise: 50 })
        ];
        
        // Apply filters and ensure it completes
        fabricImage.applyFilters();
        
        // Set the scale to match original dimensions
        const scaleX = originalWidth / fabricImage.width!;
        const scaleY = originalHeight / fabricImage.height!;
        fabricImage.scale(Math.min(scaleX, scaleY));
        
        // Position at the same spot as the original
        fabricImage.set({
          left: currentLeft,
          top: currentTop,
          selectable: isPanMode,
          hasControls: false,
          hasBorders: isPanMode
        });
        
        // Save to history before updating canvas
        const historyItem: ImageHistory = {
          dataUrl: fabricImage.toDataURL({ format: 'png', multiplier: 1 }),
          effect: 'noise',
          timestamp: Date.now(),
          position: { left: currentLeft, top: currentTop },
          scale: { scaleX: fabricImage.scaleX || 1, scaleY: fabricImage.scaleY || 1 }
        };
        
        setImageHistory(prev => [...prev, historyItem]);
        
        // Increment key to trigger animation
        setImageKey(prevKey => prevKey + 1);
        
        // Update canvas with proper cleanup
        canvas.clear();
        canvas.add(fabricImage);
        canvas.renderAll();
        
        // Debug canvas state
        console.log("Canvas objects before:", canvas.getObjects().length);
        console.log("Canvas objects after:", canvas.getObjects().length);
        console.log("Image dimensions:", fabricImage.width, fabricImage.height);
        console.log("Image position:", fabricImage.left, fabricImage.top);
      };
      
      newImg.src = tempCanvas.toDataURL('image/png');
      
    } catch (error) {
      console.error('Error applying noise filter:', error);
    }
  }, [canvas, isPanMode]);

  // Apply effect
  const applyEffect = useCallback((effectType: Effect) => {
    if (!canvas) {
      console.error("Canvas is not initialized");
      return;
    }
    
    const objects = canvas.getObjects();
    const image = objects[0] as FabricImage;
    if (!image) {
      console.error("No image found on canvas");
      return;
    }
    
    setCurrentEffect(effectType);
    
    if (effectType === 'none') {
      // Reset to original
      if (imageHistory.length > 0) {
        const original = imageHistory[0];
        const img = new Image();
        img.src = original.dataUrl;
        
        img.onload = () => {
          if (!canvas) return;
          
          try {
            const fabricImage = new FabricImage(img);
            
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
              hasBorders: isPanMode
            });
            
            canvas.clear();
            canvas.add(fabricImage);
            canvas.renderAll();
            
            // Increment key to trigger animation
            setImageKey(prevKey => prevKey + 1);
          } catch (error) {
            console.error("Error resetting image:", error);
          }
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
  }, [canvas, applyHalftoneFilter, applyDuotoneFilter, applyBlackWhiteFilter, applySepiaFilter, applyNoiseFilter, imageHistory, isPanMode]);
  
  // Undo to previous state
  const handleUndo = useCallback(() => {
    if (imageHistory.length <= 1) {
      console.log("Nothing to undo");
      return;
    }
    
    try {
      console.log("Starting undo operation");
      // Get previous state
      const newHistory = [...imageHistory];
      newHistory.pop(); // Remove current state
      const prevState = newHistory[newHistory.length - 1];
      
      if (!prevState || !prevState.dataUrl) {
        console.error("Invalid previous state");
        return;
      }
      
      console.log("Undoing to previous state:", prevState.effect);
      
      // Load previous image using fabric.Image.fromURL
      fabric.Image.fromURL(
        prevState.dataUrl, 
        function(fabricImage: fabric.Image) {
          if (!canvas) {
            console.error("Canvas not available");
            return;
          }
          
          try {
            // Clean up canvas first
            canvas.clear();
            
            // Apply the position and scale from history if available
            const position = prevState.position || { 
              left: canvas.width! / 2,
              top: canvas.height! / 2 
            };
            
            const scale = prevState.scale || { scaleX: 1, scaleY: 1 };
            
            fabricImage.set({
              originX: 'center',
              originY: 'center',
              left: position.left,
              top: position.top,
              scaleX: scale.scaleX,
              scaleY: scale.scaleY,
              selectable: isPanMode,
              hasControls: false,
              hasBorders: isPanMode
            });
            
            // Add to canvas and render
            canvas.add(fabricImage);
            canvas.renderAll();
            
            // Update state
            setImageHistory(newHistory);
            setCurrentEffect(prevState.effect);
            
            // Increment key to trigger animation
            setImageKey(prevKey => prevKey + 1);
            
            console.log("Undo completed successfully");
          } catch (err) {
            console.error("Error during undo operation:", err);
          }
        },
        { crossOrigin: 'anonymous' }
      );
      
    } catch (err) {
      console.error("Error in handleUndo:", err);
    }
  }, [canvas, imageHistory, isPanMode]);

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
    
    canvas.zoomToPoint(new fabric.Point(center.x, center.y), newZoom);
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
    
    canvas.zoomToPoint(new fabric.Point(center.x, center.y), newZoom);
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
          key={imageKey}
          className="w-full h-full rounded-xl border-2 border-dashed border-[#e1e1e1] dark:border-[#2a2a2a] overflow-hidden bg-white dark:bg-black shadow-sm transition-all duration-500"
        >
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}