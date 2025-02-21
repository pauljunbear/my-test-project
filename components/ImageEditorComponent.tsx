import { useCallback, useEffect, useRef, useState } from 'react';
import { ChromePicker } from 'react-color';
import { Select } from '@tremor/react';
import { Canvas, Image as FabricImage, filters } from 'fabric';

type Effect = 'none' | 'grayscale' | 'duotone' | 'halftone';

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

// Create custom filter classes
class DuotoneFilter extends filters.BaseFilter {
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
}

class HalftoneFilter extends filters.BaseFilter {
  static type = 'Halftone';
  static fragmentSource = halftoneShader;

  dotSize: number;
  angle: number;

  constructor({ dotSize = 10, angle = Math.PI / 4 } = {}) {
    super();
    this.dotSize = dotSize;
    this.angle = angle;
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
}

// Register custom filters
filters.DuotoneFilter = DuotoneFilter;
filters.HalftoneFilter = HalftoneFilter;

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
    if (!canvas) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imgElement = new Image();
      imgElement.crossOrigin = 'anonymous';
      imgElement.onload = () => {
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
        
        canvas.add(fabricImage);
        canvas.renderAll();
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
    if (!canvas || !image) return;

    image.filters = [];

    switch (effectType) {
      case 'grayscale':
        image.filters.push(new filters.Grayscale());
        break;
      case 'duotone':
        image.filters.push(new (filters as any).DuotoneFilter({
          color1: duotoneColors.color1,
          color2: duotoneColors.color2
        }));
        break;
      case 'halftone':
        image.filters.push(new (filters as any).HalftoneFilter({
          dotSize,
          angle: Math.PI / 4
        }));
        break;
    }

    image.applyFilters();
    canvas.renderAll();
  }, [canvas, duotoneColors, dotSize]);

  useEffect(() => {
    if (!canvas) return;
    const activeObject = canvas.getObjects()[0] as FabricImage;
    if (activeObject) {
      applyEffect(effect, activeObject);
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