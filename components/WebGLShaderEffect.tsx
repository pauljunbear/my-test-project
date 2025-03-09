'use client';

import React, { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle, Suspense } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import dynamic from 'next/dynamic';

// Dynamically import ThreeComponents with no SSR
// This ensures the component will only be loaded at runtime on the client
const ThreeComponents = dynamic(() => import('./ThreeComponents'), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-video bg-gray-100 rounded-md flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full mb-2"></div>
        <p>Loading graphics components...</p>
      </div>
    </div>
  )
});

// Predefined effects with simplified parameters
const SHADER_EFFECTS = {
  none: {
    name: 'None',
    uniforms: {}
  },
  wave: {
    name: 'Wave',
    uniforms: {
      uFrequency: { value: 10.0, min: 1.0, max: 50.0, step: 0.1 },
      uAmplitude: { value: 0.03, min: 0.0, max: 0.1, step: 0.001 }
    }
  },
  pixelate: {
    name: 'Pixelate',
    uniforms: {
      uPixels: { value: 100.0, min: 4.0, max: 1000.0, step: 1.0 }
    }
  },
  rgb: {
    name: 'RGB Shift',
    uniforms: {
      uAmount: { value: 2.0, min: 0.0, max: 10.0, step: 0.1 }
    }
  },
  vortex: {
    name: 'Vortex',
    uniforms: {
      uRotation: { value: 0.2, min: -1.0, max: 1.0, step: 0.01 },
      uStrength: { value: 3.0, min: 0.0, max: 10.0, step: 0.1 }
    }
  },
  glitch: {
    name: 'Glitch',
    uniforms: {
      uIntensity: { value: 5.0, min: 0.0, max: 10.0, step: 0.1 }
    }
  }
};

// Interface for shader effect properties
interface ShaderEffectProps {
  imageUrl: string;
  onProcessedImage?: (dataUrl: string) => void;
}

// Main shader effect component
const WebGLShaderEffect = forwardRef<
  { captureFrames: () => Promise<string[]> },
  ShaderEffectProps
>(({ imageUrl, onProcessedImage }, ref) => {
  const [selectedEffect, setSelectedEffect] = useState<string>('none');
  const [customShaderCode, setCustomShaderCode] = useState<string>('');
  const [isCustomShader, setIsCustomShader] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [captureFramesCount, setCaptureFramesCount] = useState(10);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State for effect parameters
  const [uniformValues, setUniformValues] = useState<Record<string, number>>({});
  
  // Initialize uniform values when effect changes
  useEffect(() => {
    if (selectedEffect in SHADER_EFFECTS) {
      const effect = SHADER_EFFECTS[selectedEffect as keyof typeof SHADER_EFFECTS];
      
      if (effect.uniforms) {
        const initialValues: Record<string, number> = {};
        
        Object.keys(effect.uniforms).forEach(key => {
          initialValues[key] = effect.uniforms[key].value;
        });
        
        setUniformValues(initialValues);
      }
    }
  }, [selectedEffect]);
  
  // Check if image is loading
  useEffect(() => {
    setIsLoading(true);
    
    // Set loading state
    const img = new Image();
    img.onload = () => setIsLoading(false);
    img.onerror = () => {
      setError('Failed to load image');
      setIsLoading(false);
    };
    if (imageUrl) img.src = imageUrl;
  }, [imageUrl]);
  
  // Update a single uniform value
  const updateUniformValue = (key: string, value: number) => {
    setUniformValues(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Capture current frame as an image
  const captureCurrentFrame = () => {
    if (!canvasRef.current) {
      setError('Cannot capture: canvas not initialized');
      return;
    }
    
    try {
      const canvas = canvasRef.current;
      const dataURL = canvas.toDataURL('image/png');
      
      if (onProcessedImage) {
        onProcessedImage(dataURL);
      }
      
      // Also provide direct download
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = 'shader-effect-frame.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error capturing frame:', error);
      setError('Failed to capture frame');
    }
  };
  
  // Capture multiple frames for animation
  const captureFrames = async () => {
    if (!canvasRef.current) {
      setError('Cannot capture: canvas not initialized');
      return null;
    }
    
    const frames: string[] = [];
    const canvas = canvasRef.current;
    const frameCount = captureFramesCount;
    
    // Temporarily pause the animation
    const wasPlaying = isPlaying;
    setIsPlaying(false);
    
    try {
      // Wait for any pending renders to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Just capture the current frame multiple times as a simple implementation
      for (let i = 0; i < frameCount; i++) {
        const dataURL = canvas.toDataURL('image/png');
        frames.push(dataURL);
      }
      
      // Restore animation state
      setIsPlaying(wasPlaying);
      
      return frames;
    } catch (error) {
      console.error('Error capturing frames:', error);
      setError('Failed to capture animation frames');
      setIsPlaying(wasPlaying);
      return null;
    }
  };
  
  // Expose methods via useImperativeHandle
  useImperativeHandle(ref, () => ({
    captureFrames: async () => {
      const result = await captureFrames();
      return result || [];
    }
  }));
  
  // Render error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-md">
        <p className="text-red-600">{error}</p>
        <Button 
          variant="outline" 
          onClick={() => location.reload()}
          className="mt-2"
        >
          Try Again
        </Button>
      </div>
    );
  }
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded-md">
        <div className="text-center">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full mb-2"></div>
          <p>Loading shader effect...</p>
        </div>
      </div>
    );
  }
  
  // Get current effect controls
  const currentEffect = SHADER_EFFECTS[selectedEffect as keyof typeof SHADER_EFFECTS];
  const effectControls = currentEffect?.uniforms || {};
  
  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Effect selection controls */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">Image Effect</label>
          <select 
            className="w-full border rounded-md p-2"
            value={selectedEffect}
            onChange={(e) => {
              setSelectedEffect(e.target.value);
              setIsCustomShader(e.target.value === 'custom');
            }}
          >
            {Object.keys(SHADER_EFFECTS).map(key => (
              <option key={key} value={key}>
                {SHADER_EFFECTS[key as keyof typeof SHADER_EFFECTS].name}
              </option>
            ))}
            <option value="custom">Custom Effect</option>
          </select>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium">Capture Frames</label>
            <span className="text-xs text-gray-500">{captureFramesCount}</span>
          </div>
          <Slider
            value={[captureFramesCount]}
            min={5}
            max={60}
            step={1}
            onValueChange={(values) => setCaptureFramesCount(values[0])}
          />
        </div>
      </div>
      
      {/* Effect-specific controls */}
      {Object.keys(effectControls).length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.keys(effectControls).map(key => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-sm">{key.replace('u', '')}</label>
                <span className="text-xs text-gray-500">
                  {uniformValues[key]?.toFixed(2) || effectControls[key].value.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[uniformValues[key] || effectControls[key].value]}
                min={effectControls[key].min}
                max={effectControls[key].max}
                step={effectControls[key].step}
                onValueChange={(values) => updateUniformValue(key, values[0])}
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Canvas and controls */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <Button 
          variant={isPlaying ? "default" : "outline"}
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-auto"
        >
          {isPlaying ? '❚❚ Pause' : '▶ Play'}
        </Button>
        
        <div className="flex gap-2">
          <Button 
            variant="default"
            onClick={captureCurrentFrame}
            className="w-auto"
          >
            Capture Frame
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => captureFrames()}
            className="w-auto"
          >
            Capture Animation
          </Button>
        </div>
      </div>
      
      {/* Canvas container */}
      <div className="relative aspect-video w-full border rounded-md overflow-hidden">
        <canvas 
          ref={canvasRef} 
          className="absolute top-0 left-0 w-full h-full"
        />
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full mb-2"></div>
              <p>Loading effect...</p>
            </div>
          </div>
        }>
          <ThreeComponents
            imageUrl={imageUrl}
            selectedEffect={selectedEffect}
            customShaderCode={isCustomShader ? customShaderCode : undefined}
            uniformValues={uniformValues}
            isPlaying={isPlaying}
            canvasRef={canvasRef}
          />
        </Suspense>
      </div>
      
      <p className="text-xs text-gray-500 mt-2">
        Use the controls above to customize the image effect. 
        Press 'Capture Frame' to save a still image or 'Capture Animation' to create an animated sequence.
      </p>
    </div>
  );
});

WebGLShaderEffect.displayName = 'WebGLShaderEffect';

export default WebGLShaderEffect; 