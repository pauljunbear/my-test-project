import { TextureSettings, SafeCanvasRenderingContext2D } from '../types';
import { createOffscreenCanvas, getOffscreenContext } from './index';

// Function to generate a seamless noise texture
const generateNoiseTexture = (
  width: number,
  height: number,
  scale: number,
  roughness: number
): ImageData => {
  const canvas = createOffscreenCanvas(width, height);
  const ctx = getOffscreenContext(canvas);
  if (!ctx) throw new Error('Failed to get context for noise texture');

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  // Generate Perlin-like noise
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      
      // Generate multiple octaves of noise
      let value = 0;
      let amplitude = 1;
      let frequency = scale;
      
      for (let octave = 0; octave < 4; octave++) {
        const nx = x * frequency / width;
        const ny = y * frequency / height;
        
        // Simple value noise
        const noiseValue = Math.sin(nx + Math.cos(ny)) * Math.cos(ny + Math.sin(nx));
        value += noiseValue * amplitude;
        
        amplitude *= roughness;
        frequency *= 2;
      }

      // Normalize to [0, 255]
      const pixel = Math.floor((value + 1) * 127.5);
      
      data[i] = pixel;
      data[i + 1] = pixel;
      data[i + 2] = pixel;
      data[i + 3] = 255;
    }
  }

  return imageData;
};

export const applyTextureEffect = (
  ctx: SafeCanvasRenderingContext2D,
  imageData: ImageData,
  settings: TextureSettings
): ImageData => {
  const { texture, opacity, blend, scale, enabled } = settings;

  if (!enabled) return imageData;

  try {
    // Create offscreen canvas for manipulation
    const offscreenCanvas = createOffscreenCanvas(imageData.width, imageData.height);
    const offscreenCtx = getOffscreenContext(offscreenCanvas);
    if (!offscreenCtx) throw new Error('Failed to get offscreen context');

    // Put the original image data on the offscreen canvas
    offscreenCtx.putImageData(imageData, 0, 0);

    // Generate or load texture
    let textureImageData;
    if (texture === 'noise') {
      // Generate procedural noise texture
      textureImageData = generateNoiseTexture(imageData.width, imageData.height, scale, 0.5);
    } else {
      // For other texture types, we would load pre-defined textures here
      textureImageData = generateNoiseTexture(imageData.width, imageData.height, scale, 0.5);
    }

    // Create texture canvas
    const textureCanvas = createOffscreenCanvas(imageData.width, imageData.height);
    const textureCtx = getOffscreenContext(textureCanvas);
    if (!textureCtx) throw new Error('Failed to get texture context');
    
    // Put texture image data
    textureCtx.putImageData(textureImageData, 0, 0);

    // Apply the texture with chosen blend mode
    switch (blend) {
      case 'multiply':
        offscreenCtx.globalCompositeOperation = 'multiply';
        break;
      case 'overlay':
        offscreenCtx.globalCompositeOperation = 'overlay';
        break;
      case 'soft-light':
        offscreenCtx.globalCompositeOperation = 'soft-light';
        break;
      case 'screen':
        offscreenCtx.globalCompositeOperation = 'screen';
        break;
      default:
        offscreenCtx.globalCompositeOperation = 'overlay';
    }

    // Set opacity
    offscreenCtx.globalAlpha = opacity / 100;
    
    // Draw the texture
    offscreenCtx.drawImage(textureCanvas, 0, 0);
    
    // Reset blend mode and alpha
    offscreenCtx.globalCompositeOperation = 'source-over';
    offscreenCtx.globalAlpha = 1.0;

    // Get the final image data
    return offscreenCtx.getImageData(0, 0, imageData.width, imageData.height);
  } catch (error) {
    console.error('Error applying texture effect:', error);
    return imageData;
  }
}; 