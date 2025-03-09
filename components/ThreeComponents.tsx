'use client';

import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

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

// Import predefined shader effects from WebGLShaderEffect
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

// Interface for shader mesh props
interface ShaderMeshProps {
  imageUrl: string;
  selectedEffect: string;
  customShaderCode?: string;
  uniformValues: Record<string, number>;
  isPlaying: boolean;
}

// Interface for ThreeComponents props
interface ThreeComponentsProps {
  imageUrl: string;
  selectedEffect: string;
  customShaderCode?: string;
  uniformValues: Record<string, number>;
  isPlaying: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

// ShaderMesh component handles the actual rendering
function ShaderMesh({ 
  imageUrl, 
  selectedEffect, 
  customShaderCode,
  uniformValues, 
  isPlaying
}: ShaderMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const texture = useTexture(imageUrl);
  const { size } = useThree();
  
  // Set texture properties for better rendering
  useEffect(() => {
    if (texture) {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
    }
  }, [texture]);
  
  // Handle animation updates
  useFrame(({ clock }) => {
    if (materialRef.current && isPlaying) {
      const time = clock.getElapsedTime();
      
      // Update time uniform
      materialRef.current.uniforms.uTime.value = time;
      
      // Update custom uniforms from controls
      Object.keys(uniformValues).forEach(key => {
        if (materialRef.current?.uniforms[key]) {
          materialRef.current.uniforms[key].value = uniformValues[key];
        }
      });
    }
  });
  
  // Determine which shader to use
  const selectedEffectObj = SHADER_EFFECTS[selectedEffect as keyof typeof SHADER_EFFECTS] || SHADER_EFFECTS.none;
  const fragmentShader = customShaderCode || selectedEffectObj.fragmentShader;
  
  // Create uniforms object from effect definition
  const createUniforms = () => {
    const uniforms: Record<string, { value: any }> = {
      uTexture: { value: texture },
      uTime: { value: 0.0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) }
    };
    
    // Add effect-specific uniforms
    if (selectedEffectObj.uniforms) {
      Object.keys(selectedEffectObj.uniforms).forEach(key => {
        uniforms[key] = { value: uniformValues[key] ?? selectedEffectObj.uniforms[key].value };
      });
    }
    
    return uniforms;
  };
  
  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={createUniforms()}
        vertexShader={DEFAULT_VERTEX_SHADER}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}

// Export the ThreeComponents
export default function ThreeComponents({
  imageUrl,
  selectedEffect,
  customShaderCode,
  uniformValues,
  isPlaying,
  canvasRef
}: ThreeComponentsProps) {
  return (
    <Canvas ref={canvasRef} gl={{ preserveDrawingBuffer: true }}>
      <ShaderMesh 
        imageUrl={imageUrl}
        selectedEffect={selectedEffect}
        customShaderCode={customShaderCode}
        uniformValues={uniformValues}
        isPlaying={isPlaying}
      />
    </Canvas>
  );
} 