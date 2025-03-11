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
  name?: string; // Display name for the UI
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
  image: HTMLImageElement | ImageData | HTMLCanvasElement
): WebGLTexture | null => {
  try {
    const texture = gl.createTexture();
    if (!texture) {
      throw new Error('Failed to create WebGL texture');
    }
    
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // Handle different image sources (HTMLImageElement, ImageData, or HTMLCanvasElement)
    if ('width' in image && 'height' in image && 'data' in image) {
      // It's ImageData
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        image.width,
        image.height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image.data
      );
    } else {
      // It's HTMLImageElement or HTMLCanvasElement
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
    
    // Unbind the texture
    gl.bindTexture(gl.TEXTURE_2D, null);
    
    return texture;
  } catch (error) {
    console.error('Error creating texture from image:', error);
    return null;
  }
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

/**
 * Handles image resizing while maintaining the maximum possible quality
 * This is used for WebGL processing of large images that exceed texture size limits
 * 
 * @param img - The original image to process
 * @param maxTextureSize - The maximum allowed texture size (typically 4096 or 8192)
 * @returns An image that can be processed by WebGL while preserving as much quality as possible
 */
export const prepareImageForWebGL = (img: HTMLImageElement, maxTextureSize: number = 4096): HTMLImageElement | HTMLCanvasElement => {
  const { width, height } = img;
  
  // If the image is already within limits, return it as is for maximum quality
  if (width <= maxTextureSize && height <= maxTextureSize) {
    return img;
  }
  
  // Calculate aspect ratio to maintain proportions
  const aspectRatio = width / height;
  
  // Determine new dimensions while preserving aspect ratio
  let newWidth = width;
  let newHeight = height;
  
  if (width > height && width > maxTextureSize) {
    newWidth = maxTextureSize;
    newHeight = Math.round(maxTextureSize / aspectRatio);
  } else if (height > width && height > maxTextureSize) {
    newHeight = maxTextureSize;
    newWidth = Math.round(maxTextureSize * aspectRatio);
  } else if (width === height && width > maxTextureSize) {
    newWidth = maxTextureSize;
    newHeight = maxTextureSize;
  }
  
  // Create a canvas to resize the image
  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  
  // Draw the resized image on the canvas using high-quality interpolation
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Set image smoothing for high quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(img, 0, 0, newWidth, newHeight);
    
    console.log(`Image resized for WebGL processing: ${width}x${height} → ${newWidth}x${newHeight}`);
  }
  
  return canvas;
};

/**
 * Process an image with a shader effect
 */
export const processImageWithShader = async (
  image: HTMLImageElement, 
  effect: ShaderEffect,
  uniformValues: Record<string, any> = {}
): Promise<ImageData> => {
  try {
    // Create a canvas element
    const canvas = document.createElement('canvas');
    
    // Use our function to handle large images while preserving maximum quality
    const processableImage = prepareImageForWebGL(image);
    
    // Set canvas size to match the image dimensions
    canvas.width = processableImage.width;
    canvas.height = processableImage.height;
    
    // Get WebGL context
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    
    // Create shader program
    const program = createShaderProgram(
      gl, 
      effect.vertexShader || DEFAULT_VERTEX_SHADER, 
      effect.fragmentShader
    );
    
    if (!program) {
      throw new Error('Failed to create shader program');
    }
    
    // Create texture from image
    const texture = createTextureFromImage(gl, processableImage);
    if (!texture) {
      throw new Error('Failed to create texture from image');
    }
    
    // Prepare uniforms with values
    const uniforms: Record<string, { type: string; value: any }> = {};
    
    // Merge default values with provided values
    Object.entries(effect.uniforms).forEach(([name, uniform]) => {
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
      processableImage.width, 
      processableImage.height
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

// Update the ShaderEffect type if needed
export type ShaderEffect = {
  name: string;
  vertex: string;
  fragment: string;
  uniforms: Record<string, any>;
};

// Basic vertex shader that just passes through positions and texture coordinates
export const basicVertexShader = `
  attribute vec4 aVertexPosition;
  attribute vec2 aTextureCoord;
  varying vec2 vTextureCoord;
  void main() {
    gl_Position = aVertexPosition;
    vTextureCoord = aTextureCoord;
  }
`;

// Basic fragment shader that just outputs the texture color
export const basicFragmentShader = `
  precision mediump float;
  varying vec2 vTextureCoord;
  uniform sampler2D uSampler;
  void main() {
    gl_FragColor = texture2D(uSampler, vTextureCoord);
  }
`;

// Update SHADER_EFFECTS to include BW and Sepia and remove Ripple
export const SHADER_EFFECTS: Record<string, ShaderEffect> = {
  none: {
    name: 'Original',
    vertex: basicVertexShader,
    fragment: basicFragmentShader,
    uniforms: {}
  },
  blackwhite: {
    name: 'B&W',
    vertex: basicVertexShader,
    fragment: `
      precision mediump float;
      varying vec2 vTextureCoord;
      uniform sampler2D uSampler;
      uniform float uIntensity;
      
      void main() {
        vec4 color = texture2D(uSampler, vTextureCoord);
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        vec4 finalColor = vec4(gray, gray, gray, color.a);
        gl_FragColor = finalColor;
      }
    `,
    uniforms: {
      uIntensity: { value: 1.0, min: 0.0, max: 1.0, step: 0.1 }
    }
  },
  sepia: {
    name: 'Sepia',
    vertex: basicVertexShader,
    fragment: `
      precision mediump float;
      varying vec2 vTextureCoord;
      uniform sampler2D uSampler;
      uniform float uIntensity;
      
      void main() {
        vec4 color = texture2D(uSampler, vTextureCoord);
        float r = color.r * 0.393 + color.g * 0.769 + color.b * 0.189;
        float g = color.r * 0.349 + color.g * 0.686 + color.b * 0.168;
        float b = color.r * 0.272 + color.g * 0.534 + color.b * 0.131;
        vec4 sepia = vec4(r, g, b, color.a);
        vec4 finalColor = mix(color, sepia, uIntensity);
        gl_FragColor = finalColor;
      }
    `,
    uniforms: {
      uIntensity: { value: 1.0, min: 0.0, max: 1.0, step: 0.1 }
    }
  },
  halftone: {
    name: 'Halftone',
    vertex: basicVertexShader,
    fragment: `
      precision mediump float;
      varying vec2 vTextureCoord;
      uniform sampler2D uSampler;
      uniform float uDotSize;
      uniform float uSpacing;
      uniform float uAngle;
      
      void main() {
        float s = sin(uAngle), c = cos(uAngle);
        vec2 tex = vTextureCoord;
        vec2 tex2 = tex * mat2(c, -s, s, c); // Rotate the texture coordinates
        
        vec2 p = tex2 * uSpacing;
        vec2 pf = fract(p);
        vec2 pi = floor(p);
        
        // Center of the dot
        vec2 center = pi + vec2(0.5);
        vec2 centerPos = center / uSpacing;
        vec2 unrotatedCenter = centerPos * mat2(c, s, -s, c); // Unrotate
        
        // Sample original texture at the center
        vec4 color = texture2D(uSampler, unrotatedCenter);
        
        // Convert to grayscale
        float gray = (color.r + color.g + color.b) / 3.0;
        
        // Calculate dot size based on brightness
        float radius = gray * uDotSize;
        
        // Calculate distance from current pixel to center
        float dist = distance(pf, vec2(0.5));
        
        // Output 1 (white) or 0 (black) based on distance comparison
        float finalValue = 1.0 - step(radius, dist);
        
        gl_FragColor = vec4(vec3(finalValue), 1.0);
      }
    `,
    uniforms: {
      uDotSize: { value: 0.5, min: 0.1, max: 0.9, step: 0.1 },
      uSpacing: { value: 20.0, min: 5.0, max: 50.0, step: 1.0 },
      uAngle: { value: 0.0, min: 0.0, max: 6.28, step: 0.1 }
    }
  },
  duotone: {
    name: 'Duotone',
    vertex: basicVertexShader,
    fragment: `
      precision mediump float;
      varying vec2 vTextureCoord;
      uniform sampler2D uSampler;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform float uIntensity;
      
      void main() {
        vec4 texColor = texture2D(uSampler, vTextureCoord);
        float gray = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
        vec3 duotone = mix(uColor1, uColor2, gray);
        vec3 final = mix(texColor.rgb, duotone, uIntensity);
        gl_FragColor = vec4(final, texColor.a);
      }
    `,
    uniforms: {
      uColor1: { value: [0.0, 0.0, 0.4], type: 'color' },
      uColor2: { value: [1.0, 0.0, 0.0], type: 'color' },
      uIntensity: { value: 1.0, min: 0.0, max: 1.0, step: 0.1 }
    }
  },
  noise: {
    name: 'Noise',
    vertex: basicVertexShader,
    fragment: `
      precision mediump float;
      varying vec2 vTextureCoord;
      uniform sampler2D uSampler;
      uniform float uAmount;
      
      // Simple pseudo-random function
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }
      
      void main() {
        vec4 color = texture2D(uSampler, vTextureCoord);
        float noise = random(vTextureCoord) * uAmount;
        vec3 noisy = color.rgb + vec3(noise) - uAmount/2.0;
        gl_FragColor = vec4(noisy, color.a);
      }
    `,
    uniforms: {
      uAmount: { value: 0.2, min: 0.0, max: 1.0, step: 0.05 }
    }
  },
  dither: {
    name: 'Dither',
    vertex: basicVertexShader,
    fragment: `
      precision mediump float;
      varying vec2 vTextureCoord;
      uniform sampler2D uSampler;
      uniform float uThreshold;
      uniform float uStrength;
      
      // Simple dithering function using a Bayer matrix
      float dither8x8(vec2 position, float brightness) {
        int x = int(mod(position.x, 8.0));
        int y = int(mod(position.y, 8.0));
        
        // Bayer matrix for 8x8 ordered dithering
        int[64] bayer = int[](
          0, 32, 8, 40, 2, 34, 10, 42,
          48, 16, 56, 24, 50, 18, 58, 26,
          12, 44, 4, 36, 14, 46, 6, 38,
          60, 28, 52, 20, 62, 30, 54, 22,
          3, 35, 11, 43, 1, 33, 9, 41,
          51, 19, 59, 27, 49, 17, 57, 25,
          15, 47, 7, 39, 13, 45, 5, 37,
          63, 31, 55, 23, 61, 29, 53, 21
        );
        
        int index = x + y * 8;
        float limit = float(bayer[index]) / 64.0;
        
        return step(limit, brightness);
      }
      
      void main() {
        vec4 color = texture2D(uSampler, vTextureCoord);
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        
        // Apply dithering based on threshold and position
        float dithered = dither8x8(gl_FragCoord.xy, gray);
        
        // Mix between original and dithered based on strength
        vec3 finalColor = mix(color.rgb, vec3(dithered), uStrength);
        
        gl_FragColor = vec4(finalColor, color.a);
      }
    `,
    uniforms: {
      uThreshold: { value: 0.5, min: 0.0, max: 1.0, step: 0.05 },
      uStrength: { value: 1.0, min: 0.0, max: 1.0, step: 0.05 }
    }
  }
  // ripple effect removed
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