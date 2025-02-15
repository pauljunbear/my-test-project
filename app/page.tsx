'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export default function HalftoneGenerator() {
  const [image, setImage] = useState<string | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [gridSize, setGridSize] = useState(8);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);

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

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Halftone Generator</h1>
        
        <div className="space-y-6">
          {/* Controls */}
          <div className="space-y-4 p-6 bg-white rounded-lg shadow-sm">
            <div>
              <label className="block text-sm font-medium mb-2">Upload Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
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
              <label className="block text-sm font-medium mb-2">
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
              <label className="block text-sm font-medium mb-2">
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

            <button
              onClick={handleExport}
              disabled={!image}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              Export as PNG
            </button>
          </div>

          {/* Canvas Display */}
          <div className="relative bg-white p-4 rounded-lg shadow-sm">
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto mx-auto border"
            />
            <canvas
              ref={hiddenCanvasRef}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
