import { Effect } from './types';

/**
 * Brightness & Contrast Effect
 */
const brightnessContrast: Effect = {
  id: 'brightnessContrast',
  name: 'Brightness & Contrast',
  description: 'Adjust the brightness and contrast of the image',
  category: 'basic',
  thumbnail: '/thumbnails/brightness-contrast.jpg',
  parameters: [
    {
      id: 'brightness',
      name: 'Brightness',
      type: 'slider',
      min: -100,
      max: 100,
      step: 1,
      defaultValue: 0
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
    const brightness = params.brightness / 100 * 255;
    const contrast = params.contrast / 100 + 1;
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Apply brightness
      data[i] = Math.max(0, Math.min(255, data[i] + brightness));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + brightness));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + brightness));
      
      // Apply contrast (adjust relative to 128 gray)
      data[i] = Math.max(0, Math.min(255, 128 + contrast * (data[i] - 128)));
      data[i + 1] = Math.max(0, Math.min(255, 128 + contrast * (data[i + 1] - 128)));
      data[i + 2] = Math.max(0, Math.min(255, 128 + contrast * (data[i + 2] - 128)));
    }
    
    return imageData;
  }
};

/**
 * Saturation & Vibrance Effect
 */
const saturationVibrance: Effect = {
  id: 'saturationVibrance',
  name: 'Saturation & Vibrance',
  description: 'Adjust color intensity and richness',
  category: 'basic',
  thumbnail: '/thumbnails/saturation.jpg',
  parameters: [
    {
      id: 'saturation',
      name: 'Saturation',
      type: 'slider',
      min: -100,
      max: 100,
      step: 1,
      defaultValue: 0
    },
    {
      id: 'vibrance',
      name: 'Vibrance',
      type: 'slider',
      min: -100,
      max: 100,
      step: 1,
      defaultValue: 0
    }
  ],
  processFn: (imageData, params) => {
    const saturationFactor = 1 + params.saturation / 100;
    const vibranceFactor = params.vibrance / 100;
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Convert RGB to HSL
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;
      
      if (max === min) {
        h = s = 0; // achromatic
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
          default: h = 0;
        }
        
        h /= 6;
      }
      
      // Apply saturation
      s = Math.max(0, Math.min(1, s * saturationFactor));
      
      // Apply vibrance (affects less saturated colors more)
      if (vibranceFactor !== 0) {
        const sat = Math.max(0, Math.min(1, s * (1 + vibranceFactor * (1 - s))));
        s = sat;
      }
      
      // Convert back to RGB
      if (s === 0) {
        data[i] = data[i + 1] = data[i + 2] = l * 255;
      } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        data[i] = hue2rgb(p, q, h + 1/3) * 255;
        data[i + 1] = hue2rgb(p, q, h) * 255;
        data[i + 2] = hue2rgb(p, q, h - 1/3) * 255;
      }
    }
    
    return imageData;
  }
};

/**
 * Helper function for HSL to RGB conversion
 */
function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1/6) return p + (q - p) * 6 * t;
  if (t < 1/2) return q;
  if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
  return p;
}

/**
 * Highlights & Shadows Effect
 */
const highlightsShadows: Effect = {
  id: 'highlightsShadows',
  name: 'Highlights & Shadows',
  description: 'Adjust the bright and dark areas of the image',
  category: 'basic',
  thumbnail: '/thumbnails/highlights-shadows.jpg',
  parameters: [
    {
      id: 'highlights',
      name: 'Highlights',
      type: 'slider',
      min: -100,
      max: 100,
      step: 1,
      defaultValue: 0
    },
    {
      id: 'shadows',
      name: 'Shadows',
      type: 'slider',
      min: -100,
      max: 100,
      step: 1,
      defaultValue: 0
    },
    {
      id: 'whites',
      name: 'Whites',
      type: 'slider',
      min: -100,
      max: 100,
      step: 1,
      defaultValue: 0
    },
    {
      id: 'blacks',
      name: 'Blacks',
      type: 'slider',
      min: -100,
      max: 100,
      step: 1,
      defaultValue: 0
    }
  ],
  processFn: (imageData, params) => {
    const highlights = params.highlights / 100;
    const shadows = params.shadows / 100;
    const whites = params.whites / 100;
    const blacks = params.blacks / 100;
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const value = data[i + c] / 255;
        
        // Apply highlights adjustment (affects pixels above 0.5)
        if (value > 0.5) {
          data[i + c] = Math.max(0, Math.min(255, data[i + c] + (value - 0.5) * 2 * highlights * 255));
        }
        
        // Apply shadows adjustment (affects pixels below 0.5)
        if (value < 0.5) {
          data[i + c] = Math.max(0, Math.min(255, data[i + c] + (0.5 - value) * 2 * shadows * 255));
        }
        
        // Apply whites adjustment (affects very bright pixels)
        if (value > 0.8) {
          data[i + c] = Math.max(0, Math.min(255, data[i + c] + (value - 0.8) * 5 * whites * 255));
        }
        
        // Apply blacks adjustment (affects very dark pixels)
        if (value < 0.2) {
          data[i + c] = Math.max(0, Math.min(255, data[i + c] + (0.2 - value) * 5 * blacks * 255));
        }
      }
    }
    
    return imageData;
  }
};

/**
 * Temperature & Tint Effect
 */
const temperatureTint: Effect = {
  id: 'temperatureTint',
  name: 'Temperature & Tint',
  description: 'Adjust color temperature and tint of the image',
  category: 'basic',
  thumbnail: '/thumbnails/temperature.jpg',
  parameters: [
    {
      id: 'temperature',
      name: 'Temperature',
      type: 'slider',
      min: -100,
      max: 100,
      step: 1,
      defaultValue: 0
    },
    {
      id: 'tint',
      name: 'Tint',
      type: 'slider',
      min: -100,
      max: 100,
      step: 1,
      defaultValue: 0
    }
  ],
  processFn: (imageData, params) => {
    const temperature = params.temperature / 100;
    const tint = params.tint / 100;
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Apply temperature (blue-yellow axis)
      if (temperature > 0) {
        // Warm up the image
        data[i] = Math.min(255, data[i] + temperature * 60); // Increase red
        data[i + 1] = Math.min(255, data[i + 1] + temperature * 30); // Increase green less
        data[i + 2] = Math.max(0, data[i + 2] - temperature * 60); // Decrease blue
      } else if (temperature < 0) {
        // Cool down the image
        data[i] = Math.max(0, data[i] + temperature * 60); // Decrease red
        data[i + 1] = Math.max(0, data[i + 1] + temperature * 30); // Decrease green less
        data[i + 2] = Math.min(255, data[i + 2] - temperature * 60); // Increase blue
      }
      
      // Apply tint (green-magenta axis)
      if (tint > 0) {
        // Add magenta
        data[i] = Math.min(255, data[i] + tint * 40); // Increase red
        data[i + 1] = Math.max(0, data[i + 1] - tint * 40); // Decrease green
        data[i + 2] = Math.min(255, data[i + 2] + tint * 40); // Increase blue
      } else if (tint < 0) {
        // Add green
        data[i] = Math.max(0, data[i] + tint * 40); // Decrease red
        data[i + 1] = Math.min(255, data[i + 1] - tint * 40); // Increase green
        data[i + 2] = Math.max(0, data[i + 2] + tint * 40); // Decrease blue
      }
    }
    
    return imageData;
  }
};

// Export all basic effects
const basicEffects: Effect[] = [
  brightnessContrast,
  saturationVibrance,
  highlightsShadows,
  temperatureTint
];

export default basicEffects;
