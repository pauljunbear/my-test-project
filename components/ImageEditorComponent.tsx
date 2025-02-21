import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, Image as FabricImage, filters } from 'fabric';
import { Dropzone } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { Text } from '@mantine/core';

type Effect = 'none' | 'grayscale' | 'sepia' | 'blur' | 'sharpen' | 'brightness' | 'contrast' | 
  'saturation' | 'noise' | 'pixelate' | 'invert' | 'vintage' | 'blackwhite';

type EffectState = {
  type: Effect;
  intensity: number;
};

export default function ImageEditorComponent() {
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [previewCanvas, setPreviewCanvas] = useState<Canvas | null>(null);
  const [currentEffect, setCurrentEffect] = useState<EffectState>({ type: 'none', intensity: 50 });
  const [appliedEffect, setAppliedEffect] = useState<EffectState>({ type: 'none', intensity: 50 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize main canvas
  useEffect(() => {
    if (!canvasRef.current || canvas) return;

    const fabricCanvas = new Canvas(canvasRef.current);
    fabricCanvas.setDimensions({
      width: window.innerWidth - 300,
      height: window.innerHeight - 40
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

  // Initialize preview canvas
  useEffect(() => {
    if (!previewCanvasRef.current || previewCanvas) return;

    const fabricPreviewCanvas = new Canvas(previewCanvasRef.current);
    fabricPreviewCanvas.setDimensions({
      width: 150,
      height: 150
    });
    
    fabricPreviewCanvas.backgroundColor = '#f8f9fa';
    fabricPreviewCanvas.renderAll();

    setPreviewCanvas(fabricPreviewCanvas);
  }, []);

  const createPreview = useCallback((image: HTMLImageElement) => {
    if (!previewCanvas) return;

    const previewImage = new FabricImage(image);
    previewCanvas.clear();
    
    const scale = Math.min(
      140 / previewImage.width!,
      140 / previewImage.height!
    );
    
    previewImage.scale(scale);
    previewImage.set({
      left: (150 - previewImage.width! * scale) / 2,
      top: (150 - previewImage.height! * scale) / 2,
      selectable: false,
      hasControls: false
    });
    
    previewCanvas.add(previewImage);
    previewCanvas.renderAll();

    return previewImage;
  }, [previewCanvas]);

  const handleImageUpload = useCallback((file: File) => {
    if (!canvas) {
      notifications.show({
        title: 'Error',
        message: 'Canvas not initialized',
        color: 'red'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imgElement = new Image();
      imgElement.crossOrigin = 'anonymous';
      imgElement.onload = () => {
        const fabricImage = new FabricImage(imgElement);
        canvas.clear();
        
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

        // Create preview
        createPreview(imgElement);

        notifications.show({
          title: 'Success',
          message: 'Image uploaded successfully',
          color: 'green'
        });

        // Reset effects
        setCurrentEffect({ type: 'none', intensity: 50 });
        setAppliedEffect({ type: 'none', intensity: 50 });
      };
      imgElement.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [canvas, createPreview]);

  const applyEffect = useCallback((effectState: EffectState, image?: FabricImage) => {
    if (!image) return;

    image.filters = [];
    const normalizedIntensity = effectState.intensity / 100;

    switch (effectState.type) {
      case 'grayscale':
        image.filters.push(new filters.Grayscale());
        break;
      case 'sepia':
        image.filters.push(new filters.Sepia());
        break;
      case 'blur':
        image.filters.push(new filters.Blur({
          blur: normalizedIntensity * 0.5
        }));
        break;
      case 'sharpen':
        const matrix = [
          0, -normalizedIntensity, 0,
          -normalizedIntensity, 1 + 4 * normalizedIntensity, -normalizedIntensity,
          0, -normalizedIntensity, 0
        ];
        image.filters.push(new filters.Convolute({
          matrix: matrix
        }));
        break;
      case 'brightness':
        image.filters.push(new filters.Brightness({
          brightness: normalizedIntensity * 2 - 1
        }));
        break;
      case 'contrast':
        image.filters.push(new filters.Contrast({
          contrast: normalizedIntensity * 2 - 1
        }));
        break;
      case 'saturation':
        image.filters.push(new filters.Saturation({
          saturation: normalizedIntensity * 2 - 1
        }));
        break;
      case 'noise':
        image.filters.push(new filters.Noise({
          noise: normalizedIntensity * 100
        }));
        break;
      case 'pixelate':
        image.filters.push(new filters.Pixelate({
          blocksize: Math.max(2, Math.floor(normalizedIntensity * 20))
        }));
        break;
      case 'invert':
        image.filters.push(new filters.Invert());
        break;
      case 'vintage':
        image.filters.push(
          new filters.Grayscale(),
          new filters.Sepia(),
          new filters.Contrast({ contrast: 0.2 }),
          new filters.Saturation({ saturation: -0.5 })
        );
        break;
      case 'blackwhite':
        image.filters.push(
          new filters.Grayscale(),
          new filters.Contrast({ contrast: 0.7 }),
          new filters.Brightness({ brightness: 0.1 })
        );
        break;
    }
    
    image.applyFilters();
  }, []);

  // Update preview when effect changes
  useEffect(() => {
    if (!previewCanvas) return;
    const previewImage = previewCanvas.getObjects()[0] as FabricImage;
    if (previewImage) {
      applyEffect(currentEffect, previewImage);
      previewCanvas.renderAll();
    }
  }, [currentEffect, previewCanvas, applyEffect]);

  // Update main canvas when applied effect changes
  useEffect(() => {
    if (!canvas) return;
    const mainImage = canvas.getObjects()[0] as FabricImage;
    if (mainImage) {
      applyEffect(appliedEffect, mainImage);
      canvas.renderAll();
    }
  }, [appliedEffect, canvas, applyEffect]);

  const effectsWithIntensity = ['blur', 'sharpen', 'brightness', 'contrast', 'saturation', 'noise', 'pixelate'];

  return (
    <div className="h-full w-full flex bg-[#111113] text-white">
      {/* Left Sidebar */}
      <div className="w-72 bg-[#1a1a1c] border-r border-[#2a2a2c] flex flex-col">
        <div className="p-6 border-b border-[#2a2a2c]">
          <h1 className="text-lg font-semibold">Image Effects</h1>
        </div>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          <Dropzone
            onDrop={(files) => handleImageUpload(files[0])}
            onReject={() => {
              notifications.show({
                title: 'Error',
                message: 'Please upload a valid image file',
                color: 'red'
              });
            }}
            maxSize={5 * 1024 ** 2}
            accept={['image/*']}
            className="border-2 border-dashed border-[#2a2a2c] rounded-lg p-4 text-center hover:border-blue-500 transition-colors"
          >
            <div className="space-y-2">
              <Text fw={500}>Drag images here or click to select files</Text>
              <Text size="sm" c="dimmed">
                Upload a single image up to 5MB
              </Text>
            </div>
          </Dropzone>

          {/* Preview Canvas */}
          <div className="border border-[#2a2a2c] rounded-lg p-2">
            <div className="text-sm font-medium mb-2">Preview</div>
            <canvas ref={previewCanvasRef} className="w-[150px] h-[150px] bg-[#f8f9fa] rounded" />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Effect</label>
            <select
              value={currentEffect.type}
              onChange={(e) => setCurrentEffect(prev => ({ ...prev, type: e.target.value as Effect }))}
              className="w-full bg-[#2a2a2c] border-[#3a3a3c] rounded-lg p-2 text-white"
            >
              <option value="none">No Effect</option>
              <option value="grayscale">Grayscale</option>
              <option value="sepia">Sepia</option>
              <option value="blur">Blur</option>
              <option value="sharpen">Sharpen</option>
              <option value="brightness">Brightness</option>
              <option value="contrast">Contrast</option>
              <option value="saturation">Saturation</option>
              <option value="noise">Noise</option>
              <option value="pixelate">Pixelate</option>
              <option value="invert">Invert</option>
              <option value="vintage">Vintage</option>
              <option value="blackwhite">Black & White</option>
            </select>
          </div>

          {currentEffect.type !== 'none' && effectsWithIntensity.includes(currentEffect.type) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Intensity</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={currentEffect.intensity}
                  onChange={(e) => setCurrentEffect(prev => ({ ...prev, intensity: Number(e.target.value) }))}
                  className="w-full"
                />
                <div className="text-sm text-right text-gray-400">
                  {currentEffect.intensity}%
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setAppliedEffect(currentEffect)}
              className="flex-1 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Apply Effect
            </button>
          </div>
        </div>

        <div className="p-6 border-t border-[#2a2a2c]">
          <div className="flex gap-3">
            <button
              onClick={() => {
                setCurrentEffect({ type: 'none', intensity: 50 });
                setAppliedEffect({ type: 'none', intensity: 50 });
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
        <div className="w-full h-full rounded-xl border-2 border-dashed border-[#2a2a2c]">
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}