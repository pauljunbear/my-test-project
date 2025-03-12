// This file defines a Web Worker for processing effects in a separate thread

interface ProcessingMessage {
  imageData: ImageDataTransfer;
  effectType: string;
  params: Record<string, any>;
}

interface ImageDataTransfer {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

// Apply duotone effect
function applyDuotone(
  imageData: ImageData,
  highlightColor: string,
  shadowColor: string
): ImageData {
  const data = imageData.data;
  
  // Parse colors
  const highlight = {
    r: parseInt(highlightColor.slice(1, 3), 16),
    g: parseInt(highlightColor.slice(3, 5), 16),
    b: parseInt(highlightColor.slice(5, 7), 16)
  };
  
  const shadow = {
    r: parseInt(shadowColor.slice(1, 3), 16),
    g: parseInt(shadowColor.slice(3, 5), 16),
    b: parseInt(shadowColor.slice(5, 7), 16)
  };
  
  // Process pixels
  for (let i = 0; i < data.length; i += 4) {
    // Convert to grayscale
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const normGray = gray / 255;
    
    // Mix between shadow and highlight colors
    data[i] = shadow.r + (highlight.r - shadow.r) * normGray;
    data[i + 1] = shadow.g + (highlight.g - shadow.g) * normGray;
    data[i + 2] = shadow.b + (highlight.b - shadow.b) * normGray;
  }
  
  return imageData;
}

// Apply film grain effect
function applyFilmGrain(
  imageData: ImageData,
  amount: number,
  size: number
): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      const noise = (Math.random() - 0.5) * 2 * amount;
      
      for (let blockY = 0; blockY < size && y + blockY < height; blockY++) {
        for (let blockX = 0; blockX < size && x + blockX < width; blockX++) {
          const idx = ((y + blockY) * width + (x + blockX)) * 4;
          
          for (let c = 0; c < 3; c++) {
            data[idx + c] = Math.max(0, Math.min(255, data[idx + c] + noise));
          }
        }
      }
    }
  }
  
  return imageData;
}

// Apply glitch effect
function applyGlitchEffect(
  imageData: ImageData,
  intensity: number
): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  
  // Create a copy of the original data
  const originalData = new Uint8ClampedArray(data);
  
  const numGlitches = Math.floor(intensity * 10) + 3;
  
  // Apply RGB shift glitches
  for (let i = 0; i < numGlitches; i++) {
    const y = Math.floor(Math.random() * height);
    const h = Math.floor(Math.random() * 20) + 5;
    const rShift = Math.floor(Math.random() * intensity * 25);
    const gShift = Math.floor(Math.random() * intensity * 25);
    const bShift = Math.floor(Math.random() * intensity * 25);
    
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
  
  // Add random noise blocks
  for (let i = 0; i < numGlitches / 2; i++) {
    const blockX = Math.floor(Math.random() * width);
    const blockY = Math.floor(Math.random() * height);
    const blockWidth = Math.floor(Math.random() * width * 0.2) + 10;
    const blockHeight = Math.floor(Math.random() * height * 0.1) + 5;
    
    for (let y = blockY; y < Math.min(blockY + blockHeight, height); y++) {
      for (let x = blockX; x < Math.min(blockX + blockWidth, width); x++) {
        const idx = (y * width + x) * 4;
        
        // Random RGB values
        data[idx] = Math.random() * 255;     // R
        data[idx + 1] = Math.random() * 255; // G
        data[idx + 2] = Math.random() * 255; // B
      }
    }
  }
  
  return imageData;
}

// Process the effect based on type and parameters
function processEffect(
  imageData: ImageData,
  effectType: string,
  params: Record<string, any>
): ImageData {
  switch (effectType) {
    case 'duotone':
      return applyDuotone(
        imageData,
        params.highlightColor,
        params.shadowColor
      );
      
    case 'filmgrain':
      return applyFilmGrain(
        imageData,
        params.amount / 100 * 50,
        params.size
      );
      
    case 'glitch':
      return applyGlitchEffect(
        imageData,
        params.intensity / 100
      );
      
    default:
      return imageData;
  }
}

// Main worker message handler
self.onmessage = (e: MessageEvent<ProcessingMessage>) => {
  try {
    const { imageData, effectType, params } = e.data;
    
    // Create ImageData from the transferred data
    const img = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
    
    // Process the effect
    const result = processEffect(img, effectType, params);
    
    // Send back the result
    self.postMessage({
      success: true,
      imageData: {
        width: result.width,
        height: result.height,
        data: result.data.buffer
      }
    }, [result.data.buffer]);
    
  } catch (error) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export {}; // Required for TypeScript to treat this as a module 