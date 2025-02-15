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
    <div className="flex h-screen">
      {/* Left Navigation Bar */}
      <nav className="w-64 min-w-64 bg-[#141517] border-r border-[rgba(255,255,255,0.1)]">
        {/* App Title */}
        <div className="h-14 px-4 flex items-center border-b border-[rgba(255,255,255,0.1)]">
          <h1 className="text-sm font-medium text-white">Halftone Generator</h1>
        </div>

        {/* Settings Navigation */}
        <div className="flex flex-col h-[calc(100vh-3.5rem)]">
          {/* Image Upload */}
          <div className="p-3">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="fileInput"
            />
            <label 
              htmlFor="fileInput" 
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[rgba(255,255,255,0.7)] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-md hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)] transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {image ? 'Change image' : 'Upload image'}
            </label>
          </div>

          {/* Controls */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-3 py-2 space-y-4">
              {/* Grid Size */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[rgba(255,255,255,0.7)]">Grid Size</span>
                  <span className="text-xs text-[rgba(255,255,255,0.5)]">{gridSize}px</span>
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
                  <span className="text-sm text-[rgba(255,255,255,0.7)]">Brightness</span>
                  <span className="text-xs text-[rgba(255,255,255,0.5)]">{brightness}%</span>
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
                  <span className="text-sm text-[rgba(255,255,255,0.7)]">Contrast</span>
                  <span className="text-xs text-[rgba(255,255,255,0.5)]">{contrast}%</span>
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
                <span className="text-sm text-[rgba(255,255,255,0.7)]">Dithering</span>
                <select
                  value={dithering}
                  onChange={(e) => setDithering(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm text-white bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-md"
                >
                  <option value="none">No Extra Texture</option>
                  <option value="floyd">Floyd-Steinberg</option>
                  <option value="ordered">Ordered</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="p-3 border-t border-[rgba(255,255,255,0.1)]">
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex-1 px-3 py-1.5 text-sm text-white bg-transparent border border-[rgba(255,255,255,0.1)] rounded-md hover:bg-[rgba(255,255,255,0.03)]"
              >
                Reset
              </button>
              <button
                onClick={handleExport}
                disabled={!image}
                className="flex-1 px-3 py-1.5 text-sm text-white bg-[#007AFF] rounded-md hover:bg-[#0066CC] disabled:opacity-50"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 bg-[#1A1B1E] flex items-center justify-center p-8">
        {!image ? (
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-[rgba(255,255,255,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-[rgba(255,255,255,0.5)] text-sm">
              Upload an image to begin
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
      </main>
    </div>
  );
}
