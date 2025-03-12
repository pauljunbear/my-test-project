import React, { useState, useEffect, useCallback } from 'react';
import { effectCategories, allEffects, getEffectById, getDefaultParams, Effect, EffectCategory } from '../effects';
import { useEffectProcessor } from '../../hooks/useEffectProcessor';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Card, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { EffectOption } from './EffectOption';
import EffectControls from './EffectControls';
import LoadingIndicator from './LoadingIndicator';

export interface EffectsPanelProps {
  imageData: ImageData | null;
  onProcessedImageChange?: (imageData: ImageData | null) => void;
  className?: string;
}

/**
 * EffectsPanel component for applying image effects
 */
export default function EffectsPanel({ imageData, onProcessedImageChange, className }: EffectsPanelProps) {
  // State for active category and selected effect
  const [activeCategory, setActiveCategory] = useState<'basic' | 'artistic' | 'creative' | 'technical'>('basic');
  const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null);
  const [effectParams, setEffectParams] = useState<Record<string, any>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Use the effect processor hook
  const {
    imageData: originalData,
    processedImageData,
    processingEffect,
    error,
    setImageData: setProcessorImageData,
    processEffect,
    resetToOriginal
  } = useEffectProcessor();
  
  // Update image data when props change
  useEffect(() => {
    setProcessorImageData(imageData);
  }, [imageData, setProcessorImageData]);
  
  // Update processed image when available
  useEffect(() => {
    if (onProcessedImageChange && processedImageData) {
      onProcessedImageChange(processedImageData);
    }
  }, [processedImageData, onProcessedImageChange]);
  
  // Get the currently selected effect definition
  const selectedEffect = selectedEffectId 
    ? getEffectById(selectedEffectId)
    : null;
  
  // Handle category change
  const handleCategoryChange = useCallback((category: string) => {
    setActiveCategory(category as 'basic' | 'artistic' | 'creative' | 'technical');
  }, []);
  
  // Handle effect selection
  const handleEffectSelect = useCallback((effectId: string) => {
    setIsProcessing(true);
    
    const effect = getEffectById(effectId);
    if (effect) {
      setSelectedEffectId(effectId);
      // Set default parameters for the effect
      setEffectParams(getDefaultParams(effect));
    }
    
    setIsProcessing(false);
  }, []);
  
  // Reset effect selection
  const handleResetEffect = useCallback(() => {
    setSelectedEffectId(null);
    setEffectParams({});
    resetToOriginal();
  }, [resetToOriginal]);
  
  // Handle parameter changes
  const handleParamChange = useCallback((paramId: string, value: any) => {
    setEffectParams(prev => ({
      ...prev,
      [paramId]: value
    }));
  }, []);
  
  // Apply the current effect with current parameters
  const handleApplyEffect = useCallback(async () => {
    if (!selectedEffect || !originalData) return;
    
    setIsProcessing(true);
    try {
      await processEffect(selectedEffect.id, effectParams);
    } catch (err) {
      console.error('Error applying effect:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedEffect, originalData, effectParams, processEffect]);
  
  // Auto-apply effect when parameters change (with debounce)
  useEffect(() => {
    if (!selectedEffect || !originalData || Object.keys(effectParams).length === 0) {
      return;
    }
    
    const timer = setTimeout(() => {
      handleApplyEffect();
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timer);
  }, [selectedEffect, originalData, effectParams, handleApplyEffect]);
  
  // Process the list of effects to show in the current category
  const currentCategoryEffects = effectCategories[activeCategory]?.effects || [];
  
  // Render loading state if no image data available
  if (!imageData) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-full" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
      {/* Effect Categories Tabs */}
      <Tabs 
        defaultValue={activeCategory} 
        value={activeCategory}
        onValueChange={handleCategoryChange}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-4">
          {Object.values(effectCategories).map(category => (
            <TabsTrigger key={category.id} value={category.id}>
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {/* Effect Options */}
        {Object.values(effectCategories).map(category => (
          <TabsContent key={category.id} value={category.id} className="mt-2">
            <ScrollArea className="h-48">
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2 p-2">
                {category.effects.map(effect => (
                  <EffectOption
                    key={effect.id}
                    id={effect.id}
                    name={effect.name}
                    thumbnail={effect.thumbnail}
                    isSelected={effect.id === selectedEffectId}
                    isDisabled={isProcessing || processingEffect}
                    onClick={handleEffectSelect}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
      
      {/* Effect Controls */}
      <div className="mt-4 flex-grow">
        {selectedEffect ? (
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">{selectedEffect.name}</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleResetEffect}
                  disabled={isProcessing || processingEffect}
                >
                  Reset
                </Button>
              </div>
              
              <EffectControls 
                effect={selectedEffect}
                params={effectParams}
                onChange={handleParamChange}
                disabled={isProcessing || processingEffect}
              />
              
              <div className="mt-4 flex justify-center">
                <Button 
                  onClick={handleApplyEffect}
                  disabled={isProcessing || processingEffect}
                  className="w-full"
                >
                  {(isProcessing || processingEffect) ? (
                    <LoadingIndicator message="Applying effect..." />
                  ) : (
                    'Apply Effect'
                  )}
                </Button>
              </div>
              
              {error && (
                <div className="mt-2 text-red-500 text-sm">
                  Error: {error}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4 text-center text-gray-500">
              <p>Select an effect to begin editing</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
