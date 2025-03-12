// Types for the effects system

export type EffectCategory = 'basic' | 'artistic' | 'creative' | 'technical';

export interface EffectParameter {
  id: string;
  name: string;
  type: 'slider' | 'color' | 'select' | 'checkbox' | 'range';
  min?: number;
  max?: number;
  step?: number;
  defaultValue: number | string | boolean;
  options?: Array<{ value: string; label: string }>;
}

export interface Effect {
  id: string;
  name: string;
  description: string;
  category: EffectCategory;
  thumbnail?: string;
  parameters: EffectParameter[];
  processFn?: (imageData: ImageData, params: Record<string, any>) => Promise<ImageData> | ImageData;
}

export interface EffectWithParams extends Effect {
  currentParams: Record<string, any>;
}

// Utility type for effect parameters with their values
export type EffectParamValues = Record<string, any>;

// Type for a group of effects
export interface EffectCategoryInfo {
  id: EffectCategory;
  name: string;
  effects: Effect[];
}

// Type for active effects on an image
export interface ActiveEffect {
  id: string;
  params: Record<string, any>;
  appliedAt: number;
} 