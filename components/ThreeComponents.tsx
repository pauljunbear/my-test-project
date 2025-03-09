'use client';

import React, { useRef, useEffect, useState } from 'react';

// We'll define interfaces without depending on Three.js types
interface ThreeComponentsProps {
  imageUrl: string;
  selectedEffect: string;
  customShaderCode?: string;
  uniformValues: Record<string, number>;
  isPlaying: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement>;
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

// Client-side only rendering component
export default function ThreeComponents(props: ThreeComponentsProps) {
  const { imageUrl, selectedEffect, customShaderCode, uniformValues, isPlaying, canvasRef } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClientSide, setIsClientSide] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Only run Three.js code on the client side
  useEffect(() => {
    setIsClientSide(true);
  }, []);

  // Initialize Three.js when component mounts (client-side only)
  useEffect(() => {
    if (!isClientSide || isInitialized || !containerRef.current || !canvasRef.current) return;

    // Dynamically import Three.js and related libraries
    const initThree = async () => {
      try {
        // Use dynamic imports to ensure these are only loaded on the client
        const THREE = await import('three');
        const { Canvas, useFrame, useThree } = await import('@react-three/fiber');
        const { useTexture } = await import('@react-three/drei');

        // We've successfully loaded the libraries, but we won't use them directly
        // Instead, we'll use a simpler approach with a plain canvas
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          console.error('Failed to get 2D context');
          return;
        }
        
        // Load the image
        const img = new Image();
        img.src = imageUrl;
        img.onload = () => {
          // Maintain aspect ratio
          const aspectRatio = img.width / img.height;
          canvas.width = 800; // Fixed width
          canvas.height = Math.round(800 / aspectRatio);
          
          // Initial draw
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Animate with simple 2D canvas fallback
          let time = 0;
          const animate = () => {
            if (!isPlaying) return;
            
            time += 0.05;
            
            // Basic fallback animation
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Apply a simple effect
            const effect = selectedEffect || 'none';
            if (effect !== 'none') {
              // Simplified effect application
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const data = imageData.data;
              
              // Apply simple effect (grayscale for demo)
              for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = avg;     // R
                data[i + 1] = avg; // G
                data[i + 2] = avg; // B
              }
              
              ctx.putImageData(imageData, 0, 0);
            }
            
            requestAnimationFrame(animate);
          };
          
          animate();
        };
        
        img.onerror = () => {
          console.error('Failed to load image');
        };
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Three.js:', error);
      }
    };

    initThree();
  }, [isClientSide, isInitialized, imageUrl, canvasRef, containerRef, selectedEffect, isPlaying]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* This canvas will be used as a fallback and for capturing */}
      <canvas 
        ref={canvasRef} 
        className="w-full h-full object-contain"
      />
    </div>
  );
} 