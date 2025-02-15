'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export default function HalftoneGenerator() {
  const [image, setImage] = useState<string | null>(null);
  const [brightness, setBrightness] = useState(20);
  const [contrast, setContrast] = useState(0);
  const [gamma, setGamma] = useState(1);
  const [gridSize, setGridSize] = useState(25);
  const [dithering, setDithering] = useState('none');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
      };
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
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Apply halftone effect
      for (let y = 0; y < canvas.height; y += gridSize) {
        for (let x = 0; x < canvas.width; x += gridSize) {
          const i = (y * canvas.width + x) * 4;
          const brightness = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
          const radius = (gridSize / 2) * (1 - brightness / 255);
          
          ctx.beginPath();
          ctx.arc(x + gridSize / 2, y + gridSize / 2, radius, 0, Math.PI * 2);
          ctx.fillStyle = 'black';
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
    setGridSize(25);
    setDithering('none');
  };

  return (
    <main className="min-h-screen flex">
      {/* Left Panel - Controls */}
      <div className="w-80 bg-white p-6 border-r border-gray-200">
        {/* Drop Zone */}
        <div
          ref={dropZoneRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-gray-300 rounded-lg p-4 mb-8 text-center cursor-pointer"
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="fileInput"
          />
          <label htmlFor="fileInput" className="cursor-pointer">
            <div className="text-gray-500 mb-2">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Drop image/video or click to upload
            </div>
          </label>
        </div>

        {/* Grid Size */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Grid Size
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="5"
              max="50"
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm text-gray-500 w-8">{gridSize}</span>
          </div>
        </div>

        {/* Image Adjustments */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">IMAGE ADJUSTMENTS</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Brightness</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-500 w-8">{brightness}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">Contrast</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-500 w-8">{contrast}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">Gamma</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={gamma}
                  onChange={(e) => setGamma(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-500 w-8">{gamma}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dithering */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-700 mb-2">DITHERING</h3>
          <select
            value={dithering}
            onChange={(e) => setDithering(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="none">No Extra Texture</option>
            <option value="floyd">Floyd-Steinberg</option>
            <option value="ordered">Ordered</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200"
          >
            Reset All
          </button>
          <button
            onClick={handleExport}
            disabled={!image}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 disabled:opacity-50"
          >
            Export PNG
          </button>
        </div>
      </div>

      {/* Right Panel - Canvas */}
      <div className="flex-1 bg-gray-50 p-8 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-4 max-w-full max-h-full overflow-auto">
          <canvas
            ref={canvasRef}
            className="max-w-full h-auto"
          />
          <canvas
            ref={hiddenCanvasRef}
            className="hidden"
          />
        </div>
      </div>
    </main>
  );
}
