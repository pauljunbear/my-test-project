import { SafeCanvasRenderingContext2D } from '../types';

// Utility functions for effects
export const getImageData = (ctx: SafeCanvasRenderingContext2D): ImageData => {
  return ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
};

export const putImageData = (ctx: SafeCanvasRenderingContext2D, imageData: ImageData): void => {
  ctx.putImageData(imageData, 0, 0);
};

export const createOffscreenCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

export const getOffscreenContext = (canvas: HTMLCanvasElement): CanvasRenderingContext2D | null => {
  return canvas.getContext('2d');
};

// Export all effects
export { applyHalftoneEffect } from './halftone';
export { applyDuotoneEffect } from './duotone';
export { applyNoiseEffect } from './noise';
export { applyKaleidoscopeEffect } from './kaleidoscope';
export { applyLightLeaksEffect } from './light-leaks';
export { applyVignetteEffect } from './vignette';
export { applyTextureEffect } from './texture';
export { applyFrameEffect } from './frame'; 