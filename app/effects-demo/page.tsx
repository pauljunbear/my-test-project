'use client';

import React from 'react';
import ImageEffectsDemo from '@/components/ImageEffectsDemo';

export default function EffectsDemoPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Image Effects System</h1>
      <p className="text-center mb-8 max-w-2xl mx-auto text-gray-600 dark:text-gray-300">
        Upload an image and apply various effects using our powerful image processing system.
        All processing happens directly in your browser - no server uploads required!
      </p>
      
      <ImageEffectsDemo />
    </div>
  );
} 