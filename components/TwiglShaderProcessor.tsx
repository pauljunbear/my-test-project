'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Slider } from './ui/slider';
import { createImage, createCanvas, isBrowser, downloadFile } from '@/lib/browser-utils';
import { debounce } from '@/lib/utils';

// Define shader modes from Twigl
type ShaderMode = 'classic' | 'geek' | 'geeker' | 'geekest';

// Update EXAMPLE_SHADERS with real GLSL implementations
const EXAMPLE_SHADERS = {
  none: '',
  pixelate: `
    vec2 uv = FC.xy / r;
    float pixelSize = max(3.0, 50.0 * u_pixel_amount);
    vec2 pixelatedUV = floor(uv * r / pixelSize) * pixelSize / r;
    o = texture2D(b, pixelatedUV);
  `,
  vortex: `
    vec2 uv = FC.xy / r;
    vec2 center = vec2(0.5, 0.5);
    vec2 toCenter = center - uv;
    float dist = length(toCenter);
    float angle = atan(toCenter.y, toCenter.x);
    
    // Add rotation based on distance from center
    float strength = 5.0 * u_vortex_strength;
    angle += dist * strength;
    
    // Convert back to UV coordinates
    vec2 newUV = center + vec2(cos(angle), sin(angle)) * dist;
    o = texture2D(b, newUV);
  `,
  ripple: `
    vec2 uv = FC.xy / r;
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(uv, center);
    
    // Create ripple effect
    float frequency = 20.0 * u_ripple_frequency;
    float amplitude = 0.03 * u_ripple_strength;
    float phase = t * 2.0;
    
    vec2 offset = normalize(uv - center) * sin(dist * frequency - phase) * amplitude;
    vec2 newUV = uv + offset;
    
    // Sample with adjusted coordinates
    o = texture2D(b, newUV);
  `,
  duotone: `
    vec2 uv = FC.xy / r;
    vec4 texColor = texture2D(b, uv);
    
    // Convert to grayscale
    float gray = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
    
    // Define two colors for duotone effect
    vec3 color1 = vec3(0.0, 0.0, 0.4); // Dark blue
    vec3 color2 = vec3(1.0, 0.0, 0.0); // Red
    
    // Mix the colors based on grayscale and adjust with uniform
    vec3 duotone = mix(color1, color2, gray * u_duotone_intensity);
    
    o = vec4(duotone, texColor.a);
  `,
  halftone: `
    vec2 uv = FC.xy / r;
    
    // Get original color
    vec4 texColor = texture2D(b, uv);
    
    // Convert to grayscale
    float gray = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
    
    // Halftone pattern parameters
    float dotSize = 5.0 + 15.0 * u_halftone_size;
    vec2 center = vec2(0.5, 0.5);
    
    // Create grid
    vec2 st = uv * r / dotSize;
    vec2 gridPos = fract(st) - 0.5;
    vec2 cell = floor(st);
    
    // Sample original image at cell center
    vec2 cellUV = (cell + 0.5) * dotSize / r;
    float cellGray = dot(texture2D(b, cellUV).rgb, vec3(0.299, 0.587, 0.114));
    
    // Calculate dot size based on brightness
    float radius = 0.4 * sqrt(1.0 - cellGray);
    
    // Draw dot
    float dist = length(gridPos);
    float dot = 1.0 - smoothstep(radius - 0.01, radius, dist);
    
    // Output color
    o = vec4(vec3(dot), texColor.a);
  `,
};

// Define uniforms for each shader effect
const SHADER_UNIFORMS = {
  pixelate: {
    u_pixel_amount: { value: 0.5, min: 0.1, max: 1.0, step: 0.01, name: 'Pixel Amount' }
  },
  vortex: {
    u_speed: { value: 0.5, min: 0.0, max: 2.0, step: 0.01, name: 'Speed' }
  },
  halftone: {
    u_dot_size: { value: 1.0, min: 0.5, max: 2.0, step: 0.01, name: 'Dot Size' }
  },
  ripple: {
    u_speed: { value: 1.0, min: 0.0, max: 3.0, step: 0.01, name: 'Speed' },
    u_amplitude: { value: 0.5, min: 0.0, max: 1.0, step: 0.01, name: 'Amplitude' }
  },
  duotone: {}
};

// Update the EXAMPLE_UNIFORMS structure to match expected type
const EXAMPLE_UNIFORMS = {
  pixelate: { u_pixel_amount: { value: 0.5, min: 0.0, max: 1.0, step: 0.05 } },
  vortex: { u_vortex_strength: { value: 0.5, min: 0.0, max: 1.0, step: 0.05 } },
  ripple: { 
    u_ripple_frequency: { value: 0.5, min: 0.0, max: 1.0, step: 0.05 },
    u_ripple_strength: { value: 0.5, min: 0.0, max: 1.0, step: 0.05 }
  },
  duotone: { u_duotone_intensity: { value: 0.5, min: 0.0, max: 1.0, step: 0.05 } },
  halftone: { u_halftone_size: { value: 0.5, min: 0.0, max: 1.0, step: 0.05 } },
};

export default function TwiglShaderProcessor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [selectedEffect, setSelectedEffect] = useState<string>('none');
  const [shaderCode, setShaderCode] = useState<string>('');
  const [shaderMode, setShaderMode] = useState<ShaderMode>('geekest');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [uniformValues, setUniformValues] = useState<Record<string, any>>({});
  const [imageOriginalDimensions, setImageOriginalDimensions] = useState<{width: number; height: number} | null>(null);
  const [isImageResized, setIsImageResized] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState('effects');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const twiglCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Add state for animation
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationFrames, setAnimationFrames] = useState<string[]>([]);
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'png'|'gif'|'webm'>('png');
  const animationRef = useRef<number | null>(null);
  const frameDurationRef = useRef(100); // ms per frame
  const totalFramesRef = useRef(10); // for GIF

  // Add state for GIF library
  const [gifLib, setGifLib] = useState<any>(null);

  // Add a state for WebGL support
  const [isWebGLSupported, setIsWebGLSupported] = useState<boolean | null>(null);

  // Add useEffect to load GIF library on client side
  useEffect(() => {
    // Load GIF.js library on client-side only
    if (typeof window !== 'undefined') {
      import('gif.js').then((module) => {
        setGifLib(module.default);
      }).catch((error) => {
        console.error('Error loading GIF library:', error);
      });
    }
  }, []);

  // Add useEffect to check WebGL support on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if WebGL is supported
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) {
        console.warn('WebGL not supported. Some features will be disabled.');
        setIsWebGLSupported(false);
      } else {
        setIsWebGLSupported(true);
      }
    }
  }, []);

  // Update the implementShaderEffect function with better type checking
  const implementShaderEffect = (canvas: HTMLCanvasElement, sourceImage: HTMLImageElement, shaderCode: string, uniforms: Record<string, any>) => {
    try {
      // Get WebGL context
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2') || canvas.getContext('experimental-webgl');
      if (!gl) {
        console.error('WebGL not supported');
        // Fallback to 2D canvas
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
          // Add a text overlay to indicate WebGL is not available
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(0, 0, canvas.width, 30);
          ctx.fillStyle = 'white';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('WebGL not supported - showing original image', canvas.width / 2, 20);
        }
        return false;
      }

      // Now that we know gl is a WebGLRenderingContext, we can safely use it
      const webGLContext = gl as WebGLRenderingContext;

      // Vertex shader source - just pass through positions and texture coordinates
      const vsSource = `
        attribute vec4 aVertexPosition;
        attribute vec2 aTextureCoord;
        varying vec2 vTextureCoord;
        void main() {
          gl_Position = aVertexPosition;
          vTextureCoord = aTextureCoord;
        }
      `;

      // Fragment shader source - this will be the shader code from Twigl
      // We need to adapt it based on the mode
      let fsSource = '';
      
      // For geekest mode, we need to add some boilerplate
      fsSource = `
        precision highp float;
        
        uniform vec2 r; // resolution
        uniform float t; // time
        uniform sampler2D b; // backbuffer (original image)
        
        // Custom uniforms
        ${Object.entries(uniforms).map(([key, value]) => 
          `uniform float ${key};`
        ).join('\n')}
        
        #define FC gl_FragCoord
        #define o gl_FragColor
        
        // Useful functions
        mat2 rotate2D(float r){
          return mat2(cos(r), sin(r), -sin(r), cos(r));
        }
        
        // Main code from Twigl
        void main() {
          ${shaderCode}
        }
      `;
      
      // For non-geekest modes, we'd need different adaptations
      
      // Create shader program
      const program = createShaderProgram(webGLContext, vsSource, fsSource);
      if (!program) {
        console.error('Failed to create shader program');
        return false;
      }
      
      // Set up geometry (a simple quad that fills the canvas)
      const positions = [
        -1.0, -1.0,
         1.0, -1.0,
         1.0,  1.0,
        -1.0,  1.0,
      ];
      const texCoords = [
        0.0, 0.0,
        1.0, 0.0,
        1.0, 1.0,
        0.0, 1.0,
      ];
      const indices = [0, 1, 2, 0, 2, 3];
      
      // Create buffers
      const positionBuffer = webGLContext.createBuffer();
      webGLContext.bindBuffer(webGLContext.ARRAY_BUFFER, positionBuffer);
      webGLContext.bufferData(webGLContext.ARRAY_BUFFER, new Float32Array(positions), webGLContext.STATIC_DRAW);
      
      const texCoordBuffer = webGLContext.createBuffer();
      webGLContext.bindBuffer(webGLContext.ARRAY_BUFFER, texCoordBuffer);
      webGLContext.bufferData(webGLContext.ARRAY_BUFFER, new Float32Array(texCoords), webGLContext.STATIC_DRAW);
      
      const indexBuffer = webGLContext.createBuffer();
      webGLContext.bindBuffer(webGLContext.ELEMENT_ARRAY_BUFFER, indexBuffer);
      webGLContext.bufferData(webGLContext.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), webGLContext.STATIC_DRAW);
      
      // Set up attributes
      const aVertexPosition = webGLContext.getAttribLocation(program, 'aVertexPosition');
      webGLContext.bindBuffer(webGLContext.ARRAY_BUFFER, positionBuffer);
      webGLContext.vertexAttribPointer(aVertexPosition, 2, webGLContext.FLOAT, false, 0, 0);
      webGLContext.enableVertexAttribArray(aVertexPosition);
      
      const aTextureCoord = webGLContext.getAttribLocation(program, 'aTextureCoord');
      webGLContext.bindBuffer(webGLContext.ARRAY_BUFFER, texCoordBuffer);
      webGLContext.vertexAttribPointer(aTextureCoord, 2, webGLContext.FLOAT, false, 0, 0);
      webGLContext.enableVertexAttribArray(aTextureCoord);
      
      // Create texture from source image
      const texture = webGLContext.createTexture();
      webGLContext.bindTexture(webGLContext.TEXTURE_2D, texture);
      
      // Set texture parameters
      webGLContext.texParameteri(webGLContext.TEXTURE_2D, webGLContext.TEXTURE_WRAP_S, webGLContext.CLAMP_TO_EDGE);
      webGLContext.texParameteri(webGLContext.TEXTURE_2D, webGLContext.TEXTURE_WRAP_T, webGLContext.CLAMP_TO_EDGE);
      webGLContext.texParameteri(webGLContext.TEXTURE_2D, webGLContext.TEXTURE_MIN_FILTER, webGLContext.LINEAR);
      webGLContext.texParameteri(webGLContext.TEXTURE_2D, webGLContext.TEXTURE_MAG_FILTER, webGLContext.LINEAR);
      
      // Upload the image into the texture
      webGLContext.texImage2D(webGLContext.TEXTURE_2D, 0, webGLContext.RGBA, webGLContext.RGBA, webGLContext.UNSIGNED_BYTE, sourceImage);
      
      // Use the shader program
      webGLContext.useProgram(program);
      
      // Set uniforms
      const uResolution = webGLContext.getUniformLocation(program, 'r');
      webGLContext.uniform2f(uResolution, canvas.width, canvas.height);
      
      const uTime = webGLContext.getUniformLocation(program, 't');
      webGLContext.uniform1f(uTime, performance.now() / 1000.0);
      
      const uTexture = webGLContext.getUniformLocation(program, 'b');
      webGLContext.uniform1i(uTexture, 0);
      
      // Set custom uniforms
      Object.entries(uniforms).forEach(([key, value]) => {
        const uCustom = webGLContext.getUniformLocation(program, key);
        if (uCustom) {
          if (typeof value === 'number') {
            webGLContext.uniform1f(uCustom, value);
          }
          // Add other types as needed
        }
      });
      
      // Clear the canvas and draw
      webGLContext.clearColor(0.0, 0.0, 0.0, 1.0);
      webGLContext.clear(webGLContext.COLOR_BUFFER_BIT);
      
      webGLContext.bindBuffer(webGLContext.ELEMENT_ARRAY_BUFFER, indexBuffer);
      webGLContext.drawElements(webGLContext.TRIANGLES, 6, webGLContext.UNSIGNED_SHORT, 0);
      
      return true;
    } catch (error) {
      console.error('Error in shader effect implementation:', error);
      // Fallback to 2D canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
      }
      return false;
    }
  };

  // Update the loadShader function to use proper WebGL context typing
  const loadShader = (gl: WebGLRenderingContext, type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) {
      console.error('Unable to create shader');
      return null;
    }
    
    // Set the shader source code
    gl.shaderSource(shader, source);
    
    // Compile the shader
    gl.compileShader(shader);
    
    // Check if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('An error occurred compiling the shader: ' + gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  };

  // Update the createShaderProgram function to use proper WebGL context typing
  const createShaderProgram = (gl: WebGLRenderingContext, vsSource: string, fsSource: string) => {
    // Create the shader objects
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    
    if (!vertexShader || !fragmentShader) {
      return null;
    }
    
    // Create the shader program
    const program = gl.createProgram();
    if (!program) {
      console.error('Unable to create shader program');
      return null;
    }
    
    // Attach the shaders to the program
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    
    // Link the program
    gl.linkProgram(program);
    
    // Check if it linked successfully
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Unable to link shader program: ' + gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    
    return program;
  };

  // Now update the debouncedProcessShader function to use our real shader implementation
  const debouncedProcessShader = useCallback(
    debounce(async (effect: string, values: Record<string, any>) => {
      if (!imageRef.current || effect === 'none') return;
      
      try {
        setIsProcessing(true);
        
        // Get the shader code for the selected effect
        const shaderCode = EXAMPLE_SHADERS[effect as keyof typeof EXAMPLE_SHADERS] || '';
        
        // Set up canvas for rendering
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Ensure canvas dimensions match the image
        canvas.width = imageRef.current.width;
        canvas.height = imageRef.current.height;
        
        if (isWebGLSupported === false) {
          // WebGL not supported, show fallback message
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imageRef.current, 0, 0);
            
            // Add a text overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, 40);
            ctx.fillStyle = 'white';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('WebGL not supported in your browser', canvas.width / 2, 20);
            ctx.font = '12px sans-serif';
            ctx.fillText('Shader effects cannot be applied', canvas.width / 2, 35);
            
            setProcessedImageUrl(canvas.toDataURL('image/png', 1.0));
          }
          return;
        }
        
        // Process the image with actual WebGL shader
        const success = implementShaderEffect(canvas, imageRef.current, shaderCode, values);
        
        if (success) {
          // Get the processed image data
          const dataUrl = canvas.toDataURL('image/png', 1.0);
          setProcessedImageUrl(dataUrl);
        } else {
          // If WebGL rendering failed, fall back to a simple display of the original
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imageRef.current, 0, 0);
            setProcessedImageUrl(canvas.toDataURL('image/png', 1.0));
          }
        }
      } catch (error) {
        console.error('Error in shader processing:', error);
      } finally {
        setIsProcessing(false);
      }
    }, 150),
    [isWebGLSupported]
  );
  
  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Check if the file is an image
      if (!file.type.startsWith('image/')) {
        setIsError(true);
        setErrorMessage('Please select an image file.');
        return;
      }
      
      setSelectedFile(file);
      
      // Create a high-quality object URL for the image
      const fileUrl = URL.createObjectURL(file);
      setImageUrl(fileUrl);
      setProcessedImageUrl(null); // Reset processed image
      setIsError(false);
      
      // Load the image to check its dimensions
      const img = new Image();
      img.onload = () => {
        // Store original dimensions
        setImageOriginalDimensions({
          width: img.width,
          height: img.height
        });
        
        // Initialize canvas with proper dimensions
        if (canvasRef.current) {
          canvasRef.current.width = img.width;
          canvasRef.current.height = img.height;
          
          // Draw the original image to the canvas
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, img.width, img.height);
          }
        }
        
        // Set as the source for processing
        imageRef.current = img;
        
        // If there was a selected effect, apply it to the new image
        if (selectedEffect !== 'none') {
          debouncedProcessShader(selectedEffect, uniformValues);
        }
      };
      
      // Set image source to the object URL
      img.src = fileUrl;
    }
  };
  
  // Effect to update shader code when effect is selected
  useEffect(() => {
    if (selectedEffect === 'none') {
      setShaderCode('');
      return;
    }
    
    // Set the shader code from our examples
    setShaderCode(EXAMPLE_SHADERS[selectedEffect as keyof typeof EXAMPLE_SHADERS] || '');
    
    // Initialize uniform values for the selected effect
    const effectUniforms = EXAMPLE_UNIFORMS[selectedEffect as keyof typeof EXAMPLE_UNIFORMS] || {};
    const initialValues: Record<string, any> = {};
    
    // Type safety for the uniform values
    Object.entries(effectUniforms).forEach(([key, uniformValue]) => {
      const uniform = uniformValue as { value: any; min?: number; max?: number; step?: number; name?: string };
      initialValues[key] = uniform.value;
    });
    
    setUniformValues(initialValues);
  }, [selectedEffect]);
  
  // Effect to apply processing when effect or uniform values change
  useEffect(() => {
    if (imageRef.current && selectedEffect !== 'none') {
      debouncedProcessShader(selectedEffect, uniformValues);
    }
  }, [selectedEffect, uniformValues, debouncedProcessShader]);
  
  // Handle real-time uniform value changes with preview
  const handleUniformChange = (key: string, value: any) => {
    setUniformValues(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Handle reset to original image
  const handleResetImage = () => {
    setProcessedImageUrl(null);
    setSelectedEffect('none');
    setUniformValues({});
    setShaderCode('');
  };
  
  // Handle download
  const handleDownload = () => {
    if (processedImageUrl) {
      downloadFile(processedImageUrl, 'twigl-processed-image.png');
    }
  };
  
  // Handle shader mode change
  const handleModeChange = (mode: ShaderMode) => {
    setShaderMode(mode);
    // We'd need to adapt the shader code for the new mode
    // For now, let's just log the change
    console.log(`Changed shader mode to: ${mode}`);
  };

  // Update the generateAnimationFrames function for proper typing
  const generateAnimationFrames = useCallback(async (numFrames: number, effect: string, values: Record<string, any>) => {
    if (!imageRef.current || effect === 'none' || isWebGLSupported === false) {
      console.warn('Cannot generate animation frames: image not loaded, no effect selected, or WebGL not supported');
      return [];
    }
    
    console.log(`Generating ${numFrames} animation frames for effect: ${effect}`);
    const frames: string[] = [];
    const canvas = document.createElement('canvas');
    if (!canvas) return frames;
    
    // Ensure canvas dimensions match the image
    canvas.width = imageRef.current.width;
    canvas.height = imageRef.current.height;
    
    // Generate frames with different time values
    for (let i = 0; i < numFrames; i++) {
      try {
        // Get the shader code
        const shaderCode = EXAMPLE_SHADERS[effect as keyof typeof EXAMPLE_SHADERS] || '';
        
        // Update time-based values for animation
        const timeValue = i / numFrames * 2.0; // 0 to 2 seconds
        const frameValues = { ...values, t: timeValue };
        
        // Process with WebGL
        const ctx = canvas.getContext('2d');
        const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
        
        if (!gl && ctx) {
          // If WebGL is not available but 2D context is, just draw the original image
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
          frames.push(canvas.toDataURL('image/png', 1.0));
          continue;
        }
        
        if (!gl) {
          console.error('Failed to get WebGL context for animation frame generation');
          continue;
        }
        
        // We know gl is a WebGLRenderingContext
        const webGLContext = gl as WebGLRenderingContext;
        
        // Create shader program from scratch for each frame to avoid state issues
        // Set up basic vertex shader
        const vsSource = `
          attribute vec4 aVertexPosition;
          attribute vec2 aTextureCoord;
          varying vec2 vTextureCoord;
          void main() {
            gl_Position = aVertexPosition;
            vTextureCoord = aTextureCoord;
          }
        `;
        
        // Set up fragment shader with time value
        const fsSource = `
          precision highp float;
          
          uniform vec2 r; // resolution
          uniform float t; // time
          uniform sampler2D b; // backbuffer (original image)
          
          // Custom uniforms
          ${Object.entries(frameValues).map(([key, value]) => 
            `uniform float ${key};`
          ).join('\n')}
          
          #define FC gl_FragCoord
          #define o gl_FragColor
          
          // Useful functions
          mat2 rotate2D(float r){
            return mat2(cos(r), sin(r), -sin(r), cos(r));
          }
          
          // Main code from Twigl
          void main() {
            ${shaderCode}
          }
        `;
        
        // Create program
        const vertexShader = loadShader(webGLContext, webGLContext.VERTEX_SHADER, vsSource);
        const fragmentShader = loadShader(webGLContext, webGLContext.FRAGMENT_SHADER, fsSource);
        
        if (!vertexShader || !fragmentShader) {
          console.error('Failed to compile shaders for animation frame');
          continue;
        }
        
        const program = webGLContext.createProgram();
        if (!program) {
          console.error('Failed to create shader program for animation frame');
          continue;
        }
        
        webGLContext.attachShader(program, vertexShader);
        webGLContext.attachShader(program, fragmentShader);
        webGLContext.linkProgram(program);
        
        if (!webGLContext.getProgramParameter(program, webGLContext.LINK_STATUS)) {
          console.error('Unable to link shader program:', webGLContext.getProgramInfoLog(program));
          webGLContext.deleteProgram(program);
          continue;
        }
        
        // Set up geometry
        const positions = [
          -1.0, -1.0,
           1.0, -1.0,
           1.0,  1.0,
          -1.0,  1.0,
        ];
        
        const texCoords = [
          0.0, 0.0,
          1.0, 0.0,
          1.0, 1.0,
          0.0, 1.0,
        ];
        
        const indices = [0, 1, 2, 0, 2, 3];
        
        // Create buffers
        const positionBuffer = webGLContext.createBuffer();
        webGLContext.bindBuffer(webGLContext.ARRAY_BUFFER, positionBuffer);
        webGLContext.bufferData(webGLContext.ARRAY_BUFFER, new Float32Array(positions), webGLContext.STATIC_DRAW);
        
        const texCoordBuffer = webGLContext.createBuffer();
        webGLContext.bindBuffer(webGLContext.ARRAY_BUFFER, texCoordBuffer);
        webGLContext.bufferData(webGLContext.ARRAY_BUFFER, new Float32Array(texCoords), webGLContext.STATIC_DRAW);
        
        const indexBuffer = webGLContext.createBuffer();
        webGLContext.bindBuffer(webGLContext.ELEMENT_ARRAY_BUFFER, indexBuffer);
        webGLContext.bufferData(webGLContext.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), webGLContext.STATIC_DRAW);
        
        // Set up attributes
        const aVertexPosition = webGLContext.getAttribLocation(program, 'aVertexPosition');
        webGLContext.bindBuffer(webGLContext.ARRAY_BUFFER, positionBuffer);
        webGLContext.vertexAttribPointer(aVertexPosition, 2, webGLContext.FLOAT, false, 0, 0);
        webGLContext.enableVertexAttribArray(aVertexPosition);
        
        const aTextureCoord = webGLContext.getAttribLocation(program, 'aTextureCoord');
        webGLContext.bindBuffer(webGLContext.ARRAY_BUFFER, texCoordBuffer);
        webGLContext.vertexAttribPointer(aTextureCoord, 2, webGLContext.FLOAT, false, 0, 0);
        webGLContext.enableVertexAttribArray(aTextureCoord);
        
        // Create texture from source image
        const texture = webGLContext.createTexture();
        webGLContext.bindTexture(webGLContext.TEXTURE_2D, texture);
        
        // Set texture parameters
        webGLContext.texParameteri(webGLContext.TEXTURE_2D, webGLContext.TEXTURE_WRAP_S, webGLContext.CLAMP_TO_EDGE);
        webGLContext.texParameteri(webGLContext.TEXTURE_2D, webGLContext.TEXTURE_WRAP_T, webGLContext.CLAMP_TO_EDGE);
        webGLContext.texParameteri(webGLContext.TEXTURE_2D, webGLContext.TEXTURE_MIN_FILTER, webGLContext.LINEAR);
        webGLContext.texParameteri(webGLContext.TEXTURE_2D, webGLContext.TEXTURE_MAG_FILTER, webGLContext.LINEAR);
        
        // Upload the image into the texture
        webGLContext.texImage2D(webGLContext.TEXTURE_2D, 0, webGLContext.RGBA, webGLContext.RGBA, webGLContext.UNSIGNED_BYTE, imageRef.current);
        
        // Use the shader program
        webGLContext.useProgram(program);
        
        // Set uniforms
        const uResolution = webGLContext.getUniformLocation(program, 'r');
        webGLContext.uniform2f(uResolution, canvas.width, canvas.height);
        
        const uTime = webGLContext.getUniformLocation(program, 't');
        webGLContext.uniform1f(uTime, timeValue);
        
        const uTexture = webGLContext.getUniformLocation(program, 'b');
        webGLContext.uniform1i(uTexture, 0);
        
        // Set custom uniforms
        Object.entries(frameValues).forEach(([key, value]) => {
          if (key === 't') return; // Already set above
          const uCustom = webGLContext.getUniformLocation(program, key);
          if (uCustom) {
            if (typeof value === 'number') {
              webGLContext.uniform1f(uCustom, value);
            }
          }
        });
        
        // Clear the canvas and draw
        webGLContext.clearColor(0.0, 0.0, 0.0, 1.0);
        webGLContext.clear(webGLContext.COLOR_BUFFER_BIT);
        
        webGLContext.bindBuffer(webGLContext.ELEMENT_ARRAY_BUFFER, indexBuffer);
        webGLContext.drawElements(webGLContext.TRIANGLES, 6, webGLContext.UNSIGNED_SHORT, 0);
        
        // Add frame to the array
        frames.push(canvas.toDataURL('image/png', 1.0));
        
        // Clean up
        webGLContext.deleteProgram(program);
        webGLContext.deleteShader(vertexShader);
        webGLContext.deleteShader(fragmentShader);
        webGLContext.deleteBuffer(positionBuffer);
        webGLContext.deleteBuffer(texCoordBuffer);
        webGLContext.deleteBuffer(indexBuffer);
        webGLContext.deleteTexture(texture);
        
      } catch (error) {
        console.error('Error generating animation frame:', error);
      }
    }
    
    console.log(`Generated ${frames.length} frames`);
    return frames;
  }, [imageRef, isWebGLSupported]);

  // Update exportToGif function to use the loaded gifLib
  const exportToGif = useCallback(async (frames: string[]) => {
    try {
      setIsExporting(true);
      setExportProgress(0);
      
      if (!frames.length) {
        throw new Error('No frames to export');
      }
      
      if (!gifLib) {
        throw new Error('GIF library not loaded');
      }
      
      // Create a new GIF instance
      const gif = new gifLib({
        workers: 2,
        quality: 10,
        width: imageRef.current?.width || 300,
        height: imageRef.current?.height || 300,
        workerScript: '/gif.worker.js', // Path to worker script in public directory
      });
      
      // Load all frames into the GIF
      const loadImagePromises = frames.map((frameDataUrl, index) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            gif.addFrame(img, { delay: frameDurationRef.current });
            setExportProgress(((index + 1) / frames.length) * 0.8); // 80% for frame loading
            resolve();
          };
          img.src = frameDataUrl;
        });
      });
      
      // Wait for all frames to load
      await Promise.all(loadImagePromises);
      
      // Render the GIF
      gif.on('progress', (p: number) => {
        setExportProgress(0.8 + (p * 0.2)); // Remaining 20% for rendering
      });
      
      gif.on('finished', (blob: Blob) => {
        // Create a download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `twigl-shader-export-${Date.now()}.gif`;
        link.click();
        
        // Clean up
        URL.revokeObjectURL(url);
        setIsExporting(false);
        setExportProgress(0);
      });
      
      // Start rendering
      gif.render();
      
    } catch (error: unknown) {
      console.error('Error exporting GIF:', error);
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      alert(`Error exporting GIF: ${errorMessage}`);
      setIsExporting(false);
    }
  }, [gifLib]);

  // Add function to export as WebM (using MediaRecorder API)
  const exportToWebM = useCallback(async (effect: string, values: Record<string, any>, duration: number) => {
    try {
      setIsExporting(true);
      setExportProgress(0);
      
      const canvas = canvasRef.current;
      if (!canvas || !imageRef.current) {
        throw new Error('Canvas or image not available');
      }
      
      // Ensure canvas dimensions match the image
      canvas.width = imageRef.current.width;
      canvas.height = imageRef.current.height;
      
      // Set up MediaRecorder with canvas stream
      const stream = canvas.captureStream(30); // 30 FPS
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000,
      });
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        // Create a downloadable blob
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = `twigl-shader-export-${Date.now()}.webm`;
        link.click();
        
        // Clean up
        URL.revokeObjectURL(url);
        setIsExporting(false);
        setExportProgress(0);
        
        // Stop animation loop
        if (animationRef.current !== null) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
      };
      
      // Start recording
      recorder.start();
      
      // Animate the shader during recording
      let startTime = performance.now();
      const shaderCode = EXAMPLE_SHADERS[effect as keyof typeof EXAMPLE_SHADERS] || '';
      
      const animateAndRecord = () => {
        const currentTime = performance.now();
        const elapsed = (currentTime - startTime) / 1000; // seconds
        
        // Update progress
        setExportProgress(Math.min(elapsed / duration, 1.0));
        
        // Process with WebGL using current time
        implementShaderEffect(
          canvas, 
          imageRef.current!, 
          shaderCode, 
          { ...values, t: elapsed }
        );
        
        // Continue animation until duration is reached
        if (elapsed < duration) {
          animationRef.current = requestAnimationFrame(animateAndRecord);
        } else {
          // Stop recording when done
          recorder.stop();
        }
      };
      
      // Start animation loop
      animationRef.current = requestAnimationFrame(animateAndRecord);
      
    } catch (error: unknown) {
      console.error('Error exporting WebM:', error);
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      alert(`Error exporting WebM: ${errorMessage}`);
      setIsExporting(false);
    }
  }, []);

  // Update the handleExport function to handle errors better
  const handleExport = useCallback(async () => {
    if (isExporting || !imageRef.current) return;
    
    try {
      if (exportType === 'png') {
        // Export as PNG (single frame)
        if (processedImageUrl) {
          const link = document.createElement('a');
          link.href = processedImageUrl;
          link.download = `shader-export-${Date.now()}.png`;
          link.click();
        }
      } else if (exportType === 'gif') {
        // Export as animated GIF
        setIsAnimating(true);
        console.log('Starting GIF export process');
        
        // Generate more frames for smoother animation
        const frameCount = 20; // Increase number of frames
        const frames = await generateAnimationFrames(frameCount, selectedEffect, uniformValues);
        
        console.log(`Generated ${frames.length} frames for GIF`);
        setAnimationFrames(frames);
        
        if (frames.length === 0) {
          throw new Error('Failed to generate animation frames for GIF');
        }
        
        await exportToGif(frames);
      } else if (exportType === 'webm') {
        // Export as WebM video
        setIsAnimating(true);
        // Start WebM export with longer animation
        await exportToWebM(selectedEffect, uniformValues, 5.0);
      }
    } catch (error: unknown) {
      console.error('Error exporting:', error);
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      alert(`Export failed: ${errorMessage}`);
    } finally {
      setIsAnimating(false);
    }
  }, [exportType, processedImageUrl, selectedEffect, uniformValues, generateAnimationFrames, exportToGif, exportToWebM]);

  return (
    <div className="flex h-screen w-full dark:bg-gray-900 text-gray-100 relative overflow-hidden">
      {/* Add WebGL support warning if needed */}
      {isWebGLSupported === false && (
        <div className="absolute top-0 left-0 right-0 bg-red-600 text-white p-2 z-50 text-center">
          WebGL is not supported in your browser. Shader effects will not work. Please try a different browser.
        </div>
      )}
      
      <div className="flex flex-col h-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold">Twigl Shader Processor</h2>
          <p className="text-muted-foreground">Upload an image and apply advanced shader effects using Twigl technology</p>
        </div>
        
        <div className="flex flex-1 gap-6">
          {/* Left Sidebar */}
          <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden flex flex-col">
            {/* File Upload Section */}
            <div className="p-4 border-b">
              <h3 className="font-medium mb-3">Image Upload</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-center w-full">
                    <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl border-gray-300 dark:border-gray-600 cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                        </svg>
                        <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                          {selectedFile ? selectedFile.name : "Click to upload image"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG or WebP</p>
                      </div>
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                
                {isError && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    {errorMessage}
                  </div>
                )}
                
                {imageOriginalDimensions && (
                  <div className="text-xs text-gray-500">
                    Image dimensions: {imageOriginalDimensions.width} × {imageOriginalDimensions.height}px
                  </div>
                )}
              </div>
            </div>
            
            {/* Controls Tabs */}
            <div className="flex-1 overflow-y-auto">
              <Tabs 
                defaultValue="effects" 
                value={activeSidebarTab} 
                onValueChange={setActiveSidebarTab}
                className="w-full"
              >
                <div className="border-b">
                  <TabsList className="w-full justify-start p-0 h-auto bg-transparent border-b rounded-none">
                    <TabsTrigger 
                      value="effects" 
                      className="data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700 rounded-none py-3 px-4 transition-colors"
                    >
                      Effects
                    </TabsTrigger>
                    <TabsTrigger 
                      value="code" 
                      className="data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700 rounded-none py-3 px-4 transition-colors"
                    >
                      Code
                    </TabsTrigger>
                    <TabsTrigger 
                      value="settings" 
                      className="data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700 rounded-none py-3 px-4 transition-colors"
                    >
                      Settings
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="effects" className="p-4 space-y-6 mt-0">
                  {/* Shader Selection */}
                  <div>
                    <h3 className="font-medium mb-4">Select Effect</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.keys(EXAMPLE_SHADERS).map((effectKey) => (
                        <Button
                          key={effectKey}
                          variant={selectedEffect === effectKey ? "default" : "outline"}
                          className={`text-sm justify-start px-3 py-2 h-auto rounded-lg ${selectedEffect === effectKey ? 'bg-primary text-white shadow-sm' : ''}`}
                          onClick={() => setSelectedEffect(effectKey)}
                        >
                          {effectKey.charAt(0).toUpperCase() + effectKey.slice(1)}
                        </Button>
                      ))}
                      <Button
                        variant={selectedEffect === 'none' ? "default" : "outline"}
                        className={`text-sm justify-start px-3 py-2 h-auto rounded-lg ${selectedEffect === 'none' ? 'bg-primary text-white shadow-sm' : ''}`}
                        onClick={() => setSelectedEffect('none')}
                      >
                        None
                      </Button>
                    </div>
                  </div>
                  
                  {/* Effect Parameters */}
                  {selectedEffect !== 'none' && EXAMPLE_UNIFORMS[selectedEffect as keyof typeof EXAMPLE_UNIFORMS] && (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium">Effect Parameters</h3>
                        {isProcessing && (
                          <div className="flex items-center text-xs text-blue-600">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Previewing...
                          </div>
                        )}
                      </div>
                      <div className="space-y-5">
                        {Object.entries(EXAMPLE_UNIFORMS[selectedEffect as keyof typeof EXAMPLE_UNIFORMS]).map(([key, uniformValue]) => {
                          // Type safety for uniform values
                          const uniform = uniformValue as { value: any; min?: number; max?: number; step?: number; name?: string };
                          
                          // Get the current value, falling back to the default
                          const value = uniformValues[key] !== undefined ? uniformValues[key] : uniform.value;
                          
                          return (
                            <div key={key} className="space-y-2">
                              <div className="flex justify-between">
                                <Label htmlFor={key} className="text-sm">
                                  {uniform.name || key}
                                </Label>
                                <span className="text-sm font-mono text-gray-600 dark:text-gray-300">
                                  {typeof value === 'number' ? value.toFixed(2) : value}
                                </span>
                              </div>
                              <Slider
                                id={key}
                                min={uniform.min || 0}
                                max={uniform.max || 1}
                                step={uniform.step || 0.01}
                                value={[value]}
                                onValueChange={([newValue]) => handleUniformChange(key, newValue)}
                                className="pt-2"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6 space-y-2">
                    <Button 
                      className="w-full rounded-lg shadow-sm hover:shadow"
                      variant="outline"
                      onClick={handleResetImage}
                    >
                      Reset Image
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="code" className="p-4 space-y-6 mt-0">
                  <div>
                    <h3 className="font-medium mb-4">Shader Code</h3>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm">Shader Mode</Label>
                        <div className="flex mt-2 space-x-2">
                          {(['classic', 'geek', 'geeker', 'geekest'] as ShaderMode[]).map((mode) => (
                            <Button
                              key={mode}
                              variant={shaderMode === mode ? "default" : "outline"}
                              size="sm"
                              className={`text-xs ${shaderMode === mode ? 'bg-primary text-white' : ''}`}
                              onClick={() => handleModeChange(mode)}
                            >
                              {mode}
                            </Button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-auto" style={{ height: '300px' }}>
                        <pre>{shaderCode || 'No shader code available. Select an effect first.'}</pre>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        <p>In <strong>geekest</strong> mode, Twigl provides shortcuts like:</p>
                        <ul className="list-disc pl-5 mt-1">
                          <li><code>FC</code> for <code>gl_FragCoord</code></li>
                          <li><code>r</code> for <code>resolution</code></li>
                          <li><code>t</code> for <code>time</code></li>
                          <li><code>b</code> for <code>backbuffer</code></li>
                          <li><code>o</code> for <code>outColor</code> (output)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="settings" className="p-4 space-y-6 mt-0">
                  <div>
                    <h3 className="font-medium mb-4">Twigl Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm">Output Format</Label>
                        <select 
                          className="w-full p-2 border rounded-lg mt-1" 
                          defaultValue="png"
                        >
                          <option value="png">PNG (Lossless)</option>
                          <option value="jpg">JPG (High Quality)</option>
                          <option value="gif">Animated GIF</option>
                          <option value="webm">WebM Video</option>
                        </select>
                      </div>
                      
                      <div className="pt-4">
                        <h4 className="text-sm font-medium mb-2">WebGL Options</h4>
                        <div className="flex items-center">
                          <input type="checkbox" id="webgl2" className="mr-2 rounded" defaultChecked />
                          <Label htmlFor="webgl2" className="text-sm">
                            Use WebGL 2.0 when available
                          </Label>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Enables GLSL ES 3.0 features for more advanced shaders
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
          
          {/* Main Canvas Area */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <h3 className="font-medium">Canvas</h3>
                {selectedEffect !== 'none' && (
                  <div className="text-sm text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                    {selectedEffect.charAt(0).toUpperCase() + selectedEffect.slice(1)}
                  </div>
                )}
              </div>
              
              {processedImageUrl && (
                <Button size="sm" variant="outline" onClick={handleExport} className="rounded-lg shadow-sm">
                  <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Export
                </Button>
              )}
            </div>
            
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-neutral-100 dark:bg-gray-700" style={{ backgroundImage: 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABh0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMS4xYwSAYwAAADRJREFUOE9jGAUD17+6//9xYbA+TAwXhxkCVs9EAYQYTAwXB6PBbyDMAEIYJg4SPwgBAyMAACyBl26j/nYGAAAAAElFTkSuQmCC")' }}>
              {imageUrl && (
                <div className="relative max-w-full max-h-full">
                  {processedImageUrl ? (
                    <img
                      src={processedImageUrl}
                      alt="Processed"
                      className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                      style={{ maxHeight: 'calc(100vh - 230px)' }}
                    />
                  ) : (
                    <img
                      src={imageUrl}
                      alt="Original"
                      className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                      style={{ maxHeight: 'calc(100vh - 230px)' }}
                    />
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                  <canvas ref={twiglCanvasRef} id="twigl-canvas" className="hidden" />
                </div>
              )}
              
              {!imageUrl && (
                <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-3">No Image Loaded</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">Upload an image to apply Twigl shader effects</p>
                  <label htmlFor="image-upload-center" className="cursor-pointer inline-flex items-center px-5 py-2.5 bg-blue-600 border border-transparent rounded-lg text-white hover:bg-blue-700 shadow-sm transition-colors">
                    Select Image
                    <input
                      id="image-upload-center"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>
                </div>
              )}
            </div>
            
            {imageOriginalDimensions && selectedEffect !== 'none' && (
              <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-100 dark:border-amber-900/30">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Using Twigl shader processing with {shaderMode} mode. Image: {imageOriginalDimensions.width}×{imageOriginalDimensions.height}px
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Export Section */}
        <div className="absolute bottom-4 right-4 flex flex-col space-y-2 p-3 bg-gray-800 rounded-lg shadow-md">
          <div className="flex space-x-2 mb-2">
            <div className="flex items-center">
              <input
                type="radio"
                id="png-export"
                name="export-type"
                value="png"
                checked={exportType === 'png'}
                onChange={() => setExportType('png')}
                className="mr-1"
              />
              <label htmlFor="png-export" className="text-xs text-white">PNG</label>
            </div>
            
            <div className="flex items-center">
              <input
                type="radio"
                id="gif-export"
                name="export-type"
                value="gif"
                checked={exportType === 'gif'}
                onChange={() => setExportType('gif')}
                disabled={isWebGLSupported === false}
                className="mr-1"
              />
              <label htmlFor="gif-export" className={`text-xs ${isWebGLSupported === false ? 'text-gray-500' : 'text-white'}`}>GIF</label>
            </div>
            
            <div className="flex items-center">
              <input
                type="radio"
                id="webm-export"
                name="export-type"
                value="webm"
                checked={exportType === 'webm'}
                onChange={() => setExportType('webm')}
                disabled={isWebGLSupported === false}
                className="mr-1"
              />
              <label htmlFor="webm-export" className={`text-xs ${isWebGLSupported === false ? 'text-gray-500' : 'text-white'}`}>WebM</label>
            </div>
          </div>
          
          {isExporting && (
            <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${exportProgress * 100}%` }}
              ></div>
            </div>
          )}
          
          <button
            onClick={handleExport}
            disabled={isProcessing || isExporting || isAnimating || !processedImageUrl || (isWebGLSupported === false && exportType !== 'png')}
            className={`px-4 py-2 ${isProcessing || isExporting || isAnimating || !processedImageUrl || (isWebGLSupported === false && exportType !== 'png')
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
            } text-white rounded transition`}
          >
            {isExporting
              ? 'Exporting...'
              : isAnimating
                ? 'Preparing...'
                : `Export as ${exportType.toUpperCase()}`
            }
          </button>
        </div>
      </div>
    </div>
  );
} 