'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from './ui/dialog';

// Modify the GIF.js loading function to be more resilient
const loadGifJs = async () => {
  try {
    // Use a dynamic import approach that completely avoids Next.js analysis during build
    const importDynamic = new Function('modulePath', 'return import(modulePath)');
    
    try {
      const module = await importDynamic('gif.js.optimized');
      const GIF = module.default || module;
      return GIF;
    } catch (error) {
      console.error('Primary import strategy failed:', error);
      
      // Try alternative approach
      try {
        // Use eval as last resort (safe in this controlled context)
        // This helps avoid webpack analyzing the import during build
        const modulePathEval = 'gif.js.optimized';
        // @ts-ignore - We're intentionally using eval as a workaround
        const evalImport = eval(`import('${modulePathEval}')`);
        const module = await evalImport;
        const GIF = module.default || module;
        return GIF;
      } catch (fallbackError) {
        console.error('Fallback import also failed:', fallbackError);
        throw new Error('Could not import GIF.js library after multiple attempts');
      }
    }
  } catch (error) {
    console.error('All GIF import strategies failed:', error);
    throw error;
  }
};

interface EnhancedGifExportProps {
  frames: string[] | null;
  canvas: HTMLCanvasElement | null;
  captureFunction?: () => Promise<string[]>;
  onExportComplete?: (url: string) => void;
  onError?: (error: string) => void;
}

export default function EnhancedGifExport({
  frames,
  canvas,
  captureFunction,
  onExportComplete,
  onError
}: EnhancedGifExportProps) {
  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [lastExportedUrl, setLastExportedUrl] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isGifLibraryAvailable, setIsGifLibraryAvailable] = useState<boolean | null>(null);
  
  // Export options
  const [frameCount, setFrameCount] = useState(24);
  const [frameDelay, setFrameDelay] = useState(100); // In milliseconds
  const [gifQuality, setGifQuality] = useState(10);
  const [loopCount, setLoopCount] = useState(0); // 0 = infinite
  const [outputWidth, setOutputWidth] = useState(0); // 0 = original size
  const [dithering, setDithering] = useState(false);
  
  // Check if GIF.js is available
  useEffect(() => {
    const checkGifLibrary = async () => {
      try {
        await loadGifJs();
        setIsGifLibraryAvailable(true);
      } catch (error) {
        setIsGifLibraryAvailable(false);
        console.warn('GIF.js library not available:', error);
      }
    };
    
    checkGifLibrary();
  }, []);
  
  // Export as GIF
  const exportAsGif = async () => {
    if (!canvas && !frames && !captureFunction) {
      if (onError) onError('No source for GIF export');
      return;
    }
    
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      // Load GIF.js library
      const GIF = await loadGifJs();
      
      // Get frames to export
      let framesToExport: string[] = [];
      
      if (frames && frames.length > 0) {
        // Use provided frames
        framesToExport = frames;
      } else if (captureFunction) {
        // Capture frames using provided function
        const capturedFrames = await captureFunction();
        if (capturedFrames && capturedFrames.length > 0) {
          framesToExport = capturedFrames;
        } else {
          throw new Error('Failed to capture frames');
        }
      } else if (canvas) {
        // Capture current canvas state as a single frame
        framesToExport = [canvas.toDataURL('image/png')];
      } else {
        throw new Error('No content to export');
      }
      
      // Prepare for GIF creation
      const options: any = {
        workers: 2,
        quality: gifQuality,
        dither: dithering,
        workerScript: '/gif.worker.js',
      };
      
      // Add optional settings
      if (outputWidth > 0) {
        options.width = outputWidth;
        // Calculate height to maintain aspect ratio
        if (canvas) {
          options.height = Math.round((canvas.height / canvas.width) * outputWidth);
        }
      }
      
      const gif = new GIF(options);
      
      // Setup progress callback
      gif.on('progress', (p: number) => {
        setExportProgress(Math.floor(p * 100));
      });
      
      // Setup finished callback
      gif.on('finished', (blob: Blob) => {
        // Create URL for download
        const url = URL.createObjectURL(blob);
        
        // Store the URL
        setLastExportedUrl(url);
        
        // Trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = 'animated-shader-effect.gif';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Callback if provided
        if (onExportComplete) {
          onExportComplete(url);
        }
        
        setIsExporting(false);
        setExportProgress(0);
        setShowExportDialog(false);
      });
      
      // Add frames to GIF
      console.log(`Creating GIF with ${framesToExport.length} frames...`);
      setExportProgress(5); // Show some initial progress
      
      for (let i = 0; i < framesToExport.length; i++) {
        // Convert data URL to image
        const img = new Image();
        img.src = framesToExport[i];
        
        // Wait for image to load
        await new Promise<void>((resolve) => {
          img.onload = () => {
            // Add frame to GIF
            gif.addFrame(img, { delay: frameDelay, copy: true });
            setExportProgress(5 + Math.floor((i / framesToExport.length) * 45)); // First 50% is frame loading
            resolve();
          };
          img.onerror = () => {
            console.error(`Failed to load frame ${i}`);
            resolve(); // Continue with other frames
          };
        });
      }
      
      // Set loop count
      if (loopCount > 0) {
        gif.setRepeat(loopCount - 1); // GIF.js uses 0 for infinite, but subtracts 1 from the value for finite loops
      } else {
        gif.setRepeat(0);
      }
      
      // Render GIF
      gif.render();
      
    } catch (error) {
      console.error('Error exporting GIF:', error);
      if (onError) onError('Failed to export GIF: ' + (error as Error).message);
      setIsExporting(false);
      setExportProgress(0);
    }
  };
  
  // Export fallback (PNG for single frame)
  const exportFallback = () => {
    if (!canvas) {
      if (onError) onError('Canvas not available for export');
      return;
    }
    
    try {
      const dataURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = 'shader-effect.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Callback if provided
      if (onExportComplete) {
        onExportComplete(dataURL);
      }
    } catch (error) {
      console.error('Error exporting PNG:', error);
      if (onError) onError('Failed to export image');
    }
  };
  
  return (
    <>
      {isGifLibraryAvailable !== false && (
        <Button 
          variant="outline"
          onClick={() => setShowExportDialog(true)}
          disabled={isExporting}
        >
          Export Animation
        </Button>
      )}
      
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Export Animation</DialogTitle>
            <DialogDescription>
              Configure export settings for your animation.
            </DialogDescription>
          </DialogHeader>
          
          {isGifLibraryAvailable !== true ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
              <p className="text-yellow-800 text-sm">
                GIF export library not available. You can still export a single frame as PNG.
              </p>
            </div>
          ) : null}
          
          <Tabs defaultValue="basic">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Frames</label>
                  <span className="text-xs text-gray-500">{frameCount}</span>
                </div>
                <Slider
                  value={[frameCount]}
                  min={5}
                  max={60}
                  step={1}
                  onValueChange={(values) => setFrameCount(values[0])}
                  disabled={isExporting}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Animation Speed</label>
                  <span className="text-xs text-gray-500">{frameDelay}ms</span>
                </div>
                <Slider
                  value={[frameDelay]}
                  min={20}
                  max={500}
                  step={10}
                  onValueChange={(values) => setFrameDelay(values[0])}
                  disabled={isExporting}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Quality</label>
                  <span className="text-xs text-gray-500">{gifQuality}</span>
                </div>
                <Slider
                  value={[gifQuality]}
                  min={1}
                  max={20}
                  step={1}
                  onValueChange={(values) => setGifQuality(values[0])}
                  disabled={isExporting}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="advanced" className="space-y-4 pt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Loop Count</label>
                  <span className="text-xs text-gray-500">
                    {loopCount === 0 ? "Infinite" : loopCount}
                  </span>
                </div>
                <Slider
                  value={[loopCount]}
                  min={0}
                  max={10}
                  step={1}
                  onValueChange={(values) => setLoopCount(values[0])}
                  disabled={isExporting}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Output Width</label>
                  <span className="text-xs text-gray-500">
                    {outputWidth === 0 ? "Original" : `${outputWidth}px`}
                  </span>
                </div>
                <Slider
                  value={[outputWidth]}
                  min={0}
                  max={1200}
                  step={50}
                  onValueChange={(values) => setOutputWidth(values[0])}
                  disabled={isExporting}
                />
                <p className="text-xs text-gray-500">
                  0 = original size. Height will scale proportionally.
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="dithering"
                  checked={dithering}
                  onChange={(e) => setDithering(e.target.checked)}
                  disabled={isExporting}
                />
                <label htmlFor="dithering" className="text-sm font-medium">
                  Enable Dithering
                </label>
              </div>
            </TabsContent>
          </Tabs>
          
          {isExporting && (
            <div className="my-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300 ease-in-out"
                  style={{ width: `${exportProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-center mt-2">Exporting: {exportProgress}%</p>
            </div>
          )}
          
          <DialogFooter className="flex justify-between items-center">
            {isGifLibraryAvailable !== true ? (
              <Button
                onClick={exportFallback}
                disabled={isExporting || !canvas}
              >
                Export PNG
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={exportAsGif}
                  disabled={isExporting || isGifLibraryAvailable !== true}
                >
                  {isExporting ? 'Exporting...' : 'Export GIF'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={exportFallback}
                  disabled={isExporting || !canvas}
                >
                  Export PNG
                </Button>
              </div>
            )}
            
            <Button 
              variant="outline" 
              onClick={() => setShowExportDialog(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 