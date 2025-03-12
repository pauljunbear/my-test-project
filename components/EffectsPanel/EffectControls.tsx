import React from 'react';
import { Effect, EffectParameter } from '../effects/types';
import { Slider } from '../ui/slider';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../ui/select';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import LoadingIndicator from './LoadingIndicator';

interface EffectControlsProps {
  effect: Effect;
  params: Record<string, any>;
  isProcessing: boolean;
  previewActive: boolean;
  onChange: (paramId: string, value: any) => void;
  onTogglePreview: (active: boolean) => void;
  onApply: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

/**
 * Component for rendering controls for adjusting effect parameters
 */
export default function EffectControls({ 
  effect, 
  params, 
  isProcessing, 
  previewActive, 
  onChange, 
  onTogglePreview, 
  onApply, 
  onCancel, 
  disabled = false 
}: EffectControlsProps) {
  if (isProcessing) {
    return <LoadingIndicator />;
  }
  
  if (!effect || !effect.parameters || effect.parameters.length === 0) {
    return <div className="p-4 text-center text-gray-500">No parameters available</div>;
  }

  /**
   * Render the appropriate control for a parameter based on its type
   */
  const renderControl = (param: EffectParameter) => {
    const value = params[param.id] !== undefined ? params[param.id] : param.defaultValue;
    
    switch (param.type) {
      case 'slider':
        return (
          <div className="space-y-2" key={param.id}>
            <div className="flex justify-between">
              <Label htmlFor={param.id}>{param.name}</Label>
              <span className="text-sm text-gray-500">{value}</span>
            </div>
            <Slider
              id={param.id}
              min={param.min !== undefined ? param.min : 0}
              max={param.max !== undefined ? param.max : 100}
              step={param.step !== undefined ? param.step : 1}
              value={[Number(value)]}
              onValueChange={(newValue) => onChange(param.id, newValue[0])}
              disabled={disabled}
              className="my-2"
            />
          </div>
        );
        
      case 'color':
        return (
          <div className="space-y-2" key={param.id}>
            <Label htmlFor={param.id}>{param.name}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                id={param.id}
                value={String(value)}
                onChange={(e) => onChange(param.id, e.target.value)}
                disabled={disabled}
                className="w-12 h-8 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={String(value)}
                onChange={(e) => onChange(param.id, e.target.value)}
                disabled={disabled}
                className="flex-1"
              />
            </div>
          </div>
        );
        
      case 'select':
        return (
          <div className="space-y-2" key={param.id}>
            <Label htmlFor={param.id}>{param.name}</Label>
            <Select
              value={String(value)}
              onValueChange={(newValue) => onChange(param.id, newValue)}
              disabled={disabled}
            >
              <SelectTrigger id={param.id} className="w-full">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {param.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
        
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2" key={param.id}>
            <Checkbox
              id={param.id}
              checked={Boolean(value)}
              onCheckedChange={(checked) => onChange(param.id, checked)}
              disabled={disabled}
            />
            <Label htmlFor={param.id} className="cursor-pointer">
              {param.name}
            </Label>
          </div>
        );
        
      case 'range':
        // Range with two handles
        const rangeValues = Array.isArray(value) ? value : [param.min || 0, param.max || 100];
        return (
          <div className="space-y-2" key={param.id}>
            <div className="flex justify-between">
              <Label htmlFor={param.id}>{param.name}</Label>
              <span className="text-sm text-gray-500">
                {rangeValues[0]} - {rangeValues[1]}
              </span>
            </div>
            <Slider
              id={param.id}
              min={param.min !== undefined ? param.min : 0}
              max={param.max !== undefined ? param.max : 100}
              step={param.step !== undefined ? param.step : 1}
              value={rangeValues}
              onValueChange={(newValue) => onChange(param.id, newValue)}
              disabled={disabled}
              className="my-2"
            />
          </div>
        );
        
      default:
        return (
          <div className="space-y-2" key={param.id}>
            <Label htmlFor={param.id}>{param.name}</Label>
            <Input
              id={param.id}
              type="text"
              value={String(value)}
              onChange={(e) => onChange(param.id, e.target.value)}
              disabled={disabled}
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 p-4">
      <h3 className="text-lg font-semibold border-b pb-2">
        {effect.name}
      </h3>
      
      <div className="space-y-4">
        {effect.parameters.map(renderControl)}
      </div>
      
      <div className="flex items-center space-x-2 pt-2">
        <input
          type="checkbox"
          id="live-preview"
          checked={previewActive}
          onChange={(e) => onTogglePreview(e.target.checked)}
          className="rounded border-gray-300"
        />
        <Label htmlFor="live-preview" className="text-sm font-medium">
          Live Preview
        </Label>
      </div>
      
      <div className="flex justify-between pt-4">
        <Button
          onClick={onCancel}
          variant="outline"
        >
          Cancel
        </Button>
        
        <Button
          onClick={onApply}
          variant="default"
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
