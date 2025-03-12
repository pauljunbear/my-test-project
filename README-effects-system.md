# Image Effects System

A powerful, extensible image processing system for applying various effects to images directly in the browser. This system leverages Web Workers for performance and provides a modular architecture for easy extension with new effects.

## Features

- 🎨 **Rich Effect Library**: Includes basic adjustments, artistic effects, creative tools, and technical corrections
- 🚀 **Performance Optimized**: Uses Web Workers to process effects in a separate thread
- 🧩 **Modular Architecture**: Easily add new effects by implementing the standard interface
- 📱 **Responsive UI**: Works on both desktop and mobile devices
- 🔄 **Real-time Preview**: See changes as you adjust effect parameters
- 💾 **Client-side Processing**: All processing happens in the browser - no server uploads required

## Architecture

The system is built with a modular architecture:

```
components/
├── effects/              # Effect definitions and processing functions
│   ├── index.ts          # Main exports and utilities
│   ├── types.ts          # Type definitions
│   ├── basic.ts          # Basic adjustment effects
│   ├── artistic.ts       # Artistic effects
│   ├── creative.ts       # Creative effects
│   └── technical.ts      # Technical correction effects
├── EffectsPanel/         # UI components for the effects panel
│   ├── index.tsx         # Main panel component
│   ├── EffectOption.tsx  # Individual effect option component
│   ├── EffectControls.tsx # Controls for adjusting effect parameters
│   └── LoadingIndicator.tsx # Loading indicator component
├── ImageEffectsDemo.tsx  # Demo component showcasing the system
└── ui/                   # UI components (buttons, sliders, etc.)
```

### Core Components

- **Effect Definition**: Each effect is defined with an ID, name, description, parameters, and a processing function
- **Effect Processor**: A custom hook that manages effect processing state and logic
- **Web Worker**: Offloads heavy processing to a separate thread for better performance
- **EffectsPanel**: The main UI component for selecting and configuring effects

## Effect Types

The system includes four categories of effects:

1. **Basic Effects**:
   - Brightness & Contrast
   - Saturation & Vibrance
   - Highlights & Shadows
   - Temperature & Tint

2. **Artistic Effects**:
   - Duotone
   - Black & White
   - Film Grain
   - Vignette
   - Glitch

3. **Creative Effects**:
   - Tilt Shift
   - Pixelate
   - Mirror
   - Kaleidoscope

4. **Technical Effects**:
   - Sharpen
   - Noise Reduction
   - Perspective Correction
   - Dehaze

## Usage

### Basic Integration

```tsx
import { EffectsPanel } from '@/components/EffectsPanel';

function MyImageEditor() {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [processedImageData, setProcessedImageData] = useState<ImageData | null>(null);
  
  // Load image data from a canvas or other source
  
  return (
    <div>
      <EffectsPanel
        imageData={imageData}
        onProcessedImageChange={setProcessedImageData}
      />
      
      {/* Display the processed image */}
      {processedImageData && (
        <canvas ref={canvasRef} />
      )}
    </div>
  );
}
```

### Creating a Custom Effect

To add a new effect, create a definition that follows the `Effect` interface:

```tsx
import { Effect } from '@/components/effects/types';

const myCustomEffect: Effect = {
  id: 'myEffect',
  name: 'My Custom Effect',
  description: 'Description of what the effect does',
  category: 'creative', // or 'basic', 'artistic', 'technical'
  thumbnail: '/thumbnails/my-effect.jpg',
  parameters: [
    {
      id: 'intensity',
      name: 'Intensity',
      type: 'slider',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50
    }
    // Add more parameters as needed
  ],
  processFn: (imageData, params) => {
    // Implement your effect processing logic here
    const data = imageData.data;
    const intensity = params.intensity / 100;
    
    // Modify pixel data...
    
    return imageData;
  }
};

// Add to the appropriate category in your effects file
```

## Performance Considerations

- Heavy processing is offloaded to a Web Worker when available
- The system includes fallback processing on the main thread when Web Workers aren't supported
- Large images may still cause performance issues - consider downsampling for preview

## Browser Compatibility

The system works in all modern browsers that support:
- Canvas API
- Web Workers
- ES6+ features

## License

MIT 