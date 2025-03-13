import { VignetteSettings, SafeCanvasRenderingContext2D } from '../types';
import { createOffscreenCanvas, getOffscreenContext } from './index';

export const applyVignetteEffect = (
  ctx: SafeCanvasRenderingContext2D,
  imageData: ImageData,
  settings: VignetteSettings
): ImageData => {
  const { amount, feather, roundness, enabled } = settings;

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
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
    const innerRadius = maxRadius * (1 - amount / 100);
    const outerRadius = maxRadius;
    
    // Create radial gradient for the vignette
    const gradient = maskCtx.createRadialGradient(
      centerX, centerY, innerRadius * (1 - feather / 100),
      centerX, centerY, outerRadius
    );

    // Adjust the shape based on roundness
    const aspectRatio = imageData.width / imageData.height;
    maskCtx.scale(1, 1 + (1 - roundness / 100) * (aspectRatio - 1));

    // Add gradient stops
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');

    // Apply gradient
    maskCtx.fillStyle = gradient;
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Reset the scale transformation
    maskCtx.setTransform(1, 0, 0, 1, 0, 0);

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