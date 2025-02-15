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
    <div className="h-screen bg-[var(--background)] flex">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[var(--border)] px-4 flex items-center justify-between z-10">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-medium text-[var(--text-primary)]">Halftone Generator</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            className="btn btn-secondary"
          >
            Reset
          </button>
          <button
            onClick={handleExport}
            disabled={!image}
            className="btn btn-primary disabled:opacity-50"
          >
            Export PNG
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex mt-14 h-[calc(100vh-3.5rem)]">
        {/* Left Sidebar */}
        <div className="sidebar w-[280px] p-6">
          {/* Upload Section */}
          <div className="mb-8">
            <h2 className="section-header">Image</h2>
            <div className="upload-area">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="fileInput"
              />
              <label 
                htmlFor="fileInput" 
                className="flex flex-col items-center cursor-pointer"
              >
                <svg className="w-8 h-8 mb-2 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-[var(--text-secondary)]">
                  {image ? 'Change image' : 'Drop image or click to upload'}
                </span>
              </label>
            </div>
          </div>

          {/* Grid Size */}
          <div className="mb-8">
            <h2 className="section-header">Grid</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="control-label">Size</label>
                <span className="value-display">{gridSize}</span>
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
          </div>

          {/* Image Adjustments */}
          <div className="mb-8">
            <h2 className="section-header">Adjustments</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="control-label">Brightness</label>
                  <span className="value-display">{brightness}%</span>
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

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="control-label">Contrast</label>
                  <span className="value-display">{contrast}%</span>
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
            </div>
          </div>

          {/* Dithering */}
          <div className="mb-8">
            <h2 className="section-header">Dithering</h2>
            <select
              value={dithering}
              onChange={(e) => setDithering(e.target.value)}
              className="w-full"
            >
              <option value="none">No Extra Texture</option>
              <option value="floyd">Floyd-Steinberg</option>
              <option value="ordered">Ordered</option>
            </select>
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 bg-[var(--content)] p-8 flex items-center justify-center">
          {!image ? (
            <div className="text-[var(--text-tertiary)] text-sm">
              Upload an image to begin
            </div>
          ) : (
            <div className="canvas-container max-w-full max-h-full">
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
