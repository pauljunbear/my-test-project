import React from 'react';
import { ColorSetSelectorProps } from '../types';
import { Button } from '@/components/ui/button';

const predefinedPairs = [
  { name: 'B&W', colors: ['#000000', '#ffffff'] },
  { name: 'Blue/Red', colors: ['#2563eb', '#ef4444'] },
  { name: 'Purple/Gold', colors: ['#7c3aed', '#f59e0b'] },
  { name: 'Green/Pink', colors: ['#059669', '#ec4899'] },
  { name: 'Navy/Orange', colors: ['#1e3a8a', '#ea580c'] },
];

export const ColorSetSelector: React.FC<ColorSetSelectorProps> = ({
  onSelectColor,
  onSelectPair,
  selectedColor,
}) => {
  return (
    <div className="space-y-4">
      {/* Predefined color pairs */}
      <div className="grid grid-cols-2 gap-2">
        {predefinedPairs.map(({ name, colors }) => (
          <Button
            key={name}
            onClick={() => onSelectPair(colors[0], colors[1])}
            variant="outline"
            className="flex items-center justify-center gap-2 h-10"
          >
            <div className="flex gap-1">
              <div
                className="w-4 h-4 rounded-sm border border-gray-200"
                style={{ backgroundColor: colors[0] }}
              />
              <div
                className="w-4 h-4 rounded-sm border border-gray-200"
                style={{ backgroundColor: colors[1] }}
              />
            </div>
            <span className="text-sm">{name}</span>
          </Button>
        ))}
      </div>

      {/* Individual color selectors */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Shadow Color</label>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
              style={{ backgroundColor: selectedColor }}
              onClick={() => onSelectColor(selectedColor, 1)}
            />
            <input
              type="color"
              onChange={(e) => onSelectColor(e.target.value, 1)}
              value={selectedColor}
              className="hidden"
              id="color1"
            />
            <label
              htmlFor="color1"
              className="text-sm text-gray-500 cursor-pointer hover:text-gray-700"
            >
              Change
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Highlight Color</label>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
              style={{ backgroundColor: selectedColor }}
              onClick={() => onSelectColor(selectedColor, 2)}
            />
            <input
              type="color"
              onChange={(e) => onSelectColor(e.target.value, 2)}
              value={selectedColor}
              className="hidden"
              id="color2"
            />
            <label
              htmlFor="color2"
              className="text-sm text-gray-500 cursor-pointer hover:text-gray-700"
            >
              Change
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}; 