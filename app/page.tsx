'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChromePicker } from 'react-color';
import { Select, SelectItem } from '@tremor/react';
import { Canvas, Image as FabricImage } from 'fabric';
import type { IBaseFilter } from 'fabric/fabric-impl';

type Effect = 'none' | 'grayscale' | 'duotone';
type DuotoneColors = { color1: string; color2: string };

// Initialize fabric only on client side
let fabricInstance: typeof import('fabric') | null = null;

if (typeof window !== 'undefined') {
  import('fabric').then((module) => {
    fabricInstance = module;
  });
}

export default function ImageEditor() {
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [effect, setEffect] = useState<Effect>('none');
  const [duotoneColors, setDuotoneColors] = useState<DuotoneColors>({
    color1: '#000000',
    color2: '#ffffff'
  });
  const [showColorPicker1, setShowColorPicker1] = useState(false);
  const [showColorPicker2, setShowColorPicker2] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || canvas) return;

    const fabricCanvas = new Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#f8f9fa'
    });
    setCanvas(fabricCanvas);

    return () => {
      fabricCanvas.dispose();
    };
  }, [canvas]);

  const handleImageUpload = useCallback((file: File) => {
    if (!canvas || !fabricInstance) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result !== 'string') return;

      // Create image element first
      const imgElement = new Image();
      imgElement.crossOrigin = 'anonymous';
      imgElement.src = result;
      imgElement.onload = () => {
        const fabricImage = new FabricImage(imgElement);
        canvas.clear();
        
        // Scale image to fit canvas while maintaining aspect ratio
        const scale = Math.min(
          canvas.width! / fabricImage.width!,
          canvas.height! / fabricImage.height!
        ) * 0.9;
        
        fabricImage.scale(scale);
        fabricImage.set({
          left: (canvas.width! - fabricImage.width! * scale) / 2,
          top: (canvas.height! - fabricImage.height! * scale) / 2
        });
        
        canvas.add(fabricImage);
        canvas.renderAll();
        applyEffect(effect, fabricImage);
      };
    };
    reader.readAsDataURL(file);
  }, [canvas, effect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
  }, [handleImageUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const applyEffect = useCallback((effectType: Effect, image?: FabricImage) => {
    if (!canvas || !fabricInstance || !image) return;

    // Reset filters
    image.filters = [];

    switch (effectType) {
      case 'grayscale':
        const GrayscaleFilter = fabricInstance.util.getFilterBackend('Grayscale');
        if (GrayscaleFilter) {
          const filter = new GrayscaleFilter();
          image.filters.push(filter as unknown as IBaseFilter);
        }
        break;
      case 'duotone':
        const BlendColorFilter = fabricInstance.util.getFilterBackend('BlendColor');
        const ContrastFilter = fabricInstance.util.getFilterBackend('Contrast');
        if (BlendColorFilter && ContrastFilter) {
          const blendFilter = new BlendColorFilter({
            color: duotoneColors.color1,
            mode: 'tint'
          });
          const contrastFilter = new ContrastFilter({
            contrast: 0.5
          });
          image.filters.push(
            blendFilter as unknown as IBaseFilter,
            contrastFilter as unknown as IBaseFilter
          );
        }
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
    <div className="h-full w-full bg-white rounded-xl overflow-hidden flex shadow-2xl">
      {/* Left Navigation */}
      <div className="w-72 border-r border-gray-100 flex flex-col bg-white">
        {/* Header */}
        <div className="h-14 px-5 flex items-center border-b border-gray-100">
          <h1 className="text-sm font-medium text-gray-700">Image Editor</h1>
        </div>

        {/* Settings */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
              className="hidden"
              id="fileInput"
            />

            {/* Upload Section */}
            <div className="space-y-2">
              <label 
                htmlFor="fileInput" 
                className="inline-flex h-8 px-3 items-center text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 hover:border-gray-300 transition-all cursor-pointer"
              >
                Choose image
              </label>
            </div>

            {/* Effect Selection */}
            <div className="space-y-2.5">
              <span className="text-xs font-medium text-gray-700">Effect</span>
              <Select 
                value={effect}
                onValueChange={(value) => setEffect(value as Effect)}
                className="w-full"
              >
                <SelectItem value="none">No Effect</SelectItem>
                <SelectItem value="grayscale">Grayscale</SelectItem>
                <SelectItem value="duotone">Duotone</SelectItem>
              </Select>
            </div>

            {/* Duotone Controls */}
            {effect === 'duotone' && (
              <div className="space-y-2.5">
                <span className="text-xs font-medium text-gray-700">Duotone Colors</span>
                
                {/* Color 1 */}
                <div className="relative">
                  <button
                    onClick={() => setShowColorPicker1(!showColorPicker1)}
                    className="w-full h-8 px-2 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 hover:border-gray-300 transition-all flex items-center gap-2"
                  >
                    <div 
                      className="w-4 h-4 rounded-sm border border-gray-300"
                      style={{ backgroundColor: duotoneColors.color1 }}
                    />
                    Color 1
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

                {/* Color 2 */}
                <div className="relative">
                  <button
                    onClick={() => setShowColorPicker2(!showColorPicker2)}
                    className="w-full h-8 px-2 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 hover:border-gray-300 transition-all flex items-center gap-2"
                  >
                    <div 
                      className="w-4 h-4 rounded-sm border border-gray-300"
                      style={{ backgroundColor: duotoneColors.color2 }}
                    />
                    Color 2
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
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-gray-100">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEffect('none');
                setDuotoneColors({ color1: '#000000', color2: '#ffffff' });
              }}
              className="flex-1 h-8 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 hover:border-gray-300 transition-all"
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
              className="flex-1 h-8 text-xs font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-gray-900 transition-all"
            >
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 bg-white">
        <div 
          className="w-full h-full flex items-center justify-center cursor-pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <canvas ref={canvasRef} />
        </div>
      </main>
    </div>
  );
}
