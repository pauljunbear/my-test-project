import { NoiseSettings, SafeCanvasRenderingContext2D } from '../types';
import { getImageData } from './index';

// Perlin noise implementation for smooth noise generation
class PerlinNoise {
  private perm: number[] = [];

  constructor() {
    // Initialize permutation table
    for (let i = 0; i < 256; i++) {
      this.perm[i] = Math.floor(Math.random() * 256);
    }
    // Extend the permutation table to avoid overflow
    for (let i = 0; i < 256; i++) {
      this.perm[i + 256] = this.perm[i];
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 15;
    const grad_x = 1 + (h & 7); // Gradient x
    const grad_y = 1 + ((h >> 3) & 7); // Gradient y
    return ((h & 8) ? -grad_x : grad_x) * x + ((h & 8) ? -grad_y : grad_y) * y;
  }

  noise(x: number, y: number): number {
    // Find unit square that contains point
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    // Find relative x,y of point in square
    x -= Math.floor(x);
    y -= Math.floor(y);

    // Compute fade curves for each of x,y
    const u = this.fade(x);
    const v = this.fade(y);

    // Hash coordinates of the 4 square corners
    const A = this.perm[X] + Y;
    const B = this.perm[X + 1] + Y;

    // And add blended results from 4 corners of square
    return this.lerp(v,
      this.lerp(u,
        this.grad(this.perm[A], x, y),
        this.grad(this.perm[B], x - 1, y)
      ),
      this.lerp(u,
        this.grad(this.perm[A + 1], x, y - 1),
        this.grad(this.perm[B + 1], x - 1, y - 1)
      )
    );
  }
}

export const applyNoiseEffect = (
  ctx: SafeCanvasRenderingContext2D,
  imageData: ImageData,
  settings: NoiseSettings
): ImageData => {
  const { amount, type, enabled } = settings;

  if (!enabled) return imageData;

  try {
    const data = imageData.data;
    const outputData = new Uint8ClampedArray(data.length);
    const perlin = new PerlinNoise();

    // Copy original data
    outputData.set(data);

    // Scale factor for perlin noise
    const scale = 0.1;
    
    for (let i = 0; i < data.length; i += 4) {
      let noise: number;
      
      if (type === 'perlin') {
        // Generate smooth noise using Perlin noise
        const x = (i / 4) % imageData.width;
        const y = Math.floor((i / 4) / imageData.width);
        noise = perlin.noise(x * scale, y * scale);
        // Normalize to [0, 1]
        noise = (noise + 1) / 2;
      } else {
        // Generate random noise
        noise = Math.random();
      }

      // Apply noise based on amount (0-100)
      const noiseAmount = (amount / 100) * 255;
      const noiseValue = noise * noiseAmount;

      // Add noise to each channel
      outputData[i] = Math.min(255, Math.max(0, data[i] + noiseValue));
      outputData[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noiseValue));
      outputData[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noiseValue));
      // Keep original alpha
      outputData[i + 3] = data[i + 3];
    }

    return new ImageData(outputData, imageData.width, imageData.height);
  } catch (error) {
    console.error('Error applying noise effect:', error);
    return imageData;
  }
}; 