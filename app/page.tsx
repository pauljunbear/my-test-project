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
      <div className="w-72 border-r border-gray-100 flex flex-col bg-white">
        {/* Header */}
        <div className="h-14 px-5 flex items-center border-b border-gray-100">
          <h1 className="text-sm font-medium text-gray-700">Halftone Generator</h1>
        </div>

        {/* Settings */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Hidden File Input */}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="fileInput"
            />

            {/* Upload Section */}
            <div className="space-y-2">
              <label 
                htmlFor="fileInput" 
                className="inline-flex h-8 px-3 items-center text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 hover:border-gray-300 transition-all cursor-pointer"
              >
                {image ? 'Change image' : 'Choose file'}
              </label>
              {image && (
                <p className="text-xs text-gray-500 truncate">
                  {/* Show filename if available */}
                  {typeof window !== 'undefined' && 
                    ((document.getElementById('fileInput') as HTMLInputElement)?.files?.[0]?.name || 'Image loaded')}
                </p>
              )}
            </div>

            {/* Grid Size */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-700">Grid Size</span>
                <span className="text-xs text-gray-500 tabular-nums">{gridSize}px</span>
              </div>
              <input
                type="range"
                min="4"
                max="30"
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="w-full h-1 bg-gray-100 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-700 [&::-webkit-slider-thumb]:hover:bg-gray-800"
              />
            </div>

            {/* Brightness */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-700">Brightness</span>
                <span className="text-xs text-gray-500 tabular-nums">{brightness}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full h-1 bg-gray-100 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-700 [&::-webkit-slider-thumb]:hover:bg-gray-800"
              />
            </div>

            {/* Contrast */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-700">Contrast</span>
                <span className="text-xs text-gray-500 tabular-nums">{contrast}%</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="w-full h-1 bg-gray-100 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-700 [&::-webkit-slider-thumb]:hover:bg-gray-800"
              />
            </div>

            {/* Dithering */}
            <div className="space-y-2.5">
              <span className="text-xs font-medium text-gray-700">Dithering</span>
              <select
                value={dithering}
                onChange={(e) => setDithering(e.target.value)}
                className="w-full h-8 px-2.5 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 hover:border-gray-300 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik01Ljk5OTg5IDQuOTc2NzFMMi4yMzM4OSAxLjIxMDcxQzEuOTIzODkgMC45MDA3MTQgMS40MjM4OSAwLjkwMDcxNCAxLjExMzg5IDEuMjEwNzFDMC44MDM4ODggMS41MjA3MSAwLjgwMzg4OCAyLjAyMDcxIDEuMTEzODkgMi4zMzA3MUw1LjQzOTg5IDYuNjU2NzFDNS43NDk4OSA2Ljk2NjcxIDYuMjQ5ODkgNi45NjY3MSA2LjU1OTg5IDYuNjU2NzFMMTAuODg1OSAyLjMzMDcxQzExLjE5NTkgMi4wMjA3MSAxMS4xOTU5IDEuNTIwNzEgMTAuODg1OSAxLjIxMDcxQzEwLjU3NTkgMC45MDA3MTQgMTAuMDc1OSAwLjkwMDcxNCA5Ljc2NTg5IDEuMjEwNzFMNS45OTk4OSA0Ljk3NjcxWiIgZmlsbD0iIzZCNzI4MCIvPgo8L3N2Zz4K')] bg-[position:right_0.5rem_center] bg-no-repeat"
              >
                <option value="none">No Extra Texture</option>
                <option value="floyd">Floyd-Steinberg</option>
                <option value="ordered">Ordered</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-gray-100">
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 h-8 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 hover:border-gray-300 transition-all"
            >
              Reset
            </button>
            <button
              onClick={handleExport}
              disabled={!image}
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
          {!image ? (
            <div className="text-center opacity-30 select-none">
              <p className="text-[10px] text-gray-500 tracking-wide uppercase">
                Drop image here
              </p>
            </div>
          ) : (
            <div className="relative max-w-full max-h-full">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[80vh] rounded-lg"
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
