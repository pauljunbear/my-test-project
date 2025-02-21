import { useCallback, useEffect, useRef, useState } from 'react';
import { ChromePicker } from 'react-color';
import { Select } from '@tremor/react';
import { Canvas, Image as FabricImage, filters } from 'fabric';
import type { IBaseFilter } from 'fabric/fabric-impl';

type Effect = 'none' | 'grayscale' | 'duotone';

interface DuotoneFilter extends IBaseFilter {
  color1: string;
  color2: string;
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

  // Custom Duotone Filter
  const createDuotoneFilter = (color1: string, color2: string) => {
    // Create a grayscale filter first
    const grayscale = new filters.Grayscale();
    
    // Then blend with the chosen color
    const blend = new filters.BlendColor({
      color: color1,
      mode: 'multiply'
    });

    return [grayscale, blend] as IBaseFilter[];
  };

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
        image.filters.push(...createDuotoneFilter(duotoneColors.color1, duotoneColors.color2));
        break;
    }

    image.applyFilters();
    canvas.renderAll();
  }, [canvas, duotoneColors]);

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