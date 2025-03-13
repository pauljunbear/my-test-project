import { SafeCanvasRenderingContext2D } from '../types';

// Common utility functions for effects
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

export const getOffscreenContext = (canvas: HTMLCanvasElement): SafeCanvasRenderingContext2D | null => {
  return canvas.getContext('2d', { willReadFrequently: true }) as SafeCanvasRenderingContext2D | null;
};

// Re-export all effects
export * from './halftone';
export * from './duotone';
export * from './noise';
export * from './kaleidoscope';
export * from './light-leaks';
export * from './vignette';
export * from './texture';
export * from './frame'; 