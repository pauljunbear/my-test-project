'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export default function HalftoneGenerator() {
  const [image, setImage] = useState<string | null>(null);
  const [brightness, setBrightness] = useState(20);
  const [contrast, setContrast] = useState(0);
  const [gamma, setGamma] = useState(1);
  const [gridSize, setGridSize] = useState(11);
  const [dithering, setDithering] = useState('none');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const applyHalftone = useCallback(() => {
    if (!image || !canvasRef.current || !hiddenCanvasRef.current) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current!;
      const hiddenCanvas = hiddenCanvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      const hiddenCtx = hiddenCanvas.getContext('2d')!;

      // Set canvas size
      const maxSize = 800;
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      hiddenCanvas.width = canvas.width;
      hiddenCanvas.height = canvas.height;

      // Draw and process image
      hiddenCtx.filter = `brightness(${brightness}%) contrast(${contrast}%) gamma(${gamma})`;
      hiddenCtx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Get image data
      const imageData = hiddenCtx.getImageData(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Apply halftone effect
      for (let y = 0; y < canvas.height; y += gridSize) {
        for (let x = 0; x < canvas.width; x += gridSize) {
          const i = (y * canvas.width + x) * 4;
          const brightness = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
          const radius = (gridSize / 2) * (1 - brightness / 255);
          
          ctx.beginPath();
          ctx.arc(x + gridSize / 2, y + gridSize / 2, radius, 0, Math.PI * 2);
          ctx.fillStyle = '#000000';
          ctx.fill();
        }
      }
    };
    img.src = image;
  }, [image, brightness, contrast, gamma, gridSize]);

  useEffect(() => {
    applyHalftone();
  }, [applyHalftone]);

  const handleExport = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'halftone.png';
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  const handleReset = () => {
    setBrightness(20);
    setContrast(0);
    setGamma(1);
    setGridSize(11);
    setDithering('none');
  };

  return (
    <div className="min-h-screen bg-[#1E1E1E] text-white">
      <div className="flex h-screen">
        {/* Left Sidebar */}
        <div className="w-[280px] bg-[#252526] p-5 overflow-y-auto">
          {/* Upload Button */}
          <div className="mb-8">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="fileInput"
            />
            <label 
              htmlFor="fileInput" 
              className="block w-full py-2 px-4 bg-[#2D2D2D] hover:bg-[#3E3E3E] text-center rounded-[4px] cursor-pointer text-sm transition-colors"
            >
              Upload Image
            </label>
          </div>

          {/* Grid Size */}
          <div className="mb-6">
            <label className="text-xs text-[#CCCCCC] mb-2 block">Grid Size</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="4"
                max="30"
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-[#CCCCCC] w-8 text-right">{gridSize}</span>
            </div>
          </div>

          {/* Image Adjustments */}
          <div className="mb-6">
            <h3 className="text-xs font-medium text-[#CCCCCC] mb-4">ADJUSTMENTS</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#CCCCCC] mb-2 block">Brightness</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-xs text-[#CCCCCC] w-8 text-right">{brightness}</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#CCCCCC] mb-2 block">Contrast</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-xs text-[#CCCCCC] w-8 text-right">{contrast}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dithering */}
          <div className="mb-8">
            <h3 className="text-xs font-medium text-[#CCCCCC] mb-2">DITHERING</h3>
            <select
              value={dithering}
              onChange={(e) => setDithering(e.target.value)}
              className="w-full p-2 text-sm bg-[#2D2D2D] text-white border-none rounded-[4px]"
            >
              <option value="none">No Extra Texture</option>
              <option value="floyd">Floyd-Steinberg</option>
              <option value="ordered">Ordered</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 px-4 py-2 bg-[#2D2D2D] hover:bg-[#3E3E3E] text-[#CCCCCC] rounded-[4px] text-sm transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleExport}
              disabled={!image}
              className="flex-1 px-4 py-2 bg-[#007AFF] hover:bg-[#0066CC] text-white rounded-[4px] text-sm transition-colors disabled:opacity-50 disabled:hover:bg-[#007AFF]"
            >
              Export
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-[#1E1E1E] p-8 flex items-center justify-center">
          {!image ? (
            <div className="text-[#CCCCCC] text-sm">
              Upload an image to begin
            </div>
          ) : (
            <div className="max-w-full max-h-full">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full"
              />
              <canvas
                ref={hiddenCanvasRef}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
