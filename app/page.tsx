'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, Image as FabricImage } from 'fabric';
import { ChromePicker } from 'react-color';
import { Select, SelectItem } from '@tremor/react';

type Effect = 'none' | 'grayscale' | 'duotone';
type DuotoneColors = { color1: string; color2: string };

// Ensure fabric.js is only loaded on client side
const initCanvas = (canvas: HTMLCanvasElement): Canvas => {
  return new Canvas(canvas, {
    width: 800,
    height: 600,
    backgroundColor: '#f8f9fa'
  });
};

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
    if (canvasRef.current && !canvas && typeof window !== 'undefined') {
      const fabricCanvas = initCanvas(canvasRef.current);
      setCanvas(fabricCanvas);
    }

    // Cleanup
    return () => {
      canvas?.dispose();
    };
  }, [canvas]);

  const handleImageUpload = useCallback((file: File) => {
    if (!canvas) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result !== 'string') return;

      FabricImage.fromURL(result, (img) => {
        canvas.clear();
        
        // Scale image to fit canvas while maintaining aspect ratio
        const scale = Math.min(
          canvas.width! / img.width!,
          canvas.height! / img.height!
        ) * 0.9;
        
        img.scale(scale);
        img.set({
          left: (canvas.width! - img.width! * scale) / 2,
          top: (canvas.height! - img.height! * scale) / 2
        });
        
        canvas.add(img);
        canvas.renderAll();
        applyEffect(effect, img);
      });
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
    if (!canvas) return;
    const targetImage = image || canvas.getObjects()[0] as FabricImage;
    if (!targetImage) return;

    // Reset filters
    targetImage.filters = [];

    switch (effectType) {
      case 'grayscale':
        targetImage.filters.push(new FabricImage.filters.Grayscale());
        break;
      case 'duotone':
        // Custom duotone filter implementation
        targetImage.filters.push(
          new FabricImage.filters.BlendColor({
            color: duotoneColors.color1,
            mode: 'tint'
          }),
          new FabricImage.filters.Contrast({
            contrast: 0.5
          })
        );
        break;
    }

    targetImage.applyFilters();
    canvas.renderAll();
  }, [canvas, duotoneColors]);

  useEffect(() => {
    const activeObject = canvas?.getObjects()[0] as FabricImage;
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
