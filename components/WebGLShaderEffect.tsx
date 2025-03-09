'use client';

import React, { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle, Suspense } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import dynamic from 'next/dynamic';

// Dynamically import ThreeComponents with no SSR to avoid server import of Three.js
const ThreeComponents = dynamic(() => import('./ThreeComponents'), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-video bg-gray-100 rounded-md flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full mb-2"></div>
        <p>Loading WebGL components...</p>
      </div>
    </div>
  )
});

// Default shaders (these don't require Three.js imports)
const DEFAULT_VERTEX_SHADER = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const DEFAULT_FRAGMENT_SHADER = `
uniform sampler2D uTexture;
uniform float uTime;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec4 color = texture2D(uTexture, uv);
  gl_FragColor = color;
}
`;

// Predefined shader effects
const SHADER_EFFECTS = {
  none: {
    name: 'None',
    fragmentShader: DEFAULT_FRAGMENT_SHADER,
    uniforms: {}
  },
  wave: {
    name: 'Wave',
    fragmentShader: `
      uniform sampler2D uTexture;
      uniform float uTime;
      uniform float uFrequency;
      uniform float uAmplitude;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        
        // Apply wave distortion
        uv.x += sin(uv.y * uFrequency + uTime) * uAmplitude;
        uv.y += sin(uv.x * uFrequency - uTime) * uAmplitude;
        
        // Maintain image edges
        vec4 color = texture2D(uTexture, clamp(uv, 0.0, 1.0));
        
        gl_FragColor = color;
      }
    `,
    uniforms: {
      uFrequency: { value: 10.0, min: 1.0, max: 50.0, step: 0.1 },
      uAmplitude: { value: 0.03, min: 0.0, max: 0.1, step: 0.001 }
    }
  },
  pixelate: {
    name: 'Pixelate',
    fragmentShader: `
      uniform sampler2D uTexture;
      uniform float uTime;
      uniform float uPixels;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        
        // Pixelate effect
        float pixels = max(4.0, uPixels);
        vec2 pixelUv = floor(uv * pixels) / pixels;
        
        vec4 color = texture2D(uTexture, pixelUv);
        
        gl_FragColor = color;
      }
    `,
    uniforms: {
      uPixels: { value: 100.0, min: 4.0, max: 1000.0, step: 1.0 }
    }
  },
  rgb: {
    name: 'RGB Shift',
    fragmentShader: `
      uniform sampler2D uTexture;
      uniform float uTime;
      uniform float uAmount;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        
        // RGB Shift
        float amount = uAmount * 0.01;
        float angle = uTime;
        vec2 offset = vec2(cos(angle), sin(angle)) * amount;
        
        float r = texture2D(uTexture, uv + offset).r;
        float g = texture2D(uTexture, uv).g;
        float b = texture2D(uTexture, uv - offset).b;
        
        gl_FragColor = vec4(r, g, b, 1.0);
      }
    `,
    uniforms: {
      uAmount: { value: 2.0, min: 0.0, max: 10.0, step: 0.1 }
    }
  },
  vortex: {
    name: 'Vortex',
    fragmentShader: `
      uniform sampler2D uTexture;
      uniform float uTime;
      uniform float uRotation;
      uniform float uStrength;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv - 0.5;
        float dist = length(uv);
        float angle = atan(uv.y, uv.x);
        
        // Vortex effect
        float rotation = uRotation * 5.0;
        float twist = dist * uStrength;
        float newAngle = angle + twist + uTime * rotation;
        
        vec2 newUv = vec2(cos(newAngle), sin(newAngle)) * dist + 0.5;
        vec4 color = texture2D(uTexture, clamp(newUv, 0.0, 1.0));
        
        gl_FragColor = color;
      }
    `,
    uniforms: {
      uRotation: { value: 0.2, min: -1.0, max: 1.0, step: 0.01 },
      uStrength: { value: 3.0, min: 0.0, max: 10.0, step: 0.1 }
    }
  },
  glitch: {
    name: 'Glitch',
    fragmentShader: `
      uniform sampler2D uTexture;
      uniform float uTime;
      uniform float uIntensity;
      varying vec2 vUv;

      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      void main() {
        vec2 uv = vUv;
        
        // Create a glitch effect
        float interval = 0.8; 
        float glitchStrength = uIntensity * 0.1;
        
        // Time-based glitch trigger
        float glitchTrigger = step(interval, fract(uTime * 0.5));
        
        if (glitchTrigger > 0.0) {
          // Apply horizontal shift
          float noise = random(vec2(floor(uTime * 10.0), floor(uv.y * 50.0)));
          if (noise > 0.8) {
            uv.x += (noise - 0.8) * glitchStrength * 10.0;
          }
          
          // Color channel splitting sometimes
          if (random(vec2(uTime)) > 0.7) {
            float rShift = random(vec2(uTime, 0.0)) * 0.02 * glitchStrength;
            float gShift = random(vec2(uTime, 1.0)) * 0.02 * glitchStrength;
            float bShift = random(vec2(uTime, 2.0)) * 0.02 * glitchStrength;
            
            float r = texture2D(uTexture, uv + vec2(rShift, 0.0)).r;
            float g = texture2D(uTexture, uv + vec2(0.0, gShift)).g;
            float b = texture2D(uTexture, uv + vec2(bShift, 0.0)).b;
            
            gl_FragColor = vec4(r, g, b, 1.0);
            return;
          }
        }
        
        vec4 color = texture2D(uTexture, clamp(uv, 0.0, 1.0));
        gl_FragColor = color;
      }
    `,
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

// Main WebGL shader effect component
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
  const [frameRate, setFrameRate] = useState(30);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isWebGLSupported, setIsWebGLSupported] = useState<boolean | null>(null);
  
  // State for shader uniform values
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
  
  // Check if WebGL is supported
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const hasWebGL = !!(window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      
      setIsWebGLSupported(hasWebGL);
      
      if (!hasWebGL) {
        setError('WebGL is not supported in your browser. Please try a different browser.');
      }
    } catch (err) {
      setError('Error checking WebGL support');
      setIsWebGLSupported(false);
    }
    
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
      
      // For this simplified implementation, just capture the current canvas state
      // multiple times to simulate animation frames
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
  
  // Render WebGL not supported state
  if (isWebGLSupported === false) {
    return (
      <div className="p-4 bg-yellow-50 rounded-md">
        <h3 className="font-medium text-yellow-800 mb-2">WebGL Not Supported</h3>
        <p className="text-yellow-700 mb-4">
          Your browser or device doesn't support WebGL, which is required for shader effects.
          Try using a different browser or device.
        </p>
        <Button 
          variant="outline" 
          onClick={captureCurrentFrame}
          className="w-auto"
        >
          Capture Image
        </Button>
      </div>
    );
  }
  
  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Effect selection controls */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">Shader Effect</label>
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
            <option value="custom">Custom Shader</option>
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
      
      {/* Custom shader code input */}
      {isCustomShader && (
        <div className="border rounded-md p-4 bg-gray-50">
          <label className="block text-sm font-medium mb-2">Custom Fragment Shader</label>
          <textarea
            className="w-full h-40 font-mono text-sm p-3 border rounded-md"
            value={customShaderCode || DEFAULT_FRAGMENT_SHADER}
            onChange={(e) => setCustomShaderCode(e.target.value)}
            placeholder="Enter GLSL fragment shader code..."
          />
        </div>
      )}
      
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
        {isWebGLSupported && (
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="inline-block animate-spin h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full mb-2"></div>
                <p>Loading WebGL...</p>
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
        )}
      </div>
      
      <p className="text-xs text-gray-500 mt-2">
        Use the controls above to customize the shader effect. 
        Press 'Capture Frame' to save a still image or 'Capture Animation' to create an animated sequence.
      </p>
    </div>
  );
});

WebGLShaderEffect.displayName = 'WebGLShaderEffect';

export default WebGLShaderEffect; 