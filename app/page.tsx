'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export default function HalftoneGenerator() {
  const [image, setImage] = useState<string | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(0);
  const [gridSize, setGridSize] = useState(11);
  const [dithering, setDithering] = useState('none');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);

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
      hiddenCtx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
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
  }, [image, brightness, contrast, gridSize]);

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
    setBrightness(100);
    setContrast(0);
    setGridSize(11);
    setDithering('none');
  };

  return (
    <div className="h-full w-full bg-white rounded-xl overflow-hidden flex shadow-2xl">
      {/* Left Navigation */}
      <div className="w-72 bg-[#F3F4F6] flex flex-col">
        {/* Header */}
        <div className="h-14 px-4 flex items-center border-b border-gray-200">
          <h1 className="text-base font-semibold text-gray-900">Halftone Generator</h1>
        </div>

        {/* Settings */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Hidden File Input */}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="fileInput"
            />

            {/* Upload Button */}
            <label 
              htmlFor="fileInput" 
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {image ? 'Change image' : 'Upload image'}
            </label>

            {/* Grid Size */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Grid Size</span>
                <span className="text-xs text-gray-500">{gridSize}px</span>
              </div>
              <input
                type="range"
                min="4"
                max="30"
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Brightness */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Brightness</span>
                <span className="text-xs text-gray-500">{brightness}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Contrast */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Contrast</span>
                <span className="text-xs text-gray-500">{contrast}%</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Dithering */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Dithering</span>
              <select
                value={dithering}
                onChange={(e) => setDithering(e.target.value)}
                className="w-full px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-md hover:border-gray-300 transition-all cursor-pointer"
              >
                <option value="none">No Extra Texture</option>
                <option value="floyd">Floyd-Steinberg</option>
                <option value="ordered">Ordered</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              Reset
            </button>
            <button
              onClick={handleExport}
              disabled={!image}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all"
            >
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 bg-[#E5E7EB] p-8">
        <div 
          className="w-full h-full rounded-lg bg-[#D1D5DB] flex items-center justify-center cursor-pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {!image ? (
            <div className="text-center opacity-30 select-none">
              <p className="text-[10px] text-gray-600 tracking-wide uppercase">
                Drop image here
              </p>
            </div>
          ) : (
            <div className="relative max-w-full max-h-full">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[80vh] rounded-lg shadow-lg"
              />
              <canvas
                ref={hiddenCanvasRef}
                className="hidden"
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
