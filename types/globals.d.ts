/**
 * Global type declarations for browser-only features and polyfills
 */

// For styleSingleton patch
interface StyleSingletonAPI {
  add: (style: string) => HTMLStyleElement | null;
  remove: (style: string) => void;
  flush: () => void;
}

interface Window {
  styleSingleton?: () => StyleSingletonAPI;
}

// For styleSingleton patch in Node.js environment
declare namespace NodeJS {
  interface Global {
    styleSingletonInstances?: Map<string, any>;
    styleSingleton?: () => StyleSingletonAPI;
  }
}

// Add any other global augmentations here 