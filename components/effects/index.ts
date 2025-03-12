import { Effect, EffectCategory, EffectParamValues } from './types';
import basicEffects from './basic';
import artisticEffects from './artistic';
import creativeEffects from './creative';
import technicalEffects from './technical';

// Common types for effect processing
export interface EffectParameter {
  id: string;
  name: string;
  type: 'range' | 'color' | 'select' | 'checkbox';
  min?: number;
  max?: number;
  step?: number;
  default: any;
  options?: Array<{ value: string; label: string }>;
}

export interface EffectDefinition {
  id: string;
  name: string;
  category: 'basic' | 'artistic' | 'creative' | 'technical';
  params: EffectParameter[];
  processFn: (canvas: HTMLCanvasElement, params: Record<string, any>) => Promise<ImageData | void>;
}

export interface EffectCategoryInfo {
  id: string;
  name: string;
  effects: Array<{ id: string; name: string }>;
}

// All effects organized by category
export const effectCategories: Record<EffectCategory, {
  id: EffectCategory,
  name: string,
  effects: Effect[]
}> = {
  basic: {
    id: 'basic',
    name: 'Basic',
    effects: basicEffects
  },
  artistic: {
    id: 'artistic',
    name: 'Artistic',
    effects: artisticEffects
  },
  creative: {
    id: 'creative',
    name: 'Creative',
    effects: creativeEffects
  },
  technical: {
    id: 'technical',
    name: 'Technical',
    effects: technicalEffects
  }
};

// Flat array of all effects
export const allEffects: Effect[] = [
  ...basicEffects,
  ...artisticEffects,
  ...creativeEffects,
  ...technicalEffects
];

/**
 * Helper function to get effect definition by ID
 */
export function getEffectById(effectId: string): Effect | undefined {
  return allEffects.find(effect => effect.id === effectId);
}

/**
 * Helper function to get default parameters for an effect
 */
export function getDefaultParams(effect: Effect): EffectParamValues {
  if (!effect.parameters) return {};
  
  return effect.parameters.reduce((params, param) => {
    params[param.id] = param.defaultValue;
    return params;
  }, {} as EffectParamValues);
}

export * from './types';
export { basicEffects, artisticEffects, creativeEffects, technicalEffects };

// Default export for all effects
export default {
  basicEffects,
  artisticEffects,
  creativeEffects,
  technicalEffects
};
