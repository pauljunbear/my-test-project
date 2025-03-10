/**
 * Type definitions for gif.js
 * 
 * This is a custom type declaration file for gif.js
 * to ensure TypeScript compatibility with the library.
 */

declare module 'gif.js' {
  export interface GifOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
    background?: string;
    transparent?: string | null;
    dither?: boolean;
    repeat?: number;
    debug?: boolean;
  }

  export interface GifFrameOptions {
    delay?: number;
    copy?: boolean;
    dispose?: number;
  }

  export default class GIF {
    constructor(options: GifOptions);
    
    /**
     * Add a frame to the GIF
     * @param image - The image data to add (can be ImageData, HTMLCanvasElement, or HTMLImageElement)
     * @param options - Frame options
     */
    addFrame(
      image: HTMLCanvasElement | HTMLImageElement | ImageData | CanvasRenderingContext2D | WebGLRenderingContext,
      options?: GifFrameOptions
    ): void;
    
    /**
     * Start rendering the GIF
     */
    render(): void;
    
    /**
     * Set the number of times the GIF should loop
     * @param count - Number of times to loop (0 = infinite)
     */
    setRepeat(count: number): void;
    
    /**
     * Set the option to make a color transparent
     * @param color - The color to make transparent
     */
    setTransparent(color: string | null): void;
    
    /**
     * Set the GIF options
     * @param options - The options to set
     */
    setOptions(options: GifOptions): void;
    
    /**
     * Set up a listener for GIF events
     * @param event - The event to listen for ('start', 'progress', 'finished', 'error')
     * @param callback - The callback function
     */
    on(event: 'start' | 'progress' | 'finished' | 'error', callback: (...args: any[]) => void): void;
    
    /**
     * Abort the rendering process
     */
    abort(): void;
  }
} 