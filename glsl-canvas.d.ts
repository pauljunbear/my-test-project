declare module 'glsl-canvas' {
  export default class GlslCanvas {
    constructor(canvas: HTMLCanvasElement, options?: any);
    
    // Main methods
    load(fragmentString: string, vertexString?: string): void;
    setUniform(name: string, ...value: any[]): boolean;
    setUniforms(uniforms: Record<string, any>): void;
    render(): void;
    pause(): void;
    play(): void;
    destroy(): void;
    
    // Properties
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
    
    // Additional methods for animation
    resetTime(): void;
    timeLoad: number;
    timePrev: number;
    timeNow: number;
  }
} 