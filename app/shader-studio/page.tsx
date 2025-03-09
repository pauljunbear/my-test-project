'use client';

import React from 'react';
import ShaderEffectStudio from '@/components/ShaderEffectStudio';

export default function ShaderStudioPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Shader Effect Studio</h1>
        <p className="text-gray-600">
          Apply WebGL shader effects to your images and export them as GIF or MOV animations.
        </p>
      </div>
      
      <ShaderEffectStudio />
      
      <div className="mt-12 border-t pt-6">
        <h2 className="text-xl font-semibold mb-4">How to Use</h2>
        <ol className="space-y-2 list-decimal list-inside text-gray-700">
          <li>Upload an image using the file input above</li>
          <li>Choose a shader effect from the dropdown menu</li>
          <li>Adjust the parameters to customize the effect</li>
          <li>Click Play/Pause to control the animation</li>
          <li>Use the export options to save your creation:</li>
          <ul className="ml-8 mt-2 space-y-1 list-disc list-inside text-gray-600">
            <li>Capture Frame: Save the current frame as a PNG image</li>
            <li>Export Animation: Save as an animated GIF with customizable settings</li>
            <li>Export as MOV: Create a high-quality video file (requires the server to be running)</li>
          </ul>
        </ol>
      </div>
      
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <h3 className="text-lg font-medium text-yellow-800 mb-2">Note about MOV Export</h3>
        <p className="text-yellow-700">
          MOV export requires the server component to be running. Make sure you've started the 
          video export server by running <code className="bg-yellow-100 px-1 py-0.5 rounded">npm run start</code> in 
          the server directory.
        </p>
      </div>
    </div>
  );
} 