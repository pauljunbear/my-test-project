import { DuotoneSettings, SafeCanvasRenderingContext2D } from '../types';
import { getImageData } from './index';

interface RGB {
  r: number;
  g: number;
  b: number;
}

const parseHexColor = (hex: string): RGB => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
};

export const applyDuotoneEffect = (
  ctx: SafeCanvasRenderingContext2D,
  imageData: ImageData,
  settings: DuotoneSettings
): ImageData => {
  const { color1, color2, intensity, enabled } = settings;

  if (!enabled) return imageData;

  try {
    // Parse colors to RGB components
    const shadowColor = parseHexColor(color1);
    const highlightColor = parseHexColor(color2);

    // Create a new array for the modified pixel data
    const data = imageData.data;
    const outputData = new Uint8ClampedArray(data.length);

    // Apply the duotone effect to each pixel
    for (let i = 0; i < data.length; i += 4) {
      // Get the RGB values for the current pixel
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;

      // Convert to grayscale using the precise formula
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      // Apply intensity adjustment
      const adjustedGray = Math.pow(gray, (intensity / 50) * 0.8 + 0.6);

      // Map the grayscale value to the two colors
      // p' = (1 - gray) × shadowColor + gray × highlightColor
      const r_out = Math.round(((1 - adjustedGray) * shadowColor.r + adjustedGray * highlightColor.r) * 255);
      const g_out = Math.round(((1 - adjustedGray) * shadowColor.g + adjustedGray * highlightColor.g) * 255);
      const b_out = Math.round(((1 - adjustedGray) * shadowColor.b + adjustedGray * highlightColor.b) * 255);

      // Set the output pixel values
      outputData[i] = r_out;
      outputData[i + 1] = g_out;
      outputData[i + 2] = b_out;
      outputData[i + 3] = data[i + 3]; // Keep original alpha
    }

    // Create and return new ImageData
    return new ImageData(outputData, imageData.width, imageData.height);
  } catch (error) {
    console.error('Error applying duotone effect:', error);
    return imageData;
  }
}; 