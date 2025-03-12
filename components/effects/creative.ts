import { Effect } from './types';

/**
 * Tilt Shift Effect
 */
const tiltShiftEffect: Effect = {
  id: 'tiltShift',
  name: 'Tilt Shift',
  description: 'Create a miniature effect with selective focus',
  category: 'creative',
  thumbnail: '/thumbnails/tilt-shift.jpg',
  parameters: [
    {
      id: 'position',
      name: 'Position',
      type: 'slider',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50
    },
    {
      id: 'blurAmount',
      name: 'Blur Amount',
      type: 'slider',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50
    },
    {
      id: 'gradientSize',
      name: 'Gradient Size',
      type: 'slider',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 30
    },
    {
      id: 'horizontal',
      name: 'Horizontal',
      type: 'checkbox',
      defaultValue: false
    }
  ],
  processFn: (imageData, params) => {
    const position = params.position / 100;
    const blurAmount = params.blurAmount / 100 * 10; // Scale to reasonable range
    const gradientSize = Math.max(0.1, params.gradientSize / 100);
    const horizontal = params.horizontal;
    
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Create a copy of the original data
    const originalData = new Uint8ClampedArray(data);
    
    // Apply a simple box blur
    const applyBoxBlur = (x: number, y: number, radius: number) => {
      const idx = (y * width + x) * 4;
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      
      // Simple box blur
      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const offsetX = Math.min(width - 1, Math.max(0, x + kx));
          const offsetY = Math.min(height - 1, Math.max(0, y + ky));
          const offset = (offsetY * width + offsetX) * 4;
          
          r += originalData[offset];
          g += originalData[offset + 1];
          b += originalData[offset + 2];
          a += originalData[offset + 3];
          count++;
        }
      }
      
      // Set the blurred pixel
      data[idx] = r / count;
      data[idx + 1] = g / count;
      data[idx + 2] = b / count;
      data[idx + 3] = a / count;
    };
    
    // Position the focal plane
    const focusCenter = horizontal ? height * position : width * position;
    const gradientRange = horizontal ? height * gradientSize : width * gradientSize;
    
    // Process each pixel
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Calculate distance from focal plane
        const dist = horizontal ? Math.abs(y - focusCenter) : Math.abs(x - focusCenter);
        
        // If outside the focus area, apply blur based on distance
        if (dist > gradientRange) {
          // Full blur radius at maximum distance
          const maxDist = horizontal ? height / 2 : width / 2;
          const blurRadius = Math.min(10, Math.floor(
            blurAmount * Math.min(1, (dist - gradientRange) / (maxDist - gradientRange))
          ));
          
          if (blurRadius > 0) {
            applyBoxBlur(x, y, blurRadius);
          }
        }
      }
    }
    
    return imageData;
  }
};

/**
 * Pixelate Effect
 */
const pixelateEffect: Effect = {
  id: 'pixelate',
  name: 'Pixelate',
  description: 'Create a pixelated/mosaic effect',
  category: 'creative',
  thumbnail: '/thumbnails/pixelate.jpg',
  parameters: [
    {
      id: 'pixelSize',
      name: 'Pixel Size',
      type: 'slider',
      min: 1,
      max: 50,
      step: 1,
      defaultValue: 8
    },
    {
      id: 'shape',
      name: 'Pixel Shape',
      type: 'select',
      defaultValue: 'square',
      options: [
        { value: 'square', label: 'Square' },
        { value: 'circle', label: 'Circle' },
        { value: 'diamond', label: 'Diamond' }
      ]
    }
  ],
  processFn: (imageData, params) => {
    const pixelSize = Math.max(1, Math.floor(params.pixelSize));
    const shape = params.shape;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Create a copy for processing
    const tempData = new Uint8ClampedArray(data);
    
    // Function to apply a shape mask
    const isInShape = (x: number, y: number, centerX: number, centerY: number, size: number): boolean => {
      if (shape === 'square') {
        return true; // Always visible for square
      } else if (shape === 'circle') {
        const dx = (x - centerX) / (size / 2);
        const dy = (y - centerY) / (size / 2);
        return dx * dx + dy * dy <= 1;
      } else if (shape === 'diamond') {
        const dx = Math.abs(x - centerX) / (size / 2);
        const dy = Math.abs(y - centerY) / (size / 2);
        return dx + dy <= 1;
      }
      return true;
    };
    
    // Process pixels in blocks
    for (let y = 0; y < height; y += pixelSize) {
      for (let x = 0; x < width; x += pixelSize) {
        // Calculate average color for this block
        let r = 0, g = 0, b = 0, a = 0, count = 0;
        
        for (let by = 0; by < pixelSize && y + by < height; by++) {
          for (let bx = 0; bx < pixelSize && x + bx < width; bx++) {
            const idx = ((y + by) * width + (x + bx)) * 4;
            r += tempData[idx];
            g += tempData[idx + 1];
            b += tempData[idx + 2];
            a += tempData[idx + 3];
            count++;
          }
        }
        
        // Average color
        r = r / count;
        g = g / count;
        b = b / count;
        a = a / count;
        
        // Apply the average color to the block with shape mask
        const centerX = x + pixelSize / 2;
        const centerY = y + pixelSize / 2;
        
        for (let by = 0; by < pixelSize && y + by < height; by++) {
          for (let bx = 0; bx < pixelSize && x + bx < width; bx++) {
            if (isInShape(x + bx, y + by, centerX, centerY, pixelSize)) {
              const idx = ((y + by) * width + (x + bx)) * 4;
              data[idx] = r;
              data[idx + 1] = g;
              data[idx + 2] = b;
              data[idx + 3] = a;
            }
          }
        }
      }
    }
    
    return imageData;
  }
};

/**
 * Mirror Effect
 */
const mirrorEffect: Effect = {
  id: 'mirror',
  name: 'Mirror',
  description: 'Create a mirrored reflection of the image',
  category: 'creative',
  thumbnail: '/thumbnails/mirror.jpg',
  parameters: [
    {
      id: 'direction',
      name: 'Direction',
      type: 'select',
      defaultValue: 'right',
      options: [
        { value: 'right', label: 'Left to Right' },
        { value: 'left', label: 'Right to Left' },
        { value: 'down', label: 'Top to Bottom' },
        { value: 'up', label: 'Bottom to Top' }
      ]
    },
    {
      id: 'position',
      name: 'Position',
      type: 'slider',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50
    }
  ],
  processFn: (imageData, params) => {
    const direction = params.direction;
    const position = params.position / 100;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Create a copy of original data
    const originalData = new Uint8ClampedArray(data);
    
    if (direction === 'right' || direction === 'left') {
      // Horizontal mirroring
      const mirrorX = Math.floor(width * position);
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          
          if ((direction === 'right' && x > mirrorX) || 
              (direction === 'left' && x < mirrorX)) {
            // Calculate mirror position
            const mx = direction === 'right' ? 
              mirrorX - (x - mirrorX) : 
              mirrorX + (mirrorX - x);
              
            if (mx >= 0 && mx < width) {
              const midx = (y * width + mx) * 4;
              data[idx] = originalData[midx];
              data[idx + 1] = originalData[midx + 1];
              data[idx + 2] = originalData[midx + 2];
              data[idx + 3] = originalData[midx + 3];
            }
          }
        }
      }
    } else {
      // Vertical mirroring
      const mirrorY = Math.floor(height * position);
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          
          if ((direction === 'down' && y > mirrorY) || 
              (direction === 'up' && y < mirrorY)) {
            // Calculate mirror position
            const my = direction === 'down' ? 
              mirrorY - (y - mirrorY) : 
              mirrorY + (mirrorY - y);
              
            if (my >= 0 && my < height) {
              const midx = (my * width + x) * 4;
              data[idx] = originalData[midx];
              data[idx + 1] = originalData[midx + 1];
              data[idx + 2] = originalData[midx + 2];
              data[idx + 3] = originalData[midx + 3];
            }
          }
        }
      }
    }
    
    return imageData;
  }
};

/**
 * Kaleidoscope Effect
 */
const kaleidoscopeEffect: Effect = {
  id: 'kaleidoscope',
  name: 'Kaleidoscope',
  description: 'Create a symmetrical kaleidoscope pattern',
  category: 'creative',
  thumbnail: '/thumbnails/kaleidoscope.jpg',
  parameters: [
    {
      id: 'segments',
      name: 'Segments',
      type: 'slider',
      min: 2,
      max: 20,
      step: 1,
      defaultValue: 6
    },
    {
      id: 'rotation',
      name: 'Rotation',
      type: 'slider',
      min: 0,
      max: 360,
      step: 1,
      defaultValue: 0
    },
    {
      id: 'zoom',
      name: 'Zoom',
      type: 'slider',
      min: 10,
      max: 200,
      step: 1,
      defaultValue: 100
    }
  ],
  processFn: (imageData, params) => {
    const segments = Math.floor(params.segments);
    const rotation = params.rotation * Math.PI / 180;
    const zoom = params.zoom / 100;
    
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Create a copy of original data
    const originalData = new Uint8ClampedArray(data);
    
    // Calculate center
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Process each pixel
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        // Translate to center
        let dx = (x - centerX) / zoom;
        let dy = (y - centerY) / zoom;
        
        // Apply rotation
        const dist = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dy, dx) + rotation;
        
        // Apply kaleidoscope effect - map to segment
        angle = angle % (2 * Math.PI / segments);
        if (angle < 0) angle += 2 * Math.PI / segments;
        
        // Mirror within segment
        if (angle > Math.PI / segments) {
          angle = 2 * Math.PI / segments - angle;
        }
        
        // Convert back to Cartesian
        const srcX = Math.round(centerX + dist * Math.cos(angle));
        const srcY = Math.round(centerY + dist * Math.sin(angle));
        
        // Copy pixel if within bounds
        if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
          const srcIdx = (srcY * width + srcX) * 4;
          data[idx] = originalData[srcIdx];
          data[idx + 1] = originalData[srcIdx + 1];
          data[idx + 2] = originalData[srcIdx + 2];
          data[idx + 3] = originalData[srcIdx + 3];
        } else {
          // Out of bounds - set to transparent
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 0;
        }
      }
    }
    
    return imageData;
  }
};

// Export all creative effects
const creativeEffects: Effect[] = [
  tiltShiftEffect,
  pixelateEffect,
  mirrorEffect,
  kaleidoscopeEffect
];

export default creativeEffects;
