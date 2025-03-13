import { LightLeaksSettings, SafeCanvasRenderingContext2D } from '../types';
import { createOffscreenCanvas, getOffscreenContext } from './index';

interface GradientStop {
  position: number;
  color: string;
}

const generateGradientStops = (color: string, intensity: number): GradientStop[] => {
  const alpha = intensity / 100;
  return [
    { position: 0, color: `${color}00` },
    { position: 0.4, color: `${color}${Math.floor(alpha * 40).toString(16).padStart(2, '0')}` },
    { position: 0.6, color: `${color}${Math.floor(alpha * 80).toString(16).padStart(2, '0')}` },
    { position: 0.8, color: `${color}${Math.floor(alpha * 40).toString(16).padStart(2, '0')}` },
    { position: 1, color: `${color}00` }
  ];
};

export const applyLightLeaksEffect = (
  ctx: SafeCanvasRenderingContext2D,
  imageData: ImageData,
  settings: LightLeaksSettings
): ImageData => {
  const { color, intensity, angle, position, enabled } = settings;

  if (!enabled) return imageData;

  try {
    // Create offscreen canvas for manipulation
    const offscreenCanvas = createOffscreenCanvas(imageData.width, imageData.height);
    const offscreenCtx = getOffscreenContext(offscreenCanvas);
    if (!offscreenCtx) throw new Error('Failed to get offscreen context');

    // Put the original image data on the offscreen canvas
    offscreenCtx.putImageData(imageData, 0, 0);

    // Create another offscreen canvas for the light leak effect
    const leakCanvas = createOffscreenCanvas(imageData.width, imageData.height);
    const leakCtx = getOffscreenContext(leakCanvas);
    if (!leakCtx) throw new Error('Failed to get leak context');

    // Clear the leak canvas
    leakCtx.clearRect(0, 0, leakCanvas.width, leakCanvas.height);

    // Calculate gradient parameters
    const centerX = imageData.width * (position / 100);
    const centerY = imageData.height / 2;
    const angleRad = (angle * Math.PI) / 180;
    const gradientLength = Math.max(imageData.width, imageData.height) * 1.5;

    // Create gradient
    const gradient = leakCtx.createLinearGradient(
      centerX - Math.cos(angleRad) * gradientLength / 2,
      centerY - Math.sin(angleRad) * gradientLength / 2,
      centerX + Math.cos(angleRad) * gradientLength / 2,
      centerY + Math.sin(angleRad) * gradientLength / 2
    );

    // Add gradient stops
    const stops = generateGradientStops(color, intensity);
    stops.forEach(stop => {
      gradient.addColorStop(stop.position, stop.color);
    });

    // Apply gradient
    leakCtx.fillStyle = gradient;
    leakCtx.fillRect(0, 0, leakCanvas.width, leakCanvas.height);

    // Blend the light leak with the original image
    offscreenCtx.globalCompositeOperation = 'screen';
    offscreenCtx.drawImage(leakCanvas, 0, 0);

    // Get the final image data
    return offscreenCtx.getImageData(0, 0, imageData.width, imageData.height);
  } catch (error) {
    console.error('Error applying light leaks effect:', error);
    return imageData;
  }
}; 