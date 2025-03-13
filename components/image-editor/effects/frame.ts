import { FrameSettings, SafeCanvasRenderingContext2D } from '../types';
import { createOffscreenCanvas, getOffscreenContext } from './index';

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
  const { style, color, width, enabled } = settings;

  if (!enabled) return imageData;

  try {
    // Create offscreen canvas for manipulation
    const offscreenCanvas = createOffscreenCanvas(imageData.width, imageData.height);
    const offscreenCtx = getOffscreenContext(offscreenCanvas);
    if (!offscreenCtx) throw new Error('Failed to get offscreen context');

    // Put the original image data on the offscreen canvas
    offscreenCtx.putImageData(imageData, 0, 0);

    // Get frame style
    const frameStyle = frameStyles[style] || frameStyles.simple;
    const scaledWidth = (width / 100) * Math.min(imageData.width, imageData.height) * 0.1;
    const frameWidth = Math.max(frameStyle.outerWidth, Math.floor(scaledWidth));

    // Set frame style
    offscreenCtx.strokeStyle = color;
    offscreenCtx.lineWidth = frameStyle.innerWidth;
    offscreenCtx.lineJoin = 'miter';
    offscreenCtx.lineCap = 'square';

    // Draw frame
    if (frameStyle.pattern) {
      offscreenCtx.lineWidth = frameStyle.outerWidth;
      frameStyle.pattern(
        offscreenCtx,
        frameWidth / 2,
        frameWidth / 2,
        imageData.width - frameWidth,
        imageData.height - frameWidth
      );
    } else {
      // Draw simple frame
      offscreenCtx.strokeRect(
        frameWidth / 2,
        frameWidth / 2,
        imageData.width - frameWidth,
        imageData.height - frameWidth
      );
    }

    // Get the final image data
    return offscreenCtx.getImageData(0, 0, imageData.width, imageData.height);
  } catch (error) {
    console.error('Error applying frame effect:', error);
    return imageData;
  }
}; 