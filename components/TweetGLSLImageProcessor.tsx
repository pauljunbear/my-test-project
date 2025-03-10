'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { createImage, isBrowser, safelyImportBrowserModule } from '@/lib/browser-utils';

interface TweetGLSLImageProcessorProps {
  imageUrl: string;
  onProcessedImage?: (dataUrl: string) => void;
}

export default function TweetGLSLImageProcessor({
  imageUrl,
  onProcessedImage
}: TweetGLSLImageProcessorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [intensity, setIntensity] = useState(1.0);
  const [speed, setSpeed] = useState(0.5);
  const [animationActive, setAnimationActive] = useState(false);
  const animationRef = useRef<number | null>(null);
  const [animationTime, setAnimationTime] = useState(0);
  
  // Load and process image with shader
  useEffect(() => {
    if (!imageUrl || !canvasRef.current || !isBrowser()) return;

    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl2');
    
    if (!gl) {
      console.error('WebGL2 not supported');
      return;
    }
    
    // Stop any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Load the image
    const img = createImage();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Create shader program
      const program = setupShaderProgram(gl);
      if (!program) return;
      
      // Create texture from the image
      const texture = createTexture(gl, img);
      
      // Set up buffers and attributes
      setupBuffers(gl, program);
      
      // Uniform locations
      const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
      const timeLoc = gl.getUniformLocation(program, 'u_time');
      const intensityLoc = gl.getUniformLocation(program, 'u_intensity');
      const textureLoc = gl.getUniformLocation(program, 'u_image');
      
      // Render frame function
      const renderFrame = (time: number) => {
        // Clear the canvas
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        // Set uniforms
        gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
        gl.uniform1f(timeLoc, time * speed);
        gl.uniform1f(intensityLoc, intensity);
        
        // Bind the texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(textureLoc, 0);
        
        // Draw the full-screen quad
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        // If animation is active, continue
        if (animationActive) {
          setAnimationTime(time);
          animationRef.current = requestAnimationFrame((t) => renderFrame(t * 0.001));
        }
      };
      
      // Initial render
      renderFrame(animationTime);
    };
    
    img.onerror = () => {
      console.error('Failed to load image');
    };
    
    img.src = imageUrl;
    
    // Cleanup function
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [imageUrl, intensity, speed, animationActive, animationTime]);
  
  // Function to set up shader program
  const setupShaderProgram = (gl: WebGL2RenderingContext) => {
    // Vertex shader - simple pass-through
    const vertexShaderSource = `#version 300 es
      in vec4 a_position;
      in vec2 a_texCoord;
      out vec2 v_texCoord;
      
      void main() {
        gl_Position = a_position;
        v_texCoord = a_texCoord;
      }
    `;
    
    // Fragment shader - modified to use the input image
    const fragmentShaderSource = `#version 300 es
      precision highp float;
      
      uniform sampler2D u_image;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform float u_intensity;
      
      in vec2 v_texCoord;
      out vec4 outColor;
      
      // HSV to RGB conversion
      vec3 hsv(float h, float s, float v) {
        vec4 t = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
        vec3 p = abs(fract(vec3(h) + t.xyz) * 6.0 - vec3(t.w));
        return v * mix(vec3(t.x), clamp(p - vec3(t.x), 0.0, 1.0), s);
      }
      
      void main() {
        // Get the original image color
        vec4 originalColor = texture(u_image, v_texCoord);
        
        // Setup coordinates and variables
        vec2 r = u_resolution;
        vec2 FC = gl_FragCoord.xy;
        float t = u_time;
        vec4 o = vec4(0.0, 0.0, 0.0, originalColor.a); // Keep original alpha
        
        // Calculate coordinate displacement based on original image
        vec2 distortedCoord = v_texCoord;
        
        // Declare variables for the ray marching and effects
        float i, e, R, s;
        
        // Ray setup - use texture coordinates for ray direction
        vec3 q, p, d = vec3(FC.xy/r - vec2(0.6, 0.5), 0.7);
        
        // Apply the effect with limited iterations for performance
        for(q.zx--; i++ < 20.0 * u_intensity;) {
          // Accumulate color using HSV
          o.rgb += hsv(0.1 + originalColor.r * 0.2, 0.2 + originalColor.g * 0.3, min(e*s, 0.7-e)/35.0);
          
          s = 1.0;
          p = q += d * e * R * 0.1;
          p = vec3(log2(R=length(p)) - t, exp(1.0 - p.z/R), atan(p.y, p.x) + cos(t) * 0.2);
          
          for(e = --p.y; s < 300.0; s += s) {
            e += sin(dot(sin(p.zxy * s) - 0.5, 1.0 - cos(p.yxz * s))) / s;
          }
        }
        
        // Blend the effect with original image
        o.rgb = mix(originalColor.rgb, o.rgb, u_intensity * 0.7);
        outColor = o;
      }
    `;
    
    // Create shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) return null;
    
    // Create and link program
    const program = gl.createProgram();
    if (!program) {
      console.error('Failed to create program');
      return null;
    }
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      return null;
    }
    
    gl.useProgram(program);
    return program;
  };
  
  // Create a shader
  const createShader = (gl: WebGL2RenderingContext, type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) {
      console.error('Failed to create shader');
      return null;
    }
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  };
  
  // Set up buffers and attributes
  const setupBuffers = (gl: WebGL2RenderingContext, program: WebGLProgram) => {
    // Create a buffer for positions
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    
    // Positions for a full-screen quad (2 triangles)
    const positions = [
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    // Setup position attribute
    const positionLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    
    // Create a buffer for texture coordinates
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    
    // Texture coordinates for the quad
    const texCoords = [
      0, 0,
      1, 0,
      0, 1,
      0, 1,
      1, 0,
      1, 1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
    
    // Setup texture coordinate attribute
    const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
  };
  
  // Create texture from image
  const createTexture = (gl: WebGL2RenderingContext, image: HTMLImageElement) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    // Upload the image data
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    return texture;
  };
  
  // Handle capture
  const handleCapture = () => {
    if (!canvasRef.current) return;
    
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      if (onProcessedImage) {
        onProcessedImage(dataUrl);
      }
    } catch (error) {
      console.error('Error capturing canvas:', error);
    }
  };
  
  // Toggle animation
  const toggleAnimation = () => {
    setAnimationActive(prev => !prev);
  };
  
  // Export as GIF
  const exportAsGif = async () => {
    if (!canvasRef.current) return;
    setIsProcessing(true);
    
    try {
      // Import the GIF.js library dynamically
      const GifModule = await safelyImportBrowserModule(
        () => import('gif.js.optimized').then(module => module.default || module),
        null
      );
      
      if (!GifModule) {
        console.error('Failed to load GIF library');
        alert('GIF export is not available in this environment');
        return;
      }
      
      // Capture frames for GIF
      const frameCount = 20;
      const frames: string[] = [];
      const canvas = canvasRef.current;
      
      // Create GIF instance
      const gif = new GifModule({
        workers: 2,
        quality: 10,
        width: canvas.width,
        height: canvas.height,
        workerScript: '/gif.worker.js',
      });
      
      // Progress indicator
      gif.on('progress', (p: number) => {
        console.log(`Creating GIF: ${Math.round(p * 100)}%`);
      });
      
      // On completion
      gif.on('finished', (blob: Blob) => {
        // Create object URL for the blob
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = 'tweet-glsl-animation.gif';
        
        // Notify about the processed result
        if (onProcessedImage) {
          // We'll pass the first frame for preview
          onProcessedImage(frames[0]);
        }
        
        // Trigger download
        link.click();
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setIsProcessing(false);
      });
      
      // Capture all frames
      for (let i = 0; i < frameCount; i++) {
        // Update time and render
        const time = i / frameCount * Math.PI * 2;
        setAnimationTime(time);
        
        // Allow rendering to happen
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Capture frame
        const dataUrl = canvasRef.current.toDataURL('image/png');
        frames.push(dataUrl);
        
        // Add frame to GIF
        // We need to convert dataURL to image element
        const img = new Image();
        img.src = dataUrl;
        await new Promise(resolve => { img.onload = resolve; });
        
        // Add to GIF
        gif.addFrame(img, { delay: 100, copy: true });
      }
      
      // Render the GIF
      gif.render();
      
    } catch (error) {
      console.error('Error exporting as GIF:', error);
      alert('Failed to create GIF. Try a different browser or check console for details.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="border rounded-md overflow-hidden">
        <canvas 
          ref={canvasRef} 
          className="w-full"
          style={{ aspectRatio: '16/9' }}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Effect Intensity</label>
            <Slider
              min={0.1}
              max={2}
              step={0.1}
              value={[intensity]}
              onValueChange={(value) => setIntensity(value[0])}
            />
            <div className="text-xs text-right">{intensity.toFixed(1)}</div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Animation Speed</label>
            <Slider
              min={0.1}
              max={2}
              step={0.1}
              value={[speed]}
              onValueChange={(value) => setSpeed(value[0])}
            />
            <div className="text-xs text-right">{speed.toFixed(1)}</div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 items-start">
          <Button variant="secondary" onClick={toggleAnimation}>
            {animationActive ? "Pause" : "Animate"}
          </Button>
          
          <Button variant="secondary" onClick={handleCapture}>
            Capture Frame
          </Button>
          
          <Button
            variant="secondary"
            onClick={exportAsGif}
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "Export as GIF"}
          </Button>
        </div>
      </div>
      
      <div className="text-xs text-gray-500">
        Based on shader by 
        <a
          href="https://x.com/YoheiNishitsuji/status/1898392319386366065"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 text-blue-500 hover:underline"
        >
          @YoheiNishitsuji
        </a>
      </div>
    </div>
  );
} 