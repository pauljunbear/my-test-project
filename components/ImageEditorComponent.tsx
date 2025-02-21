import { useCallback, useEffect, useRef, useState } from 'react';
import { ChromePicker } from 'react-color';
import { Select } from '@tremor/react';
import { Canvas, Image as FabricImage, filters } from 'fabric';

type Effect = 'none' | 'grayscale' | 'duotone' | 'halftone' | 'sepia' | 'invert' | 'blur' | 'sharpen' | 'edge' | 'pixelate' | 'emboss';

// Custom Duotone Shader
const duotoneShader = `
  precision highp float;
  uniform sampler2D uTexture;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec2 uResolution;
  varying vec2 vTexCoord;

  void main() {
    vec4 color = texture2D(uTexture, vTexCoord);
    float luminance = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    vec3 duotone = mix(uColor1, uColor2, luminance);
    gl_FragColor = vec4(duotone, color.a);
  }
`;

// Custom Halftone Shader
const halftoneShader = `
  precision highp float;
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform float uDotSize;
  uniform float uAngle;
  varying vec2 vTexCoord;

  void main() {
    vec2 tex = vTexCoord * uResolution;
    float s = sin(uAngle);
    float c = cos(uAngle);
    vec2 tex2 = vec2(
      c * tex.x - s * tex.y,
      s * tex.x + c * tex.y
    );
    vec2 p = mod(tex2, uDotSize) - vec2(uDotSize/2.0);
    vec4 color = texture2D(uTexture, vTexCoord);
    float luminance = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    float d = length(p);
    float r = (uDotSize/2.0) * sqrt(luminance);
    float alpha = step(d, r);
    gl_FragColor = vec4(vec3(alpha), 1.0);
  }
`;

// Custom Sepia Shader
const sepiaShader = `
  precision highp float;
  uniform sampler2D uTexture;
  uniform float uIntensity;
  varying vec2 vTexCoord;

  void main() {
    vec4 color = texture2D(uTexture, vTexCoord);
    float r = color.r * 0.393 + color.g * 0.769 + color.b * 0.189;
    float g = color.r * 0.349 + color.g * 0.686 + color.b * 0.168;
    float b = color.r * 0.272 + color.g * 0.534 + color.b * 0.131;
    vec3 sepia = vec3(r, g, b);
    gl_FragColor = vec4(mix(color.rgb, sepia, uIntensity), color.a);
  }
`;

// Custom Edge Detection Shader
const edgeShader = `
  precision highp float;
  uniform sampler2D uTexture;
  uniform vec2 uTexSize;
  uniform float uThreshold;
  varying vec2 vTexCoord;

  void main() {
    vec2 onePixel = vec2(1.0, 1.0) / uTexSize;
    vec4 color = texture2D(uTexture, vTexCoord);
    vec4 colorRight = texture2D(uTexture, vTexCoord + vec2(onePixel.x, 0.0));
    vec4 colorBottom = texture2D(uTexture, vTexCoord + vec2(0.0, onePixel.y));
    
    float dx = length(color.rgb - colorRight.rgb);
    float dy = length(color.rgb - colorBottom.rgb);
    float edge = length(vec2(dx, dy));
    
    edge = smoothstep(0.0, uThreshold, edge);
    gl_FragColor = vec4(vec3(edge), 1.0);
  }
`;

// Custom Emboss Shader
const embossShader = `
  precision highp float;
  uniform sampler2D uTexture;
  uniform vec2 uTexSize;
  uniform float uStrength;
  varying vec2 vTexCoord;

  void main() {
    vec2 onePixel = vec2(1.0, 1.0) / uTexSize;
    vec4 color = texture2D(uTexture, vTexCoord);
    vec4 colorTopLeft = texture2D(uTexture, vTexCoord - onePixel);
    
    vec3 emboss = (color.rgb - colorTopLeft.rgb) * uStrength + vec3(0.5);
    gl_FragColor = vec4(emboss, color.a);
  }
`;

// Custom filters namespace
namespace CustomFilters {
  export const DuotoneFilter = class extends filters.BaseFilter<'Duotone', { color1: string; color2: string }> {
    static type = 'Duotone';
    static fragmentSource = duotoneShader;

    color1: string;
    color2: string;

    constructor({ color1 = '#000000', color2 = '#ffffff' } = {}) {
      super();
      this.color1 = color1;
      this.color2 = color2;
    }

    applyTo2d(options: any) {
      const imageData = options.imageData;
      const data = imageData.data;
      
      const c1 = this.hexToRgb(this.color1);
      const c2 = this.hexToRgb(this.color2);

      for (let i = 0; i < data.length; i += 4) {
        const luminance = (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) / 255;
        
        data[i] = Math.round(c1.r * (1 - luminance) + c2.r * luminance);
        data[i + 1] = Math.round(c1.g * (1 - luminance) + c2.g * luminance);
        data[i + 2] = Math.round(c1.b * (1 - luminance) + c2.b * luminance);
      }
    }

    private hexToRgb(hex: string) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    }
  };

  export const HalftoneFilter = class extends filters.BaseFilter<'Halftone', {
    dotSize: number;
    angle: number;
    spacing: number;
    mode: 'CMYK';
  }> {
    static type = 'Halftone';
    static fragmentSource = halftoneShader;

    dotSize: number;
    angle: number;
    spacing: number;
    mode: 'CMYK';

    constructor({ dotSize = 10, angle = Math.PI / 4, spacing = 10, mode = 'CMYK' } = {}) {
      super();
      this.dotSize = dotSize;
      this.angle = angle;
      this.spacing = spacing;
      this.mode = 'CMYK';
    }

    applyTo2d(options: any) {
      const imageData = options.imageData;
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d')!;
      const tempImageData = tempCtx.createImageData(width, height);
      
      for (let y = 0; y < height; y += this.dotSize) {
        for (let x = 0; x < width; x += this.dotSize) {
          let totalLuminance = 0;
          let count = 0;
          
          // Calculate average luminance for this cell
          for (let dy = 0; dy < this.dotSize && y + dy < height; dy++) {
            for (let dx = 0; dx < this.dotSize && x + dx < width; dx++) {
              const i = ((y + dy) * width + (x + dx)) * 4;
              const luminance = (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) / 255;
              totalLuminance += luminance;
              count++;
            }
          }
          
          const avgLuminance = totalLuminance / count;
          const dotRadius = (this.dotSize / 2) * avgLuminance;
          
          // Draw dot
          for (let dy = 0; dy < this.dotSize && y + dy < height; dy++) {
            for (let dx = 0; dx < this.dotSize && x + dx < width; dx++) {
              const distance = Math.sqrt(
                Math.pow(dx - this.dotSize / 2, 2) +
                Math.pow(dy - this.dotSize / 2, 2)
              );
              
              const i = ((y + dy) * width + (x + dx)) * 4;
              const value = distance < dotRadius ? 255 : 0;
              
              tempImageData.data[i] = value;
              tempImageData.data[i + 1] = value;
              tempImageData.data[i + 2] = value;
              tempImageData.data[i + 3] = 255;
            }
          }
        }
      }
      
      // Copy back to original imageData
      for (let i = 0; i < data.length; i++) {
        data[i] = tempImageData.data[i];
      }
    }
  };

  export const SepiaFilter = class extends filters.BaseFilter<'Sepia', { intensity: number }> {
    static type = 'Sepia';
    static fragmentSource = sepiaShader;

    intensity: number;

    constructor({ intensity = 1.0 } = {}) {
      super();
      this.intensity = intensity;
    }

    applyTo2d(options: any) {
      const imageData = options.imageData;
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
        data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
        data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
      }
    }
  };

  export const EdgeDetectionFilter = class extends filters.BaseFilter<'EdgeDetection', { threshold: number }> {
    static type = 'EdgeDetection';
    static fragmentSource = edgeShader;

    threshold: number;

    constructor({ threshold = 0.5 } = {}) {
      super();
      this.threshold = threshold;
    }

    applyTo2d(options: any) {
      const imageData = options.imageData;
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      const output = new Uint8ClampedArray(data.length);
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const right = ((y * width + Math.min(x + 1, width - 1)) * 4);
          const bottom = ((Math.min(y + 1, height - 1) * width + x) * 4);
          
          const dx = Math.abs(data[i] - data[right]) +
                    Math.abs(data[i + 1] - data[right + 1]) +
                    Math.abs(data[i + 2] - data[right + 2]);
                    
          const dy = Math.abs(data[i] - data[bottom]) +
                    Math.abs(data[i + 1] - data[bottom + 1]) +
                    Math.abs(data[i + 2] - data[bottom + 2]);
          
          const edge = Math.min(255, Math.sqrt(dx * dx + dy * dy) * this.threshold);
          output[i] = output[i + 1] = output[i + 2] = edge;
          output[i + 3] = 255;
        }
      }
      
      for (let i = 0; i < data.length; i++) {
        data[i] = output[i];
      }
    }
  };

  export const EmbossFilter = class extends filters.BaseFilter<'Emboss', { strength: number }> {
    static type = 'Emboss';
    static fragmentSource = embossShader;

    strength: number;

    constructor({ strength = 1.0 } = {}) {
      super();
      this.strength = strength;
    }

    applyTo2d(options: any) {
      const imageData = options.imageData;
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      const output = new Uint8ClampedArray(data.length);
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const topLeft = (((y > 0 ? y - 1 : y) * width + (x > 0 ? x - 1 : x)) * 4);
          
          for (let c = 0; c < 3; c++) {
            const diff = (data[i + c] - data[topLeft + c]) * this.strength;
            output[i + c] = Math.min(255, Math.max(0, 128 + diff));
          }
          output[i + 3] = 255;
        }
      }
      
      for (let i = 0; i < data.length; i++) {
        data[i] = output[i];
      }
    }
  };
}

export default function ImageEditorComponent() {
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [effect, setEffect] = useState<Effect>('none');
  const [duotoneColors, setDuotoneColors] = useState({
    color1: '#000000',
    color2: '#ffffff'
  });
  const [showColorPicker1, setShowColorPicker1] = useState(false);
  const [showColorPicker2, setShowColorPicker2] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dotSize, setDotSize] = useState(10);
  const [sepiaIntensity, setSepiaIntensity] = useState(1.0);
  const [blurRadius, setBlurRadius] = useState(10);
  const [sharpenStrength, setSharpenStrength] = useState(0.5);
  const [edgeThreshold, setEdgeThreshold] = useState(0.5);
  const [pixelSize, setPixelSize] = useState(10);
  const [embossStrength, setEmbossStrength] = useState(1.0);
  const [halftoneSpacing, setHalftoneSpacing] = useState(10);
  const [halftoneAngle, setHalftoneAngle] = useState(45);
  const [halftoneMode, setHalftoneMode] = useState<'CMYK'>('CMYK');

  // Initialize fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || canvas) return;

    const fabricCanvas = new Canvas(canvasRef.current);
    fabricCanvas.setDimensions({
      width: window.innerWidth - 300, // Accounting for sidebar
      height: window.innerHeight - 40 // Accounting for padding
    });
    
    fabricCanvas.backgroundColor = '#f8f9fa';
    fabricCanvas.renderAll();

    setCanvas(fabricCanvas);

    const handleResize = () => {
      fabricCanvas.setDimensions({
        width: window.innerWidth - 300,
        height: window.innerHeight - 40
      });
      fabricCanvas.renderAll();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      fabricCanvas.dispose();
    };
  }, []);

  const handleImageUpload = useCallback((file: File) => {
    console.log('Handling image upload:', file.name);
    if (!canvas) {
      console.log('No canvas available for image upload');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      console.log('Image file read successfully');
      const imgElement = new Image();
      imgElement.crossOrigin = 'anonymous';
      imgElement.onload = () => {
        console.log('Image loaded into DOM element');
        const fabricImage = new FabricImage(imgElement);
        canvas.clear();
        
        // Calculate scale to fit canvas while maintaining aspect ratio
        const scale = Math.min(
          (canvas.width! - 40) / fabricImage.width!,
          (canvas.height! - 40) / fabricImage.height!
        );
        
        fabricImage.scale(scale);
        fabricImage.set({
          left: (canvas.width! - fabricImage.width! * scale) / 2,
          top: (canvas.height! - fabricImage.height! * scale) / 2,
          selectable: false,
          hasControls: false
        });
        
        console.log('Adding image to canvas with dimensions:', {
          width: fabricImage.width,
          height: fabricImage.height,
          scale
        });
        
        canvas.add(fabricImage);
        canvas.renderAll();
        console.log('Image added to canvas, applying effect:', effect);
        applyEffect(effect, fabricImage);
      };
      imgElement.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [canvas, effect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
  }, [handleImageUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const applyEffect = useCallback((effectType: Effect, image?: FabricImage) => {
    if (!canvas || !image) {
      console.log('No canvas or image available', { canvas, image });
      return;
    }

    console.log('Applying effect:', effectType);
    console.log('Current image filters:', image.filters);

    image.filters = [];

    switch (effectType) {
      case 'grayscale':
        console.log('Applying grayscale filter');
        image.filters.push(new filters.Grayscale());
        break;
      case 'sepia':
        image.filters.push(new CustomFilters.SepiaFilter({
          intensity: sepiaIntensity
        }));
        break;
      case 'invert':
        image.filters.push(new filters.Invert());
        break;
      case 'blur':
        image.filters.push(new filters.Blur({
          blur: blurRadius
        }));
        break;
      case 'sharpen':
        image.filters.push(new filters.Convolute({
          matrix: [
            0, -1 * sharpenStrength, 0,
            -1 * sharpenStrength, 4 * sharpenStrength + 1, -1 * sharpenStrength,
            0, -1 * sharpenStrength, 0
          ]
        }));
        break;
      case 'edge':
        image.filters.push(new CustomFilters.EdgeDetectionFilter({
          threshold: edgeThreshold
        }));
        break;
      case 'pixelate':
        image.filters.push(new filters.Pixelate({
          blocksize: pixelSize
        }));
        break;
      case 'emboss':
        image.filters.push(new CustomFilters.EmbossFilter({
          strength: embossStrength
        }));
        break;
      case 'duotone':
        console.log('Applying duotone filter with colors:', duotoneColors);
        const duotoneFilter = new CustomFilters.DuotoneFilter({
          color1: duotoneColors.color1,
          color2: duotoneColors.color2
        });
        console.log('Created duotone filter:', duotoneFilter);
        image.filters.push(duotoneFilter);
        break;
      case 'halftone':
        console.log('Applying halftone filter with params:', {
          dotSize,
          spacing: halftoneSpacing,
          angle: (halftoneAngle * Math.PI) / 180,
          mode: halftoneMode
        });
        const halftoneFilter = new CustomFilters.HalftoneFilter({
          dotSize,
          spacing: halftoneSpacing,
          angle: (halftoneAngle * Math.PI) / 180,
          mode: halftoneMode
        });
        console.log('Created halftone filter:', halftoneFilter);
        image.filters.push(halftoneFilter);
        break;
    }

    console.log('Filters after adding new filter:', image.filters);
    
    try {
      console.log('Attempting to apply filters');
      image.applyFilters();
      console.log('Filters applied successfully');
    } catch (error) {
      console.error('Error applying filters:', error);
    }

    try {
      console.log('Attempting to render canvas');
      canvas.renderAll();
      console.log('Canvas rendered successfully');
    } catch (error) {
      console.error('Error rendering canvas:', error);
    }
  }, [canvas, duotoneColors, dotSize, sepiaIntensity, blurRadius, sharpenStrength,
      edgeThreshold, pixelSize, embossStrength, halftoneSpacing, halftoneAngle, halftoneMode]);

  useEffect(() => {
    console.log('Effect changed to:', effect);
    if (!canvas) {
      console.log('No canvas available for effect change');
      return;
    }
    const activeObject = canvas.getObjects()[0] as FabricImage;
    if (activeObject) {
      console.log('Found active image object:', activeObject);
      applyEffect(effect, activeObject);
    } else {
      console.log('No active image object found');
    }
  }, [effect, duotoneColors, applyEffect, canvas]);

  return (
    <div className="h-full w-full flex bg-[#111113] text-white">
      {/* Left Sidebar */}
      <div className="w-72 bg-[#1a1a1c] border-r border-[#2a2a2c] flex flex-col">
        <div className="p-6 border-b border-[#2a2a2c]">
          <h1 className="text-lg font-semibold">Image Effects</h1>
        </div>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
            className="hidden"
          />

          <div className="space-y-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Choose Image
            </button>
            <p className="text-sm text-gray-400">or drag and drop an image</p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Effect</label>
            <Select
              value={effect}
              onValueChange={(value) => setEffect(value as Effect)}
              className="w-full bg-[#2a2a2c] border-[#3a3a3c]"
            >
              <option value="none">No Effect</option>
              <option value="grayscale">Grayscale</option>
              <option value="sepia">Sepia</option>
              <option value="invert">Invert Colors</option>
              <option value="blur">Blur</option>
              <option value="sharpen">Sharpen</option>
              <option value="edge">Edge Detection</option>
              <option value="pixelate">Pixelate</option>
              <option value="emboss">Emboss</option>
              <option value="duotone">Duotone</option>
              <option value="halftone">Halftone</option>
            </Select>
          </div>

          {effect === 'duotone' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Color 1</label>
                <div className="relative">
                  <button
                    onClick={() => setShowColorPicker1(!showColorPicker1)}
                    className="w-full h-10 rounded-lg border border-[#3a3a3c] flex items-center gap-2 px-3"
                    style={{ backgroundColor: duotoneColors.color1 }}
                  >
                    <div className="w-6 h-6 rounded border border-white/20" />
                    <span>{duotoneColors.color1}</span>
                  </button>
                  {showColorPicker1 && (
                    <div className="absolute z-10 mt-2">
                      <div 
                        className="fixed inset-0" 
                        onClick={() => setShowColorPicker1(false)}
                      />
                      <ChromePicker
                        color={duotoneColors.color1}
                        onChange={(color) => setDuotoneColors(prev => ({ ...prev, color1: color.hex }))}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Color 2</label>
                <div className="relative">
                  <button
                    onClick={() => setShowColorPicker2(!showColorPicker2)}
                    className="w-full h-10 rounded-lg border border-[#3a3a3c] flex items-center gap-2 px-3"
                    style={{ backgroundColor: duotoneColors.color2 }}
                  >
                    <div className="w-6 h-6 rounded border border-white/20" />
                    <span>{duotoneColors.color2}</span>
                  </button>
                  {showColorPicker2 && (
                    <div className="absolute z-10 mt-2">
                      <div 
                        className="fixed inset-0" 
                        onClick={() => setShowColorPicker2(false)}
                      />
                      <ChromePicker
                        color={duotoneColors.color2}
                        onChange={(color) => setDuotoneColors(prev => ({ ...prev, color2: color.hex }))}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {effect === 'halftone' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Dot Size</label>
                <input
                  type="range"
                  min="4"
                  max="20"
                  value={dotSize}
                  onChange={(e) => setDotSize(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Spacing</label>
                <input
                  type="range"
                  min="4"
                  max="20"
                  value={halftoneSpacing}
                  onChange={(e) => setHalftoneSpacing(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Angle</label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={halftoneAngle}
                  onChange={(e) => setHalftoneAngle(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mode</label>
                <Select
                  value={halftoneMode}
                  onValueChange={(value) => setHalftoneMode('CMYK')}
                  className="w-full bg-[#2a2a2c] border-[#3a3a3c]"
                >
                  <option value="CMYK">CMYK</option>
                </Select>
              </div>
            </div>
          )}

          {effect === 'sepia' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Intensity</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={sepiaIntensity}
                  onChange={(e) => setSepiaIntensity(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {effect === 'blur' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Radius</label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={blurRadius}
                  onChange={(e) => setBlurRadius(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {effect === 'sharpen' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Strength</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={sharpenStrength}
                  onChange={(e) => setSharpenStrength(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {effect === 'edge' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Threshold</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={edgeThreshold}
                  onChange={(e) => setEdgeThreshold(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {effect === 'pixelate' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pixel Size</label>
                <input
                  type="range"
                  min="2"
                  max="50"
                  value={pixelSize}
                  onChange={(e) => setPixelSize(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {effect === 'emboss' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Strength</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={embossStrength}
                  onChange={(e) => setEmbossStrength(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[#2a2a2c]">
          <div className="flex gap-3">
            <button
              onClick={() => {
                setEffect('none');
                setDuotoneColors({ color1: '#000000', color2: '#ffffff' });
              }}
              className="flex-1 px-4 py-2 bg-[#2a2a2c] rounded-lg hover:bg-[#3a3a3c] transition-colors"
            >
              Reset
            </button>
            <button
              onClick={() => {
                if (!canvas) return;
                const link = document.createElement('a');
                link.download = 'edited-image.png';
                link.href = canvas.toDataURL();
                link.click();
              }}
              className="flex-1 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div 
          className={`w-full h-full rounded-xl border-2 border-dashed transition-colors ${
            isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-[#2a2a2c]'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
} 