/**
 * WebGL Utilities for Image Processing
 * 
 * This module provides utilities for working with WebGL shaders
 * for browser environments.
 */

import { isBrowser, createCanvas, safelyImportBrowserModule } from './browser-utils';

// Ensure TypeScript recognizes the gif.js.optimized module
// This is a fallback in case the separate .d.ts file isn't found
declare module 'gif.js.optimized';

// Ensure TypeScript recognizes the gif.js module
declare module 'gif.js';

// Types for our shader system
export interface ShaderUniform {
  type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'int' | 'bool' | 'sampler2D';
  value: number | number[] | boolean | null;
  min?: number;
  max?: number;
  step?: number;
}

export interface ShaderProgram {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation>;
  attributes: Record<string, number>;
}

export interface ShaderEffect {
  name: string;
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, ShaderUniform>;
}

// Default shaders
export const DEFAULT_VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  
  varying vec2 v_texCoord;
  
  void main() {
    gl_Position = vec4(a_position, 0, 1);
    v_texCoord = a_texCoord;
  }
`;

// Helper function to check if we're in a Node.js environment
// Note: For now, this always returns false since we're focusing on browser-only functionality
export const isNode = (): boolean => {
  return !isBrowser();
};

// Initialize WebGL context
export const initWebGL = (canvas: HTMLCanvasElement): WebGLRenderingContext | null => {
  let gl: WebGLRenderingContext | null = null;
  
  try {
    // Try to get the WebGL context
    gl = canvas.getContext('webgl', { preserveDrawingBuffer: true }) || 
         canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true }) as WebGLRenderingContext;
    
    if (!gl) {
      console.error('WebGL not supported');
      return null;
    }
    
    // Set up the viewport
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    return gl;
  } catch (e) {
    console.error('Error initializing WebGL:', e);
    return null;
  }
};

// Create a shader from source
export const createShader = (
  gl: WebGLRenderingContext, 
  type: number, 
  source: string
): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) {
    console.error('Unable to create shader');
    return null;
  }
  
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  
  // Check if shader compiled successfully
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Error compiling shader:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  
  return shader;
};

// Create a shader program from vertex and fragment shaders
export const createShaderProgram = (
  gl: WebGLRenderingContext, 
  vertexShaderSource: string, 
  fragmentShaderSource: string
): ShaderProgram | null => {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  
  if (!vertexShader || !fragmentShader) {
    return null;
  }
  
  // Create the shader program
  const program = gl.createProgram();
  if (!program) {
    console.error('Unable to create shader program');
    return null;
  }
  
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  
  // Check if linking was successful
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Error linking program:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  
  // Get attribute and uniform locations
  const attributes: Record<string, number> = {};
  const uniforms: Record<string, WebGLUniformLocation> = {};
  
  // Extract attribute locations
  const attributeCount = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
  for (let i = 0; i < attributeCount; i++) {
    const info = gl.getActiveAttrib(program, i);
    if (info) {
      attributes[info.name] = gl.getAttribLocation(program, info.name);
    }
  }
  
  // Extract uniform locations
  const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < uniformCount; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) {
      const location = gl.getUniformLocation(program, info.name);
      if (location) {
        uniforms[info.name] = location;
      }
    }
  }
  
  return { program, attributes, uniforms };
};

// Load shader from a URL
export const loadShaderFile = async (url: string): Promise<string> => {
  const response = await fetch(url);
  return response.text();
};

// Create a texture from an image source
export const createTextureFromImage = (
  gl: WebGLRenderingContext,
  image: HTMLImageElement | ImageData
): WebGLTexture | null => {
  const texture = gl.createTexture();
  if (!texture) {
    console.error('Failed to create texture');
    return null;
  }
  
  gl.bindTexture(gl.TEXTURE_2D, texture);
  
  // Different handling for ImageData vs HTMLImageElement
  if ('data' in image && 'width' in image && 'height' in image) {
    // It's an ImageData object
    gl.texImage2D(
      gl.TEXTURE_2D, 
      0, 
      gl.RGBA, 
      image.width, 
      image.height, 
      0, 
      gl.RGBA, 
      gl.UNSIGNED_BYTE, 
      new Uint8Array(image.data.buffer)
    );
  } else {
    // It's an HTMLImageElement
    gl.texImage2D(
      gl.TEXTURE_2D, 
      0, 
      gl.RGBA, 
      gl.RGBA, 
      gl.UNSIGNED_BYTE, 
      image
    );
  }
  
  // Set texture parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  
  return texture;
};

// Set uniform values based on their type
export const setUniform = (
  gl: WebGLRenderingContext,
  location: WebGLUniformLocation,
  type: string,
  value: any
): void => {
  switch (type) {
    case 'float':
      gl.uniform1f(location, value);
      break;
    case 'vec2':
      gl.uniform2fv(location, value);
      break;
    case 'vec3':
      gl.uniform3fv(location, value);
      break;
    case 'vec4':
      gl.uniform4fv(location, value);
      break;
    case 'int':
      gl.uniform1i(location, value);
      break;
    case 'bool':
      gl.uniform1i(location, value ? 1 : 0);
      break;
    case 'sampler2D':
      gl.uniform1i(location, value);
      break;
    default:
      console.warn(`Unknown uniform type: ${type}`);
  }
};

// Apply a shader effect to an image
export const applyShaderEffect = (
  gl: WebGLRenderingContext,
  program: ShaderProgram,
  texture: WebGLTexture,
  uniforms: Record<string, { type: string; value: any }>,
  width: number,
  height: number
): ImageData | null => {
  // Clear canvas and use shader program
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program.program);
  
  // Create position buffer (covers the whole canvas)
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  // bottom left
     1, -1,  // bottom right
    -1,  1,  // top left
     1,  1   // top right
  ]), gl.STATIC_DRAW);
  
  // Create texture coordinate buffer
  const texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    0, 0,  // bottom left
    1, 0,  // bottom right
    0, 1,  // top left
    1, 1   // top right
  ]), gl.STATIC_DRAW);
  
  // Set up position attribute
  if ('a_position' in program.attributes) {
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(program.attributes.a_position);
    gl.vertexAttribPointer(program.attributes.a_position, 2, gl.FLOAT, false, 0, 0);
  }
  
  // Set up texture coordinate attribute
  if ('a_texCoord' in program.attributes) {
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(program.attributes.a_texCoord);
    gl.vertexAttribPointer(program.attributes.a_texCoord, 2, gl.FLOAT, false, 0, 0);
  }
  
  // Set up texture uniform
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  
  if ('u_texture' in program.uniforms) {
    gl.uniform1i(program.uniforms.u_texture, 0);
  } else if ('uTexture' in program.uniforms) {
    gl.uniform1i(program.uniforms.uTexture, 0);
  }
  
  // Set resolution uniform if it exists
  if ('u_resolution' in program.uniforms) {
    gl.uniform2f(program.uniforms.u_resolution, width, height);
  } else if ('uResolution' in program.uniforms) {
    gl.uniform2f(program.uniforms.uResolution, width, height);
  }
  
  // Set custom uniforms
  Object.entries(uniforms).forEach(([name, uniform]) => {
    if (name in program.uniforms) {
      setUniform(gl, program.uniforms[name], uniform.type, uniform.value);
    }
  });
  
  // Draw the quad
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  
  // Read pixels back
  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  
  // Return as ImageData
  return new ImageData(
    new Uint8ClampedArray(pixels.buffer),
    width,
    height
  );
};

// Apply shader effect to an image (high-level function)
export const processImageWithShader = async (
  imageSource: HTMLImageElement | ImageData,
  shaderEffect: ShaderEffect,
  uniformValues: Record<string, any>
): Promise<ImageData> => {
  if (!isBrowser()) {
    throw new Error('WebGL processing is only available in browser environments');
  }

  // Determine dimensions using type guards
  const isHTMLImage = (img: HTMLImageElement | ImageData): img is HTMLImageElement => 
    'naturalWidth' in img;
  
  const width = isHTMLImage(imageSource) ? imageSource.naturalWidth : imageSource.width;
  const height = isHTMLImage(imageSource) ? imageSource.naturalHeight : imageSource.height;
  
  try {
    // Create canvas for WebGL rendering
    const canvas = createCanvas(width, height);
    
    // Initialize WebGL context
    const gl = initWebGL(canvas);
    if (!gl) {
      throw new Error('Failed to initialize WebGL');
    }
    
    // Create shader program
    const program = createShaderProgram(
      gl, 
      shaderEffect.vertexShader || DEFAULT_VERTEX_SHADER, 
      shaderEffect.fragmentShader
    );
    
    if (!program) {
      throw new Error('Failed to create shader program');
    }
    
    // Create texture from image
    const texture = createTextureFromImage(gl, imageSource);
    if (!texture) {
      throw new Error('Failed to create texture from image');
    }
    
    // Prepare uniforms with values
    const uniforms: Record<string, { type: string; value: any }> = {};
    
    // Merge default values with provided values
    Object.entries(shaderEffect.uniforms).forEach(([name, uniform]) => {
      uniforms[name] = { 
        type: uniform.type,
        value: name in uniformValues ? uniformValues[name] : uniform.value
      };
    });
    
    // Apply shader effect
    const resultImageData = applyShaderEffect(
      gl, 
      program, 
      texture, 
      uniforms, 
      width, 
      height
    );
    
    if (!resultImageData) {
      throw new Error('Failed to apply shader effect');
    }
    
    return resultImageData;
  } catch (e) {
    console.error('Error processing image with shader:', e);
    throw e;
  }
};

// Export a collection of predefined shader effects
export const SHADER_EFFECTS: Record<string, ShaderEffect> = {
  pixelate: {
    name: 'Pixelate',
    vertexShader: DEFAULT_VERTEX_SHADER,
    fragmentShader: `
      precision mediump float;
      
      uniform sampler2D u_texture;
      uniform vec2 u_resolution;
      uniform float u_pixel_size;
      
      varying vec2 v_texCoord;
      
      void main() {
        vec2 uv = v_texCoord;
        
        // Pixelation effect
        float dx = u_pixel_size / u_resolution.x;
        float dy = u_pixel_size / u_resolution.y;
        
        // Calculate the nearest pixel center
        vec2 pixelated = vec2(
          dx * floor(uv.x / dx) + dx * 0.5,
          dy * floor(uv.y / dy) + dy * 0.5
        );
        
        gl_FragColor = texture2D(u_texture, pixelated);
      }
    `,
    uniforms: {
      u_pixel_size: { type: 'float', value: 10.0, min: 1.0, max: 100.0, step: 1.0 }
    }
  },
  
  dither: {
    name: 'Dither',
    vertexShader: DEFAULT_VERTEX_SHADER,
    fragmentShader: `
      precision mediump float;
      
      uniform sampler2D u_texture;
      uniform vec2 u_resolution;
      uniform float u_dither_strength;
      uniform float u_dither_scale;
      
      varying vec2 v_texCoord;
      
      // Pseudo-random function
      float rand(vec2 co) {
        return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      void main() {
        vec2 uv = v_texCoord;
        vec4 color = texture2D(u_texture, uv);
        
        // Convert to grayscale
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        
        // Apply dithering
        float dither = rand(floor(uv * u_resolution / u_dither_scale) / (u_resolution / u_dither_scale));
        
        // Mix original and dithered effect
        float dithered = step(dither, gray);
        vec3 finalColor = mix(color.rgb, vec3(dithered), u_dither_strength);
        
        gl_FragColor = vec4(finalColor, color.a);
      }
    `,
    uniforms: {
      u_dither_strength: { type: 'float', value: 1.0, min: 0.0, max: 1.0, step: 0.01 },
      u_dither_scale: { type: 'float', value: 1.0, min: 0.1, max: 10.0, step: 0.1 }
    }
  },
  
  edgeDetect: {
    name: 'Edge Detect',
    vertexShader: DEFAULT_VERTEX_SHADER,
    fragmentShader: `
      precision mediump float;
      
      uniform sampler2D u_texture;
      uniform vec2 u_resolution;
      uniform float u_intensity;
      
      varying vec2 v_texCoord;
      
      void main() {
        vec2 uv = v_texCoord;
        vec2 texel = 1.0 / u_resolution;
        
        // Sample neighboring pixels
        vec4 top = texture2D(u_texture, vec2(uv.x, uv.y - texel.y));
        vec4 bottom = texture2D(u_texture, vec2(uv.x, uv.y + texel.y));
        vec4 left = texture2D(u_texture, vec2(uv.x - texel.x, uv.y));
        vec4 right = texture2D(u_texture, vec2(uv.x + texel.x, uv.y));
        vec4 current = texture2D(u_texture, uv);
        
        // Calculate edges using Sobel filter
        vec4 horizEdge = abs(right - left);
        vec4 vertEdge = abs(top - bottom);
        vec4 edge = sqrt(horizEdge * horizEdge + vertEdge * vertEdge);
        
        // Adjust intensity and output
        edge *= u_intensity;
        
        gl_FragColor = vec4(edge.rgb, current.a);
      }
    `,
    uniforms: {
      u_intensity: { type: 'float', value: 1.0, min: 0.0, max: 5.0, step: 0.1 }
    }
  },
  
  halftone: {
    name: 'Halftone',
    vertexShader: DEFAULT_VERTEX_SHADER,
    fragmentShader: `
      precision mediump float;
      
      uniform sampler2D u_texture;
      uniform vec2 u_resolution;
      uniform float u_dot_size;
      uniform float u_angle;
      
      varying vec2 v_texCoord;
      
      void main() {
        vec2 uv = v_texCoord;
        vec4 color = texture2D(u_texture, uv);
        
        // Convert to grayscale
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        
        // Calculate grid based on resolution and dot size
        float scale = u_dot_size;
        float s = sin(u_angle);
        float c = cos(u_angle);
        
        // Transform coordinates
        vec2 tex = uv * u_resolution;
        vec2 rotated = vec2(
          c * tex.x - s * tex.y,
          s * tex.x + c * tex.y
        );
        
        // Create halftone pattern
        vec2 nearest = 2.0 * fract(rotated / (2.0 * scale)) - 1.0;
        float dist = length(nearest);
        float radius = 0.5 * sqrt(gray);
        
        // Final color
        float halftone = 1.0 - step(radius, dist);
        vec3 finalColor = vec3(halftone);
        
        gl_FragColor = vec4(finalColor, color.a);
      }
    `,
    uniforms: {
      u_dot_size: { type: 'float', value: 6.0, min: 1.0, max: 20.0, step: 0.5 },
      u_angle: { type: 'float', value: 0.785, min: 0.0, max: 3.14159, step: 0.01 } // default is 45 degrees
    }
  },
  
  ripple: {
    name: 'Animated Ripple',
    vertexShader: DEFAULT_VERTEX_SHADER,
    fragmentShader: `
      precision mediump float;
      
      uniform sampler2D u_texture;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform float u_amplitude;
      uniform float u_frequency;
      uniform float u_speed;
      
      varying vec2 v_texCoord;
      
      void main() {
        vec2 uv = v_texCoord;
        
        // Get center distance
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(uv, center);
        
        // Calculate ripple effect
        float angle = u_time * u_speed;
        float waveFactor = sin(dist * u_frequency - angle) * u_amplitude;
        
        // Apply distortion to coordinates
        vec2 distortedUV = uv + normalize(uv - center) * waveFactor / u_resolution;
        
        // Sample the texture with distorted coordinates
        vec4 color = texture2D(u_texture, distortedUV);
        
        gl_FragColor = color;
      }
    `,
    uniforms: {
      u_time: { type: 'float', value: 0.0, min: 0.0, max: 10.0, step: 0.01 },
      u_amplitude: { type: 'float', value: 5.0, min: 0.0, max: 50.0, step: 0.1 },
      u_frequency: { type: 'float', value: 20.0, min: 1.0, max: 50.0, step: 0.5 },
      u_speed: { type: 'float', value: 1.0, min: 0.1, max: 5.0, step: 0.1 }
    }
  }
};

// Utility for sampling frames for GIF export
export const captureFrames = async (
  processFunction: (time: number) => Promise<ImageData>,
  frameCount: number,
  duration: number = 2.0 // seconds
): Promise<ImageData[]> => {
  const frames: ImageData[] = [];
  
  for (let i = 0; i < frameCount; i++) {
    // Calculate time value (0 to 1 over the duration)
    const time = (i / frameCount) * duration;
    
    // Process frame at this time
    const frameData = await processFunction(time);
    frames.push(frameData);
  }
  
  return frames;
};

// Function to export frames as GIF in browser
export const exportBrowserGif = async (
  frames: ImageData[],
  options: {
    width?: number;
    height?: number;
    quality?: number;
    delay?: number;
    repeat?: number;
  } = {}
): Promise<Blob> => {
  if (!isBrowser()) {
    throw new Error('GIF export is only available in browser environments');
  }
  
  try {
    // Dynamically import gif.js
    const GifModule = await import('gif.js').then(module => module.default || module);
    
    if (!GifModule) {
      throw new Error('Failed to load GIF library');
    }
    
    return new Promise((resolve, reject) => {
      // Create a GIF instance with the provided options
      const gif = new GifModule({
        workers: 2,
        quality: options.quality || 10,
        width: options.width,
        height: options.height,
        workerScript: '/gif.worker.js', // Make sure this file exists in public/ directory
      });
      
      // Add each frame to the GIF
      frames.forEach(frame => {
        // Create a temporary canvas to draw the ImageData
        const canvas = createCanvas(frame.width, frame.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get 2D context for canvas');
        
        // Draw the frame data to the canvas
        ctx.putImageData(frame, 0, 0);
        
        // Add the canvas to the GIF
        gif.addFrame(canvas, {
          delay: options.delay || 100,
          copy: true
        });
      });
      
      // Set loop count
      if (options.repeat !== undefined) {
        gif.setRepeat(options.repeat);
      }
      
      // Handle GIF completion
      gif.on('finished', (blob: Blob) => {
        resolve(blob);
      });
      
      // Handle errors properly using the 'error' event that gif.js supports
      gif.on('error', (error: Error) => {
        reject(error);
      });
      
      // Start rendering
      gif.render();
    });
  } catch (e) {
    console.error('Failed to create GIF:', e);
    throw e;
  }
};

// Alias exportGif to exportBrowserGif since we're only supporting browser mode
export const exportGif = exportBrowserGif; 