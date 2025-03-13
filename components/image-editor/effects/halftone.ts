import { HalftoneSettings, SafeCanvasRenderingContext2D } from '../types';
import { getImageData, putImageData, createOffscreenCanvas, getOffscreenContext } from './index';

// Bayer matrix for ordered dithering (4x4)
const BAYER_MATRIX_4X4 = [
  [ 1,  9,  3, 11],
  [13,  5, 15,  7],
  [ 4, 12,  2, 10],
  [16,  8, 14,  6]
].map(row => row.map(val => val / 17)); // Normalize to [0, 1] range

export const applyHalftoneEffect = (
  ctx: SafeCanvasRenderingContext2D,
  imageData: ImageData,
  settings: HalftoneSettings
): ImageData => {
  const { dotSize, spacing, angle, shape, enabled } = settings;

  if (!enabled) return imageData;

  try {
    // Convert to grayscale first
    const grayscaleData = new Uint8ClampedArray(imageData.data);
    for (let i = 0; i < grayscaleData.length; i += 4) {
      // Apply grayscale formula: gray = 0.299 × r + 0.587 × g + 0.114 × b
      const r = grayscaleData[i] / 255;
      const g = grayscaleData[i + 1] / 255;
      const b = grayscaleData[i + 2] / 255;
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      
      const grayValue = Math.round(gray * 255);
      grayscaleData[i] = grayscaleData[i + 1] = grayscaleData[i + 2] = grayValue;
    }

    // Create an offscreen canvas for the halftone pattern
    const offscreenCanvas = createOffscreenCanvas(ctx.canvas.width, ctx.canvas.height);
    const offCtx = getOffscreenContext(offscreenCanvas);

    if (!offCtx) {
      throw new Error('Could not get offscreen canvas context');
    }

    // Clear offscreen canvas and set white background
    offCtx.fillStyle = 'white';
    offCtx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    offCtx.fillStyle = 'black';
    offCtx.strokeStyle = 'black';

    // Angle in radians
    const radians = angle * Math.PI / 180;

    // Loop through the image with spacing intervals
    for (let y = 0; y < ctx.canvas.height; y += spacing) {
      for (let x = 0; x < ctx.canvas.width; x += spacing) {
        // Sample the grayscale value at this point
        const pixelIndex = (Math.floor(y) * imageData.width + Math.floor(x)) * 4;
        
        // Apply Bayer dithering
        const i = Math.floor(y) % 4;
        const j = Math.floor(x) % 4;
        const threshold = BAYER_MATRIX_4X4[i][j];
        
        const grayValue = grayscaleData[pixelIndex] / 255;
        
        // Calculate size based on gray value (invert for proper effect)
        // Use dithering threshold to create a more detailed pattern
        const size = dotSize * (grayValue > threshold ? (1 - grayValue) * 0.8 + 0.2 : 0);
        
        if (size > 0) {
          offCtx.save();
          
          // First translate to where the dot should be
          offCtx.translate(x, y);
          
          // Only apply rotation if needed
          if (angle !== 0) {
            offCtx.rotate(radians);
          }
          
          offCtx.beginPath();
          
          switch (shape) {
            case 'circle':
              offCtx.arc(0, 0, size, 0, Math.PI * 2);
              offCtx.fill();
              break;
            case 'square':
              offCtx.fillRect(-size, -size, size * 2, size * 2);
              break;
            case 'line':
              offCtx.lineWidth = size;
              offCtx.beginPath();
              offCtx.moveTo(-spacing / 2, 0);
              offCtx.lineTo(spacing / 2, 0);
              offCtx.stroke();
              break;
          }
          
          offCtx.restore();
        }
      }
    }

    // Draw the halftone pattern from the offscreen canvas onto the main canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(offscreenCanvas, 0, 0);

    // Return the new image data
    return getImageData(ctx);
  } catch (error) {
    console.error('Error applying halftone effect:', error);
    return imageData;
  }
}; 