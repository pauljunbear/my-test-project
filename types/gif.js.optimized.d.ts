/**
 * Type definitions for gif.js.optimized
 * 
 * This is a custom type declaration file for gif.js.optimized
 * since official types don't exist
 */

declare module 'gif.js.optimized' {
  export interface GifOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
    background?: string;
    transparent?: number | null;
    dither?: boolean | string;
    debug?: boolean;
  }

  export interface GifFrameOptions {
    delay?: number;
    copy?: boolean;
    dispose?: number;
  }

  export default class GIF {
    constructor(options: GifOptions);
    
    running: boolean;
    
    addFrame(imageElement: CanvasImageSource, options?: GifFrameOptions): void;
    render(): void;
    abort(): void;
    
    on(event: 'start' | 'progress' | 'finished' | 'abort', callback: Function): void;
    
    setOptions(options: GifOptions): void;
    setOption(key: string, value: any): void;
    
    setRepeat(repeat: number): void;
    setDelay(delay: number): void;
    setFrameRate(frameRate: number): void;
    setDispose(dispose: number): void;
    setQuality(quality: number): void;
    setDither(dither: boolean | string): void;
    setGlobalPalette(palette: boolean | Uint8Array): void;
    getGlobalPalette(): Uint8Array | boolean;
    
    isRendering(): boolean;
    isRunning(): boolean;
  }
} 