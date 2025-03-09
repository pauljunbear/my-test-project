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

// Define types for the shader effects
interface UniformValue {
  value: number | number[];
  min?: number;
  max?: number;
  step?: number;
}

interface ShaderUniforms {
  [key: string]: UniformValue;
}

interface ShaderEffect {
  name: string;
  uniforms: ShaderUniforms;
}

// Predefined effects with simplified parameters
const SHADER_EFFECTS: Record<string, ShaderEffect> = {
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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEffect, setSelectedEffect] = useState<string>('none');
  const [uniformValues, setUniformValues] = useState<Record<string, number | number[]>>({});
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const componentRef = useRef<any>(null);
  
  // Effect to initialize uniform values when effect changes
  useEffect(() => {
    const effect = SHADER_EFFECTS[selectedEffect];
    
    if (effect && effect.uniforms) {
      const initialValues: Record<string, number> = {};
      
      // Safely extract initial values from uniforms with proper type checking
      Object.keys(effect.uniforms).forEach(key => {
        const uniform = effect.uniforms[key as keyof typeof effect.uniforms];
        if (uniform && 
            typeof uniform === 'object' && 
            'value' in uniform && 
            (typeof uniform.value === 'number' || Array.isArray(uniform.value))) {
          // Handle both number and array types (for vec2, vec3, etc.)
          if (typeof uniform.value === 'number') {
            initialValues[key] = uniform.value;
          } else if (Array.isArray(uniform.value) && uniform.value.length > 0) {
            // If it's an array, use the first value (this is a simplification)
            initialValues[key] = uniform.value[0];
          }
        }
      });
      
      setUniformValues(initialValues);
    }
  }, [selectedEffect]);
  
  // Check if image is loading
  useEffect(() => {
    setIsLoading(true);
    
    const img = new Image();
    img.onload = () => {
      setIsLoading(false);
    };
    img.onerror = () => {
      console.error('Failed to load image');
      setIsLoading(false);
    };
    img.src = imageUrl;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl]);
  
  // Update uniform values
  const updateUniformValue = (key: string, value: number | number[]) => {
    setUniformValues(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Capture current frame
  const captureCurrentFrame = () => {
    if (!componentRef.current) return;
    
    try {
      const dataUrl = componentRef.current.captureScreenshot();
      if (onProcessedImage) {
        onProcessedImage(dataUrl);
      }
      return dataUrl;
    } catch (error) {
      console.error('Error capturing frame:', error);
      return null;
    }
  };
  
  // Function to capture multiple frames for animation
  const captureFrames = async () => {
    if (!componentRef.current) return [];
    
    setIsCapturing(true);
    const frames: string[] = [];
    
    try {
      // For wave effect, capture frames with varying time
      if (selectedEffect === 'wave') {
        const frameCount = 30;
        const originalFrequency = uniformValues.uFrequency;
        
        for (let i = 0; i < frameCount; i++) {
          // Simulate time passing for wave effect
          const time = i / frameCount * Math.PI * 2;
          
          // Handle both number and array types for originalFrequency
          if (typeof originalFrequency === 'number') {
            // If it's a number, add variation directly
            updateUniformValue('uFrequency', originalFrequency + Math.sin(time) * 5);
          } else if (Array.isArray(originalFrequency) && originalFrequency.length > 0) {
            // If it's an array, create a new array with the first value varied
            const newArray = [...originalFrequency];
            newArray[0] = originalFrequency[0] + Math.sin(time) * 5;
            updateUniformValue('uFrequency', newArray);
          } else {
            // If it's neither (shouldn't happen, but TypeScript needs this case)
            // Just use a fallback value
            updateUniformValue('uFrequency', Math.sin(time) * 5 + 10);
          }
          
          // Wait for the next frame to render
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const dataUrl = componentRef.current.captureScreenshot();
          frames.push(dataUrl);
        }
        
        // Reset to original value
        updateUniformValue('uFrequency', originalFrequency);
      } else {
        // For other effects, capture 10 slightly different frames
        const frameCount = 10;
        const effect = SHADER_EFFECTS[selectedEffect];
        const uniformKey = Object.keys(effect.uniforms)[0];
        
        if (uniformKey) {
          const originalValue = uniformValues[uniformKey];
          const uniformObject = effect.uniforms[uniformKey as keyof typeof effect.uniforms];
          // Ensure the uniform object exists and has min/max properties
          const min = uniformObject && 'min' in uniformObject ? 
            (uniformObject.min as number) || 0 : 0;
          const max = uniformObject && 'max' in uniformObject ? 
            (uniformObject.max as number) || 100 : 100;
          const range = max - min;
          
          // Only apply variations to number values
          if (typeof originalValue === 'number') {
            for (let i = 0; i < frameCount; i++) {
              // Vary the primary parameter slightly
              const variation = Math.sin(i / frameCount * Math.PI * 2) * (range * 0.1);
              updateUniformValue(uniformKey, Math.max(min, Math.min(max, originalValue + variation)));
              
              // Wait for the next frame to render
              await new Promise(resolve => setTimeout(resolve, 100));
              
              const dataUrl = componentRef.current.captureScreenshot();
              frames.push(dataUrl);
            }
            
            // Reset to original value
            updateUniformValue(uniformKey, originalValue);
          } else if (Array.isArray(originalValue) && originalValue.length > 0) {
            // Handle array values - vary the first element if it's an array
            const firstValue = originalValue[0];
            const newArray = [...originalValue];
            
            for (let i = 0; i < frameCount; i++) {
              const variation = Math.sin(i / frameCount * Math.PI * 2) * (range * 0.1);
              newArray[0] = Math.max(min, Math.min(max, firstValue + variation));
              updateUniformValue(uniformKey, [...newArray]);
              
              // Wait for the next frame to render
              await new Promise(resolve => setTimeout(resolve, 100));
              
              const dataUrl = componentRef.current.captureScreenshot();
              frames.push(dataUrl);
            }
            
            // Reset to original value
            updateUniformValue(uniformKey, originalValue);
          } else {
            // If we can't vary the value, just capture multiple identical frames
            for (let i = 0; i < frameCount; i++) {
              await new Promise(resolve => setTimeout(resolve, 100));
              const dataUrl = componentRef.current.captureScreenshot();
              frames.push(dataUrl);
            }
          }
        } else {
          // Just capture current frame if no uniforms to animate
          const dataUrl = componentRef.current.captureScreenshot();
          frames.push(dataUrl);
        }
      }
    } catch (error) {
      console.error('Error capturing frames:', error);
    }
    
    setIsCapturing(false);
    setCapturedFrames(frames);
    return frames;
  };
  
  // Handle animation playback
  useEffect(() => {
    if (isAnimating && capturedFrames.length > 0) {
      const animate = (time: number) => {
        if (time - lastTimeRef.current > 100) { // 100ms between frames (10 FPS)
          setCurrentFrameIndex(prev => (prev + 1) % capturedFrames.length);
          lastTimeRef.current = time;
        }
        animationRef.current = requestAnimationFrame(animate);
      };
      
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isAnimating, capturedFrames]);
  
  // Expose capture frames method via ref
  useImperativeHandle(ref, () => ({
    captureFrames: async () => {
      return await captureFrames();
    }
  }));
  
  return (
    <div className="w-full space-y-4">
      {/* Effect selector */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(SHADER_EFFECTS).map(([key, effect]) => (
          <Button
            key={key}
            variant={selectedEffect === key ? "default" : "outline"}
            onClick={() => setSelectedEffect(key)}
            disabled={isLoading || isCapturing}
            className="text-sm h-8"
          >
            {effect.name}
          </Button>
        ))}
      </div>
      
      {/* Uniform sliders */}
      {selectedEffect !== 'none' && (
        <div className="space-y-2">
          {Object.entries(SHADER_EFFECTS[selectedEffect].uniforms).map(([key, uniform]) => (
            <div key={key} className="space-y-1">
              <div className="text-sm font-medium">{key.replace(/^u/, '')}</div>
              <div className="flex items-center gap-3">
                <Slider
                  min={uniform.min || 0}
                  max={uniform.max || 1}
                  step={uniform.step || 0.01}
                  value={[
                    typeof uniformValues[key] === 'number' 
                      ? uniformValues[key] as number 
                      : typeof uniform.value === 'number' 
                        ? uniform.value 
                        : (Array.isArray(uniform.value) && uniform.value.length > 0) 
                          ? uniform.value[0] 
                          : 0
                  ]}
                  onValueChange={(value) => updateUniformValue(key, value[0])}
                  disabled={isCapturing}
                  className="flex-1"
                />
                <span className="text-xs w-12 text-right">
                  {typeof uniformValues[key] === 'number' 
                    ? (uniformValues[key] as number).toFixed(2) 
                    : typeof uniform.value === 'number' 
                      ? uniform.value.toFixed(2)
                      : Array.isArray(uniform.value) && uniform.value.length > 0 
                        ? uniform.value[0].toFixed(2)
                        : '0.00'
                  }
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Three.js renderer */}
      <div className="border rounded-md overflow-hidden">
        <Suspense fallback={
          <div className="w-full aspect-video bg-gray-100 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
          </div>
        }>
          <ThreeComponents
            ref={componentRef}
            imageUrl={imageUrl}
            effectName={selectedEffect}
            uniformValues={uniformValues}
          />
        </Suspense>
      </div>
      
      {/* Capture buttons */}
      <div className="flex flex-wrap gap-2">
        <Button 
          variant="secondary"
          onClick={captureCurrentFrame}
          disabled={isLoading || isCapturing}
        >
          Capture Frame
        </Button>
        
        <Button 
          variant="secondary"
          onClick={captureFrames}
          disabled={isLoading || isCapturing || selectedEffect === 'none'}
        >
          {isCapturing ? (
            <>
              <span className="animate-spin mr-2">⟳</span>
              Capturing...
            </>
          ) : (
            'Capture Animation'
          )}
        </Button>
        
        {capturedFrames.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setIsAnimating(!isAnimating)}
          >
            {isAnimating ? 'Pause' : 'Play'} Animation
          </Button>
        )}
      </div>
      
      {/* Animation preview */}
      {capturedFrames.length > 0 && (
        <div className="mt-4 border rounded-md p-4">
          <h3 className="text-lg font-medium mb-2">Animation Preview</h3>
          <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
            <img 
              src={capturedFrames[currentFrameIndex]} 
              alt="Animation preview"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Frame {currentFrameIndex + 1} of {capturedFrames.length}
          </div>
        </div>
      )}
    </div>
  );
});

WebGLShaderEffect.displayName = 'WebGLShaderEffect';

export default WebGLShaderEffect; 