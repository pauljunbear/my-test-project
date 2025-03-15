import { DuotoneSettings } from '../types';

export const applyDuotoneEffect = (ctx: CanvasRenderingContext2D, imageData: ImageData, settings: DuotoneSettings): ImageData => {
  const { shadowColor, highlightColor, enabled, intensity } = settings;
  
  if (!enabled) return imageData;

  const data = imageData.data;
  const shadow = hexToRgb(shadowColor);
  const highlight = hexToRgb(highlightColor);

  if (!shadow || !highlight) {
    console.error('Invalid color values for duotone effect');
    return imageData;
  }

  // Convert intensity from 0-100 to 0-1
  const intensityFactor = intensity / 100;

  for (let i = 0; i < data.length; i += 4) {
    // Get grayscale value
    const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
    
    // Apply intensity to the grayscale value
    const adjustedGray = Math.pow(gray, (intensity / 50) * 0.8 + 0.6);
    
    // Interpolate between shadow and highlight colors
    data[i] = Math.round(lerp(data[i], lerp(shadow.r, highlight.r, adjustedGray), intensityFactor));
    data[i + 1] = Math.round(lerp(data[i + 1], lerp(shadow.g, highlight.g, adjustedGray), intensityFactor));
    data[i + 2] = Math.round(lerp(data[i + 2], lerp(shadow.b, highlight.b, adjustedGray), intensityFactor));
    // Keep original alpha
  }

  return imageData;
};

// Helper function to interpolate between two values
const lerp = (start: number, end: number, t: number): number => {
  return start * (1 - t) + end * t;
};

// Helper function to convert hex color to RGB
const hexToRgb = (hex: string): { r: number, g: number, b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}; 