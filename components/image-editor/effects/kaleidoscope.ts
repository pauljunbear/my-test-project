import { KaleidoscopeSettings, SafeCanvasRenderingContext2D } from '../types';
import { createOffscreenCanvas, getOffscreenContext } from './index';

export const applyKaleidoscopeEffect = (
  ctx: SafeCanvasRenderingContext2D,
  imageData: ImageData,
  settings: KaleidoscopeSettings
): ImageData => {
  const { segments, rotation, zoom, enabled } = settings;

  if (!enabled) return imageData;

  try {
    // Create offscreen canvas for manipulation
    const offscreenCanvas = createOffscreenCanvas(imageData.width, imageData.height);
    const offscreenCtx = getOffscreenContext(offscreenCanvas);
    if (!offscreenCtx) throw new Error('Failed to get offscreen context');

    // Put the original image data on the offscreen canvas
    offscreenCtx.putImageData(imageData, 0, 0);

    // Create another offscreen canvas for the final result
    const resultCanvas = createOffscreenCanvas(imageData.width, imageData.height);
    const resultCtx = getOffscreenContext(resultCanvas);
    if (!resultCtx) throw new Error('Failed to get result context');

    // Clear the result canvas
    resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);

    // Calculate center point
    const centerX = imageData.width / 2;
    const centerY = imageData.height / 2;

    // Calculate angle for each segment
    const segmentAngle = (Math.PI * 2) / segments;
    const zoomFactor = zoom / 100;

    // Draw each segment
    for (let i = 0; i < segments; i++) {
      resultCtx.save();

      // Move to center
      resultCtx.translate(centerX, centerY);

      // Apply rotation and zoom
      resultCtx.rotate(segmentAngle * i + (rotation * Math.PI) / 180);
      resultCtx.scale(zoomFactor, zoomFactor);

      // Create clipping path for the segment
      resultCtx.beginPath();
      resultCtx.moveTo(0, 0);
      resultCtx.arc(0, 0, Math.max(imageData.width, imageData.height), 
        -segmentAngle / 2, segmentAngle / 2);
      resultCtx.closePath();
      resultCtx.clip();

      // Draw the segment
      resultCtx.drawImage(
        offscreenCanvas,
        -centerX,
        -centerY,
        imageData.width,
        imageData.height
      );

      // Mirror the segment
      resultCtx.scale(-1, 1);
      resultCtx.drawImage(
        offscreenCanvas,
        -centerX,
        -centerY,
        imageData.width,
        imageData.height
      );

      resultCtx.restore();
    }

    // Get the final image data
    return resultCtx.getImageData(0, 0, imageData.width, imageData.height);
  } catch (error) {
    console.error('Error applying kaleidoscope effect:', error);
    return imageData;
  }
}; 