export type EffectType = 
  | 'none' 
  | 'halftone' 
  | 'duotone' 
  | 'blackwhite' 
  | 'sepia' 
  | 'noise' 
  | 'dither' 
  | 'exposure' 
  | 'contrast' 
  | 'kaleidoscope' 
  | 'lightleaks' 
  | 'vignette' 
  | 'texture' 
  | 'frame';

export interface BaseSettings {
  enabled: boolean;
}

export interface HalftoneSettings extends BaseSettings {
  dotSize: number;
  spacing: number;
  angle: number;
  shape: 'circle' | 'square' | 'line';
}

export interface DuotoneSettings extends BaseSettings {
  shadowColor: string;
  highlightColor: string;
  intensity: number;  // 0-100, controls the strength of the duotone effect
}

export interface NoiseSettings extends BaseSettings {
  level: number;
}

export interface ExposureSettings extends BaseSettings {
  level: number; // -100 to 100
}

export interface ContrastSettings extends BaseSettings {
  level: number; // -100 to 100
}

export interface DitheringSettings extends BaseSettings {
  intensity: number;
}

export interface KaleidoscopeSettings extends BaseSettings {
  segments: number;  // Number of segments in the kaleidoscope (4-16)
  rotation: number;  // Rotation angle of the pattern (0-360)
  zoom: number;      // Zoom level (0.5-2.0)
}

export interface LightLeaksSettings extends BaseSettings {
  intensity: number;    // Overall intensity of the effect (0-100)
  color: string;        // Color of the light leak (hex)
  position: number;     // Position of the leak (0-100)
  angle: number;        // Angle of the light leak (0-360 degrees)
  blend: 'screen' | 'overlay' | 'soft-light';  // Blend mode
}

export interface VignetteSettings extends BaseSettings {
  intensity: number;    // Strength of the vignette (0-100)
  color: string;        // Color of the vignette (hex)
  feather: number;      // Softness of the edge (0-100)
  shape: 'circular' | 'rectangular';  // Shape of the vignette
}

export interface TextureSettings extends BaseSettings {
  texture: string;      // Texture identifier from library
  opacity: number;      // Opacity of the texture (0-100)
  blend: 'multiply' | 'overlay' | 'soft-light' | 'screen';
  scale: number;        // Scale of the texture (0.5-2.0)
}

export interface FrameSettings extends BaseSettings {
  ratio: '16:9' | '1:1' | '4:5' | '5:4' | 'custom';
  width: number;        // Frame width in pixels
  height: number;       // Frame height in pixels
  color: string;        // Frame color (hex)
  padding: number;      // Padding between image and frame (px)
  style: 'simple' | 'double' | 'ornate' | 'vintage';  // Frame style
}

export type EffectSettings = 
  | HalftoneSettings 
  | DuotoneSettings 
  | NoiseSettings 
  | ExposureSettings 
  | ContrastSettings 
  | DitheringSettings 
  | KaleidoscopeSettings 
  | LightLeaksSettings 
  | VignetteSettings 
  | TextureSettings 
  | FrameSettings;

export interface ImageHistory {
  dataUrl: string;
  effects: AppliedEffect[];
  timestamp: number;
}

export interface AppliedEffect {
  type: EffectType;
  settings: EffectSettings;
}

export interface CropState {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isSelecting: boolean;
}

export interface ColorSetSelectorProps {
  onSelectColor: (color: string, index: 1 | 2) => void;
  onSelectPair: (color1: string, color2: string) => void;
  selectedColor: string;
}

export interface UploadDropzoneProps {
  onUpload: (file: File) => void;
}

// Canvas context with required settings
export interface SafeCanvasRenderingContext2D extends CanvasRenderingContext2D {
  willReadFrequently?: boolean;
} 