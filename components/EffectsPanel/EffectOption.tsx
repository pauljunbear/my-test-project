import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface EffectOptionProps {
  id: string;
  name: string;
  thumbnail?: string;
  isSelected: boolean;
  isDisabled?: boolean;
  onClick: (id: string) => void;
}

export function EffectOption({
  id,
  name,
  thumbnail,
  isSelected,
  isDisabled = false,
  onClick
}: EffectOptionProps) {
  // Placeholder thumbnail if none provided
  const thumbnailSrc = thumbnail || '/placeholders/effect-placeholder.jpg';
  
  return (
    <div
      className={cn(
        'relative flex flex-col items-center p-2 rounded-md transition-all cursor-pointer',
        'border border-transparent hover:border-blue-400 hover:bg-gray-100/20',
        isSelected && 'border-blue-500 bg-blue-100/20',
        isDisabled && 'opacity-60 cursor-not-allowed pointer-events-none'
      )}
      onClick={() => !isDisabled && onClick(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          !isDisabled && onClick(id);
        }
      }}
      tabIndex={isDisabled ? -1 : 0}
      role="button"
      aria-pressed={isSelected}
      aria-disabled={isDisabled}
    >
      <div className="w-full aspect-square relative rounded-md overflow-hidden mb-2">
        {/* Fallback for Next.js Image in case of static export */}
        {typeof Image !== 'undefined' ? (
          <Image
            src={thumbnailSrc}
            alt={`${name} effect preview`}
            fill
            sizes="100px"
            className="object-cover"
          />
        ) : (
          <img
            src={thumbnailSrc}
            alt={`${name} effect preview`}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      
      <span className="text-sm font-medium text-center">{name}</span>
      
      {isSelected && (
        <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-1 w-5 h-5 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3 h-3"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </div>
  );
} 