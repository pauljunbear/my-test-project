'use client';

import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

// Component API exposed through ref
export interface ThreeComponentsRef {
  captureScreenshot: () => string | null;
}

// We'll define interfaces without depending on Three.js types
interface ThreeComponentsProps {
  imageUrl: string;
  selectedEffect: string;
  customShaderCode?: string;
  uniformValues: Record<string, number | number[]>;
  isPlaying?: boolean; // Made optional with default
  canvasRef?: React.RefObject<HTMLCanvasElement>; // Made optional
}

// Default shaders (copied from WebGLShaderEffect)
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

// Predefined shader effects - shader code is just strings, no dependencies
const SHADER_EFFECTS = {
  none: { name: 'None' },
  wave: { name: 'Wave' },
  pixelate: { name: 'Pixelate' },
  rgb: { name: 'RGB Shift' },
  vortex: { name: 'Vortex' },
  glitch: { name: 'Glitch' }
};

// Client-side only rendering component using canvas 2D instead of WebGL
const ThreeComponents = forwardRef<ThreeComponentsRef, ThreeComponentsProps>((props, ref) => {
  const { 
    imageUrl, 
    selectedEffect, 
    customShaderCode, 
    uniformValues, 
    isPlaying = false, 
    canvasRef: externalCanvasRef 
  } = props;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isClientSide, setIsClientSide] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const animationRef = useRef<number | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const timeRef = useRef<number>(0);
  
  // Use the provided canvas ref or our internal one
  const canvasRef = externalCanvasRef || internalCanvasRef;
  
  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    captureScreenshot: () => {
      if (!canvasRef.current) return null;
      
      try {
        // Return the canvas contents as a data URL
        return canvasRef.current.toDataURL('image/png');
      } catch (error) {
        console.error('Failed to capture screenshot:', error);
        return null;
      }
    }
  }));

  // Check if we're on the client side
  useEffect(() => {
    setIsClientSide(true);
  }, []);

  // Initialize the canvas for 2D rendering
  useEffect(() => {
    if (!isClientSide || isInitialized || !canvasRef.current) return;

    const initCanvas = async () => {
      try {
        // Get canvas and context
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('Failed to get 2D context');
          return;
        }
        
        // Load the image
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;
        
        img.onload = () => {
          // Store the image for later use
          imageRef.current = img;
          
          // Set canvas dimensions
          const aspectRatio = img.width / img.height;
          canvas.width = 800; // Fixed width
          canvas.height = Math.round(800 / aspectRatio);
          
          // Initial draw
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Start animation loop
          startAnimation();
          setIsInitialized(true);
        };
        
        img.onerror = () => {
          console.error('Failed to load image');
        };
      } catch (error) {
        console.error('Failed to initialize canvas:', error);
      }
    };

    initCanvas();
    
    // Cleanup animation when unmounting
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isClientSide, isInitialized, imageUrl, canvasRef]);
  
  // Animation function
  const startAnimation = () => {
    if (!canvasRef.current || !imageRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Stop any existing animation
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }
    
    // Only animate if playing is true
    if (!isPlaying) return;
    
    // Animation function
    const animate = () => {
      if (!canvas || !ctx || !imageRef.current || !isPlaying) return;
      
      // Update time
      timeRef.current += 0.05;
      const time = timeRef.current;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw original image
      ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
      
      // Apply effect based on selected effect
      const effect = selectedEffect || 'none';
      if (effect !== 'none') {
        // Get image data for pixel manipulation
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        
        // Apply different effects
        switch (effect) {
          case 'grayscale':
            // Simple grayscale effect
            for (let i = 0; i < data.length; i += 4) {
              const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
              data[i] = avg;     // R
              data[i + 1] = avg; // G
              data[i + 2] = avg; // B
            }
            break;
            
          case 'wave':
            // Simple wave distortion (simplified version of shader)
            // Handle both number and array types for uniform values
            const waveFrequency = typeof uniformValues.uFrequency === 'number' 
              ? uniformValues.uFrequency 
              : Array.isArray(uniformValues.uFrequency) && uniformValues.uFrequency.length > 0
                ? uniformValues.uFrequency[0]
                : 10;
                
            const waveAmplitude = typeof uniformValues.uAmplitude === 'number'
              ? uniformValues.uAmplitude
              : Array.isArray(uniformValues.uAmplitude) && uniformValues.uAmplitude.length > 0
                ? uniformValues.uAmplitude[0]
                : 0.03;
            
            // Create a temporary canvas to avoid distortion artifacts
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext('2d');
            
            if (tempCtx) {
              tempCtx.drawImage(imageRef.current, 0, 0, width, height);
              const sourceData = tempCtx.getImageData(0, 0, width, height).data;
              
              for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                  // Calculate wave distortion
                  const distortionX = Math.sin(y * waveFrequency * 0.01 + time) * waveAmplitude * width;
                  const distortionY = Math.sin(x * waveFrequency * 0.01 - time) * waveAmplitude * height;
                  
                  // Source coordinates with distortion
                  const sx = Math.floor(x + distortionX);
                  const sy = Math.floor(y + distortionY);
                  
                  // Only copy if within bounds
                  if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
                    const sourceIndex = (sy * width + sx) * 4;
                    const targetIndex = (y * width + x) * 4;
                    
                    data[targetIndex] = sourceData[sourceIndex];         // R
                    data[targetIndex + 1] = sourceData[sourceIndex + 1]; // G
                    data[targetIndex + 2] = sourceData[sourceIndex + 2]; // B
                  }
                }
              }
            }
            break;
            
          case 'pixelate':
            // Pixelation effect
            const pixelSize = Math.max(5, 
              typeof uniformValues.uPixels === 'number'
                ? uniformValues.uPixels
                : Array.isArray(uniformValues.uPixels) && uniformValues.uPixels.length > 0
                  ? uniformValues.uPixels[0]
                  : 20
            );
            
            for (let y = 0; y < height; y += pixelSize) {
              for (let x = 0; x < width; x += pixelSize) {
                // Get color from the center of the current pixel block
                const centerX = Math.min(x + Math.floor(pixelSize/2), width - 1);
                const centerY = Math.min(y + Math.floor(pixelSize/2), height - 1);
                const centerIndex = (centerY * width + centerX) * 4;
                
                const r = data[centerIndex];
                const g = data[centerIndex + 1];
                const b = data[centerIndex + 2];
                
                // Fill the pixel block with this color
                for (let py = 0; py < pixelSize && y + py < height; py++) {
                  for (let px = 0; px < pixelSize && x + px < width; px++) {
                    const index = ((y + py) * width + (x + px)) * 4;
                    data[index] = r;
                    data[index + 1] = g;
                    data[index + 2] = b;
                  }
                }
              }
            }
            break;
            
          case 'rgb':
            // RGB shift effect
            const amount = (
              typeof uniformValues.uAmount === 'number'
                ? uniformValues.uAmount
                : Array.isArray(uniformValues.uAmount) && uniformValues.uAmount.length > 0
                  ? uniformValues.uAmount[0]
                  : 2
            ) * 0.01;
            
            const angle = time;
            const shiftX = Math.cos(angle) * amount * width;
            const shiftY = Math.sin(angle) * amount * height;
            
            // Create a temporary canvas
            const rgbTempCanvas = document.createElement('canvas');
            rgbTempCanvas.width = width;
            rgbTempCanvas.height = height;
            const rgbTempCtx = rgbTempCanvas.getContext('2d');
            
            if (rgbTempCtx) {
              rgbTempCtx.drawImage(imageRef.current, 0, 0, width, height);
              const rgbSourceData = rgbTempCtx.getImageData(0, 0, width, height).data;
              
              for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                  const index = (y * width + x) * 4;
                  
                  // Red channel - shifted one way
                  const rx = Math.floor(x + shiftX);
                  const ry = Math.floor(y + shiftY);
                  if (rx >= 0 && rx < width && ry >= 0 && ry < height) {
                    const rIndex = (ry * width + rx) * 4;
                    data[index] = rgbSourceData[rIndex];
                  }
                  
                  // Blue channel - shifted the other way
                  const bx = Math.floor(x - shiftX);
                  const by = Math.floor(y - shiftY);
                  if (bx >= 0 && bx < width && by >= 0 && by < height) {
                    const bIndex = (by * width + bx) * 4;
                    data[index + 2] = rgbSourceData[bIndex + 2];
                  }
                  
                  // Green channel stays the same
                }
              }
            }
            break;
            
          default:
            // Default to grayscale if effect not implemented
            for (let i = 0; i < data.length; i += 4) {
              const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
              data[i] = avg;
              data[i + 1] = avg;
              data[i + 2] = avg;
            }
        }
        
        // Put the modified image data back on the canvas
        ctx.putImageData(imageData, 0, 0);
      }
      
      // Continue animation
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation loop
    animate();
  };
  
  // Update animation when isPlaying changes
  useEffect(() => {
    if (isInitialized) {
      startAnimation();
    }
  }, [isPlaying, isInitialized, selectedEffect, uniformValues]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Use internal canvas if external one not provided */}
      {!externalCanvasRef && (
        <canvas 
          ref={internalCanvasRef}
          className="w-full h-full"
        />
      )}
    </div>
  );
});

// Add display name for better debugging
ThreeComponents.displayName = 'ThreeComponents';

export default ThreeComponents; 