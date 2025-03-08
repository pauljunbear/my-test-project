'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface ClientShaderEffectsProps {
  imageData: string | null;
  onProcessedImage?: (processedImageData: string) => void;
}

// Import GlslCanvas dynamically
const loadGlslCanvas = async () => {
  try {
    // Dynamic import to avoid SSR issues
    const module = await import('glsl-canvas');
    return module.default;
  } catch (error) {
    console.error('Error loading GlslCanvas:', error);
    throw new Error('Failed to load shader library');
  }
};

// Shader effects collection
const SHADER_EFFECTS = {
  grayscale: `
    precision mediump float;
    
    uniform vec2 u_resolution;
    uniform sampler2D u_texture;
    
    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec4 color = texture2D(u_texture, uv);
      float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      gl_FragColor = vec4(vec3(gray), color.a);
    }
  `,
  ripple: `
    precision mediump float;
    
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform sampler2D u_texture;
    
    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      
      // Create a ripple effect
      float distance = length(uv - vec2(0.5));
      vec2 distortedUV = uv + (uv - vec2(0.5)) * sin(distance * 10.0 - u_time) * 0.1;
      
      vec4 color = texture2D(u_texture, distortedUV);
      gl_FragColor = color;
    }
  `,
  pixelate: `
    precision mediump float;
    
    uniform vec2 u_resolution;
    uniform sampler2D u_texture;
    
    void main() {
      float pixels = 100.0;
      float dx = 1.0 / pixels;
      float dy = 1.0 / pixels;
      
      vec2 coord = vec2(dx * floor(gl_FragCoord.x / dx),
                        dy * floor(gl_FragCoord.y / dy));
      
      vec2 uv = coord / u_resolution.xy;
      gl_FragColor = texture2D(u_texture, uv);
    }
  `,
  blur: `
    precision mediump float;
    
    uniform vec2 u_resolution;
    uniform sampler2D u_texture;
    
    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec2 pixel = 1.0 / u_resolution.xy;
      
      vec4 color = vec4(0.0);
      
      // 9-tap Gaussian blur
      color += texture2D(u_texture, uv + pixel * vec2(-1.0, -1.0)) * 0.0625;
      color += texture2D(u_texture, uv + pixel * vec2(0.0, -1.0)) * 0.125;
      color += texture2D(u_texture, uv + pixel * vec2(1.0, -1.0)) * 0.0625;
      color += texture2D(u_texture, uv + pixel * vec2(-1.0, 0.0)) * 0.125;
      color += texture2D(u_texture, uv) * 0.25;
      color += texture2D(u_texture, uv + pixel * vec2(1.0, 0.0)) * 0.125;
      color += texture2D(u_texture, uv + pixel * vec2(-1.0, 1.0)) * 0.0625;
      color += texture2D(u_texture, uv + pixel * vec2(0.0, 1.0)) * 0.125;
      color += texture2D(u_texture, uv + pixel * vec2(1.0, 1.0)) * 0.0625;
      
      gl_FragColor = color;
    }
  `
};

export default function ClientShaderEffects({ imageData, onProcessedImage }: ClientShaderEffectsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEffect, setCurrentEffect] = useState<string>('grayscale');
  const [isAnimated, setIsAnimated] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glslCanvasRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // Initialize shader canvas when component mounts
  useEffect(() => {
    if (!canvasRef.current || !imageData) return;
    
    const setupShader = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load GlslCanvas library
        const GlslCanvas = await loadGlslCanvas();
        
        // Create image element
        const img = new Image();
        img.crossOrigin = "anonymous";
        
        img.onload = () => {
          if (!canvasRef.current) return;
          
          // Create and setup canvas
          canvasRef.current.width = img.width;
          canvasRef.current.height = img.height;
          
          // Initialize GlslCanvas
          if (glslCanvasRef.current) {
            // If we already have a GlslCanvas instance, destroy it first
            try {
              glslCanvasRef.current.destroy();
            } catch (e) {
              console.warn('Error destroying previous GlslCanvas:', e);
            }
          }
          
          try {
            // Create new GlslCanvas instance
            glslCanvasRef.current = new GlslCanvas(canvasRef.current);
            
            // Load the shader
            glslCanvasRef.current.load(SHADER_EFFECTS[currentEffect as keyof typeof SHADER_EFFECTS]);
            
            // Set the image as a texture
            glslCanvasRef.current.setUniform('u_texture', img);
            
            // Store image for later use
            imageRef.current = img;
            
            // Set animation flag based on current effect
            setIsAnimated(currentEffect === 'ripple');
            
            // Start animation loop if needed
            if (currentEffect === 'ripple') {
              startAnimationLoop();
            }
            
            setIsLoading(false);
          } catch (e) {
            console.error('Error initializing GlslCanvas:', e);
            setError('Failed to initialize shader. Please try a different effect.');
            setIsLoading(false);
          }
        };
        
        img.onerror = () => {
          console.error('Error loading image for shader effects');
          setError('Failed to load image for shader processing');
          setIsLoading(false);
        };
        
        // Load the image
        img.src = imageData;
      } catch (e) {
        console.error('Error setting up shader:', e);
        setError('Failed to set up shader environment');
        setIsLoading(false);
      }
    };
    
    setupShader();
    
    // Cleanup function
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (glslCanvasRef.current) {
        try {
          glslCanvasRef.current.destroy();
        } catch (e) {
          console.warn('Error during cleanup:', e);
        }
      }
    };
  }, [imageData, currentEffect]);
  
  // Animation loop for ripple effect
  const startAnimationLoop = () => {
    let startTime = Date.now();
    
    const animate = () => {
      if (!glslCanvasRef.current) return;
      
      const now = Date.now();
      const time = (now - startTime) / 1000;
      
      // Update time uniform
      glslCanvasRef.current.setUniform('u_time', time);
      
      // Request next frame
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation loop
    animate();
  };
  
  // Handle effect change
  const handleEffectChange = (effect: string) => {
    if (effect === currentEffect) return;
    
    // Cancel any running animation
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    setCurrentEffect(effect);
  };
  
  // Export the processed image
  const exportImage = () => {
    if (!canvasRef.current || !glslCanvasRef.current) return;
    
    setIsExporting(true);
    
    try {
      // For non-animated effects, just grab the current canvas state
      const dataUrl = canvasRef.current.toDataURL('image/png');
      
      if (onProcessedImage) {
        onProcessedImage(dataUrl);
      }
      
      setIsExporting(false);
    } catch (e) {
      console.error('Error exporting image:', e);
      setError('Failed to export processed image');
      setIsExporting(false);
    }
  };
  
  // Export animated effect as GIF or video
  const exportAnimation = () => {
    if (!canvasRef.current || !glslCanvasRef.current) return;
    
    setIsExporting(true);
    setError('Exporting animations is not yet implemented');
    setIsExporting(false);
  };
  
  if (error) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-red-50 border border-red-200 rounded-lg">
        <div className="flex flex-col items-center text-center p-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 mb-4">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h3 className="text-lg font-medium text-red-800 mb-2">Shader Error</h3>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <Button 
            variant="secondary"
            onClick={() => {
              setError(null);
              setCurrentEffect('grayscale');
            }}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-gray-50 border rounded-lg">
        <div className="flex flex-col items-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-2"></div>
          <p>Initializing shader effects...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full flex flex-col space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex gap-2 items-center">
          <Select
            value={currentEffect}
            onValueChange={handleEffectChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select effect" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grayscale">Grayscale</SelectItem>
              <SelectItem value="pixelate">Pixelate</SelectItem>
              <SelectItem value="blur">Blur</SelectItem>
              <SelectItem value="ripple">Ripple (Animated)</SelectItem>
            </SelectContent>
          </Select>
          
          <p className="text-sm text-gray-500">
            {isAnimated ? 'Animated Effect' : 'Static Effect'}
          </p>
        </div>
        
        <div className="flex gap-2">
          {isAnimated ? (
            <Button
              variant="outline"
              onClick={exportAnimation}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export Animation'}
            </Button>
          ) : (
            <Button
              variant="default"
              onClick={exportImage}
              disabled={isExporting}
            >
              {isExporting ? 'Applying...' : 'Apply Effect'}
            </Button>
          )}
        </div>
      </div>
      
      <div className="w-full border rounded-lg overflow-hidden flex items-center justify-center bg-gray-100 relative">
        <canvas 
          ref={canvasRef} 
          className="max-w-full max-h-[400px] object-contain"
        />
      </div>
      
      <div className="text-xs text-muted-foreground">
        <p className="font-medium mb-1">Shader Effects</p>
        <p>Shader effects are powered by GLSL and applied directly to your image. For best results, try different effects and apply them once you're satisfied with the result.</p>
        {isAnimated && (
          <p className="mt-1 text-amber-600">Note: Animated effects like Ripple are in real-time. Click "Apply Effect" to capture the current frame.</p>
        )}
      </div>
    </div>
  );
} 