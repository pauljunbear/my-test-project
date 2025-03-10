/**
 * Type definitions for glsl-canvas
 * 
 * This is a custom type declaration file for glsl-canvas
 * to ensure TypeScript compatibility with the library.
 */

declare module 'glsl-canvas' {
  export interface GlslCanvasOptions {
    canvas?: HTMLCanvasElement;
    width?: number;
    height?: number;
    webGLOptions?: WebGLContextAttributes;
    antialias?: boolean;
    alpha?: boolean;
    extensions?: string[];
    uniformsDefaults?: Record<string, any>;
    backgroundColor?: [number, number, number, number];
    backgroundAlpha?: number;
    onError?: (error: Error) => void;
  }

  export default class GlslCanvas {
    constructor(canvas: HTMLCanvasElement, options?: GlslCanvasOptions);
    
    /**
     * Set the GLSL fragment shader code
     */
    load(fragmentString: string, vertexString?: string): void;
    
    /**
     * Set a uniform value
     */
    setUniform(name: string, ...values: any[]): void;
    
    /**
     * Resize the canvas
     */
    resize(width: number, height: number): void;
    
    /**
     * Set the resolution uniform
     */
    setResolution(width: number, height: number): void;
    
    /**
     * Render the GLSL canvas once
     */
    render(): void;
    
    /**
     * Start animation loop
     */
    play(): void;
    
    /**
     * Stop animation loop
     */
    pause(): void;
    
    /**
     * Toggle animation loop
     */
    toggle(): void;
    
    /**
     * Set time uniform
     */
    setTime(time: number): void;
    
    /**
     * Load texture from URL
     */
    loadTexture(name: string, url: string, options?: Record<string, any>): void;
    
    /**
     * Load texture from image element
     */
    loadTexture(name: string, img: HTMLImageElement, options?: Record<string, any>): void;
    
    /**
     * Load cubemap texture
     */
    loadCubemap(name: string, urls: string[], options?: Record<string, any>): void;
    
    /**
     * Current time of the animation
     */
    time: number;
    
    /**
     * Destroy the GlslCanvas instance and clean up resources
     */
    destroy(): void;
    
    /**
     * Get WebGL context
     */
    getContext(): WebGLRenderingContext;
    
    /**
     * Get the canvas element
     */
    getCanvas(): HTMLCanvasElement;
    
    /**
     * Set fragment shader
     */
    setFragmentString(fragmentString: string): void;
    
    /**
     * Set vertex shader
     */
    setVertexString(vertexString: string): void;
  }
} 