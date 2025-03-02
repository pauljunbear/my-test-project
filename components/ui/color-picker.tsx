import React, { useState, useEffect } from 'react';
import { Input } from './input';
import { Label } from './label';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(color);

  // Update input value when color prop changes
  useEffect(() => {
    setInputValue(color);
  }, [color]);

  // Handle manual input of hex color
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Only update parent if it's a valid hex color
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      onChange(value);
    }
  };

  // Handle color picker change
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    onChange(value);
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-2">
        <div 
          className="w-10 h-10 rounded-md border border-gray-300" 
          style={{ backgroundColor: color }}
        />
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          className="w-24"
          maxLength={7}
        />
      </div>
      <div>
        <Label className="sr-only">Pick a color</Label>
        <input
          type="color"
          value={color}
          onChange={handleColorChange}
          className="w-full h-8 cursor-pointer"
        />
      </div>
    </div>
  );
} 