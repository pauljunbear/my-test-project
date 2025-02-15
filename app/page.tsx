'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export default function HalftoneGenerator() {
  // State
  const [image, setImage] = useState<string | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [dotColor, setDotColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [gridSize, setGridSize] = useState(8);
  const [activeTab, setActiveTab] = useState('html');
  
  // Refs
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
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Apply halftone effect
      for (let y = 0; y < canvas.height; y += gridSize) {
        for (let x = 0; x < canvas.width; x += gridSize) {
          const i = (y * canvas.width + x) * 4;
          const brightness = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
          const radius = (gridSize / 2) * (1 - brightness / 255);
          
          ctx.beginPath();
          ctx.arc(x + gridSize / 2, y + gridSize / 2, radius, 0, Math.PI * 2);
          ctx.fillStyle = dotColor;
          ctx.fill();
        }
      }
    };
    img.src = image;
  }, [image, brightness, contrast, gridSize, dotColor, bgColor]);

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

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 p-4">
        <div className="max-w-screen-xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-medium">Halftone Generator</h1>
          <button
            onClick={handleExport}
            disabled={!image}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export PNG
          </button>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 flex gap-4">
        {/* Left Panel - Editor */}
        <div className="w-1/2 bg-gray-800 rounded-lg overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            {['html', 'css', 'js'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm ${
                  activeTab === tab ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Upload Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full p-2 bg-gray-700 rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Dot Color</label>
              <input
                type="color"
                value={dotColor}
                onChange={(e) => setDotColor(e.target.value)}
                className="w-full h-10 bg-gray-700 rounded cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Background Color</label>
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-full h-10 bg-gray-700 rounded cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Brightness: {brightness}%
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Contrast: {contrast}%
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Grid Size: {gridSize}px
              </label>
              <input
                type="range"
                min="4"
                max="20"
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="w-1/2 bg-gray-800 rounded-lg p-4">
          <div className="bg-white rounded-lg shadow-lg p-4 w-full h-full flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full"
            />
            <canvas
              ref={hiddenCanvasRef}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
