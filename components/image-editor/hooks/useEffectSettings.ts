import { useState, useCallback } from 'react';
import {
  EffectType,
  HalftoneSettings,
  DuotoneSettings,
  NoiseSettings,
  KaleidoscopeSettings,
  LightLeaksSettings,
  VignetteSettings,
  TextureSettings,
  FrameSettings,
  DitheringSettings,
  ExposureSettings,
  ContrastSettings,
} from '../types';

type EffectSettingsState = {
  halftone: HalftoneSettings;
  duotone: DuotoneSettings;
  noise: NoiseSettings;
  kaleidoscope: KaleidoscopeSettings;
  lightleaks: LightLeaksSettings;
  vignette: VignetteSettings;
  texture: TextureSettings;
  frame: FrameSettings;
  dither: DitheringSettings;
  exposure: ExposureSettings;
  contrast: ContrastSettings;
};

interface UseEffectSettingsReturn {
  settings: EffectSettingsState;
  currentEffect: EffectType;
  updateSettings: <T extends keyof EffectSettingsState>(
    effectType: T,
    newSettings: Partial<EffectSettingsState[T]>
  ) => void;
  setCurrentEffect: (effect: EffectType) => void;
  resetSettings: (effectType: keyof EffectSettingsState) => void;
}

const defaultSettings: EffectSettingsState = {
  halftone: {
    enabled: true,
    dotSize: 2,
    spacing: 5,
    angle: 45,
    shape: 'circle',
  },
  duotone: {
    enabled: true,
    shadowColor: '#000000',
    highlightColor: '#ffffff',
    intensity: 100,
  },
  noise: {
    enabled: true,
    level: 20,
  },
  kaleidoscope: {
    enabled: true,
    segments: 8,
    rotation: 0,
    zoom: 1.0,
  },
  lightleaks: {
    enabled: true,
    intensity: 50,
    color: '#FFA500',
    position: 45,
    angle: 45,
    blend: 'screen',
  },
  vignette: {
    enabled: true,
    intensity: 50,
    color: '#000000',
    feather: 50,
    shape: 'circular',
  },
  texture: {
    enabled: true,
    texture: 'paper',
    opacity: 50,
    blend: 'overlay',
    scale: 1.0,
  },
  frame: {
    enabled: true,
    ratio: '1:1',
    width: 1000,
    height: 1000,
    color: '#FFFFFF',
    padding: 20,
    style: 'simple',
  },
  dither: {
    enabled: true,
    intensity: 100,
  },
  exposure: {
    enabled: true,
    level: 0,
  },
  contrast: {
    enabled: true,
    level: 0,
  },
};

export const useEffectSettings = (): UseEffectSettingsReturn => {
  const [settings, setSettings] = useState<EffectSettingsState>(defaultSettings);
  const [currentEffect, setCurrentEffect] = useState<EffectType>('none');

  const updateSettings = useCallback(<T extends keyof EffectSettingsState>(
    effectType: T,
    newSettings: Partial<EffectSettingsState[T]>
  ) => {
    setSettings(prev => ({
      ...prev,
      [effectType]: {
        ...prev[effectType],
        ...newSettings,
      },
    }));
  }, []);

  const resetSettings = useCallback((effectType: keyof EffectSettingsState) => {
    setSettings(prev => ({
      ...prev,
      [effectType]: defaultSettings[effectType],
    }));
  }, []);

  return {
    settings,
    currentEffect,
    updateSettings,
    setCurrentEffect,
    resetSettings,
  };
}; 