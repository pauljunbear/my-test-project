import { FrameSettings, SafeCanvasRenderingContext2D } from '../types';
import { createOffscreenCanvas, getOffscreenContext } from './index';

// Helper function to adjust color brightness
const adjustColorBrightness = (color: string, percent: number): string => {
  // Remove # if present
  let hex = color.replace('#', '');
  
  // Convert to RGB
  let r = parseInt(hex.substr(0, 2), 16);
  let g = parseInt(hex.substr(2, 2), 16);
  let b = parseInt(hex.substr(4, 2), 16);
  
  // Adjust brightness
  r = Math.max(0, Math.min(255, r + (r * percent / 100)));
  g = Math.max(0, Math.min(255, g + (g * percent / 100)));
  b = Math.max(0, Math.min(255, b + (b * percent / 100)));
  
  // Convert back to hex
  return '#' + 
    Math.round(r).toString(16).padStart(2, '0') + 
    Math.round(g).toString(16).padStart(2, '0') + 
    Math.round(b).toString(16).padStart(2, '0');
};

interface FrameStyle {
  innerWidth: number;
  outerWidth: number;
  pattern?: (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => void;
}

const frameStyles: Record<string, FrameStyle> = {
  simple: {
    innerWidth: 1,
    outerWidth: 2
  },
  double: {
    innerWidth: 1,
    outerWidth: 4,
    pattern: (ctx, x, y, width, height) => {
      const gap = 2;
      ctx.strokeRect(x, y, width, height);
      ctx.strokeRect(x + gap, y + gap, width - 2 * gap, height - 2 * gap);
    }
  },
  ornate: {
    innerWidth: 2,
    outerWidth: 8,
    pattern: (ctx, x, y, width, height) => {
      // Draw main frame
      ctx.strokeRect(x, y, width, height);
      
      // Draw corner ornaments
      const cornerSize = 20;
      const margin = 4;
      
      // Top-left corner
      ctx.beginPath();
      ctx.moveTo(x + margin, y + cornerSize);
      ctx.quadraticCurveTo(x + margin, y + margin, x + cornerSize, y + margin);
      ctx.stroke();
      
      // Top-right corner
      ctx.beginPath();
      ctx.moveTo(x + width - cornerSize, y + margin);
      ctx.quadraticCurveTo(x + width - margin, y + margin, x + width - margin, y + cornerSize);
      ctx.stroke();
      
      // Bottom-right corner
      ctx.beginPath();
      ctx.moveTo(x + width - margin, y + height - cornerSize);
      ctx.quadraticCurveTo(x + width - margin, y + height - margin, x + width - cornerSize, y + height - margin);
      ctx.stroke();
      
      // Bottom-left corner
      ctx.beginPath();
      ctx.moveTo(x + cornerSize, y + height - margin);
      ctx.quadraticCurveTo(x + margin, y + height - margin, x + margin, y + height - cornerSize);
      ctx.stroke();
    }
  },
  vintage: {
    innerWidth: 2,
    outerWidth: 12,
    pattern: (ctx, x, y, width, height) => {
      // Draw main frame
      ctx.strokeRect(x, y, width, height);
      
      // Add vintage pattern
      const patternSize = 10;
      const margin = 6;
      
      ctx.save();
      ctx.lineWidth = 1;
      
      // Draw diagonal lines
      for (let i = margin; i < width - margin; i += patternSize) {
        ctx.beginPath();
        ctx.moveTo(x + i, y + margin);
        ctx.lineTo(x + i + patternSize / 2, y + margin + patternSize);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x + i, y + height - margin);
        ctx.lineTo(x + i + patternSize / 2, y + height - margin - patternSize);
        ctx.stroke();
      }
      
      // Draw dots at intersections
      ctx.fillStyle = ctx.strokeStyle;
      for (let i = margin; i < width - margin; i += patternSize) {
        ctx.beginPath();
        ctx.arc(x + i + patternSize / 4, y + margin + patternSize / 2, 1, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(x + i + patternSize / 4, y + height - margin - patternSize / 2, 1, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    }
  }
};

export const applyFrameEffect = (
  ctx: SafeCanvasRenderingContext2D,
  imageData: ImageData,
  settings: FrameSettings
): ImageData => {
  const { style, color, width, height, padding, ratio, enabled } = settings;

  if (!enabled) return imageData;

  try {
    // Create offscreen canvas for manipulation with frame dimensions
    const frameWidth = width;
    const frameHeight = height;
    
    // Calculate new dimensions based on ratio if specified
    let newWidth = imageData.width;
    let newHeight = imageData.height;
    
    if (ratio !== 'custom') {
      const [widthRatio, heightRatio] = ratio.split(':').map(Number);
      if (widthRatio && heightRatio) {
        // Determine which dimension to keep based on the aspect ratio
        const currentRatio = imageData.width / imageData.height;
        const targetRatio = widthRatio / heightRatio;
        
        if (currentRatio > targetRatio) {
          // Width is larger than the target ratio, so base on height
          newWidth = Math.round(imageData.height * targetRatio);
          newHeight = imageData.height;
        } else {
          // Height is larger than the target ratio, so base on width
          newWidth = imageData.width;
          newHeight = Math.round(imageData.width / targetRatio);
        }
      }
    } else {
      newWidth = frameWidth;
      newHeight = frameHeight;
    }
    
    // Calculate total canvas size including padding
    const paddingSize = padding;
    const canvasWidth = newWidth + (paddingSize * 2);
    const canvasHeight = newHeight + (paddingSize * 2);

    // Create offscreen canvas for the result
    const offscreenCanvas = createOffscreenCanvas(canvasWidth, canvasHeight);
    const offscreenCtx = getOffscreenContext(offscreenCanvas);
    if (!offscreenCtx) throw new Error('Failed to get offscreen context');

    // Clear canvas with frame color
    offscreenCtx.fillStyle = color;
    offscreenCtx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Get frame style
    const frameStyle = frameStyles[style] || frameStyles.simple;
    
    // Draw the original image in the center with padding
    const tempCanvas = createOffscreenCanvas(imageData.width, imageData.height);
    const tempCtx = getOffscreenContext(tempCanvas);
    if (!tempCtx) throw new Error('Failed to get temp context');
    tempCtx.putImageData(imageData, 0, 0);
    
    // Center the image in the frame
    const offsetX = Math.floor((canvasWidth - newWidth) / 2);
    const offsetY = Math.floor((canvasHeight - newHeight) / 2);
    offscreenCtx.drawImage(tempCanvas, 0, 0, imageData.width, imageData.height, 
                           offsetX, offsetY, newWidth, newHeight);
    
    // Apply frame styling if a pattern is available
    if (frameStyle.pattern) {
      offscreenCtx.strokeStyle = adjustColorBrightness(color, -20);
      offscreenCtx.lineWidth = frameStyle.innerWidth;
      frameStyle.pattern(offscreenCtx, paddingSize / 2, paddingSize / 2, 
                        canvasWidth - paddingSize, canvasHeight - paddingSize);
    }

    // Get the final image data
    return offscreenCtx.getImageData(0, 0, canvasWidth, canvasHeight);
  } catch (error) {
    console.error('Error applying frame effect:', error);
    return imageData;
  }
}; 