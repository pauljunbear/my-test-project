import React from 'react';
import { EffectCategory } from '../effects';

interface EffectCategoriesProps {
  categories: EffectCategory[];
  activeCategory: string;
  selectedEffect: string | null;
  onSelectCategory: (categoryId: string) => void;
  onSelectEffect: (effectId: string) => void;
}

const EffectCategories: React.FC<EffectCategoriesProps> = ({
  categories,
  activeCategory,
  selectedEffect,
  onSelectCategory,
  onSelectEffect
}) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">Effects</h2>
      
      {/* Category tabs */}
      <div className="flex overflow-x-auto mb-4 pb-2 scrollbar-hidden">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap rounded-md mr-1 ${
              activeCategory === category.id
                ? 'bg-primary/10 text-primary'
                : 'text-foreground hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
      
      {/* Effects list */}
      <div className="space-y-1 max-h-[calc(100vh-240px)] overflow-y-auto pr-1 scrollbar-hidden">
        {categories
          .find(cat => cat.id === activeCategory)
          ?.effects.map(effect => (
            <button
              key={effect.id}
              onClick={() => onSelectEffect(effect.id)}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                selectedEffect === effect.id
                  ? 'bg-primary text-white'
                  : 'text-foreground hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {effect.name}
            </button>
          ))}
      </div>
    </div>
  );
};

export default EffectCategories;
