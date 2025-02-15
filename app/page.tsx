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
    <div className="relative min-h-screen">
      {/* Left Navigation Bar */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-[#0A0A0B] border-r border-[#1F2937]/10">
        {/* App Title */}
        <div className="flex h-14 items-center border-b border-[#1F2937]/10 px-4">
          <h1 className="text-sm font-semibold text-white">Halftone Generator</h1>
        </div>

        {/* Settings Navigation */}
        <div className="flex-1 overflow-y-auto">
          {/* Controls */}
          <div className="p-4 space-y-6">
            {/* Upload Section */}
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="fileInput"
              />
              <label 
                htmlFor="fileInput" 
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#E5E7EB] bg-[#1F2937]/5 border border-[#1F2937]/10 rounded-md hover:bg-[#1F2937]/10 hover:border-[#1F2937]/20 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {image ? 'Change image' : 'Upload image'}
              </label>
            </div>

            {/* Grid Size */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[#E5E7EB]">Grid Size</span>
                <span className="text-xs text-[#9CA3AF]">{gridSize}px</span>
              </div>
              <input
                type="range"
                min="4"
                max="30"
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="w-full accent-[#2563EB] bg-[#1F2937]/10 rounded-full"
              />
            </div>

            {/* Brightness */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[#E5E7EB]">Brightness</span>
                <span className="text-xs text-[#9CA3AF]">{brightness}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full accent-[#2563EB] bg-[#1F2937]/10 rounded-full"
              />
            </div>

            {/* Contrast */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[#E5E7EB]">Contrast</span>
                <span className="text-xs text-[#9CA3AF]">{contrast}%</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="w-full accent-[#2563EB] bg-[#1F2937]/10 rounded-full"
              />
            </div>

            {/* Dithering */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-[#E5E7EB]">Dithering</span>
              <select
                value={dithering}
                onChange={(e) => setDithering(e.target.value)}
                className="w-full px-3 py-2 text-sm text-[#E5E7EB] bg-[#1F2937]/5 border border-[#1F2937]/10 rounded-md hover:bg-[#1F2937]/10 hover:border-[#1F2937]/20 transition-all cursor-pointer"
              >
                <option value="none">No Extra Texture</option>
                <option value="floyd">Floyd-Steinberg</option>
                <option value="ordered">Ordered</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-[#1F2937]/10">
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 px-3 py-2 text-sm font-medium text-[#E5E7EB] bg-[#1F2937]/5 border border-[#1F2937]/10 rounded-md hover:bg-[#1F2937]/10 transition-all"
            >
              Reset
            </button>
            <button
              onClick={handleExport}
              disabled={!image}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-md hover:bg-[#1D4ED8] disabled:opacity-50 disabled:hover:bg-[#2563EB] transition-all"
            >
              Export
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="pl-64 min-h-screen bg-[#0A0A0B]">
        <div className="h-screen flex items-center justify-center p-8">
          <div className="relative max-w-full max-h-full">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-[80vh] rounded-lg"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            />
            <canvas
              ref={hiddenCanvasRef}
              className="hidden"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
