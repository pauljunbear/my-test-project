import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { HexColorPicker } from 'react-colorful';
import { Button } from './button';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full h-10 p-1 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div 
              className="h-6 w-6 rounded-sm border border-muted-foreground/20" 
              style={{ backgroundColor: color }}
            />
            <span className="text-sm">{color}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3">
        <HexColorPicker color={color} onChange={onChange} />
        <div className="flex justify-between mt-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
          <Button 
            size="sm" 
            onClick={() => {
              onChange(color);
              setOpen(false);
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
} 