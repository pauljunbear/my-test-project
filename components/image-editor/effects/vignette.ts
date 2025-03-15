import { VignetteSettings, SafeCanvasRenderingContext2D } from '../types';
import { createOffscreenCanvas, getOffscreenContext } from './index';

export const applyVignetteEffect = (
  ctx: SafeCanvasRenderingContext2D,
  imageData: ImageData,
  settings: VignetteSettings
): ImageData => {
  const { intensity, color, feather, shape, enabled } = settings;

  if (!enabled) return imageData;

  try {
    // Create offscreen canvas for manipulation
    const offscreenCanvas = createOffscreenCanvas(imageData.width, imageData.height);
    const offscreenCtx = getOffscreenContext(offscreenCanvas);
    if (!offscreenCtx) throw new Error('Failed to get offscreen context');

    // Put the original image data on the offscreen canvas
    offscreenCtx.putImageData(imageData, 0, 0);

    // Create another offscreen canvas for the vignette mask
    const maskCanvas = createOffscreenCanvas(imageData.width, imageData.height);
    const maskCtx = getOffscreenContext(maskCanvas);
    if (!maskCtx) throw new Error('Failed to get mask context');

    // Clear the mask canvas
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Calculate dimensions for the vignette
    const centerX = imageData.width / 2;
    const centerY = imageData.height / 2;
    
    // Different handling based on shape
    if (shape === 'circular') {
      const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
      const innerRadius = maxRadius * (1 - intensity / 100);
      const outerRadius = maxRadius;
      
      // Create radial gradient for the vignette
      const gradient = maskCtx.createRadialGradient(
        centerX, centerY, innerRadius * (1 - feather / 100),
        centerX, centerY, outerRadius
      );

      // Add gradient stops
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, `${color}`);

      // Apply gradient
      maskCtx.fillStyle = gradient;
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    } else {
      // Rectangular vignette
      const w = imageData.width;
      const h = imageData.height;
      const featherAmount = feather / 100;
      const vignetteSize = 1 - intensity / 100;
      
      // Create rectangular gradient
      const innerWidth = w * vignetteSize;
      const innerHeight = h * vignetteSize;
      const x0 = (w - innerWidth) / 2;
      const y0 = (h - innerHeight) / 2;
      const x1 = x0 + innerWidth;
      const y1 = y0 + innerHeight;
      
      // Clear with full color
      maskCtx.fillStyle = `${color}`;
      maskCtx.fillRect(0, 0, w, h);
      
      // Create feathered edge with gradient
      // Top edge
      const topGradient = maskCtx.createLinearGradient(0, y0 - featherAmount * y0, 0, y0);
      topGradient.addColorStop(0, `${color}`);
      topGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      maskCtx.fillStyle = topGradient;
      maskCtx.fillRect(0, 0, w, y0);
      
      // Clear center
      maskCtx.clearRect(x0, y0, innerWidth, innerHeight);
    }

    // Apply the vignette mask to the original image
    offscreenCtx.globalCompositeOperation = 'multiply';
    offscreenCtx.drawImage(maskCanvas, 0, 0);

    // Get the final image data
    return offscreenCtx.getImageData(0, 0, imageData.width, imageData.height);
  } catch (error) {
    console.error('Error applying vignette effect:', error);
    return imageData;
  }
}; 