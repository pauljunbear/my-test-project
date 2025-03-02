import React, { useState, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Input } from './input';
import { Label } from './label';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';

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

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-10 h-10 p-0 border-2"
              style={{ backgroundColor: color }}
            />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <HexColorPicker color={color} onChange={onChange} />
          </PopoverContent>
        </Popover>
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          className="w-24"
          maxLength={7}
        />
      </div>
    </div>
  );
} 