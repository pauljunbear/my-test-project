import { Effect } from './types';

/**
 * Duotone Effect
 */
const duotoneEffect: Effect = {
  id: 'duotone',
  name: 'Duotone',
  description: 'Create a two-color gradient based on image brightness',
  category: 'artistic',
  thumbnail: '/thumbnails/duotone.jpg',
  parameters: [
    {
      id: 'highlightColor',
      name: 'Highlight Color',
      type: 'color',
      defaultValue: '#FFDF00' // Golden yellow
    },
    {
      id: 'shadowColor',
      name: 'Shadow Color',
      type: 'color',
      defaultValue: '#0077B6' // Deep blue
    }
  ],
  processFn: (imageData, params) => {
    // Parse colors
    const highlight = {
      r: parseInt(params.highlightColor.slice(1, 3), 16),
      g: parseInt(params.highlightColor.slice(3, 5), 16),
      b: parseInt(params.highlightColor.slice(5, 7), 16)
    };
    
    const shadow = {
      r: parseInt(params.shadowColor.slice(1, 3), 16),
      g: parseInt(params.shadowColor.slice(3, 5), 16),
      b: parseInt(params.shadowColor.slice(5, 7), 16)
    };
    
    const data = imageData.data;
    
    // Process pixels
    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const t = gray / 255; // Normalized brightness
      
      // Mix between shadow and highlight colors
      data[i] = shadow.r + (highlight.r - shadow.r) * t;
      data[i + 1] = shadow.g + (highlight.g - shadow.g) * t;
      data[i + 2] = shadow.b + (highlight.b - shadow.b) * t;
    }
    
    return imageData;
  }
};

/**
 * Black and White Effect
 */
const blackAndWhiteEffect: Effect = {
  id: 'blackAndWhite',
  name: 'Black & White',
  description: 'Convert image to grayscale with adjustable filter',
  category: 'artistic',
  thumbnail: '/thumbnails/bw.jpg',
  parameters: [
    {
      id: 'redFilter',
      name: 'Red Channel',
      type: 'slider',
      min: 0,
      max: 200,
      step: 1,
      defaultValue: 30
    },
    {
      id: 'greenFilter',
      name: 'Green Channel',
      type: 'slider',
      min: 0,
      max: 200,
      step: 1,
      defaultValue: 59
    },
    {
      id: 'blueFilter',
      name: 'Blue Channel',
      type: 'slider',
      min: 0,
      max: 200,
      step: 1,
      defaultValue: 11
    },
    {
      id: 'contrast',
      name: 'Contrast',
      type: 'slider',
      min: -100,
      max: 100,
      step: 1,
      defaultValue: 0
    }
  ],
  processFn: (imageData, params) => {
    // Normalize filter weights
    const total = params.redFilter + params.greenFilter + params.blueFilter;
    let redWeight = params.redFilter / total;
    let greenWeight = params.greenFilter / total;
    let blueWeight = params.blueFilter / total;
    
    // If total is 0, use standard weights
    if (total === 0) {
      redWeight = 0.3;
      greenWeight = 0.59;
      blueWeight = 0.11;
    }
    
    const contrast = params.contrast / 100 + 1;
    const data = imageData.data;
    
    // Process pixels
    for (let i = 0; i < data.length; i += 4) {
      // Convert to weighted grayscale
      const gray = redWeight * data[i] + greenWeight * data[i + 1] + blueWeight * data[i + 2];
      
      // Apply contrast (adjust relative to 128 gray)
      let value = 128 + contrast * (gray - 128);
      value = Math.max(0, Math.min(255, value));
      
      data[i] = data[i + 1] = data[i + 2] = value;
    }
    
    return imageData;
  }
};

/**
 * Film Grain Effect
 */
const filmGrainEffect: Effect = {
  id: 'filmGrain',
  name: 'Film Grain',
  description: 'Add analog film grain to the image',
  category: 'artistic',
  thumbnail: '/thumbnails/film-grain.jpg',
  parameters: [
    {
      id: 'amount',
      name: 'Amount',
      type: 'slider',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 30
    },
    {
      id: 'size',
      name: 'Grain Size',
      type: 'slider',
      min: 1,
      max: 5,
      step: 1,
      defaultValue: 1
    },
    {
      id: 'monochrome',
      name: 'Monochrome',
      type: 'checkbox',
      defaultValue: true
    }
  ],
  processFn: (imageData, params) => {
    const amount = params.amount / 100 * 50; // Scale to reasonable range
    const size = params.size;
    const monochrome = params.monochrome;
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // For larger grain sizes, we create blocks of noise
    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        // Generate noise values for this block
        let noiseR, noiseG, noiseB;
        
        if (monochrome) {
          // Same noise for all channels
          noiseR = noiseG = noiseB = (Math.random() - 0.5) * 2 * amount;
        } else {
          // Different noise for each channel
          noiseR = (Math.random() - 0.5) * 2 * amount;
          noiseG = (Math.random() - 0.5) * 2 * amount;
          noiseB = (Math.random() - 0.5) * 2 * amount;
        }
        
        // Apply noise to all pixels in this block
        for (let blockY = 0; blockY < size && y + blockY < height; blockY++) {
          for (let blockX = 0; blockX < size && x + blockX < width; blockX++) {
            const idx = ((y + blockY) * width + (x + blockX)) * 4;
            
            data[idx] = Math.max(0, Math.min(255, data[idx] + noiseR));
            data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + noiseG));
            data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + noiseB));
          }
        }
      }
    }
    
    return imageData;
  }
};

/**
 * Vignette Effect
 */
const vignetteEffect: Effect = {
  id: 'vignette',
  name: 'Vignette',
  description: 'Add a soft dark edge around the image',
  category: 'artistic',
  thumbnail: '/thumbnails/vignette.jpg',
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
      id: 'size',
      name: 'Size',
      type: 'slider',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50
    },
    {
      id: 'feather',
      name: 'Feather',
      type: 'slider',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50
    }
  ],
  processFn: (imageData, params) => {
    const amount = params.amount / 100;
    // Size is reversed - smaller values create larger vignettes
    const size = 1 - params.size / 100;
    const feather = params.feather / 100;
    
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Calculate center and max distance
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
    // Adjust the radius based on size
    const radius = maxDistance * size;
    // Calculate feather zone
    const featherZone = feather * maxDistance;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        // Calculate distance from center
        const distX = x - centerX;
        const distY = y - centerY;
        const distance = Math.sqrt(distX * distX + distY * distY);
        
        // Calculate vignette factor
        let vignette = 0;
        
        if (distance > radius) {
          if (featherZone > 0 && distance < radius + featherZone) {
            // In the feather zone - soft transition
            vignette = (distance - radius) / featherZone * amount;
          } else {
            // Outside radius + feather - full vignette
            vignette = amount;
          }
        }
        
        // Apply vignette
        data[idx] = Math.max(0, data[idx] * (1 - vignette));
        data[idx + 1] = Math.max(0, data[idx + 1] * (1 - vignette));
        data[idx + 2] = Math.max(0, data[idx + 2] * (1 - vignette));
      }
    }
    
    return imageData;
  }
};

/**
 * Glitch Effect
 */
const glitchEffect: Effect = {
  id: 'glitch',
  name: 'Glitch',
  description: 'Add digital glitch artifacts to the image',
  category: 'artistic',
  thumbnail: '/thumbnails/glitch.jpg',
  parameters: [
    {
      id: 'intensity',
      name: 'Intensity',
      type: 'slider',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50
    },
    {
      id: 'seed',
      name: 'Seed',
      type: 'slider',
      min: 1,
      max: 100,
      step: 1,
      defaultValue: 1
    }
  ],
  processFn: (imageData, params) => {
    const intensity = params.intensity / 100;
    const seed = params.seed;
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Create a copy of the original data
    const originalData = new Uint8ClampedArray(data);
    
    // Use seed for consistent random values
    const random = (max: number) => {
      // Simple pseudo-random function using seed
      let value = Math.sin(seed * 9999 + Math.random() * 9999) * 10000;
      return Math.abs(value % max);
    };
    
    const numGlitches = Math.floor(intensity * 10) + 3;
    
    // Apply RGB shift glitches
    for (let i = 0; i < numGlitches; i++) {
      const y = Math.floor(random(height));
      const h = Math.floor(random(20)) + 5;
      const rShift = Math.floor(random(intensity * 25));
      const gShift = Math.floor(random(intensity * 25));
      const bShift = Math.floor(random(intensity * 25));
      
      for (let row = y; row < Math.min(y + h, height); row++) {
        // Red channel shift
        for (let col = 0; col < width - rShift; col++) {
          const targetIdx = (row * width + col) * 4;
          const sourceIdx = (row * width + col + rShift) * 4;
          if (sourceIdx < originalData.length) {
            data[targetIdx] = originalData[sourceIdx];
          }
        }
        
        // Green channel shift
        for (let col = 0; col < width - gShift; col++) {
          const targetIdx = (row * width + col) * 4 + 1;
          const sourceIdx = (row * width + col + gShift) * 4 + 1;
          if (sourceIdx < originalData.length) {
            data[targetIdx] = originalData[sourceIdx];
          }
        }
        
        // Blue channel shift
        for (let col = 0; col < width - bShift; col++) {
          const targetIdx = (row * width + col) * 4 + 2;
          const sourceIdx = (row * width + col + bShift) * 4 + 2;
          if (sourceIdx < originalData.length) {
            data[targetIdx] = originalData[sourceIdx];
          }
        }
      }
    }
    
    // Add random blocks
    for (let i = 0; i < numGlitches / 2; i++) {
      const blockX = Math.floor(random(width));
      const blockY = Math.floor(random(height));
      const blockWidth = Math.floor(random(width * 0.2)) + 10;
      const blockHeight = Math.floor(random(height * 0.1)) + 5;
      
      for (let y = blockY; y < Math.min(blockY + blockHeight, height); y++) {
        for (let x = blockX; x < Math.min(blockX + blockWidth, width); x++) {
          const idx = (y * width + x) * 4;
          
          if (random(100) < 50) {
            // Shift pixel data
            const shiftX = Math.floor(random(20)) - 10;
            const shiftY = Math.floor(random(10)) - 5;
            
            const sourceX = Math.max(0, Math.min(width - 1, x + shiftX));
            const sourceY = Math.max(0, Math.min(height - 1, y + shiftY));
            const sourceIdx = (sourceY * width + sourceX) * 4;
            
            for (let c = 0; c < 3; c++) {
              data[idx + c] = originalData[sourceIdx + c];
            }
          } else if (random(100) < 30) {
            // Random RGB values
            data[idx] = random(255);     // R
            data[idx + 1] = random(255); // G
            data[idx + 2] = random(255); // B
          }
        }
      }
    }
    
    return imageData;
  }
};

// Export all artistic effects
const artisticEffects: Effect[] = [
  duotoneEffect,
  blackAndWhiteEffect,
  filmGrainEffect,
  vignetteEffect,
  glitchEffect
];

export default artisticEffects;
