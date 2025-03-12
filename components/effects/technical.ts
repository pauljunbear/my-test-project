import { Effect } from './types';

/**
 * Sharpen Effect
 */
const sharpenEffect: Effect = {
  id: 'sharpen',
  name: 'Sharpen',
  description: 'Enhance the edges and details in the image',
  category: 'technical',
  thumbnail: '/thumbnails/sharpen.jpg',
  parameters: [
    {
      id: 'amount',
      name: 'Amount',
      type: 'slider',
      min: 0,
      max: 200,
      step: 1,
      defaultValue: 50
    },
    {
      id: 'radius',
      name: 'Radius',
      type: 'slider',
      min: 0,
      max: 2,
      step: 0.1,
      defaultValue: 0.5
    }
  ],
  processFn: (imageData, params) => {
    const amount = params.amount / 100 * 2; // Scale to reasonable range
    const radius = Math.ceil(params.radius);
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Create a copy of the original data
    const originalData = new Uint8ClampedArray(data);
    
    // Apply a laplacian filter for sharpening
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        // Skip alpha channel
        for (let c = 0; c < 3; c++) {
          // Get current pixel
          const centerValue = originalData[idx + c];
          
          // Calculate the local average (sum of surrounding pixels)
          let sum = 0;
          let count = 0;
          
          for (let ky = -radius; ky <= radius; ky++) {
            for (let kx = -radius; kx <= radius; kx++) {
              if (kx === 0 && ky === 0) continue; // Skip center pixel
              
              const offsetX = Math.min(width - 1, Math.max(0, x + kx));
              const offsetY = Math.min(height - 1, Math.max(0, y + ky));
              const offset = (offsetY * width + offsetX) * 4 + c;
              
              sum += originalData[offset];
              count++;
            }
          }
          
          const average = sum / count;
          
          // Apply unsharp masking: original + amount * (original - blur)
          // Simplified to: original * (1 + amount) - average * amount
          data[idx + c] = Math.max(0, Math.min(255, 
            centerValue * (1 + amount) - average * amount
          ));
        }
      }
    }
    
    return imageData;
  }
};

/**
 * Noise Reduction Effect
 */
const noiseReductionEffect: Effect = {
  id: 'noiseReduction',
  name: 'Noise Reduction',
  description: 'Reduce noise and grain in the image',
  category: 'technical',
  thumbnail: '/thumbnails/noise-reduction.jpg',
  parameters: [
    {
      id: 'amount',
      name: 'Amount',
      type: 'slider',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50
    },
    {
      id: 'preserveDetails',
      name: 'Preserve Details',
      type: 'slider',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50
    }
  ],
  processFn: (imageData, params) => {
    const amount = params.amount / 100;
    const preserveDetails = params.preserveDetails / 100;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Create a copy of the original data
    const originalData = new Uint8ClampedArray(data);
    
    // Simple edge-preserving blur
    const radius = Math.max(1, Math.floor(amount * 5));
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        // Process each color channel
        for (let c = 0; c < 3; c++) {
          // Get center pixel value
          const centerValue = originalData[idx + c];
          
          let sum = 0;
          let weightSum = 0;
          
          // Calculate weighted average of surrounding pixels
          for (let ky = -radius; ky <= radius; ky++) {
            for (let kx = -radius; kx <= radius; kx++) {
              const offsetX = Math.min(width - 1, Math.max(0, x + kx));
              const offsetY = Math.min(height - 1, Math.max(0, y + ky));
              const offset = (offsetY * width + offsetX) * 4 + c;
              
              const neighborValue = originalData[offset];
              
              // Calculate weight based on spatial distance and color difference
              const spatialDist = Math.sqrt(kx * kx + ky * ky) / radius;
              const colorDist = Math.abs(centerValue - neighborValue) / 255;
              
              // Smaller weight for pixels with very different colors (preserve edges)
              const preserveEdges = preserveDetails * 30; // Scale factor for edge sensitivity
              const weight = Math.exp(-(spatialDist * spatialDist + colorDist * colorDist * preserveEdges));
              
              sum += neighborValue * weight;
              weightSum += weight;
            }
          }
          
          // Calculate final value as weighted average
          const blurredValue = sum / weightSum;
          
          // Mix original and blurred based on amount
          data[idx + c] = centerValue * (1 - amount) + blurredValue * amount;
        }
      }
    }
    
    return imageData;
  }
};

/**
 * Perspective Correction Effect
 */
const perspectiveEffect: Effect = {
  id: 'perspective',
  name: 'Perspective',
  description: 'Adjust the perspective of the image',
  category: 'technical',
  thumbnail: '/thumbnails/perspective.jpg',
  parameters: [
    {
      id: 'horizontalSkew',
      name: 'Horizontal Skew',
      type: 'slider',
      min: -50,
      max: 50,
      step: 1,
      defaultValue: 0
    },
    {
      id: 'verticalSkew',
      name: 'Vertical Skew',
      type: 'slider',
      min: -50,
      max: 50,
      step: 1,
      defaultValue: 0
    },
    {
      id: 'topWidth',
      name: 'Top Width',
      type: 'slider',
      min: 50,
      max: 150,
      step: 1,
      defaultValue: 100
    },
    {
      id: 'bottomWidth',
      name: 'Bottom Width',
      type: 'slider',
      min: 50,
      max: 150,
      step: 1,
      defaultValue: 100
    }
  ],
  processFn: (imageData, params) => {
    const horizontalSkew = params.horizontalSkew / 100;
    const verticalSkew = params.verticalSkew / 100;
    const topWidth = params.topWidth / 100;
    const bottomWidth = params.bottomWidth / 100;
    
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Create a copy of the original data
    const originalData = new Uint8ClampedArray(data);
    
    // Clear the destination image
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    }
    
    // For each destination pixel, find the source pixel
    for (let y = 0; y < height; y++) {
      // Normalize y coordinate to 0-1
      const ny = y / height;
      
      // Calculate horizontal scale for this row
      const horizontalScale = topWidth + (bottomWidth - topWidth) * ny;
      
      // Calculate skew offsets for this row
      const xSkewOffset = horizontalSkew * (ny - 0.5) * width;
      const ySkewOffset = verticalSkew * (ny - 0.5) * height;
      
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        // Normalize x coordinate to -0.5 to 0.5, then apply scale
        const nx = (x / width - 0.5) / horizontalScale + 0.5;
        
        // Apply skew and convert back to pixel coordinates
        const sourceX = Math.round(nx * width - xSkewOffset);
        const sourceY = Math.round(y - ySkewOffset);
        
        // Check if source pixel is within bounds
        if (sourceX >= 0 && sourceX < width && sourceY >= 0 && sourceY < height) {
          const sourceIdx = (sourceY * width + sourceX) * 4;
          
          // Copy pixel from source to destination
          data[idx] = originalData[sourceIdx];
          data[idx + 1] = originalData[sourceIdx + 1];
          data[idx + 2] = originalData[sourceIdx + 2];
          data[idx + 3] = originalData[sourceIdx + 3];
        }
      }
    }
    
    return imageData;
  }
};

/**
 * Dehaze Effect
 */
const dehazeEffect: Effect = {
  id: 'dehaze',
  name: 'Dehaze',
  description: 'Reduce haze and fog to improve clarity',
  category: 'technical',
  thumbnail: '/thumbnails/dehaze.jpg',
  parameters: [
    {
      id: 'strength',
      name: 'Strength',
      type: 'slider',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50
    },
    {
      id: 'depth',
      name: 'Depth',
      type: 'slider',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50
    }
  ],
  processFn: (imageData, params) => {
    const strength = params.strength / 100;
    const depth = params.depth / 100;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Find the brightest pixel as an estimate of the atmospheric light
    let brightestVal = 0;
    let atmosR = 0, atmosG = 0, atmosB = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = r + g + b;
      
      if (brightness > brightestVal) {
        brightestVal = brightness;
        atmosR = r;
        atmosG = g;
        atmosB = b;
      }
    }
    
    // Normalize atmospheric light
    const atmosMax = Math.max(atmosR, atmosG, atmosB, 1);
    atmosR /= atmosMax;
    atmosG /= atmosMax;
    atmosB /= atmosMax;
    
    // Estimate transmission based on depth parameter
    const minTransmission = 0.1 + 0.8 * (1 - depth);
    
    // Apply dehaze to each pixel
    for (let i = 0; i < data.length; i += 4) {
      // Calculate the local transmission estimate
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      
      // Estimate transmission
      const darkChannel = Math.min(r, Math.min(g, b));
      const transmission = Math.max(minTransmission, 
        1 - strength * darkChannel
      );
      
      // Apply dehaze formula: (I - A) / t + A
      data[i] = Math.max(0, Math.min(255, 
        ((r - atmosR) / transmission + atmosR) * 255
      ));
      data[i + 1] = Math.max(0, Math.min(255, 
        ((g - atmosG) / transmission + atmosG) * 255
      ));
      data[i + 2] = Math.max(0, Math.min(255, 
        ((b - atmosB) / transmission + atmosB) * 255
      ));
    }
    
    return imageData;
  }
};

// Export all technical effects
const technicalEffects: Effect[] = [
  sharpenEffect,
  noiseReductionEffect,
  perspectiveEffect,
  dehazeEffect
];

export default technicalEffects;
