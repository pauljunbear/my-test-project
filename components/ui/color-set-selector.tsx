"use client";

import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Label } from './label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './tabs';

interface Color {
  name: string;
  hex: string;
  description: string;
}

interface ColorPair {
  name: string;
  color1: string;
  color2: string;
}

interface ColorSet {
  name: string;
  colors?: Color[];
  pairs?: ColorPair[];
}

interface ColorSets {
  colorSets: ColorSet[];
}

interface ColorSetSelectorProps {
  onSelectColor: (color: string) => void;
  onSelectPair: (color1: string, color2: string) => void;
  onPreviewColor?: (color: string) => void;
  onPreviewPair?: (color1: string, color2: string) => void;
  onCancelPreview?: () => void;
  selectedColor?: string;
  previewMode?: boolean;
}

export function ColorSetSelector({ 
  onSelectColor, 
  onSelectPair, 
  onPreviewColor,
  onPreviewPair,
  onCancelPreview,
  selectedColor,
  previewMode = false
}: ColorSetSelectorProps) {
  const [colorSets, setColorSets] = useState<ColorSet[]>([]);
  const [selectedSet, setSelectedSet] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<string>('single');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [hoveredPair, setHoveredPair] = useState<ColorPair | null>(null);

  useEffect(() => {
    const fetchColorSets = async () => {
      try {
        setLoading(true);
        const response = await fetch('/data/colors.json');
        if (!response.ok) {
          throw new Error('Failed to load color sets');
        }
        const data: ColorSets = await response.json();
        setColorSets(data.colorSets);
        if (data.colorSets.length > 0) {
          setSelectedSet(data.colorSets[0].name);
        }
      } catch (err) {
        console.error('Error loading color sets:', err);
        setError('Failed to load color sets');
      } finally {
        setLoading(false);
      }
    };

    fetchColorSets();
  }, []);

  const handleColorMouseEnter = (color: string) => {
    setHoveredColor(color);
    if (onPreviewColor) {
      onPreviewColor(color);
    }
  };

  const handleColorMouseLeave = () => {
    setHoveredColor(null);
    if (onCancelPreview) {
      onCancelPreview();
    }
  };

  const handlePairMouseEnter = (pair: ColorPair) => {
    setHoveredPair(pair);
    if (onPreviewPair) {
      onPreviewPair(pair.color1, pair.color2);
    }
  };

  const handlePairMouseLeave = () => {
    setHoveredPair(null);
    if (onCancelPreview) {
      onCancelPreview();
    }
  };

  const currentSet = colorSets.find(set => set.name === selectedSet);

  if (loading) {
    return <div className="p-4 text-center">Loading color sets...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="single">Single Color</TabsTrigger>
          <TabsTrigger value="duotone">Duotone Pairs</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-4 mt-2">
          <div>
            <Label>Color Set</Label>
            <Select value={selectedSet} onValueChange={setSelectedSet}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Select a color set" />
              </SelectTrigger>
              <SelectContent>
                {colorSets
                  .filter(set => set.colors && set.colors.length > 0)
                  .map(set => (
                    <SelectItem key={set.name} value={set.name}>
                      {set.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {currentSet?.colors?.map(color => (
              <Button
                key={color.hex}
                variant="outline"
                className={`h-12 relative ${selectedColor === color.hex ? 'ring-2 ring-primary' : ''} ${hoveredColor === color.hex ? 'ring-2 ring-blue-400' : ''}`}
                style={{ backgroundColor: color.hex }}
                onClick={() => onSelectColor(color.hex)}
                onMouseEnter={() => handleColorMouseEnter(color.hex)}
                onMouseLeave={handleColorMouseLeave}
              >
                <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                  {color.name}
                </span>
              </Button>
            ))}
          </div>
          
          {hoveredColor && (
            <div className="mt-2 flex justify-end">
              <Button 
                size="sm" 
                onClick={() => onSelectColor(hoveredColor)}
              >
                Apply
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="duotone" className="space-y-4 mt-2">
          <div>
            <Label>Duotone Pairs</Label>
            <div className="grid grid-cols-1 gap-2 mt-1">
              {colorSets
                .find(set => set.name === "Duotone Pairs")
                ?.pairs?.map(pair => (
                  <Button
                    key={pair.name}
                    variant="outline"
                    className={`h-12 relative ${hoveredPair?.name === pair.name ? 'ring-2 ring-blue-400' : ''}`}
                    style={{ 
                      background: `linear-gradient(to right, ${pair.color1} 0%, ${pair.color1} 50%, ${pair.color2} 50%, ${pair.color2} 100%)` 
                    }}
                    onClick={() => onSelectPair(pair.color1, pair.color2)}
                    onMouseEnter={() => handlePairMouseEnter(pair)}
                    onMouseLeave={handlePairMouseLeave}
                  >
                    <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                      {pair.name}
                    </span>
                  </Button>
                ))}
            </div>
          </div>
          
          {hoveredPair && (
            <div className="mt-2 flex justify-end">
              <Button 
                size="sm" 
                onClick={() => onSelectPair(hoveredPair.color1, hoveredPair.color2)}
              >
                Apply
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 